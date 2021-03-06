const axios = require('axios');
const WebsocketManager = require('./WebsocketManager');

var LayoutTaskCalculator = function(axiosSPOIn){
    var axiosSPO = axiosSPOIn;
    var websocketManager;
    var workspaceId;
    var canceled = false;
    var layoutTaskId; 
    var websocketConnection = false;
    var events = {
        "onstart" : function(){return false;},
        "onprogress" : function(){return false;},
        "onfinish" : function(){return false;},
        "oncanceled" : function(){return false;},
        "onfailed" : function(){return false;},
        "onerror" : function(){return false;}
    }    

    //----------FUNCTIONS---------
    function extractIdFromHref(href){
        let arr = href.split("/"); //extracts "id=1250FD-84..." from ".../layoutTasks/id=1250FD-84..."
        return arr[arr.length - 1].split("=")[1]; //extracts "1250FD-84..." from "id=1250FD-84..."
    }
    
    function calculateLayoutTask(layoutTask){
        //prepare websocket events
        websocketManager.on("message", function(msg){
            if(canceled) return;
            var messageType = Object.keys(msg)[0];
            switch(messageType){
                case "resourceCreationNotification-Root":
                    if(extractIdFromHref(msg[messageType].href) === layoutTaskId){
                        events.onprogress(workspaceId, "new");
                    }
                    break;       

                case "resourceStateChangeNotification-Root":
                    if(extractIdFromHref(msg[messageType].href) === layoutTaskId){
                        let state = msg[messageType].newState;
                        events.onprogress(workspaceId, state);
                        if(state === "SUCCESS") events.onfinish(workspaceId, "finished", layoutTaskId);
                        if(state === "FAILURE") events.onfailed(workspaceId, "failed", layoutTaskId);
                        if(state === "CANCELED"){
                            canceled = true;
                            events.oncanceled(workspaceId, "canceled", layoutTaskId);
                        }
                        //if(state === "RUNNING") //nada
                    }
                    break;

                case "layoutTaskRoundCompleteNotification-Root":
                    if(extractIdFromHref(msg[messageType].layoutTaskHref) === layoutTaskId){
                        events.onprogress(workspaceId, (msg[messageType].progress*100) + "%");
                    }            
                    break;

                case "resourceUpdateNotification-Root":
                    if(extractIdFromHref(msg[messageType].href) === layoutTaskId){
                        events.oncanceled(workspaceId, "canceled", layoutTaskId);
                    }else{
                        console.log("other resourceUpdateNotification LT ID:");
                        console.log(msg);
                    }
                    break;

                default:
                    console.error("Unknown SPO websocket message type '" + messageType + "'");
                    break;
            }

        });

        //start calculation
        axiosSPO({
            method: 'POST',
            url: 'api/rest/workspaces/id=' + workspaceId + '/layoutTasks',
            data: layoutTask
        })
        .then(res => {
            layoutTaskId = extractIdFromHref(res.headers.location); //extract LayoutTaskID
        })
        .catch(err=> {
            events.onerror(workspaceId, err.message, layoutTaskId);
        })
    }



    //----------CONSTRUCTOR---------
    //create websocket connection
    websocketManager = new WebsocketManager();
    websocketManager.on("open", function(){websocketConnection = true;});
    websocketManager.on("close", function(){websocketConnection = false;});    
    websocketManager.on("error", function(){websocketConnection = false;});
    websocketManager.connect();


    //----------INTERFACE---------
    this.calculate = function(binderySignatures, workspaceIdIn){
        canceled = false;
        workspaceId = workspaceIdIn;

        //create LayoutTask
        var layoutTask = {
            "layoutTasks-Root" : {
                "layoutTask" : {
                    "label" : "Multiple LayoutTasks Service",
                    "parameters" : {
                        "binderySignatures" : binderySignatures
                    }
                }
            }
        };

        calculateLayoutTask(layoutTask, workspaceId);
    }

    this.cancel = function(){
        var layoutTask = {
            "layoutTasks-Root" : {
                "layoutTask" : {
                    "id" : layoutTaskId,
                    "state" : "CANCELED"
                }
            }
        };
        //start calculation
        axiosSPO({
            method: 'PUT',
            url: 'api/rest/workspaces/id=' + workspaceId + '/layoutTasks/ids=' + layoutTaskId,
            data: layoutTask
        })
        .then(() => {
        })
        .catch(err=> {
            console.log("Layout Task " + layoutTaskId + " could not be canceled.");
        })
        .finally(()=>{
            canceled = true;
            events.oncanceled(workspaceId, "canceled", layoutTaskId);
        })
    }

    this.getError = function(workspaceId, layoutTaskId){
        return(
                axiosSPO({
                method: 'GET',
                url: 'api/rest/workspaces/id=' + workspaceId + '/layoutTasks/id=' + layoutTaskId + '/exceptionInfo',
            })  
        );
    }

    this.on = function(event, fct){
        var key = "on" + event;
        if(!events.hasOwnProperty(key)) throw new Error("Wrong event key: " + event);
        events[key] = fct;
    }
}

module.exports = LayoutTaskCalculator;