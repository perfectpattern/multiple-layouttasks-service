function Websocket(url){
    //--------VARIABLES---------


    //--------EVENTS---------
    var events = {
        "message" : function(msg){
            return false;
        },
        "error" : function(err){
            return false;
        }        
    };


    //--------FUNCTIONS---------


    //--------CONSTRUCTOR---------
    var connection = new WebSocket(url);

    // When the connection is open, send some data to the server
    connection.onopen = function () {
        connection.send('ping'); // Send the message 'Ping' to the server
    };
    
    // Log errors
    connection.onerror = function (error) {
        console.log('WebSocket Error:');
        console.log(error);
        alert("Please reload page!");
        events.error(error);
    };
    
    // Log messages from the server
    connection.onmessage = function (msg) {
        try{
            var parsedMsg = JSON.parse(msg.data);
            //console.log(parsedMsg);
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


    //--------INTERFACE---------
    this.on = function(event, fct){
        events[event] = fct;
    }
}