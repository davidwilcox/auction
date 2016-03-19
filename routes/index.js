var express = require('express');
var router = express.Router();


//var simpledb = require('simpledb');
//var sdb		 = new simpledb.SimpleDB();
var AWS = require("aws-sdk");
AWS.config.update({
	region: "us-west-2"
});
var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();


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
})

/*
router.post('/createdomain/:domain', function(req, res, next) {
	sdb.createDomain( req.params.domain, function( error ) {
		res.json({Error:error});
	});
});

router.post('/deletedomain/:domain', function(req, res, next) {
	sdb.deleteDomain( req.params.domain, function(err, result, meta) {
		res.json({Error:err});
	});
});
*/

router.post('/createguest', function(req, res, next) {
	guest = req.body;
	if ( !('name' in guest) ) {
		res.status(300).send({Message:"'name' attribute not defined."});
		return;
	} else if ( !('foodRes' in guest) ) {
		res.status(300).send({Message:"'foodRes' attribute not defined."});
		return;
	} else if ( !('agegroup' in guest) ) {
		res.status(300).send({Message:"'agegroup' attribute not defined."});
		return;
	} else if ( guest.agegroup != 'adult' && guest.agegroup != 'teen' && guest.agegroup != 'child' ) {
		res.status(300).send({Message:"'agegroup' should be set to 'adult', 'teen' or 'child'"});
		return;
	} else if ( guest.foodRes != 'none' && guest.foodRes != 'vegan' && guest.foodRes != 'glutenfree' ) {
		res.status(300).send({Message:"'foodRes' should be set to 'vegan', 'meat' or 'glutenfree'"});
		return;
	}
	guest.guestid = guid();
	var params = {
		TableName: "tickets",
		Item: {
			"id": guest.guestid,
			"name": guest.name,
			"foodRes": guest.foodRes,
			"agegroup": guest.agegroup
		}
	};

	docClient.put(params, function(err, data) {
		if (err) {
			console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
			res.status(400).json({error: "Unable to add item. Error JSON:", err});
		} else {
			console.log("Added item:", JSON.stringify(data, null, 2));
			res.status(200).json(data);
		}
	});
});

router.get('/guest/:guestid', function(req, res, next) {
	var params = {
		TableName: "tickets",
		Key: {
			"id": req.params.guestid
		}
	};

	docClient.get(params, function(err, data) {
		res.json(data);
	});
});


router.get('/allguests', function(req, res, next) {
	var params = {
		TableName: "tickets"
	};
	docClient.scan(params, function(err, data) {
		if (err) {
			console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			res.json(data.Items);
		}
	});
});


router.get("/all/:table", function(req, res, next) {
	var params = {
		TableName: req.params.table
	};
	docClient.scan(params, function(err, data) {
		if (err) {
			console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			res.json(data.Items);
		}
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

	var params = {
		TableName: "users",
		Item: req.body,
		ConditionExpression: "(attribute_not_exists(email))"
	};

	docClient.put(params, function(err, data) {

		if ( err ) {
			return res.status(401).json({message: "username already used."});
		}

		var today = new Date();
		var exp = new Date(today);
		exp.setDate(today.getDate() + 60);

		res.json({token: jwtsign.sign({
			email: req.body.email,
			exp: parseInt(exp.getTime()/1000),
		}, 'SECRET')});

	});
});

router.get('/accountexists/:email', function(req, res, next) {
	var params = {
		TableName: "users",
		Key: {
			"email": req.params.email
		}
	};
	docClient.get(params, function(err, data) {
		if (err) {
			console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			if ( data.Item ) {
				res.json( {exists: "true" } );
			} else {
				res.json( {exists: "false" } );
			}
		}
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

	req.body.username = req.body.email;
	passport.authenticate('local', function(err, user, info) {

		if ( err ) {
			return next(err);
		}
		if ( user ) {
			var today = new Date();
			var exp = new Date(today);
			exp.setDate(today.getDate() + 60);

			res.json({token: jwtsign.sign({
				email: user.email,
				exp: parseInt(exp.getTime()/1000),
			}, 'SECRET')});
		} else {
			res.status(401).json(info);
		}
	})(req, res, next);
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
});


module.exports = router;
