var fs = require("fs");
var mongo = require("mongodb");
var Grid = require("gridfs-stream");

var mongoUrl = process.env.MONGOLAB_URI || 'mongodb://mkaichen-node_quick_gallery-2012840/uploadfiles' || 'mongodb://localhost/uploadfiles';

module.exports.init = function(callback) {
	mongo.MongoClient.connect(mongoUrl, function(err, db) {
		if (err) throw err;

		var gridfs = Grid(db, mongo);

		// streaming to gridfs
		module.exports.writeToMongo = function (filename, instream) {
			if (typeof instream === "undefined")
				instream = fs.createReadStream("uploads/"+filename);
			
			var gridwritestream = gridfs.createWriteStream({ filename: filename });
			instream.pipe(gridwritestream);
			
			instream.on('error', function(err) { throw err; })
			gridwritestream.on('finish', function() {
				console.log('done writing to mongo');
			});
		};

		// streaming from gridfs
		module.exports.readingFromMongo = function (filename, outstream) {
			if (typeof outstream === "undefined")
				outstream = fs.createWriteStream("uploads/"+filename);
			
			var gridreadstream = gridfs.createReadStream({ filename: filename });
			gridreadstream.pipe(outstream);
			
			gridreadstream.on('error', function(err) { throw err; });
			outstream.on('finish', function() {
				console.log('done reading from mongo');
			});
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