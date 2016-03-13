var express = require('express');
var router = express.Router();


var simpledb = require('simpledb');
var sdb		 = new simpledb.SimpleDB(
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
	console.log(guest);
	if ( !('name' in guest) ) {
		res.status(300).send({Message:"'name' attribute not defined."});
		console.log("1");
		return;
	} else if ( !('foodRes' in guest) ) {
		res.status(300).send({Message:"'foodRes' attribute not defined."});
		console.log("2");
		return;
	} else if ( !('agegroup' in guest) ) {
		res.status(300).send({Message:"'agegroup' attribute not defined."});
		console.log("3");
		return;
	} else if ( guest.agegroup != 'adult' && guest.agegroup != 'teen' && guest.agegroup != 'child' ) {
		res.status(300).send({Message:"'agegroup' should be set to 'adult', 'teen' or 'child'"});
		console.log("4");
		return;
	} else if ( guest.foodRes != 'none' && guest.foodRes != 'vegan' && guest.foodRes != 'glutenfree' ) {
		res.status(300).send({Message:"'foodRes' should be set to 'vegan', 'meat' or 'glutenfree'"});
		console.log("5");
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
	if ( !req.body.email || !req.body.password ) {
		return res.status(400).json({message: 'Please fill out email and password.'});
	}

	salt = crypto.randomBytes(16).toString('hex');
	hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64).toString('hex');
	delete req.body.password;
	req.body.hash = hash;
	req.body.salt = salt;
	sdb.putItem('users', req.body.email, req.body, function(error) {
		console.log(error);

		var today = new Date();
		var exp = new Date(today);
		exp.setDate(today.getDate() + 60);

		res.json({token: jwtsign.sign({
			email: req.body.email,
			exp: parseInt(exp.getTime()/1000),
		}, 'SECRET')});
	});
});

var jwt = require('express-jwt');
var auth = jwt({secret: "SECRET", userProperty: "payload"});
var crypto = require('crypto');
var passport = require('passport');

router.post('/login', function(req, res, next) {
	if ( !req.body.email || !req.body.password ) {
		return res.status(400).json({message: "Please fill out both 'email' and 'password'"});
	}

	passport.authenticate('local', function(err, user, info) {
		console.log("auth");

		var today = new Date();
		var exp = new Date(today);
		exp.setDate(today.getDate() + 60);

		res.json({token: jwtsign.sign({
			email: user.email,
			exp: parseInt(exp.getTime()/1000),
		}, 'SECRET')});
		console.log("after");
	})(req.body, res, next);
	console.log("end");
});

router.post('/donateitem', auth, function(req, res, next) {
	item = req.body;
	if ( !item.itemname || !item.quantity || !item.fmv ||
		 !item.description || !item.restrictions ) {
		return res.status(400).json({message: "Please fill out 'itemname', " +
									 "'quantity', 'fmv', " +
									 "'description', and 'restrictions'"});
	}

	item.itemid = guid();

	sdb.putItem('items', item.id, item, function(error) {
		console.log(error);
		res.json({Error: error});
	});
});


module.exports = router;
