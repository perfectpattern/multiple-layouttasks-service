const Job = require('./server/Job');
const LayoutTaskCalculator = require('./server/LayoutTaskCalculator');
const Workspaces = require('./server/Workspaces');
const deliverHTTP = require('./server/deliverHTTP');
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const axios = require('axios');
const bodyParser = require('body-parser');
const bodyParserError = require('bodyparser-json-error');
const version = require('./server/version');
const PORT = process.env.PORT || 4201;

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(bodyParserError.beautify({ status: 500, res: { msg: 'You sent a bad JSON !' } }));// Beautify body parser json syntax error

const baseUrl = 'https://' + process.env.SPO_URL + '/';
const timeout = 5000;
const authorization = 'Basic ' + Buffer.from(process.env.SPO_USER + ':' + process.env.SPO_PASSWORD).toString('base64');
const xtenant = process.env.SPO_TENANT;

const axiosSPO = axios.create({
    baseURL: baseUrl,
    timeout: timeout,
    headers: {
        "X-Tenant" : xtenant,
        "accept" : "application/json",
        "Authorization": authorization
    }
});


//-----------VARIABLES------------
var job, workspaces, layoutTaskCalculator;
var calculationCanceled = false;
var currentlyCalculatedWorkspaceId = null;
var calculationInProgress = false;


//-----------FUNCTIONS------------
function getStatus(){
    if(workspaces.isReadyForCalculation() === true && job.exists() === true){
        if(calculationInProgress){
            return "calculating"
        }else{
            return "readyForCalculation";
        }
    }else{
        return "notReadyForCalculation";
    }
}

function sendWebsocketMsg(code){
    var msg;
    switch(code){
        case "PIBconnection":
            msg = {status : "warning",  code : "PIBconnection", message : "connection to PIB Flow"};
            break;

        case "noPIBconnection":
            msg = {status : "warning",  code : "noPIBconnection", message : "no connection to PIB Flow"};
            break;

        case "statusChanged":
            msg = {status : "info",  code : "statusChanged", message : "status changed"};
            break;

        case "jobReceived":
            msg = {status : "info",  code : "jobReceived", message : "received job"};
            break;

        case "workspaceStatusUpdate": 
            msg = {status : "info",  code : "workspaceStatusUpdate", message : "workspace status update"};
            break;

        case "layoutTaskStatusUpdate": 
            msg = {status : "info",  code : "layoutTaskStatusUpdate", message : "layout task status update"};
            break;

        case "calculationStarted":
            msg = {status : "info",  code : "calculationStarted", message : "calculation started"};
            break;

        case "calculationCanceled":
            msg = {status : "info",  code : "calculationCanceled", message : "calculation canceled"};
            break;

        case "calculationFailed":
            msg = {status : "info",  code : "calculationFailed", message : "calculation failed"};
            break;            

        case "calculationFinished":
            msg = {status : "info",  code : "calculationFinished", message : "calculation finished"};
            break;                    

        default:
            break;
    }
    msg.on = new Date().getTime();

    //answer to all websocket clients
    expressWs.getWss().clients.forEach(client => {
        client.send(JSON.stringify(msg));
    });
}

function sendToPIBFlow(jobName, layoutTaskId, workspaceId){
    //msg to PIB Flow
    axios.post(process.env.FLOW_LOCATION + "/controller/layouttask/" + jobName + "/" + layoutTaskId + "/" + workspaceId)
    .then(res=> {
        workspaces.setStatus(workspaceId, "sent");
        sendWebsocketMsg("layoutTaskStatusUpdate");
    })
    .catch(err => {
        console.log(err); 
        workspaces.setStatus(workspaceId, "not sent");
        workspaces.setErrorMsg(workspaceId, "The LayoutTask could not be sent to PIB Flow! Please check connectionto PIB Flow.");
    })
}

function calculate(index){
    //calculation canceled: exit loop.
    if(calculationCanceled === true){
        workspaces.resetAllWaiting();
        calculationCanceled = false;
        return;
    }

    //all LTs calculation finished
    if(index > workspaces.getIdList().length - 1){
        //Calculation finished, Do something
        calculationInProgress = false;
        sendWebsocketMsg("calculationFinished");
        return;
    }

    //calculate this workspace index
    currentlyCalculatedWorkspaceId = workspaces.getIdList()[index];

    if(workspaces.isSelected(currentlyCalculatedWorkspaceId)){
        layoutTaskCalculator.on("progress", function(workspaceId, progress, layoutTaskId){
            workspaces.setStatus(workspaceId, progress);
            sendWebsocketMsg("layoutTaskStatusUpdate");
        });
        layoutTaskCalculator.on("finish", function(workspaceId, status, layoutTaskId){
            workspaces.setStatus(workspaceId, status);
            sendToPIBFlow(job.getName(), layoutTaskId, workspaceId);
            index = index + 1;
            calculate(index); //next layoutTask            
        });
        layoutTaskCalculator.on("failed", function(workspaceId, status, layoutTaskId){
            layoutTaskCalculator.getError(workspaceId, layoutTaskId)
            .then(response => {
                var errMsg = response.data["exceptionInfo-Root"].message;
                workspaces.setStatus(workspaceId, status);
                workspaces.setErrorMsg(workspaceId, errMsg);
                sendWebsocketMsg("calculationFailed");
                index = index + 1;
                calculate(index); //next layoutTask
            })
            .catch(e => {
                console.log(e);
            });
        });
        layoutTaskCalculator.on("canceled", function(workspaceId, status, layoutTaskId){
            workspaces.setStatus(workspaceId, status);
            calculationInProgress = false;
            calculationCanceled = false; //reset the value since cancelation is now completed
            sendWebsocketMsg("calculationCanceled");
        });     
        layoutTaskCalculator.on("error", function(workspaceId, errMsg, layoutTaskId){     
            workspaces.setStatus(workspaceId, "error");
            workspaces.setErrorMsg(workspaceId, errMsg);
        });
        layoutTaskCalculator.calculate(job.getBinderySignatures(), currentlyCalculatedWorkspaceId);
    }

    //next workspace index
    else{
        index = index + 1;
        calculate(index);
    }
}

