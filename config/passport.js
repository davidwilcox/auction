var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


var simpledb = require('simpledb');
var sdb      = new simpledb.SimpleDB(
    {keyid:'AKIAIZELJIBWQ3ETHZ4A',secret:'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'});
var crypto = require('crypto');


passport.use(new LocalStrategy(
	{ // or whatever you want to use
		usernameField: 'email',
		passwordField: 'password'
	},
	function(email, password, done) {

		sdb.getItem('users', email, function(error, getItemResult, meta) {
			if ( error ) {
				return done(null, false, { message: error });
			}
			if ( !getItemResult ) {
				return done(null, false, { message: "User doesn't exist." });
			}
			hash = getItemResult.hash;
			salt = getItemResult.salt;
			test_hash = crypto.pbkdf2Sync(password, salt, 1000, 64).toString('hex');
			if ( test_hash != hash ) {
				return done(null, false, { message: "Invalid password." });
			}
			return done(null, getItemResult);
		});
	}
));
