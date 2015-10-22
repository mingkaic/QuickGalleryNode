var fs = require('fs');
var mmm = require('mmmagic');

// singleton
var images = (function () {

	var instance = null; // myself
	
	function init() { // private constructor
		// private:
		var imgObjs = []; // currently array of strings, make into image objects later
		
		var magicType = new mmm.Magic(mmm.MAGIC_MIME_TYPE); // reusable type identifier
	
		// file name of all uploaded so far images
		fs.readdir('uploads', function(err, fileNames) {
			if (err) throw err;
			fileNames.forEach(function(fileName) {
				magicType.detectFile('uploads/'+fileName, function(err, type) {
					if (err) throw err;
					imgObjs.push({
						url: fileName,
						type: type	
					});
				});
			});
		});
		
		return {
			// public:
			add: function (newImgUrl, newImgType) {
				imgObjs.push({
					url: newImgUrl,
					type: newImgType
				});
			},
			peek: function () {
				return imgObjs; // do something smart later
			}
		};
	};

	return {
		getInstance: function () {
			if (null === instance )
				instance = init();
			return instance;
		}
	};

})();

module.exports = images;