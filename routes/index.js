var express = require('express');
var router = express.Router();


var simpledb = require('simpledb');
var sdb      = new simpledb.SimpleDB(
    {keyid:'AKIAIZELJIBWQ3ETHZ4A',secret:'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'});


function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.post('/createdomain/:domain', function(req, res, next) {
    sdb.createDomain( req.params.domain, function( error ) {
        console.log(error);
        res.json({Error:error});
    });
});

router.post('/deletedomain/:domain', function(req, res, next) {
    sdb.deleteDomain( req.params.domain, function(err, result, meta) {
        res.json({Error:err});
    });
});

router.post('/createguest', function(req, res, next) {
    guest = req.body;
    if ( !('firstname' in guest) ) {
        res.status(300).send({Message:"'firstname' attribute note defined."});
        return;
    } else if ( !('lastname' in guest) ) {
        res.status(300).send({Message:"'lastname' attribute note defined."});
        return;
    } else if ( !('email' in guest) ) {
        res.status(300).send({Message:"'email' attribute note defined."});
        return;
    } else if ( !('food' in guest) ) {
        res.status(300).send({Message:"'food' attribute note defined."});
        return;
    } else if ( !('agegroup' in guest) ) {
        res.status(300).send({Message:"'agegroup' attribute note defined."});
        return;
    } else if ( guest.agegroup != 'adult' && guest.agegroup != 'teen' && guest.agegroup != 'child' ) {
        res.status(300).send({Message:"'agegroup' should be set to 'adult', 'teen' or 'child'"});
        return;
    } else if ( guest.food != 'meat' && guest.food != 'vegan' && guest.food != 'glutenfree' ) {
        res.status(300).send({Message:"'food' should be set to 'vegan', 'meat' or 'glutenfree'"});
        return;
    }
    guest.guestid = guid();
    sdb.putItem('guests', guest.guestid, guest, function( error ) {
        console.log(error);
        res.status(200).json(guest);
    });
});

router.get('/guest/:guestid', function(req, res, next) {
    console.log(req.params.guestid);
    sdb.getItem('guests', req.params.guestid, function( error, getItemResult, meta ) {
        console.log(getItemResult);
        res.json(getItemResult);
    });
});


router.get("/all/:table", function(req, res, next) {
    sdb.select('select * from ' + req.params.table, function(error, selectResult, meta) {
        console.log(selectResult);
        res.json(selectResult);
    });
});


var jwtsign = require('jsonwebtoken');


router.post('/register', function(req, res, next) {
    if ( !req.body.username || !req.body.password ) {
        return res.status(400).json({message: 'Please fill out username and password.'});
    }

    salt = crypto.randomBytes(16).toString('hex');
    hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64).toString('hex');
    delete req.body.password;
    req.body.hash = hash;
    req.body.salt = salt;
    sdb.putItem('users', req.body.username, req.body, function(error) {
        console.log(error);
        res.json({token: jwtsign.sign({
            username: req.body.username,
            exp: parseInt(exp.getTime()/1000),
        }, 'SECRET')});
    });
});

var jwt = require('express-jwt');
var auth = jwt({secret: "SECRET", userProperty: "payload"});
var crypto = require('crypto');
var passport = require('passport');

router.post('/login', function(req, res, next) {
    if ( !req.body.username || !req.body.password ) {
        return res.status(400).json({message: "Please fill out both 'username' and 'password'"});
    }

    passport.authenticate('local', function(err, user, info) {
        console.log("auth");

        var today = new Date();
        var exp = new Date(today);
        exp.setDate(today.getDate() + 60);

        res.json({token: jwtsign.sign({
            username: user.username,
            exp: parseInt(exp.getTime()/1000),
        }, 'SECRET')});
        console.log("after");
    })(req.body, res, next);
    console.log("end");
});


module.exports = router;
