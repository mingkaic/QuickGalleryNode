(function() {
  angular.module("QG", []).controller("masterController", ["$scope", "$http", function($scope, $http) {
    console.log('controller active');
    
    $scope.imageSrcs = [];
    
    // RESTful consumption
    $http.get('/images').success(function(response) {
      console.log(response);
      // obtain raw image data from response
      if (null !== response) {
        // serve the image
        $scope.imageSrcs.push(response);
      }
    });
    
    /*var socket = io();
    $scope.name = '';
    
    socket.on('connect', function () {
      console.log('connected');
      $scope.setName();
    });

    $scope.setName = function setName() {
      console.log($scope.name);
      socket.emit('identify', $scope.name);
    };*/
  }]);
})();