const fs = require('fs');
const job = require('./job');
const path = require('path');
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const axios = require('axios');
const bodyParser = require('body-parser');
const bodyParserError = require('bodyparser-json-error');
const version = require('./version');
const PORT = process.env.PORT || 4203;

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(bodyParserError.beautify({ status: 500, res: { msg: 'You sent a bad JSON !' } }));// Beautify body parser json syntax error

var baseUrl = 'https://' + process.env.SPO_URL + '/';
var timeout = 5000;
var authorization = 'Basic ' + Buffer.from(process.env.SPO_USER + ':' + process.env.SPO_PASSWORD).toString('base64');
var xtenant = process.env.SPO_TENANT;

const axiosSPO = axios.create({
    baseURL: baseUrl,
    timeout: timeout,
    headers: {
        "X-Tenant" : xtenant,
        "accept" : "application/json",
        "Authorization": authorization
    }
});



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

//websocket
app.ws('/', function(ws, req) {
    //echo
    ws.on('message', function(msg) {
        ws.send(JSON.stringify({echo:msg}));
    });
});

//POST a json
app.post('/job/:name', (req, res) => {
    jobname = req.params.name;
    data = req.body;
    job.set(jobname, data);

    //answer to all websocket clients
    expressWs.getWss().clients.forEach(client => {
        client.send(JSON.stringify({
            "status" : "info",
            "code" : 1,
            "message" : "received job"
        }));
    });
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

app.get('/SPO/getWorkspaces', (req,res) => {
    
    axiosSPO({
        url: 'api/rest/workspaces'
    })
    .then(response => {
        //console.log(response);
        res.set("Content-Type", "application/json");
        res.status(200).send(response.data);
    })
    .catch(err => {
        console.log(err);
        res.set("Content-Type", "application/json");
        res.status(err.response.status).send();
    });
});

//GET UI
app.get('/*', (req, res) => {
    //res.sendFile(path.join(__dirname + '/html/index.html'));
    var root = './src/html/';
    var url = req.url;
    
    //check if a file was asked for
    if(url.substr(url.length - 5).indexOf(".") === -1){ //not a file
        url = "index.html";
    }
    
    // set asset path
    var assetPath = path.join(root, url);

    // define content type
    var contentType = "application/octet-stream"
    
    if(path.extname(assetPath) === ".html" || path.extname(assetPath) === ".htm") {
        contentType = 'text/html';
    } else if (path.extname(assetPath) === ".js") {
        contentType = 'text/javascript';
    } else if (path.extname(assetPath) === ".css") {
        contentType = 'text/css';
    } else if (path.extname(assetPath) === ".ico") {
        contentType = 'image/x-icon';
    } else if (path.extname(assetPath) === ".svg") {
        contentType = 'image/svg+xml';
    }
    
    // try to deliver asset
    if(fs.existsSync(assetPath)) {
        fs.readFile(assetPath, (err, data) => {
            if (err) throw err;
            res.set('Content-Type', contentType)
            res.status(200).send(data);
        });
        
    } 
    
    //asset not found: 404
    else {
        assetPath = path.join(root, "content/404.html");
        fs.readFile(assetPath, (err, data) => {
            if (err) throw err;
            res.set('Content-Type', contentType)
            res.status(404).send(data);

        });
    }
});

// Listen to the App Engine-specified port, or 8080 otherwise
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});