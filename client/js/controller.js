(function() {
    angular
    .module('QG', ['angularFileUpload'])
    .controller('masterController', ["$scope", "$http", 'FileUploader', function($scope, $http, FileUploader) {
        $scope.uploader = new FileUploader();

        $scope.ImageFiles = [];

        $scope.image = null;
        $scope.imageFileName = '';

        // socket
        var socket = io.connect();

        socket.on('connect', function() {
            console.log('found server');

            var delivery = new Delivery(socket);

            delivery.on('delivery.connect',function(delivery){
                // request download for Images from server
                delivery.on('receive.start',function(fileUID){
                    console.log('receiving a file!');
                });

                // populate images
                delivery.on('receive.success',function(file){
                    if (file.isImage()) {
                        $scope.ImageFiles.push(file);
                        $scope.$apply();
                    }
                });

                // upload to server
                $scope.imageUpload = function(imageItem) {
                    delivery.send(imageItem._file);
                    imageItem.remove();
                };
                
                $scope.deleteThis = function(imagefile) {
                    socket.emit('deleteFile', {name: imagefile.name});
                    var index = $scope.ImageFiles.indexOf(imagefile);
                    if (index > -1)
                        $scope.ImageFiles.splice(index, 1);
                };
                
                // multiple deliveries must be spawned (but can't because delivery is singleton)
                // ISSUE: delivery.send may block other deliveries from sending as all process are done on a single thread resulting in no uploads
                $scope.imageUploadQueue = function() {
                    if ($scope.uploader.queue.length > 0) {
                        var imageItem = $scope.uploader.queue[0];
                        $scope.imageUpload(imageItem);
                        delivery.on('send.success', $scope.imageUploadQueue); // recurse
                    }
                }
            });
        });
    }]);
})();

// blocking on client side. consider using parallel.js