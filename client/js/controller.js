(function() {

Object.extend = function(destination, source) {
	if (typeof destination !== "object" || typeof source !== "object")
		return null;
	for (var property in source) {
		if (source[property] && typeof source[property] === "object") {
			if (null == destination[property]) destination[property] = {};
			Object.extend(destination[property], source[property]);
		} else {
			destination[property] = source[property];
		}
	}
	return destination;
};

var persistent_data = function() {
	var instance;
	
	function createInstance(http, service) {
		var token = service.get('session-token');
		
		// remember last session's persistent_data
		http.post('token_get', {token: token, data: persistent_data})
		.then(function(response) {
			if (response) {
				var sessionPair = response.data;
				console.log("original token: ",sessionPair.token, " original data: ", sessionPair.data);
				console.log("RECEIVED: ",sessionPair.data);
				service.set('session-token', sessionPair.token);
				Object.extend(instance, sessionPair.data);
				updateUser(false, http, service);
			} 
		});
		
		function updateUser(remember) {
			if (remember) {
				var token = service.get('session-token');
				console.log("sending token: ",token, " sending data: ", instance);
				http.post('/token_post', {token: token, data: instance});
			}

			var signin = $('.signin');
			var signout = $('.signout');
			console.log(instance.user.username);
			if (instance.user.username) {
				signout.show();
				signin.hide();
			} else {
				signin.show();
				signout.hide();
			}
		}
		var object = {
			user: {
				username: null, email: null,
				disable: function() {
					this.username = null;
					updateUser(true);
				},
				addUser: function(username, email, remember) {
					this.username = username;
					this.email = email;
					updateUser(remember);
				}
			},
			viewableImages: function() {
				var unique_map = {};
				
				var pub = {
					images: [],
					insert: insert, 
					remove:remove
				};
			
				function insert(imageFile) {
					var key = imageFile.id;
					if (key) {
						unique_map[key] = imageFile;
						pub.images.push(imageFile);
					}
				}
			
				function remove(imageFile) {
					var key = imageFile.id;
					if (key) {
						delete unique_map[key];
						pub.images = $.map(unique_map, function(value, index) {
							return [value];
						});
					}
				}
			
				return pub;
			}()
		};
		return object;
	}
	
	return {
        getInstance: function (http, service) {
            if (null == instance) instance = createInstance(http, service);
            return instance;
        }
	};
}();

$('.signout').hide();

// uses: upload, dialog, tabs
var app = angular.module('QG', ['angularFileUpload', 'ngDialog', 'ui.bootstrap', 'LocalStorageModule']);

app.config(function (localStorageServiceProvider) {
	localStorageServiceProvider
		.setPrefix('QG_') // avoid overwriting existing localstorage variables by prefixing with QG_
		.setStorageType('sessionStorage') // set to sessionStorage (per window and non-persistent)
		.setStorageCookie(30, '/')
		.setStorageCookieDomain(Window.location)
		.setNotify(true, true);
});

function changeStorageType(type) {
	app.config(function (localStorageServiceProvider) {
		localStorageServiceProvider.setStorageType(type);
	});
}

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

app.controller('loginDialogController',
['$scope', '$http', 'localStorageService', function($scope, $http, localStorageService) {
	var curUser = persistent_data.getInstance($http, localStorageService).user;

	$scope.user = {remember: true};

	$scope.verify = function() {
		$http.post('/userVerify', {
			email: $scope.user.email,
			password: $scope.user.password
		})
		.then(function(response) {
			var userPack = response.data;
			var msg = '';
			if (userPack) {
				curUser.addUser(userPack, $scope.user.email, $scope.user.remember);
				$scope.closeThisDialog();
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
					curUser.addUser($scope.user.username, $scope.user.email, true);
					$scope.closeThisDialog();
				}
			} else {
				console.log('server error, try again later');
			}
		});
	};
}]);

app.controller('userDialogController', ['$scope', '$http', 'localStorageService',
function($scope, $http, localStorageService) {
	
	var curUser = $scope.currentUser = persistent_data.getInstance($http, localStorageService).user;
	$scope.delete = false;
	$scope.password = "";

	$scope.modifyUser = function() {

	};

	$scope.deleteConfirm = function() {
		$http.post('/userDelete', { email: persistent_data.user.email, password: $scope.password })
		.then(function(response) {
			var success = response.data;
			console.log(success);
			if (success) {
				$scope.closeThisDialog();
				curUser.disable();
			}
		});
	};
}]);

app.controller('masterController',
["$scope", "$http", 'FileUploader', 'ngDialog', 'localStorageService', 
function($scope, $http, FileUploader, ngDialog, localStorageService) {
	if (false == localStorageService.isSupported) {
		console.log('session storage is not supported. using local instead');
		changeStorageType('localStorage');
	}
	
	var g_data = persistent_data.getInstance($http, localStorageService); // initialize singleton
	
	$scope.currentUser = g_data.user;
	$scope.ImageFiles = g_data.viewableImages;

	$scope.signOut = function() {
		g_data.user.disable();
	};

	$scope.openLoginDialog = function() {
		ngDialog.open({
			template: '../dialogTemplates/loginDialogTemplate.html',
			controller: 'loginDialogController'
		});
	};

	$scope.openUserDialog = function() {
		ngDialog.open({
		   template: '../dialogTemplates/userDialogTemplate.html',
		   controller: 'userDialogController'
		});
	};

	$scope.uploader = new FileUploader();

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
			$scope.ImageFiles.remove(file);
			$scope.$apply();
		});

		// upload to server
		$scope.imageUpload = function(imageItem) {
			var file = {
				"filename": imageItem._file.name,
				"contentType": imageItem._file.type
			};

			if (null != g_data.user.username) {
				file.metadata = {uploader: g_data.user.username};
			}

			var stream = ss.createStream();
			ss(socket).emit('imageUpload', stream, file);
			ss.createBlobReadStream(imageItem._file).pipe(stream); // reading from a File object

			stream.on('finish', function() {
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