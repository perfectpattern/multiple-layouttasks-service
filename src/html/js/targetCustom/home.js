//--------VARIABLES---------
var spoerror = false;
var workspaces = new Workspaces();
var myDataTable_workspaces;
var freezeUI = false;



//--------EVENTS---------
//Define target custom websocket events (websocket is already fully initialized)
websocket.on("message", function(msg){
    getStatus();
    switch(msg.code){
        case "PIBconnection":
            msgBar.clear("error");
            break;

        case "noPIBconnection":
            msgBar.error("Keine Verbindung zu PIB Flow!");
            break;

        case "websocketRegistered":
            break;

        case "statusChanged": 
            break;

        case "jobReceived":
            getJobInfos();
            setEvent("jobreceived");
            break;

        case "calculationStarted":
            setEvent("started");
            break;

        case "calculationFailed":
            setEvent("failed");
            break;

        case "calculationFinished":
            setEvent("finished");
            break;

        case "calculationCanceled":
            setEvent("canceled");
            break;            

        default: //"layoutTaskStatusUpdate", "workspaceStatusUpdate"
            workspaces.load();
            break;   
    }
});

workspaces.on("loading", function(workspaces){
    $('#title-workspaces span').html();
});

workspaces.on("loaded", function(response, wsData){
    if(spoerror === true) msgBar.hide();
    spoerror = false;
    freezeUI = response.calcInProgress;
    $('#title-workspaces span').html("[" + (lan== "de" ? "aktualisiert" : "updated") + ": " + (response.updated == null ? "-" : new Date(response.updated).toLocaleString()) + "]");
    myDataTable_workspaces.setData(wsData);
});

workspaces.on("error", function(err){
    spoerror = true;
    $('#title-workspaces span').html();
    msgBar.error((lan == "de" ? "Keine Verbindung zu sPrint One" : "No connection to sPrint One") + "(" + err.status + ": " + err.statusText + ").");
    myDataTable_workspaces.setError();
});


//----------BUTTONS--------
$('#update').click(function(){
    workspaces.update().then(()=>{})
    .catch((e)=>{alert(e.responseText);})
});

$('#start').click(function(){
    $.get('/SPO/start').then(()=>{})
    .catch((e)=>{alert(e.responseText);})
});

$('#cancel').click(function(){
    $.get('/SPO/cancel').then(()=>{})
    .catch((e)=>{alert(e.responseText);})
});

$('#reset').click(function(){
    if(confirm("Wirklich alles komplett zurücksetzen?")){
        $.get('/reset').then(()=>{})
        .then(()=>{
            getStatus();
            getJobInfos();
            workspaces.load();
        })
        .catch((e)=>{
            alert(e.responseText);
        })
    }
});

//--------FUNCTIONS---------
function setUI(status){

    $('#calcStatus').removeAttr("class").attr("class", "tag " + status);

    switch(status){
        case "readyForCalculation":
            $('#calcStatus').html(lan == "de" ? "bereit" : "ready");
            $('#cancel').addClass("inactive");
            $('#update').removeClass("inactive");
            $('#start').removeClass("inactive");
            break;

        case "notReadyForCalculation":
            $('#calcStatus').html(lan == "de" ? "warte auf Input" : "waiting for input");
            $('#start').addClass("inactive");
            $('#cancel').addClass("inactive");
            $('#update').removeClass("inactive");
            break;

        case "calculating":
            $('#calcStatus').html(lan == "de" ? "berechnet..." : "calculating...");
            $('#start').addClass("inactive");
            $('#cancel').removeClass("inactive");
            $('#update').addClass("inactive");
            break;

        default:
            console.log("Wrong status '" + status + "'!");
            break;
    }
}

function setEvent(event){
    $('#calcEvent').removeAttr("class").attr("class", "tag " + event);
    $('#calcEvent').show();
    switch(event){
        case "jobreceived":
            $('#calcEvent').html(lan == "de" ? "Job empfangen" : "job received");
            break;

        case "started":
            $('#calcEvent').html(lan == "de" ? "gestartet" : "started");
            break;         

        case "finished":
            $('#calcEvent').html(lan == "de" ? "beendet" : "finished");
            break;
        
        case "canceled":
            $('#calcEvent').html(lan == "de" ? "abgebrochen" : "canceled");
            break;

        case "failed":
            $('#calcEvent').html(lan == "de" ? "fehlgeschlagen" : "failed");
            break;
        
        default:
            break;
    }
    setTimeout(function(){$('#calcEvent').hide();}, 3000)
}

