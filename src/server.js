const Job = require('./server/Job');
const LayoutTaskCalculator = require('./server/LayoutTaskCalculator');
const deliverHTTP = require('./server/deliverHTTP');
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const axios = require('axios');
const bodyParser = require('body-parser');
const bodyParserError = require('bodyparser-json-error');
const version = require('./server/version');
const PORT = process.env.PORT || 4203;

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
var job;
var workspaces = {
    calcInProgress : false,
    updated : null,
    data : {}
};

//-----------FUNCTIONS------------
function getWorkspaces(){
    return new Promise(function(resolve, reject){
        axiosSPO({
            url: 'api/rest/workspaces'
        })
        .then(response => {
            wsIds = [];

            //update or add entry per valid workspace to 'workspaces'
            response.data['workspaces-Root'].workspace.forEach(workspace => {

                if(workspace.description.indexOf('{MLTS}') > -1){ //only add if fulfills criteria
                    wsIds.push(workspace.id); //collect all active workspace ids
                    if(workspaces.data.hasOwnProperty(workspace.id)){
                        workspaces.data[workspace.id].label = workspace.label //only update label
                    }

                    else{
                        workspaces.data[workspace.id] = {
                            "label" : workspace.label,
                            "selected" : false,
                            "status" : "-"
                        };
                    }
                }
            });

            //delete obsolete entries
            Object.keys(workspaces.data).forEach(wsId => {
                if(!wsIds.includes(wsId)) delete workspaces.data[wsId];
            });

            //reset updated
            workspaces.updated = new Date().getTime();
            resolve();
        })

        .catch(err => {
            console.log(err);
            reject();
        });
    })
}

function sendWebsocketMsg(code){
    var msg;
    switch(code){
        case 1:
            msg = {status : "info",  code : 1, message : "received job"};
            break;

        case 2:
            msg = {status : "info",  code : 2, message : "calculation started"};
            break;

        case 3: 
            msg = {status : "info",  code : 3, message : "calculation job status update"};
            break;

        case 4:
            msg = {status : "info",  code : 4, message : "calculation canceled"};
            break;

        case 5:
            msg = {status : "info",  code : 5, message : "calculation failed"};
            break;            

        case 6:
            msg = {status : "info",  code : 6, message : "calculation finished"};
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

function calculate(index){
    var workspaceKeys = Object.keys(workspaces.data);

    //calculation finished
    if(index > workspaceKeys.length - 1){
        //Calculation finished, Do something
        workspaces.calcInProgress = false;
        sendWebsocketMsg(6);
        return;
    }

    //calculatie this workspace index
    var currentWorkspaceId = workspaceKeys[index];
    var currentWorkspace = workspaces.data[currentWorkspaceId];

    if(currentWorkspace.selected){
        layoutTaskCalculator.on("progress", function(workspaceId, status){
            workspaces.data[workspaceId].status = status;
            sendWebsocketMsg(3);
        });
        layoutTaskCalculator.on("finish", function(workspaceId, status){
            index = index + 1;
            calculate(index);
        });
        layoutTaskCalculator.on("error", function(workspaceId, status){
            workspaces.calcInProgress = false;
            sendWebsocketMsg(5);
        });                    
        layoutTaskCalculator.calculate(job.getBinderySignatures, currentWorkspaceId);
    }

    //next workspace index
    else{
        index = index + 1;
        calculate(index);
    }
}




//-----------START------------
job = new Job();
getWorkspaces();
layoutTaskCalculator = new LayoutTaskCalculator(axiosSPO);




//-----------WEBSERVICE------------
//GET the version
app.get('/version', (req, res) => {
    res.status(200).send(version.getVersion());
});

app.get('/port', (req, res) => {
    res.status(200).send({port : PORT});
});

app.get('/jobInfos', (req, res) => {
    res.status(200).send(job.getMeta());
});

//websocket client registration
app.ws('/', function(ws, req) {
    ws.on('message', function(msg) {
        ws.send(JSON.stringify({status : "echo", code : 0, message : msg})); //echo
    });
});

//POST a json
app.post('/job/:name', (req, res) => {
    jobname = req.params.name;
    data = req.body;
    job.set(jobname, data);
    sendWebsocketMsg(1);
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
    getWorkspaces()
    .then(() => { res.status(200).send("success"); })
    .catch(() => { res.status(400).send("error"); })
});

app.get('/SPO/getWorkspaces', (req,res) => {
    res.set("Content-Type", "application/json");
    res.status(200).send(workspaces);
});

app.post('/SPO/setWorkspace', (req, res) => {
    var body = req.body;
    if(workspaces.data.hasOwnProperty(body.id)){
        workspaces.data[body.id].selected = body.selected == "true";
        res.status(200).send("success");
    }else{
        res.status(400).send("Id not found.");
    }
});

app.get('/SPO/start', (req, res) => {
    workspaces.calcInProgress = true;
    sendWebsocketMsg(2);
    //set selected workspaces "pending"
    for(var wsId in workspaces.data)
        if(workspaces.data[wsId].selected) workspaces.data[wsId].status = "pending";
    sendWebsocketMsg(3);
    calculate(0);
    res.status(200).send("success");
});

app.get('/SPO/cancel', (req, res) => {
    sendWebsocketMsg(4);
    for(var wsId in workspaces.data){
        var workspace = workspaces.data[wsId];
        if(workspace.status !== "-"){
            workspace.status = "-";
            sendWebsocketMsg(3);
        }
    }
    workspaces.calcInProgress = false;
    res.status(200).send("success");
});

//GET HTTP
app.get('/*', (req, res) => {
    deliverHTTP.deliver(req, res);
});

// Listen to the App Engine-specified port, or 8080 otherwise
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});