// standard variables
var express = require('express');
var http = require('http');
var path = require('path');
var socketIo = require('socket.io');

// dealing with files and streams
var base64 = require('base64-stream');
var concatStream = require('concat-stream');
var fs = require('fs'); // great for testing streams
var socketStream = require('socket.io-stream');

// express server setup
var router = express();
var server = http.createServer(router);

var mongoServices = require('./mongo-services');

// send client
router.use(express.static(path.resolve(__dirname, 'client')));

// image names
var images = [];
Array.prototype.indexOfDupName = function(compareName) {
	for (var i = 0; i < this.length; i++)
		if (typeof this[i].filename !== "undefined" && this[i].filename === compareName)
			return i;
	return -1;
};

// mongo client initial connection
try {
	mongoServices.init(function() {
		mongoServices.getFilesFromMongo(function(files) {
			console.log(files);
			images = files;
		});
	});
} catch (err) {
	console.log(err);
	console.log('WARNING: mongo unavailable');
}

// socket setup
var io = socketIo(server);
io.on('connection', function (socket) {
	console.log('got a client?'); // which client?

	// socket stream for direct access with mongo server
	socketStream(socket).on('imageUpload', function(instream, file) {
		console.log(file);
		if (images.indexOfDupName(file.filename) < 0) { // avoid dups
			console.log("no dups");
			// save directly to mongo
			try {
				mongoServices.writeToMongo({ "filename": file.filename, "content_type": file.contentType, "aliases": file.aliases }, instream, function() {
					sendImage(file);
				});
			} catch(err) {
				console.log(err);
			}
			
			 images.push(file); // only send files that are images
		}
	});

	// downloading to client using socket emit
	// stream is first encoded into base64 then concatenated into string format (probably easier vice versa...)
	function sendImage(file) {
		if (file.contentType.indexOf('image') > -1) {
	        try { // a lot can go wrong here
				var instream = mongoServices.readFromMongo(file.filename); // get directly from mongo
		        var stringStream = concatStream({ encoding: "string" }, function(imageData) { // imageData is a string
					console.log('sending to client');
					socket.emit('imageDownload', {filename: file.filename, dataURL: 'data:'+file.contentType+';base64,'+imageData, contentType: "image/jpg"});
				});
				
				instream.pipe(base64.encode()).pipe(stringStream); // ensure base64 encoding first
			} catch(err) {
				console.log(err);
			}
		}
	}

	for (var i = 0; i < images.length; i++) {
		sendImage(images[i]); // using uploads buffer directory
	}

	socket.on('deleteFile', function(imageFile) {
		console.log('trying to delete '+imageFile.filename);
		// clear from images
		var index = images.indexOfDupName(imageFile.filename);
		if (index > -1)
			images.splice(index, 1);
		
		// remove from mongo
		mongoServices.deleteFromMongo(imageFile.filename);
	});

    socket.on('disconnect', function (msg) {
    	console.log('lost connection to a client?'); // to fix: which client?
    });
});

// listen
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
	var addr = server.address();
	console.log("Server listening at ", addr.address + ":" + addr.port);
});