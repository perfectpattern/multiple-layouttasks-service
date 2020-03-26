var CalculationTracker = function(){
    var href = null;


        
    function interpretSPOwebsocketMessage(msg){
        switch(Object.keys(msg)[0]){

        }
    }

    this.trackHref = function(href){

    }

    this.on = function(event, fct){
        events[event] = fct;
    }

    this.newMessage = function(msg){

    }
}

module.exports  = CalculationTracker;