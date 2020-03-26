//--------VARIABLES---------
var spoerror = false;
var workspaces = new Workspaces();
var myDataTable_workspaces;
var freezeUI = false;



//--------EVENTS---------
//Define target custom websocket events (websocket is already fully initialized)
websocket.on("message", function(msg){
    //console.log("WS-Msg: " + msg.message + ".");
    //console.log(msg);
    switch(msg.code){
        case 0:
            //ping;
            break;

        case 1: //received job
            getJobInfos();
            break;

        case 2:  //started calculation
            freezeUI = true;
            break;
            
        case 3: //calculation job status update
            workspaces.load();
            break;    

        case 4: //calculation canceled
            workspaces.load();
            break; 

        case 5: //calculation failed
            break;

        case 6: //calculation finished
            workspaces.load();
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
    $('#title-workspaces span').html("[" + (lan== "de" ? "aktualisiert" : "updated") + ": " + new Date(response.updated).toLocaleString() + "]");
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
    if(freezeUI === true){
        alert(lan == "de" ? "Bitte Berechnung abwarten oder abbrechen." : "Please wait for completion of calculation or cancel.");
        return;
    }
    workspaces.update();
});

$('#start').click(function(){
    $.get('/SPO/start').then(()=>{
        freezeUI = true; 
        setUI("running");
    }).catch((e)=>{console.log(e);})
});

$('#cancel').click(function(){
    $.get('/SPO/cancel').then(()=>{
        freezeUI = false;
        setUI("canceled");
    }).catch((e)=>{console.log(e);})
});

//--------FUNCTIONS---------
function setUI(status){
    switch(status){
        case "ready":
            $('#calcStatus').html().removeClass("running").removeClass("canceled").removeClass("ready");
            break;

        case "running":
            $('#calcStatus').html(lan == "de" ? "läuft..." : "running...").addClass("running").removeClass("canceled").removeClass("ready");
            break;

        case "canceled":
            $('#calcStatus').html(lan == "de" ? "abgebrochen." : "canceled.").addClass("canceled").removeClass("running").removeClass("ready");
            setTimeout(function(){ setUI("ready") },1000);
            break;

        case "finished":
            $('#calcStatus').html(lan == "de" ? "abgebrochen." : "canceled.").removeClass("canceled").removeClass("running").removeClass("ready");
            setTimeout(function(){ setUI("ready") },1000);            
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
                    if(freezeUI === true){
                        
                        $(this).prop('checked', !$(this).prop('checked'));
                        event.preventDefault();
                        alert(lan == "de" ? "Bitte Berechnung abwarten oder abbrechen." : "Please wait for completion of calculation or cancel.");
                        return false;
                    }
                    $.post( "/SPO/setWorkspace", { id: this.id, selected: this.checked })
                    .done(function( response ) {
                        
                    })
                    .fail(function(err){
                        console.log(err);
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
            ascending : false
        },
        selectable : false
    }
);

getJobInfos(); //inital check, if a job was already received on page load

workspaces.load(); //load workspaces