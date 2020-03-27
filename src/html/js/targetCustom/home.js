//--------VARIABLES---------
var spoerror = false;
var workspaces = new Workspaces();
var myDataTable_workspaces;
var freezeUI = false;



//--------EVENTS---------
//Define target custom websocket events (websocket is already fully initialized)
websocket.on("message", function(msg){
    switch(msg.code){
        case "websocketRegistered":
            //ping;
            break;

        case "statusChanged": 
            getStatus();
            break;

        case "jobReceived":
            getStatus();
            getJobInfos();
            break;

        case "workspaceStatusUpdate":
            getStatus();
            workspaces.load();
            break;    

        case "layoutTaskStatusUpdate":
            getStatus();
            workspaces.load();
            break;    

        case "calculationStarted":
            getStatus();
            workspaces.load();
            break;

        case "calculationCanceled":
            workspaces.load();
            setUI("canceled");
            break; 

        case "calculationFailed":
            workspaces.load();
            getStatus();
            break;           

        case "calculationFinished":
            workspaces.load();
            setUI("finished");
            break;   

        default: 
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

//--------FUNCTIONS---------
function setStatusClass(name){
    $('#calcStatus').removeAttr("class").attr("class", name);
}

function setUI(status){
    switch(status){
        case "readyForCalculation":
            setStatusClass(status);
            $('#calcStatus').html(lan == "de" ? "bereit" : "ready");
            $('#cancel').addClass("inactive");
            $('#start').removeClass("inactive");
            break;

        case "notReadyForCalculation":
            setStatusClass(status);
            $('#calcStatus').html(lan == "de" ? "warte auf Input" : "waiting for input");
            $('#start').addClass("inactive");
            $('#cancel').addClass("inactive");
            break;

        case "calculating":
            setStatusClass(status);
            $('#calcStatus').html(lan == "de" ? "berechnet..." : "calculating...");
            $('#start').addClass("inactive");
            $('#cancel').addClass("inactive");
            break;

        case "canceled":
            setStatusClass(status);
            $('#calcStatus').html(lan == "de" ? "abgebrochen" : "canceled");
            $('#start').removeClass("inactive");
            $('#cancel').addClass("inactive");
            setTimeout(function(){ getStatus() },1000);
            break;

        case "finished":
            setStatusClass(status);
            $('#calcStatus').html(lan == "de" ? "fertig" : "finished");
            $('#start').removeClass("inactive");
            $('#cancel').addClass("inactive");
            setTimeout(function(){ getStatus() },1000);       
            break;
    }
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
        $('#job').append('<p class="title">' + (lan == "de" ? "Kein Job empfangen." : "No job received.") + '</p>');
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
            key : 'status',
            type: "STRING",
            sortAs : "STRING",
            align : "right",
            initWidth : "25%"
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
getStatus();
workspaces.load(); //load workspaces