//--------VARIABLES---------
var spoerror = false;
var workspaces = new Workspaces();



//--------EVENTS---------
//Define target custom websocket events (websocket is already fully initialized)
websocket.on("message", function(msg){
    console.log(msg);
    switch(msg.code){
        case 1:
            getJobInfos();
            break;

        default: 
            break;
    }
});

workspaces.on("loading", function(workspaces){
    $('#workspaces').removeClass("error").removeClass("loaded").addClass("loading").html("loading...");
    $('#title-workspaces span').html();
});

workspaces.on("loaded", function(workspaces, updated){
    if(spoerror === true) msgBar.hide();
    spoerror = false;
    console.log(workspaces);
    $('#workspaces').removeClass("error").removeClass("loading").addClass("loaded").html("loaded...");
    $('#title-workspaces span').html("[" + (lan== "de" ? "aktualisiert" : "updated") + ": " + updated + "]");
});

workspaces.on("error", function(err){
    spoerror = true;
    $('#workspaces').removeClass("loading").removeClass("loaded").addClass("error").html("error...");
    $('#title-workspaces span').html();
    msgBar.error((lan == "de" ? "Keine Verbindung zu sPrint One" : "No connection to sPrint One") + "(" + err.status + ": " + err.statusText + ").");
});

$('#reload').click(function(){
    workspaces.load();
});


//--------FUNCTIONS---------
//get job infos, if received by PIB Flow
function getJobInfos(){
    $.get('/jobInfos')
    .then(meta => {
        console.log(meta);
        if(meta.entries > 0){
            $('#job').html("Job '" + meta.jobname + "' empfangen (" + meta.entries + " Bindery Signatures).");
        }
        
        else{
            $('#job').html(lan == "de" ? "Kein Job empfangen." : "No job received.");
        }
    })
}



//--------START---------

getJobInfos(); //inital check, if a job was already received on page load

workspaces.load(); //load workspaces