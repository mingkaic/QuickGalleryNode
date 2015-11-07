var bcrypt = require('bcrypt');
var mongoose = require('mongoose');

var services = require('./mongo-services');

var schema = mongoose.Schema;

var saltworkfactor = 10;

var uniques = module.exports.uniques = ['username', 'email'];

var schemaField = {
	"username": { type: String, trim: true, required: true },
	"email": { type: String, trim: true, required: true },
	"password": { type: String, required: true },
	"name": {
		"first": String,
		"last": String
	},
	"token": String
};

for (var i = 0; i < uniques.length; i++) {
	schemaField[uniques[i]].unique = uniques[uniques[i]];
}

var userSchema = new schema(schemaField);

// auto password hash before save
userSchema.pre('save', function(callback) {
	var user = this;

	// continue if no modification is made to password
	if (false == user.isModified('password')) return callback();

	// generate a salt
	bcrypt.genSalt(saltworkfactor, function(err, salt) {
		if (err) return callback(err);

		// hash the password along with our new salt
		bcrypt.hash(user.password, salt, function(err, hash) {
			if (err) return callback(err);
			user.password = hash;
			callback();
		});
	});
});

// cascade remove to fs.files
userSchema.post('remove', function(user) {
	services.fileDelete({'metadata.uploader': mongoose.Types.ObjectId(user._id)});
});

userSchema.methods.comparePassword = function(candidatePassword, callback) {
	bcrypt.compare(candidatePassword, this.password, callback);
};

module.exports.user = mongoose.model('user', userSchema);