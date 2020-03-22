function Workspaces(){
    //--------VARIABLES---------
    var data = [];
    var updated = null;


    //--------EVENTS---------
    var events = {
        "loading" : function(){ return false; },
        "loaded" : function(data){ return false; },
        "error" : function(err){ return false; }
    }


    //--------FUNCTIONS---------
    function load(){
        events.loading();
        data = [];
        $.get('/SPO/getWorkspaces')
        .then(response => {
            response['workspaces-Root'].workspace.forEach(workspace => {
                if(workspace.description.indexOf('{MLTS}') > -1) data.push(workspace);
            });
            updated = new Date().toLocaleString();
            events.loaded(data, updated);
        })
        .catch(err => {
            events.error(err);
        })
    }

    //--------CONSTRUCTOR---------
    //empty


    //--------INTERFACE---------
    this.load = function(){
        load();
    }

    this.on = function(event, fct){
        events[event] = fct;
    }
}