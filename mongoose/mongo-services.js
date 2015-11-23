var mongoose = require('mongoose');
var sockets = require('../server').socketList;

// use sparingly
// useful for preventing changes to externally passed objects (e.g. options)
// from being viewed from the outside
function clone(obj) {
	var copy;

	// Handle the 3 simple types, and null or undefined
	if (null == obj || "object" != typeof obj) return obj;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Array
	if (obj instanceof Array) {
		copy = [];
		for (var i = 0, len = obj.length; i < len; i++) {
			copy[i] = clone(obj[i]);
		}
		return copy;
	}

	// Handle Object
	if (obj instanceof Object) {
		copy = {};
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
		}
		return copy;
	}
	
	return obj;
}

var dbNom ='userImages';
var mongoURL = process.env.MONGOLAB_URI || 'mongodb://mkaichen-node_quick_gallery-2012840/'+dbNom || 'mongodb://localhost/'+dbNom;
var conn = mongoose.connection;

function attemptConnection(callback) {
	mongoose.connect(mongoURL, function(err) {
		if (err) callback(false);
		else callback(true);
	});
}

function closeOrError() {
	console.log('an error has occurred. attempting to reconnect');
	var incrementingTimer = 10; // starts at 10 seconds maxes at 120 seconds
	var interval = setInterval(function() {
		console.log('attempting reconnection: '+incrementingTimer);
		attemptConnection(function(connected) {
			if (true == connected) 
				interval.clearInterval();
		});
		if (incrementingTimer < 120) {
			incrementingTimer += 10;
		}
	}, incrementingTimer*1000);
}

attemptConnection(function(connected) {
	if (false == connected) 
		closeOrError();
});

conn.on('close', function() { // error or otherwise
	console.log('mongoose offline');
	closeOrError();
});

conn.once('open', function () {
	var user = require('./user-services');
	var grid = require('./grid-services');
	
	console.log('mongoose online');

	module.exports.userSave = user.save;
	module.exports.userExists = function(options, password, callback) {
		user.exists(options, password, function(foundUser) {
			var pack = foundUser ? foundUser.username : false;
			callback(pack);
		});
	};
	module.exports.userDelete = user.delete;

	// options must not be used afterwards
	module.exports.fileWrite = function(options, instream, callback) {
		var docId = mongoose.Types.ObjectId();
		var username = options.metadata? options.metadata.uploader: null;
		// this function must not leave mongo-service
		user.idFromUsername(username, function(id) {
			var myOptions = clone(options);
			myOptions._id = docId;
			if (myOptions.contentType) {
				myOptions.content_type = myOptions.contentType;
				delete myOptions.contentType;
			}
			if (id) myOptions.metadata.uploader = id;
			else if (myOptions.metadata) delete myOptions.metadata.uploader;

			grid.write(myOptions, instream, function(err) {
				callback(err, docId);
			});
		});
	};
	module.exports.fileRead = grid.read;
	module.exports.fileDelete = function(options) { // inject file handling callback
		if (options.filename) return; // never delete by filename
		grid.delete(options, function(file) {
			if (file) {
				file.id = file._id;
				delete file._id;
				sockets.forEach(function(socket) {
					socket.emit('notifyDeletion', file); // notify all clients that the following files are deleted
				});
			}
		});
	};
	module.exports.fileExists = grid.exists;
	module.exports.fileGet = grid.info;
});