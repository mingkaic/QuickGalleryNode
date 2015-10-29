(function() {
    angular
    .module('QG', ['angularFileUpload'])
    .controller('masterController', ["$scope", "$http", 'FileUploader', function($scope, $http, FileUploader) {
        $scope.uploader = new FileUploader();

        $scope.ImageFiles = [];
        Array.prototype.indexOfDupName = function(compareName) {
        	for (var i = 0; i < this.length; i++)
        		if (typeof this[i].filename !== "undefined" && this[i].filename === compareName)
        			return i;
        	return -1;
        };

        $scope.image = null;
        $scope.imageFileName = '';

        // socket
        var socket = io.connect();

        socket.on('connect', function() {
            console.log('found server');

            socket.on('imageDownload', function(file) {
                if (file.contentType.indexOf("image") > -1 && $scope.ImageFiles.indexOfDupName(file.filename) < 0) {
                    $scope.ImageFiles.push(file);
                    $scope.$apply();
                }
            });

            // upload to server
            $scope.imageUpload = function(imageItem) {
                var file = {
                    "filename": imageItem._file.name,
                    "contentType": imageItem._file.type,
                    "aliases": imageItem.alias
                };

                var stream = ss.createStream();
                ss(socket).emit('imageUpload', stream, file);
                ss.createBlobReadStream(imageItem._file).pipe(stream); // reading from a File object

                stream.on('finish', function() {
                    console.log('file '+file.filename+'sent to server');
                    imageItem.remove();
                });

                // unelegant
                /*
                var read = new FileReader();
                read.readAsDataURL(imageItem._file);
                read.onloadend = function(){
                    file.data = read.result;
                    $scope.ImageFiles.push(file);
                    $scope.$apply();

                    imageItem.remove();
                };*/
            };

            $scope.deleteThis = function(imagefile) {
                console.log(imagefile);
                socket.emit('deleteFile', imagefile);
                var index = $scope.ImageFiles.indexOfDupName(imagefile.filename);
                if (index > -1)
                    $scope.ImageFiles.splice(index, 1);
            };

            $scope.imageUploadQueue = function() {
                $scope.uploader.queue.forEach(function (imageItem) {
                    $scope.imageUpload(imageItem);
                });
            };
        });
    }]);
})();

// blocking on client side. consider using parallel.js