function checkPIBFLowConnection(){
        //msg to PIB Flow
        axios.get(process.env.FLOW_LOCATION + "/version")
        .then(res=> {
            sendWebsocketMsg("PIBconnection");
        })
        .catch(err=>{
            sendWebsocketMsg("noPIBconnection");
        });
}




//-----------START------------
job = new Job();
workspaces = new Workspaces(axiosSPO);
workspaces.on("updated", function(){
    sendWebsocketMsg("workspaceStatusUpdate");
})
layoutTaskCalculator = new LayoutTaskCalculator(axiosSPO);
checkPIBFLowConnection();
setInterval(checkPIBFLowConnection,5000);


//-----------WEBSERVICE------------
app.get('/version', (req, res) => {
    res.status(200).send(version.getVersion());
});

app.get('/port', (req, res) => {
    res.status(200).send({port : PORT});
});

app.get('/jobInfos', (req, res) => {
    res.status(200).send(job.getMeta());
});

app.get('/status', (req, res) => {
    res.set("Content-Type", "application/json");
    res.status(200).send({status : getStatus()});
});

//websocket client registration
app.ws('/', function(ws, req) {
    ws.on('message', function(msg) {
        ws.send(JSON.stringify({status : "echo", code : "websocketRegistered", message : msg})); //echo
    });
});

//POST a json
app.post('/job/:name', (req, res) => {
    jobname = req.params.name;
    data = req.body;
    job.set(jobname, data);
    sendWebsocketMsg("jobReceived");
    return res.status(200).send("success");
});

app.get('/config', (req,res) => {
    var data = {
        "FLOW_LOCATION"     : process.env.FLOW_LOCATION,
        "SPO_URL"           : process.env.SPO_URL,
        "SPO_TENANT"        : process.env.SPO_TENANT,
        "SPO_USER"          : process.env.SPO_USER
    };
    res.set("Content-Type", "application/json");
    res.status(200).send(data);
});

app.get('/SPO/updateWorkspaces', (req,res) => {
    if(calculationInProgress){
        res.status(400).send("Calculation in progress");
    }else{
        workspaces.update()
        .then(() => { 
            res.status(200).send("success"); 
        })
        .catch(() => { 
            res.status(400).send("error"); 
        })
    }
});

app.get('/SPO/getWorkspaces', (req,res) => {
    res.set("Content-Type", "application/json");
    res.status(200).send(workspaces.getAllData());
});

app.post('/SPO/setWorkspace', (req, res) => {
    var body = req.body;
    if(calculationInProgress){
        res.status(400).send("Calculation in progress.");
    }
    else if(!workspaces.hasId(body.id)){
        res.status(400).send("Id not found.");
    }
    else{
        workspaces.setSelected(body.id, body.selected == "true");
        sendWebsocketMsg("workspaceStatusUpdate");
        res.status(200).send("success");
    }
});

app.get('/SPO/start', (req, res) => {
    var status = getStatus();
    if(calculationCanceled === true){ 
        res.status(400).send("Cancelation not yet completed");
    }
    else if(status === "calculating"){ 
        res.status(400).send("Already calculating"); 
    }
    else if(status === "notReadyForCalculation"){ 
        res.status(400).send("Not ready yet"); 
    }
    else{
        sendWebsocketMsg("calculationStarted");
        calculationInProgress = true;
        workspaces.setAllWaiting();
        calculate(0);
        res.status(200).send("success");
    }
});

app.get('/SPO/cancel', (req, res) => {
    if(calculationInProgress === false){
        res.status(400).send("No calculation running");
    }else if(calculationCanceled === true){
        res.status(400).send("Already canceled");
    }
    else{
        calculationCanceled = true;
        layoutTaskCalculator.cancel();
        res.status(200).send("success");
    }
});



//GET HTTP
app.get('/*', (req, res) => {
    deliverHTTP.deliver(req, res);
});

// Listen to the App Engine-specified port, or 8080 otherwise
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});