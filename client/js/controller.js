(function() {

var currentUser = {};
var viewableImages = function() {
	var map = {};
	var pack = {
		images: [],
		insert: function(file) {
			if (Array.isArray(file)) {
				file.forEach(function(f) {
					insertOne(f);
				});
			} else {
				insertOne(file);
			}
		},
		remove: function(file) {
			if (Array.isArray(file)) {
				file.forEach(function(f) {
					removeOne(f);
				});
			} else {
				removeOne(file);
			}
		}
	};

	function insertOne(imageFile) {
		var key = imageFile.id;
		if (key) {
			map[key] = imageFile;
			pack.images.push(imageFile);
		}
	}

	function removeOne(imageFile) {
		var key = imageFile.id;
		if (!key && typeof imageFile === 'string') {
			key = imageFile;
		}
		if (key) {
			delete map[key];
			pack.images = $.map(map, function(value, index) {
				return [value];
			});
		}
	}

	return pack;
}();

$('.signout').hide();

function clearUser() {
	for (var attrib in currentUser) {
		delete currentUser[attrib];
	}
}

function updateUser() {
	var signin = $('.signin');
	var signout = $('.signout');
	if (currentUser.username) {
		signout.show();
		signin.hide();
	} else {
		signin.show();
		signout.hide();
	}
}

// uses: upload, dialog, tabs
var app = angular.module('QG', ['angularFileUpload', 'ngDialog', 'ui.bootstrap']);

// password and confirm password field comparison during registration
app.directive('compareTo', [function () {
	return {
		require: 'ngModel',
		scope: {
			otherModelValue: "=compareTo"
		},
		link: function(scope, element, attributes, ngModel) {
			ngModel.$validators.compareTo = function(modelValue) {
				return modelValue == scope.otherModelValue;
			};

			scope.$watch("otherModelValue", function() {
				ngModel.$validate();
			});
		}
	};
}]);

app.controller('loginDialogController', ['$scope', '$http', function($scope, $http) {
	console.log('loginDialog loaded!');

	$scope.user = {};

	$scope.verify = function() {
		console.log('attempting to login');
		$http.post('/userVerify', { 
			email: $scope.user.email,
			password: $scope.user.password
		})
		.then(function(response) {
			var userPack = response.data;
			var msg = '';
			if (userPack) {
				currentUser.username = userPack;
				currentUser.email = $scope.user.email;
				$scope.closeThisDialog();
				updateUser();
			} else {
				if (null === userPack)
					msg = 'server error, try again later';
				else
					msg = 'username and password are incorrect';
				console.log(msg);
			}
		});
	};

	$scope.register = function() {
		console.log('attempting to register');
		$http.post('/userSave', {
			username: $scope.user.username, 
			email: $scope.user.email, 
			password: $scope.user.password 
		})
		.then(function(response) {
			var issues = response.data;
			if (issues) {
				if (issues.length > 0) {
					console.log(issues);
				} else {
					currentUser.username = $scope.user.username;
					currentUser.email = $scope.user.email;
					$scope.closeThisDialog();
					updateUser();
				}
			} else {
				console.log('server error, try again later');
			}
		});
	};
}]);

app.controller('userDialogController', ['$scope', '$http', function($scope, $http) {
   console.log('userDialog loaded!');
   $scope.currentUser = currentUser;
   $scope.delete = false;
   $scope.password = "";

   $scope.modifyUser = function() {

   };

   $scope.deleteConfirm = function() {
	   console.log('trying to delete user');
	   $http.post('/userDelete', { email: currentUser.email, password: $scope.password })
	   .then(function(response) {
		   var success = response.data;
		   console.log(success);
		   if (success) {
			   $scope.closeThisDialog();
			   clearUser();
			   updateUser();
		   }
	   });
   };
}]);

app.controller('masterController', 
["$scope", "$http", 'FileUploader', 'ngDialog', function($scope, $http, FileUploader, ngDialog) {

	$scope.currentUser = currentUser;

	$scope.openLoginDialog = function() {
		console.log('opening login dialog!');
		ngDialog.open({
			template: '../dialogTemplates/loginDialogTemplate.html',
			controller: 'loginDialogController'
		});
	};

	$scope.signOut = function() {
		clearUser();
		updateUser();
	};

	$scope.openUserDialog = function() {
		// verify is logged in
		if (null == currentUser) return;

		ngDialog.open({
		   template: '../dialogTemplates/userDialogTemplate.html',
		   controller: 'userDialogController'
		});
	};

	$scope.uploader = new FileUploader();

	$scope.ImageFiles = viewableImages;

	$scope.imageFileName = '';

	// socket
	var socket = io.connect();

	socket.on('connect', function() {
		console.log('found server');

		socket.on('imageDownload', function(file) {
			if (file.contentType.indexOf("image") > -1) {
				$scope.ImageFiles.insert(file);
				$scope.$apply();
			}
		});

		socket.on('notifyDeletion', function(file) {
			console.log(file.id, ' deleted:');
			$scope.ImageFiles.remove(file);
			$scope.$apply();
		});

		// upload to server
		$scope.imageUpload = function(imageItem) {
			var file = {
				"filename": imageItem._file.name,
				"contentType": imageItem._file.type
			};

			if (null != currentUser.username) {
				file.metadata = {uploader: currentUser.username};
			}

			var stream = ss.createStream();
			ss(socket).emit('imageUpload', stream, file);
			ss.createBlobReadStream(imageItem._file).pipe(stream); // reading from a File object

			stream.on('finish', function() {
				console.log('file '+file.filename+' sent to server');
				imageItem.remove();
			});
		};

		$scope.deleteFile = function(imagefile) {
			socket.emit('deleteFile', imagefile.id);
		};

		$scope.imageUploadQueue = function() {
			$scope.uploader.queue.forEach(function (imageItem) {
				$scope.imageUpload(imageItem);
			});
		};
	});

}]);

})();

// blocking on client side on socket upload and download. consider using parallel.js