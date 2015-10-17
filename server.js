// standard variables
var express = require('express');
var http = require('http');
var socketio = require('socket.io');

var path = require('path');
// var async = require('async');

// file serving
var fs = require('fs');

var router = express();
var server = http.createServer(router);
//var io = socketio.listen(server);

var bodyParser = require('body-parser');
router.use(bodyParser.json());

// send client
router.use(express.static(path.resolve(__dirname, 'client')));

var sockets = [];
var users = ['micky mouse', 'daphne duck', 'howard the cat'];
/*
// socket connection
io.on('connection', function (socket) {
  // connected
  console.log('ready');
  socket.emit('server ready');
  
  sockets.push(socket);
  
  // disconnect handler
  socket.on('disconnect', function () {
    sockets.splice(sockets.indexOf(socket), 1); // remove from socket array
    // handle data
  });

  // additional calls
  socket.on('identify', function(name) {
    console.log(name);
    users.push(name);
  });
  
});*/

var method = function (something) {
  console.log(something);
  something = something.body;
  console.log(something);
};

// RESTful HTTP connection
router.get('/images', function(req, res, next) {
  console.log("requested");
  // get images
  fs.readFile('test.png', function(err, data) {
    var new64 = new Buffer(data).toString('base64');
    res.json('data:image/png;base64,'+new64); // serialize for consumption
  });
});

router.get('/users', function(req, res, next) {
  // pass back user names
  res.json(users);
});

router.post('/', function(req, res, next) {
  method(req);
  return res.json(null);
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at ", addr.address + ":" + addr.port);
});
