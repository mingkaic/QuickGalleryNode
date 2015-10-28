// standard variables
var express = require('express');
var http = require('http');
var path = require('path');
var socket = require('socket.io');

// dealing with files
var delivery = require('delivery');
var fs = require('fs');

// express server setup
var router = express();
var server = http.createServer(router);

var mongoServices = require('./mongo-services');

// send client
router.use(express.static(path.resolve(__dirname, 'client')));

// image names
var images = [];

// mongo client initial connection
try {
	mongoServices.init(function() {
		fs.readdir('uploads', function(err, fileNames) {
			if (err) throw err;
			images.concat(fileNames);
		});
		
		mongoServices.getFilesFromMongo(function(files) {
			files.forEach(function(file) {
				if (images.indexOf(file.filename) < 0) {
					images.push(file.filename);
					mongoServices.readingFromMongo(file.filename); // download from mongo here
				}
			}); // get all files in images
		});
	});
} catch (err) {
	console.log(err);
	console.log('WARNING: mongo unavailable');
}

// socket setup
var io = socket(server);
io.on('connection', function (socket) {
	console.log('got a client?'); // which client?

	var deliverable = delivery.listen(socket);

	// downloading images to client
	deliverable.on('delivery.connect',function(deliverable){
		for (var i = 0; i < images.length; i++) {
			deliverable.send({
				name: images[i],
				path: 'uploads/'+images[i]
			});
		}
	});

	deliverable.on('send.success',function(file){
		console.log('File successfully sent to client!'); // which file?
	});

	// uploading  from client
	deliverable.on('receive.success',function(file){
		if (images.indexOf(file.name) < 0) { // avoid dups
			fs.writeFile('uploads/'+file.name, file.buffer, function(err){
				if(err) console.log('File could not be saved.');

				console.log('File saved.');

				images.push(file.name);
				deliverable.send({
					name: file.name,
					path: 'uploads/'+file.name
				});
				
				try {
					mongoServices.writeToMongo(file.name);
				} catch(err) {
					console.log(err);
				}
			});
		}
	});

	socket.on('deleteFile', function(data) {
		console.log('trying to delete '+data.name);
		// clear from images
		var index = images.indexOf(data.name);
		if (index > -1)
			images.splice(index, 1);
			
		// remove from buffer directory
		fs.unlink('uploads/'+data.name, function(err) {
			if (err) console.log(err);
		});
		// remove from mongo
		mongoServices.deleteFromMongo(data.name);
	})

    socket.on('disconnect', function (msg) {
    	console.log('lost connection to a client?'); // to fix: which client?
    });
});

// listen
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
	var addr = server.address();
	console.log("Server listening at ", addr.address + ":" + addr.port);
});