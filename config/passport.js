var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


//var simpledb = require('simpledb');
//var sdb      = new simpledb.SimpleDB();

var crypto = require('crypto');

var AWS = require("aws-sdk");
AWS.config.update({
	region: "us-west-2"
});

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();


passport.use(new LocalStrategy(
	{ // or whatever you want to use
		usernameField: 'email',
		passwordField: 'password'
	},
	function(email, password, done) {

		var params = {
			TableName: "users",
			Key: {
				"email": email
			}
		};

		docClient.get(params, function(error, data) {
			if ( error ) {
				return done(null, false, { message: error });
			}
			if ( !data.Item ) {
				return done(null, false, { message: "User doesn't exist." });
			}
			hash = data.Item.hash;
			salt = data.Item.salt;
			test_hash = crypto.pbkdf2Sync(password, salt, 1000, 64).toString('hex');
			if ( test_hash != hash ) {
				return done(null, false, { message: "Invalid password." });
			}
			return done(null, data.Item);
		});
	}
));
