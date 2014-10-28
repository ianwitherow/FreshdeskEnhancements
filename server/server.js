var settings = require("./settings.json");
var port = +settings.port;
var io = require('socket.io').listen(port);
var users = [];
var nextId = 0;
var chatHistory = [];

//Add the 'everyone' user
users.push( { name: 'Everyone', avatar: 'http://i.imgur.com/03727FO.png' } );

io.sockets.on('connection', function(socket) {
	var user = new User(nextId++);
	socket.on('register', function(userInfo) {
		if (!userInfo.name) return;
		user.name = userInfo.name;
		user.path = userInfo.path;
		user.avatar = userInfo.avatar;
		users.push(user);
		console.log("Registered " + user.name + " with id: " + user.id);
		socket.broadcast.emit("users", users);
		socket.emit("users", users);
		var userChatHistory = chatHistory.filter(function(chat) {
			return chat.to == user.name || chat.to == "Everyone" || chat.from == user.name;
		});
		socket.emit("messageCatchup", userChatHistory);
	});

	socket.on('disconnect', function() {
		console.log(user.name + ' disconnected');
		users = users.removeAt("id", user.id);
		socket.broadcast.emit("users", users);
	});

	socket.on("hashchange", function(info) {
		user.path = info.path;
		console.log(user.name + ' is now at ' + user.path);
		//tell people where everyone is at yo
		socket.broadcast.emit("users", users);
		socket.emit("users", users);
	});
	socket.on("getUsers", function() {
		console.log("Sending user list to " + user.name);
		socket.emit("users", users);
	});
	socket.on("sendMessage", function(msg) {
		msg.sentTime = new Date();
		chatHistory.push(msg);
		if (chatHistory.length > 100) {
			//Don't want this getting unruly; cut off the first message
			chatHistory = chatHistory.splice(1, chatHistory.length);
		}
		console.log(msg);
		socket.emit("sendMessage",  msg);
		socket.broadcast.emit("sendMessage",  msg);
	});
});

console.log("Listening on port " + port);


function User(id) {
	this.id = id;
}


/* With an array of objects, this lets you specify a key/value to look for and remove the object from the array */
Array.prototype.removeAt = function(property, value) {
	for (var i = 0; i < this.length; i++) {
		if (this[i][property] == value) {
			this.splice(i, 1);
			return this;
		}
	}
	return this;
}

