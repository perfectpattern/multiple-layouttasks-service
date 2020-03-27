var Workspaces = function(axiosSPO){
    var workspaces = {};
    var updated = null;
    var events = {
        "onloaded" : function(){return false;},
        "onupdated" : function(){return false;},
        "onerror" : function(){return false;}
    }  

    function load(){
        return new Promise(function(resolve, reject){
            axiosSPO({
                url: 'api/rest/workspaces'
            })
            .then(response => {
                wsIds = [];

                //update or add entry per valid workspace to 'workspaces'
                response.data['workspaces-Root'].workspace.forEach(workspaceIn => {

                    if(workspaceIn.description.indexOf('{MLTS}') > -1){ //only add if fulfills criteria
                        wsIds.push(workspaceIn.id); //collect all active workspace ids
                        
                        if(workspaces.hasOwnProperty(workspaceIn.id)){ //if already in workspaces
                            workspaces[workspaceIn.id].label = workspaceIn.label //only update label
                        }

                        else{ //not yet in workspaces: create new entry
                            workspaces[workspaceIn.id] = {
                                "label" : workspaceIn.label,
                                "selected" : false,
                                "status" : "-"
                            };
                        }
                    }
                });

                //delete obsolete entries
                Object.keys(workspaces).forEach(wsId => {
                    if(!wsIds.includes(wsId)) delete workspaces[wsId];
                });

                //reset updated
                updated = new Date().getTime();
                resolve();
            })

            .catch(err => {
                console.log(err);
                reject();
            })
            .finally(()=> {
                events.onloaded();
                events.onupdated();
            })
        })
    }


    //-------CONSTRUCTOR-------
    load();


    //-------INTERFACE-------
    this.on = function(event, fct){
        events["on" + event] = fct;
    }

    this.getWorkspaces = function(){
        return workspaces;
    }

    this.getUpdated = function(){
        return updated;
    }

    this.getAllData = function(){
        return {
            updated : updated,
            data : workspaces
        }
    }

    this.isReadyForCalculation = function(){
        //returns true if at least one workspace is selected
        //if(Object.keys(workspaces).length === 0) return false;
        for(var i = 0; i < Object.keys(workspaces).length; i++){
            if(workspaces[Object.keys(workspaces)[i]].selected === true) return true;
        }
        return false;
    }

    this.setSelected = function(workspaceId, selected){
        workspaces[workspaceId].selected = selected;
        events.onupdated();
    }

    this.isSelected = function(workspaceId){
        return workspaces[workspaceId].selected;
    }

    this.setStatus = function(workspaceId, status){
        workspaces[workspaceId].status = status;
        events.onupdated();
    }    

    this.hasId = function(workspaceId){
        return workspaces.hasOwnProperty(workspaceId);
    }

    this.getIdList = function(){
        return Object.keys(workspaces);
    }

    this.resetAllWaiting = function(){
        for(var workspaceId in workspaces){
            var workspace = workspaces[workspaceId];
            if(workspace.status == "waiting") workspace.status = "-";
        }
        events.onupdated();
    }

    this.setAllWaiting = function(){
        for(var workspaceId in workspaces)
            if(workspaces[workspaceId].selected) workspaces[workspaceId].status = "waiting";
        events.onupdated();
    }

    this.update = function(){
        return load();
    }
}

module.exports = Workspaces;