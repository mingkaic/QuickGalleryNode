var user = require('./user-model').user;
var uniques = require('./user-model').uniques;

function handleError(err, callback) {
	console.log(err);
	callback(null);
}

// callback null if error, array otherwise
// OR search for unique fields in options
function matchUsers(options, callback) {
	var orOptions = [];

	for (var i = 0; i < uniques.length; i++) {
		var op = {};
		op[uniques[i]]=options[uniques[i]];
		orOptions.push(op);
	}

	user.find({$or: orOptions}, function(err, foundUsers) {
		if (err) return handleError(err, callback);
		callback(foundUsers);
	});
}

// save allows both update and create. to update, overwrite property must be passed in
// callback null if error, issues array if conflicting uniques, empty array otherwise
// passing in user_options and overwrite (property that's changed) if overwriting
// if no overwrite authority and conflicting uniques occur, issues are returned
module.exports.save = function (options, callback) {
	var overwrite = options.overwrite;
	if (overwrite) { // find exact match
		var myOptions = {};
		for (var attrib in options) {
			if (attrib != 'password')
				myOptions[attrib] = options[attrib];
		}
		exactMatch(myOptions, options.password, function(foundUser) {
			if (foundUser && options.user_options && options.user_options[overwrite]) {
				foundUser[overwrite] = options.user_options[overwrite];
				foundUser.save(function(err) {
					if (err) return handleError(err, callback);
	
					console.log('old '+foundUser.username+' saved');
					callback([]);
				});
			}
		});
	} else {
		var user_options = options.user_options || options;
		var issues = [];
		matchUsers(user_options, function(foundUsers) {
			if (foundUsers.length > 0) { // found matching users
				// draw issues
				for (var i = 0; i < foundUsers.length; i++) {
					var conflictingUser = foundUsers[i];
					for (var i = 0; i < uniques.length; i++) {
						// issue if matching unique field
						if (0 == user_options[uniques[i]].localeCompare(conflictingUser[uniques[i]])) {
							issues.push('existing '+uniques[i]);
						}
					}
				}
				callback(issues);
			} else if (0 == foundUsers.length) { // no matching
				var freshUser = new user(user_options);
				freshUser.save(function(err) {
					if (err) return handleError(err, callback);
	
					console.log('new '+options.username+' saved');
					callback([]);
				});
			} else { // error
				callback(null);
			}
		});
	}
};

// finds user that matches option EXACTLY
// callback null if error, false if not match (user or password), user info otherwise
var exactMatch = module.exports.exists = function (options, password, callback) {
	user.findOne(options, function(err, foundUser) {
		if (err) return handleError(err, callback);

		if (null == foundUser) return callback(false);
		foundUser.comparePassword(password, function(err, isMatch) {
			if (err) return handleError(err, callback);
			callback(isMatch ? foundUser : false);
		});
	});
};

// verifies exact match before deletion
// callback null if error, false if not match (user or password), true otherwise
module.exports.delete = function (options, password, callback) {
	exactMatch(options, password, function(foundUser) {
		if (foundUser) {
			foundUser.remove(function(err) {
				if (err) return handleError(err, callback);
				callback(true);
			});
		} else {
			callback(false);
		}
	});
};

module.exports.idFromUsername = function(username, callback) {
	if (!username) return callback(false);
	user.findOne({username: username}, function(err, foundUser) {
		if (err) return handleError(err, callback);
		if (!foundUser) return callback(false);
		callback(foundUser._id);
	});
};