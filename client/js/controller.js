(function() {
    angular
    .module('QG', ['angularFileUpload'])
    .controller('masterController', ["$scope", "$http", 'FileUploader', function($scope, $http, FileUploader) {
        $scope.uploader = new FileUploader();

        $scope.Images = [];

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
                        $scope.Images.push(file.dataURL());
                        $scope.$apply();
                    }
                });

                // upload to server
                $scope.imageUpload = function(imageItem) {
                    var file = imageItem._file;
                    delivery.send(file);
                    imageItem.remove();
                };

                $scope.imageUploadQueue = function() {
                    while (0 < $scope.uploader.queue.length) {
                        $scope.imageUpload($scope.uploader.queue[0]);
                    }
                }
            });
        });
    }]);
})();

// blocking on client side. consider using parallel.js