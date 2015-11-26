var crypto = require('crypto');
var redis = require('redis');

var client = null;

// redistogo connection
if (process.env.REDISTOGO_URL) {
	var rtg   = require("url").parse(process.env.REDISTOGO_URL);
	client = redis.createClient(rtg.port, rtg.hostname);
	client.auth(rtg.auth.split(":")[1]);
} else {
    client = redis.createClient();
}

client.on('error', function(err) {
	console.log(err);
});

function handleError(err, callback) {
	console.log(err);
	if (typeof callback === "function") callback(null);
}

var TOKEN_LENGTH = 256;
var TIME_TO_LIVE = 14400; // 4 hours

client.on('connect', function() {
	console.log('redis connected');

	module.exports.createToken = function(callback) {
		crypto.randomBytes(TOKEN_LENGTH, function(err, token) {
			if (err || null == token) handleError(err || 'Problem when generating token', callback);
			else callback(token.toString('hex'));
		});
	};

	module.exports.setTokenWithData = function(token, data, ttl, callback) {
		data = data || {};
		ttl = ttl || TIME_TO_LIVE;
		callback = callback || function() {};

		// insane sanity check
		var err = null;
		if (token == null) err = 'Token is null';
		if (typeof data !== 'object') err = 'data is not an Object';
		if (typeof ttl !== 'number') err = 'ttl is not a Number';
		if (err) return handleError(err, callback);

		data._ts = new Date();
		
		console.log(data);

		client.set(token, JSON.stringify(data), function(err, reply) {
			if (err || null == reply) {
				handleError(err || 'Token not set in redis', callback);
			} else {
				client.expire(token, ttl, function(err, reply) {
					if (err || null == reply) handleError(err ||'Expiration not set on redis' , callback);
					else callback(true);
				});
			}
		});
	};

	var getData = module.exports.getDataByToken = function(token, callback) {
		if (null == token) return handleError('Token is null', callback);

		client.get(token, function(err, userData) {
			if (err || null == userData) handleError(err || 'Token Not Found', callback);
			else callback(JSON.parse(userData));
		});
	};
});