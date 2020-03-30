const WebSocket = require('ws');

/**
 * Class for managing the websocket communication
 **/
var WebsocketManager = function() {
    var websocket;
    var closedOnPurpose = false;
    var reconnectInterval = 500;
    var websocketUrl = "wss://" + process.env.SPO_URL + "/api/websocket/notifications";
    var headers = {
        'Accept': 'application/json',
        'X-Tenant': process.env.SPO_TENANT,
        'Authorization': 'Basic ' + Buffer.from(process.env.SPO_USER + ':' + process.env.SPO_PASSWORD).toString('base64')
    }
    //external events
    var events = {
        onopen : function(){ return false; },
        onclose : function(){ return false; },
        onmessage : function(){ return false; },
        onerror : function(){ return false; }
    }

    function connect() {
        console.log('Connecting to SPO Websocket ' + websocketUrl +'...');
    
        var headerLines = [];
        for(var name in headers) {
            headerLines.push(name + ': ' + headers[name]);
        }
        var headersString = Buffer.from(headerLines.join("\r\n")).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '.');
        
        websocket = new WebSocket(websocketUrl, ['Headers', 'Headers-' + headersString]);

        websocket.onopen = function(openEvent) {
            console.log('SPO Websocket connection has been established successfully.');
            events.onopen();
        };
        
        websocket.onclose = function() {
            if(!closedOnPurpose){
                console.error('Connection lost/refused, retry in ' + (reconnectInterval / 1000) + ' seconds');
                setTimeout(function() { connect(); }, reconnectInterval);
            }else{
                console.log('WebSocket connection has been closed.');
            }
            events.onclose();
        };

        websocket.onerror = function(errorEvent) {
            console.error('Websocket error: ' + errorEvent.message);
            events.onerror();
        };
        
        websocket.onmessage = function(messageEvent) {
            //console.log("received notification:");
            //console.log(JSON.parse(messageEvent.data));
            events.onmessage(JSON.parse(messageEvent.data));
        };
    };

    function close(){
        closedOnPurpose = true;
        websocket.close();
    }


    
    //------INTERFACE-------
    this.connect = function(){
        connect();
    }

    this.close = function() {
        close();
    };

    this.on = function(event, fct){
        events["on" + event] = fct;
    }
};



module.exports = WebsocketManager; 