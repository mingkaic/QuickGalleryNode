// standard variables
var express = require('express');
var http = require('http');
var path = require('path');
var socket = require('socket.io');
var sstream = require('socket.io-stream');

// file serving
var fs = require('fs');

// express server setup
var router = express();
var server = http.createServer(router);

// send client
router.use(express.static(path.resolve(__dirname, 'client')));

// image objects
var images = require('./imageCenter').getInstance().peek();

// socket setup
var io = socket(server);
io.on('connection', function (socket) {
	console.log('got a client?'); // which client?
	
	for (var imageIndex = 0; imageIndex < images.length; imageIndex++) {
		// streaming documents one at a time to client
		var imageStream = sstream.createStream(); // new stream
		sstream(socket).emit('uImages', imageStream);
		
		var imgObj = images[imageIndex];
		
		imageStream.push(imgObj.url+'-data:'+imgObj.type+';base64,');
		
		// base64 stream!!! <<
		fs.createReadStream('uploads/'+imgObj.url).pipe(imageStream);
	}

	socket.emit('news', { hello: 'world' });
	
	// getting streamed doc from client
	sstream(socket).on('foo', function(stream) {
		stream.pipe(fs.createWriteStream('foo.txt'));
	});
	
	socket.on('my other event', function (data) {
		console.log(data);
	});
  
    socket.on('disconnect', function (msg) {
    	console.log('lost connection to a client?'); // to fix: which client?
    });
});

// RESTful HTTP connections: great for single files, terrible for multi
var rest = require('./rest');
router.use(rest);

// listen
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
	var addr = server.address();
	console.log("Server listening at ", addr.address + ":" + addr.port);
});