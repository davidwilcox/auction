var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


var simpledb = require('simpledb');
var sdb      = new simpledb.SimpleDB(
    {keyid:'AKIAIZELJIBWQ3ETHZ4A',secret:'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'});
var crypto = require('crypto');


passport.use(new LocalStrategy(
    function(username, password, done) {
        console.log("passport");

        sdb.getItem('users', req.body.username, function(error, getItemResult, meta) {
            if ( error ) {
                console.log("err2");
                return done(null, false, { message: error });
            }
            hash = getItemResult.hash;
            salt = getItemResult.salt;
            test_hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64).toString('hex');
            if ( test_hash != hash ) {
                console.log("err3");
                return done(null, false, { message: "Invalid password." });
            }
            return done(null, getItemResult);
        });
    }
));
