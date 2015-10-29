var fs = require("fs");
var mongo = require("mongodb");
var Grid = require("gridfs-stream");
var stream = require('stream');

var mongoUrl = process.env.MONGOLAB_URI || 'mongodb://mkaichen-node_quick_gallery-2012840/uploadfiles' || 'mongodb://localhost/uploadfiles';

module.exports.init = function(callback) {
	mongo.MongoClient.connect(mongoUrl, function(err, db) {
		if (err) throw err;

		var gridfs = Grid(db, mongo);

		// streaming to gridfs
		module.exports.writeToMongo = function (options, instream, cb) {
			var gridwritestream = gridfs.createWriteStream(options);
			instream.on('error', function(err) { throw err; });
			gridwritestream.on('finish', function() {
				console.log('done writing to mongo');
				if (typeof cb === "function") cb();
			});
			
			instream.pipe(gridwritestream);
		};

		// streaming from gridfs
		module.exports.readFromMongo = function (filename, cb) {
			var gridReadStream = gridfs.createReadStream({ filename: filename });
			gridReadStream.on('error', function(err) { throw err; });
			gridReadStream.on('close'||'end', function() {
				console.log('done reading from mongo');
				if (typeof cb === "function") cb();
			});
			
			return gridReadStream;
		};

		// delete from gridfs
		module.exports.deleteFromMongo = function (filename) {
			gridfs.remove({ filename: filename }, function (err) {
				if (err) console.log(err);
				else console.log('success');
			});
		};

		module.exports.existsInMongo = function (cb, options) {
			gridfs.exists(options, function(err, found) {
				if (err) console.log(err);
				cb(found);
			})
		}

		// get metainfo from gridfs
		module.exports.getFilesFromMongo = function (cb, options) {
			if (typeof options === "undefined")
				options = {}; // get all files

			gridfs.files.find(options).toArray(function(err, files) {
				if (err) console.log(err);
				cb(files);
			});
		};

		callback();
	});
}