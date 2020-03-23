//--------VARIABLES---------
var spoerror = false;
var workspaces = new Workspaces();
var listWorkspaces;
var selectedWorkspaces = {};



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
    $('#title-workspaces span').html();
});

workspaces.on("loaded", function(workspaces, updated){
    let wsKeys = [];

    workspaces.forEach(ws => {  //add to list of not yet in list
        wsKeys.push(ws.id);
        if(!selectedWorkspaces.hasOwnProperty(ws.id)) selectedWorkspaces[ws.id] = false; 
    });

    Object.keys(selectedWorkspaces).forEach(id => { //delete obsolete entries (if id in selectedWorksapaces that is not in workspaces)
        if(!wsKeys.includes(id)) delete selectedWorkspaces[id];
    });

    if(spoerror === true) msgBar.hide();
    spoerror = false;
    console.log(workspaces);
    $('#title-workspaces span').html("[" + (lan== "de" ? "aktualisiert" : "updated") + ": " + updated + "]");
    listWorkspaces.setData(workspaces);
});

workspaces.on("error", function(err){
    spoerror = true;
    $('#title-workspaces span').html();
    msgBar.error((lan == "de" ? "Keine Verbindung zu sPrint One" : "No connection to sPrint One") + "(" + err.status + ": " + err.statusText + ").");
    listWorkspaces.setError();
});


//----------BUTTONS--------
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
listWorkspaces = new MyDataTable(
    $('#workspaces'), //parent wrapper element
    [
        {
            label : (lan == "de" ? "Bezeichnung" : "Label"),
            key : "label",
            type: "ORDER",
            sortAs : "STRING",
            align : "left",
            initWidth : "33%"
        },       
        {
            label : "Id",
            key : "id",
            type: "STRING",
            sortAs : "STRING",
            align : "left",
            initWidth : "33%"
        },       
        {
            label : (lan == "de" ? "Benutzen" : "Use"),
            key : null,
            type: "BUTTON",
            sortAs : "STRING",
            align : "right",
            initWidth : "33%",
            setContent : function(td){
                var dataIndex = td.parent().attr("dataIndex");
                var thisDataEntry = listWorkspaces.getDataEntry(dataIndex);
                var thisId = thisDataEntry.id;
                var selected = selectedWorkspaces[thisId];
                var checkbox = $('<input ' + (selected ? "checked " : "") + 'type="checkbox" class="selected" id="' + thisId + '" name="' + thisId + '"><label for="' + thisId + '"></label>');
                td.append(checkbox);
                
                checkbox.change(function() {
                    selectedWorkspaces[this.id] = this.checked;
                    console.log(selectedWorkspaces);
                    Cookie.Create("selectedWorkspaces", JSON.stringify(selectedWorkspaces), 100);
                });
            }
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

if(Cookie.Read("selectedWorkspaces")){
    selectedWorkspaces = JSON.parse(Cookie.Read("selectedWorkspaces"));
    console.log(selectedWorkspaces);
}

getJobInfos(); //inital check, if a job was already received on page load

workspaces.load(); //load workspaces