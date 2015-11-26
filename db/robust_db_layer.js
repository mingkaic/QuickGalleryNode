var mongoService = require('./mongoose/mongo-services.js');
var redisService = require('./redis/redis-services.js');

var mongoMethods = ['userSave', 'userExists', 'userDelete', 'fileWrite', 'fileRead', 'fileDelete', 'fileExists', 'fileGet'];
var redisMethods = ['getDataByToken', 'setTokenWithData', 'createToken'];

serviceToMethods(mongoService, mongoMethods);
serviceToMethods(redisService, redisMethods);

function serviceToMethods(service, method_set) {
	method_set.forEach(function(method) {
		module.exports[method] = function() {
			if (service[method]) {
				return service[method].apply(null, arguments);
			} else {
				var incrementingTimer = 10; // starts at 10 seconds maxes at 120 seconds
				var interval = setInterval(function() {
					if (service[method]) {
						clearInterval(interval);
						return service[method].apply(null, arguments);
					}
					console.log(method, " not available right now.");
					console.log("will proceed to execute once available.. waiting: ", incrementingTimer);
					if (incrementingTimer < 120) {
						incrementingTimer += 10;
					}
				}, incrementingTimer*1000);
			}
		};
	});
}