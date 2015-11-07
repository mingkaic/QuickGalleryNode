// standard variables
var express = require('express');
var http = require('http');
var path = require('path');
var socketIo = require('socket.io');

// dealing with http
var bodyParser = require('body-parser');

// dealing with streams
var base64 = require('base64-stream');
var concatStream = require('concat-stream');
var socketStream = require('socket.io-stream');

// express server setup
var router = express();
var server = http.createServer(router);

var sockets = module.exports.socketList = [];

var mongoServices = require('./mongoose/mongo-services');

// send client
router.use(express.static(path.resolve(__dirname, 'client')));

// socket setup
var io = socketIo(server);
io.on('connection', function (socket) {
	console.log('got a client');
	sockets.push(socket);

	// client download: read files to string here then emit
	function sendImage(file) {
		if (file.contentType.indexOf('image') > -1) {
			var instream = mongoServices.fileRead(file._id); // get directly from mongo
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
		mongoServices.fileWrite(file, instream, function(err, id) { 
			if (!err) {
				file._id = id;
				sendImage(file);
			}
		});
	});

	// populate client with images
	mongoServices.fileGet(function(imagefiles) {
		imagefiles.forEach(function(file) {
			sendImage(file);
		});
	});

	socket.on('deleteFile', function(imageId) {
		// remove from mongo);
		mongoServices.fileDelete({_id: imageId});
	});

	socket.on('disconnect', function (msg) {
		console.log('lost connection to a client?');
		var index = sockets.indexOf(socket);
		sockets.splice(index, 1);
	});
});

router.use(bodyParser.json());

router.post('/userVerify', function(req, res) {
	var user = req.body;
	mongoServices.userExists({'email': user.email}, user.password, function(username) {
		res.json(username);
	});
});

router.post('/userSave', function(req, res) {
	var user = req.body;
	mongoServices.userSave({username: user.username, password: user.password, email: user.email}, function(success) {
		res.json(success);
	});
});

router.post('/userDelete', function(req, res) {
	var user = req.body;
	mongoServices.userDelete({'email': user.email}, user.password, function(removed) {
		res.json(removed);
	});
});

// listen
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
	var addr = server.address();
	console.log("Server listening at ", addr.address + ":" + addr.port);
});