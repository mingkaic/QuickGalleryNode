var crypto = require('crypto');
var redis = require('redis');
var session = require('express-session');

var redisStore = require('connect-redis')(session);

var client = redis.createClient();

module.exports.store = new redisStore({ host: 'localhost', port: 6379, client: client });

function handleError(err, callback) {
	console.log(err);
	callback(null);
}

// http://www.kdelemme.com/2014/08/16/token-based-authentication-with-nodejs-redis/
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

	var tokenize = module.exports.extractTokenFromHeader = function(headers) {
		if (null == headers) return console.log('Header is null');
		if (null == headers.authorization) return console.log('Authorization header is null');

		var authArr = headers.authorization.split(' ');
		if (authArr.length != 2) return console.log('Authorization header value is not of length 2');

		// retrieve token
		var token = authArr[1];
		if (token.length != TOKEN_LENGTH * 2) return console.log('Token length is not the expected one');

		return token;
	};

	module.exports.verify = function(req, res, next) {
		var headers = req.headers;
		if (headers == null) return res.send(401);

		var token = tokenize(headers);
		if (null == token) {
			console.log('token is null');
			return res.send(401);
		}

		//Verify it in redis, set data in req._user
		getData(token, function(err, data) {
			if (err) res.send(401);
			else req._user = data;
			next();
		});
	};

	var getData = module.exports.getDataByToken = function(token, callback) {
		if (null == token) return handleError('Token is null', callback);

		client.get(token, function(err, userData) {
			if (err || null == userData) handleError(err || 'Token Not Found', callback);
			else callback(JSON.parse(userData));
		});
	};

	module.exports.expireToken = function(headers, callback) {
		if (headers == null) callback(new Error('Headers are null'));
		var token = tokenize(headers);
		if (token == null) callback(new Error('Token is null'));

		client.del(token, callback);
	};

/*
	// string
	client.set('framework', 'AngularJS', function(err, reply) {
		if (err) console.log(err);
		else console.log(reply);
	});

	client.get('framework', function(err, reply) {
		if (err) console.log(err);
		else console.log(reply);
	});

	// objects
	client.hmset('frameworks', {
		'javascript': 'AngularJS',
		'css': 'Bootstrap',
		'node': 'Express'
	}, function(err, reply) {
		if (err) console.log(err);
		else console.log(reply);
	});

	client.hgetall('frameworks', function(err, object) {
		if (err) console.log(err);
		else console.log(object);
	});

/*
	client.rpush(['frameworks', 'angularjs', 'backbone'], function(err, reply) {
		if (err) console.log(err);
		console.log(reply); //prints 2
	});

	client.lrange('frameworks', 0, -1, function(err, reply) {
		if (err) console.log(err);
		console.log(reply); // ['angularjs', 'backbone']
	});

	client.sadd(['tags', 'angularjs', 'backbonejs', 'emberjs'], function(err, reply) {
		console.log(reply); // 3
	});

	client.smembers('tags', function(err, reply) {
		console.log(reply);
	});

	client.exists('key', function(err, reply) {
		if (reply === 1) {
			console.log('exists');
		} else {
			console.log('doesn\'t exist');
		}
	});

	client.del('frameworks', function(err, reply) {
		console.log(reply);
	});

	client.set('key1', 'val1');
	client.expire('key1', 30);

	client.set('key1', 10, function() {
		client.incr('key1', function(err, reply) {
			console.log(reply); // 11
		});
	});*/
});