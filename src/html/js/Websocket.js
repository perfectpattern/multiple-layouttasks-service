function Websocket(url){
    //--------VARIABLES---------
    var connection;

    //--------EVENTS---------
    var events = {
        "message" : function(msg){return false;},
        "error" : function(err){return false;},
        "closed" : function(){return false;},
        "opened" : function(){return false;}
    };


    //--------FUNCTIONS---------
    function connect(){
        connection = new WebSocket(url);

        // When the connection is open, send some data to the server
        connection.onopen = function () {
            connection.send('ping'); // Send the message 'Ping' to the server
            console.log("WebSocket connection established.");
            events.opened();
        };
        
        // Log errors
        connection.onerror = function (error) {
            console.log("WebSocket connection error.");
            console.log(error);
            events.error(error);
            setTimeout(function(){connect()}, 1000);
        };
    
        connection.onclose = function(event) {
            console.log("WebSocket connection lost.");
            events.closed();
            setTimeout(function(){connect()}, 1000);
        };
    
        // Log messages from the server
        connection.onmessage = function (msg) {
            try{
                var parsedMsg = JSON.parse(msg.data);
                switch(msg.code){
                    case 1:
                        msgBar.info("Job received", 1000);
                        break;
    
                    default: 
                        break;
                }
    
                events.message(parsedMsg);
            }
            catch(e){
                console.error("Websocket message.data could not be parsed:");
                console.log(msg.data);
                console.log(data);
            }
        };
    }

    //--------CONSTRUCTOR---------
    connect();


    //--------INTERFACE---------
    this.on = function(event, fct){
        events[event] = fct;
    }
}