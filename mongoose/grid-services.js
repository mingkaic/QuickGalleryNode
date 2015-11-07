var mongoose = require('mongoose');
var grid_stream = require('gridfs-stream');

var grid = grid_stream(mongoose.connection.db, mongoose.mongo);

// creates write stream to gridstore
// inject metadata and other info via options
module.exports.write = function (options, instream, callback) {
	var grid_streamwritestream = grid.createWriteStream(options);
	instream.on('error', function(err) { callback(err) });
	grid_streamwritestream.on('finish', function(err) {
		if (typeof callback === "function") callback(err);
	});

	instream.pipe(grid_streamwritestream);
};

module.exports.read = function (id, callback) {
	var grid_streamReadStream = grid.createReadStream({ _id: id });
	grid_streamReadStream.on('error', function(err) { console.log(err); });
	grid_streamReadStream.on('close'||'end', function() {
		if (typeof callback === "function") callback();
	});

	return grid_streamReadStream;
};

// assert: options has id
// callback null if error, false if not found, file if found
function directDelete(options, callback) {
	options._id = mongoose.Types.ObjectId(options._id);
	grid.findOne(options, function(err, file) {
		if (err) {
			console.log(err);
			callback(null);
		} else if (file) {
			grid.remove(options, function(err) {
				if (err) return callback(err);
				callback(file);
			});
		} else callback(false);
	});
}

module.exports.delete = function (options, callback) {
	if (!options._id) { // _id is the only unique field
		listFiles(function(files) {
			if (Array.isArray(files)) {
				files.forEach(function(file){
					directDelete({_id: file._id}, callback);
				});
			} else callback(files); // error
		}, options);
	} else {
		directDelete(options, callback);
	}
};

module.exports.exists = function (options, callback) {
	grid.exist(options, function(err, found) {
		if (err) return console.log(err);
		callback(found);
	});
};

// optional options, but NOT callback callback
var listFiles = module.exports.info = function (callback, options) {
	options = options || {}; // find all
	grid.files.find(options).toArray(function(err, files) {
		if (err) return callback(err);
		callback(files);
	});
};