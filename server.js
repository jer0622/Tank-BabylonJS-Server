const { Socket } = require('dgram');
const express = require('express');
const app = express();
const http = require('http').Server(app); 
const io = require('socket.io')(http, {
    cors: {
        origin: "https://tank-client-babylonjs.herokuapp.com/"
    }
});





// Indicate where static files are located. Without this, no external js file, no css...  
app.use("/", express.static(__dirname));


// Routing
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Icon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(__dirname + "favicon.ico");
});


// Nombres d'update du server par seconde
let nbServerUpdateSeconde = 10;


var nbJoueurConnected = 0;
var playerNames = {};
var listOfPlayers = {};

var listOfPosDepart = [
    {x: 30, y:15, z:0},
    {x: -20, y:15, z:0},
    {x: 20},
    {x: 25}
];

io.on('connection', (socket) => {
    let emitStamp;
    let connectionStamp = Date.now();

    // Pour le ping, mesure de la latence
    setInterval(() => {
        emitStamp = Date.now();
        socket.emit("ping");
    }, 500);


    setInterval(() => {
        io.emit("updatePlayers", listOfPlayers);
    }, 1000 / nbServerUpdateSeconde);


    // Mise à jour des clients
    socket.on("updateClient", (newPos) => {
        listOfPlayers[socket.username] = newPos;
    });


    // Ping
    socket.on("pongo", () => { // "pong" is a reserved event name
        let currentTime = Date.now();
        let timeElapsedSincePing = currentTime - emitStamp;
        let serverTimeElapsedSinceClientConnected = currentTime - connectionStamp;
        socket.emit("data", currentTime, timeElapsedSincePing, serverTimeElapsedSinceClientConnected);
    });


    // Envoie le chat
    socket.on('sendchat', (data) => {
        io.sockets.emit('updatechat', socket.username, data);
    });


    socket.on('adduser', (username) => {
        // we store the username in the socket session for this client
		socket.username = username;

		// add the client's username to the global list
        nbJoueurConnected++;
        playerNames[username] = username;

		// echo to the current client that he is connected
		socket.emit('updatechat', 'SERVER', 'you have connected');

		// echo to all client except current, that a new person has connected
		socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');

		// tell all clients to update the list of users on the GUI
		io.emit('updateusers', playerNames);


		// Crée un nouveau joueur en lui donnant une position suivant le nombre de joueur
		listOfPlayers[username] = listOfPosDepart[nbJoueurConnected-1];
        socket.emit('posDepart', listOfPlayers);
		io.emit('updatePlayers',listOfPlayers);
    });

    // when the user disconnects.. perform this
	socket.on('disconnect', () => {
		// Remove the player
        nbJoueurConnected--;
        delete playerNames[socket.username];

		// update list of users in chat, client-side
		io.emit('updateusers', playerNames);

		// Remove the player too
		delete listOfPlayers[socket.username];		
		io.emit('updatePlayers', listOfPlayers);
		
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
	});
});


// Port pour heroku
let port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Server is running on port " + port);
});