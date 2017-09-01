//require our websocket library 
var WebSocketServer = require('ws').Server;

//creating a websocket server at port 9090 
var wss = new WebSocketServer({port: 9090});

//all connected to the server users
var users = {};


//when a user connects to our sever 
wss.on('connection', function(connection) {
    console.log("user connected");

    connection.on('message', function(message){
        var data;

        //accepting only JSON messages
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        //switching type of the user message
        switch (data.type) {
            //when a user tries to login
            case "login":
                console.log("User logged:", data.name);

                //if anyone is logged in with this username then refuse
                if(users[data.name]) {
                    sendTo(connection, {
                        type: "login",
                        success: false
                    });
                } else {
                    //save user connection on the server
                    users[data.name] = connection;
                    connection.name = data.name;

                    sendTo(connection, {
                        type: "login",
                        success: true
                    });

                }
                break;
            case "offer":
                //for ex. UserA wants to call UserB
                console.log("Sending offer to: " + data.name);
                //if UserB exists then send him offer details
                let conn_sending_offer_to = users[data.name];
                if(conn_sending_offer_to != null) {
                    //setting that UserA connected with UserB
                    connection.otherName = data.name;
                    sendTo(conn_sending_offer_to,{
                        type: "offer",
                        offer: data.offer,
                        name: connection.name
                    });
                }
                break;
            case "answer":
                console.log("Sending answer to: ", data.name);
                //for ex. UserB answers UserA
                let conn_sending_answer_to = users[data.name];
                if(conn_sending_answer_to != null) {
                    connection.otherName = data.name;
                    sendTo(conn_sending_answer_to, {
                        type: "answer",
                        answer: data.answer
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidate to:",data.name);
                let conn_sending_candidate_to = users[data.name];

                if(conn_sending_candidate_to != null) {
                    sendTo(conn_sending_candidate_to, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }

                break;
            case "leave":
                console.log("Disconnecting from", data.name);
                let conn_leave_to = users[data.name];
                conn_leave_to.otherName = null;

                //notify the other user so he can disconnect his peer connection
                if(conn_leave_to != null) {
                    sendTo(conn_leave_to, {
                        type: "leave"
                    });
                }

                break;
            default:
                sendTo(connection, {
                    type: "error",
                    message: "Command no found: " + data.type
                });

                break;
        }

    });

    connection.send("Hello from server");

    connection.on("close", function() {
        if(connection.name) {
            delete users[connection.name];

            if(connection.otherName) {
                console.log("Disconnecting from ", connection.otherName);
                let conn = users[connection.otherName];
                conn.otherName = null;

                if(conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
            }
        }
    });
});

function sendTo(connection, message) {
    connection.send(JSON.stringify(message));
}