function setJob(meta){
    if(meta.entries > 0){
        $('#job').empty();
        //$('#job').html("Job '" + meta.jobname + "' empfangen (" + meta.entries + " Bindery Signatures).");

        $('#job').append('<p class="title">Name:</p>');
        $('#job').append('<p class="value">' + meta.jobname + '</p>');
        $('#job').append('<p class="title">' + (lan == "de" ? "Empfangen" : "Received") + ':</p>');
        $('#job').append('<p class="value">' + new Date(meta.receivedOn).toLocaleString() + '</p>');
        $('#job').append('<p class="title">' + (lan == "de" ? "Einträge" : "Entries") + ':</p>');
        $('#job').append('<p class="value">' + meta.entries + '</p>');        
    }
    
    else{
        $('#job').html('<p class="title">' + (lan == "de" ? "Kein Job empfangen." : "No job received.") + '</p>');
    }    
}

//get job infos, if received by PIB Flow
function getJobInfos(){
    $.get('/jobInfos')
    .then(meta => {
        setJob(meta);
    })
    .catch(err => {
        console.log(err);
    });
}

function getStatus(){
    $.get('/status')
    .then(status => {
        setUI(status.status);
    })
    .catch(err => {
        console.log(err);
    });
}

//--------START---------
websocket.on("closed", function(){
    msgBar.error("Websocketverbindung verloren. Neu verbinden...");
});

websocket.on("opened", function(){
    msgBar.clear("error");
    msgBar.info("Websocketverbindung hergestellt.", 2000);
    getJobInfos(); //inital check, if a job was already received on page load
    workspaces.load(); //load workspaces
    getStatus();
});

myDataTable_workspaces = new MyDataTable(
    $('#workspaces'), //parent wrapper element
    [
        {
            label : (lan == "de" ? "Bezeichnung" : "Label"),
            key : "label",
            type: "ORDER",
            sortAs : "STRING",
            align : "left",
            initWidth : "25%"
        },       
        {
            label : "Id",
            key : "id",
            type: "STRING",
            sortAs : "STRING",
            align : "left",
            initWidth : "25%"
        },       
        {
            label : (lan == "de" ? "Aktiv" : "Active"),
            key : null,
            type: "BUTTON",
            sortAs : "STRING",
            align : "right",
            initWidth : "25%",
            setContent : function(td){
                var dataIndex = td.parent().attr("dataIndex");
                var workspace = myDataTable_workspaces.getDataEntry(dataIndex);
                var checkbox = $('<input ' + (workspace.selected ? "checked " : "") + 'type="checkbox" class="selected" id="' + workspace.id + '" name="' + workspace.id + '"><label for="' + workspace.id + '"></label>');
                td.append(checkbox);
                
                checkbox.change(function(event) {
                    $.post( "/SPO/setWorkspace", { id: this.id, selected: this.checked })
                    .done(function( response ) {})
                    .fail(function(err){
                        $(this).prop('checked', !$(this).prop('checked'));
                        event.preventDefault();
                        alert(err.responseText);
                    });
                });
            }
        },
        {
            label : (lan == "de" ? "Berechnung" : "Calculation"),
            key : null,
            type: "STRING",
            sortAs : "STRING",
            align : "right",
            initWidth : "25%",
            setContent : function(td, dataEntry){
                switch(dataEntry.status){
                    case "failed": case "not sent": case "error":
                        var span = $('<span class="clickable failed">' + dataEntry.status + '</span>');
                        td.append(span);
                        span.attr("errMsg", dataEntry.errorMsg);
                        span.click(function(){
                            alert($(this).attr("errMsg"));
                        })
                        break;

                    default:
                        td.html(dataEntry.status);
                        break;
                }
            }
        }                                  
    ],
    {
        height: "150px",
        width: "100%",
        minWidth : "400px",
        sorting : {
            colIndex : 0,
            ascending : true
        },
        selectable : false
    }
);

getJobInfos(); //inital check, if a job was already received on page load
workspaces.load(); //load workspaces
getStatus();