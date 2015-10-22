var fs = require('fs');

var images = [];

// file name of all uploaded so far images
fs.readdir('uploads', function(err, files) {
	if (err)
		console.log(err);
	else
		images = files;
});