// standard variables
var express = require('express'),
	http = require('http'),
	path = require('path'),
	socketIo = require('socket.io');

var logger = require('morgan');

// dealing with http
var bodyParser = require('body-parser');

// dealing with streams
var base64 = require('base64-stream');
var concatStream = require('concat-stream');
var socketStream = require('socket.io-stream');

// express server setup
var app = express();
var server = http.createServer(app);

// send client
app.use(express.static(path.resolve(__dirname, 'client')));

var sockets = module.exports.socketList = [];

// uses sockets for emitting deletion notifications
var dbServices = require('./db/robust_db_layer.js');

// middleware setup
app.use(logger('short'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/token_get', function(req, res) {
	var token = req.body.token;
	var received_data = req.body.data;
	dbServices.getDataByToken(token, function(extracted_data) {
		if (null == extracted_data) {
			dbServices.createToken(function(token) {
				dbServices.setTokenWithData(token, received_data);
				res.json({token: token, data: received_data});
			});
		} else {
			res.json({token: token, data: extracted_data});
		}
	});
});

app.post('/token_post', function(req, res) {
	var token = req.body.token;
	var received_data = req.body.data;
	
	var postCb = function(token) {
		console.log(received_data);
		dbServices.setTokenWithData(token, received_data);
		res.json(null);
	};

	dbServices.getDataByToken(token, function(extracted_data) {
		console.log(extracted_data);
		if (null == extracted_data) dbServices.createToken(postCb);
		else postCb(token);
	});
});

// socket setup
var io = socketIo(server);
io.on('connection', function (socket) {
	console.log('got a client');
	sockets.push(socket);

	// client download: read files to string here then emit
	function sendImage(file) {
		if (file.contentType.indexOf('image') > -1) {
			var instream = dbServices.fileRead(file._id); // get directly from mongo
			var stringStream = concatStream({ encoding: "string" }, function(imageData) { // imageData is a string
				sockets.forEach(function(eachSocket) {
					eachSocket.emit('imageDownload', {
						id: file._id,
						filename: file.filename,
						dataURL: 'data:'+file.contentType+';base64,'+imageData,
						contentType: file.contentType,
						metadata: file.metadata
					});
				});
			});

			instream.pipe(base64.encode()).pipe(stringStream); // ensure base64 encoding first
		}
	}

	// client upload: socket stream for direct access with mongo server
	socketStream(socket).on('imageUpload', function(instream, file) {
		dbServices.fileWrite(file, instream, function(err, id) { 
			if (!err) {
				file._id = id;
				sendImage(file);
			}
		});
	});

	// populate client with images
	dbServices.fileGet(function(imagefiles) {
		imagefiles.forEach(function(file) {
			sendImage(file);
		});
	});

	socket.on('deleteFile', function(imageId) {
		// remove from mongo);
		dbServices.fileDelete({_id: imageId});
	});

	socket.on('disconnect', function (msg) {
		console.log('lost connection to a client?');
		var index = sockets.indexOf(socket);
		sockets.splice(index, 1);
	});
});

// user information
app.post('/userVerify', function(req, res) {
	var user = req.body;
	dbServices.userExists({'email': user.email}, user.password, function(username) {
		res.json(username);
	});
});

app.post('/userSave', function(req, res) {
	var user = req.body;
	dbServices.userSave({username: user.username, password: user.password, email: user.email}, function(success) {
		res.json(success);
	});
});

app.post('/userDelete', function(req, res) {
	var user = req.body;
	dbServices.userDelete({'email': user.email}, user.password, function(removed) {
		res.json(removed);
	});
});

// listen
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
	var addr = server.address();
	console.log("Server listening at ", addr.address + ":" + addr.port);
});