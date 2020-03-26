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
            //prepare data for MyDataTable
            var wsData = [];
            Object.keys(response.data).forEach(wsId => {
                wsData.push({
                    "id" : wsId, 
                    "label" : response.data[wsId].label, 
                    "selected" : response.data[wsId].selected,
                    "status" : response.data[wsId].status
                })
            });
            events.loaded(response, wsData);
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

    this.update = function(){
        $.get('/SPO/updateWorkspaces')
        .then(() => { load(); })
        .catch(()=> { events.error(err); })
    }

    this.on = function(event, fct){
        events[event] = fct;
    }
}