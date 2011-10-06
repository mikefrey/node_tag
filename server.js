

var express = require('express'),
    app = express.createServer(),
    io = require('socket.io');

// set the view engine
app.set('view engine', 'utml');

app.configure(function(){
  app.use(express.static(__dirname + '/js'));
  app.use(express.static(__dirname + '/css'));
});

app.get('/', function(req, res){
    res.render('index', {
    	locals : { 
	    	pageTitle : "Multiplayer with Socket.IO and Node",
	  		msg : "Adding layouts to the mix now since it seems they are included by default.",
	  		req : req
		}
    });
});

// start listening on the specified port
app.listen(8000);





var EVENT = {
	CONNECT : 1,
	DISCONNECT : 0,
	UPDATE : 2
};

var clientState = {};

var socket = io.listen(app);
socket.on('connection', function(client){
	
	// send the new client a state update for all the current clients 
	for (var i = 0, l = socket.clients.length; i < l; i++) {
		var c = socket.clients[i];
		if (c.connected) {
			client.send({ 
				c: c.sessionId, 
				ev: EVENT.UPDATE, 
				s: clientState[c.sessionId] 
			});
		}
	}
	
	// tell the other clients that a new client has connected
	client.broadcast({ c:client.sessionId, ev:EVENT.CONNECT });
	
	// setup the message event for the new client
	client.on('message', function(message){
		// just pass the message on to all the other clients
		client.broadcast({
			c: client.sessionId,
			ev: EVENT.UPDATE,
			s: message
		});
		clientState[client.sessionId] = message;
	});
	
	// setup the disconnect event for the new client
	client.on('disconnect', function(){
		client.broadcast({ c:client.sessionId, ev:EVENT.DISCONNECT });
	});
});


