var express = require('express');
var router = express();

// file serving and processing
var fs = require('fs');
var mmm = require('mmmagic');

// json and file parser middleware
var bodyParser = require('body-parser');
var multipart = require('connect-multiparty');

router.use(bodyParser.json());

// reusable mime type detector
var magicType = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

router.get('/images', function(req, res, next) {
	var url = 'test.png';

	// determine mime type for proper transfer
	magicType.detectFile(url, function(err, result) {
		if (err) throw err;

		// get images and encode
		fs.readFile(url, function(err, data) {
			if (err) throw err;

			var new64 = new Buffer(data).toString('base64'); // encode into base64
			// serialize for consumption (using url as quick unique file identifier)
			res.json(url+'-data:'+result+';base64,'+new64);
		});
	});
});

// XMLHttpRequest (still unidirectional... consider revise to socket)
var multipartMiddleware = multipart();
router.post('/images', multipartMiddleware, function(req, res) {
	var fname = req.files.file.originalFilename;
	var fInPath = req.files.file.path;
	var fOutPath = 'uploads/'+fname;
	
	// guarantee proper file typing (no tiffs or jpegs)
	
	
	// file checking done! start writing
	fs.createReadStream(fInPath).pipe(fs.createWriteStream(fOutPath));

	res.json(null);
});

module.exports(router);