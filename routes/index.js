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

router.get("/admin", function(req, res, next) {
    res.render("admin/index", { title: "meeee" } );
});


router.post('/createguest', function(req, res, next) {
    var guest = req.body;
    if ( !('name' in guest) ) {
	res.status(300).send({Message:"'name' attribute not defined."});
	return;
    } else if ( !('foodRes' in guest) ) {
	res.status(300).send({Message:"'foodRes' attribute not defined."});
	return;
    } else if ( !('agegroup' in guest) ) {
	res.status(300).send({Message:"'agegroup' attribute not defined."});
	return;
    } else if ( guest.agegroup != 'ADULT_TICKET' && guest.agegroup != 'HIGHSCHOOL_TICKET' && guest.agegroup != 'CHILD_TICKET' && guest.agegroup != "JUNIORHIGH_TICKET" ) {
	res.status(300).send({Message:"'agegroup' should be set to 'ADULT_TICKET', 'HIGHSCHOOL_TICKET', 'HIGHSCHOOL_TICKET' or 'CHILD_TICKET'"});
	return;
    } else if ( guest.foodRes != 'NONE_FOOD' && guest.foodRes != 'VEGAN_FOOD' && guest.foodRes != 'GLUTENFREE_FOOD' ) {
	res.status(300).send({Message:"'foodRes' should be set to 'VEGAN_FOOD', 'NONE_FOOD' or 'GLUTENFREE_FOOD'"});
	return;
    }

    var cnt = 0;
    var put_user = function() {
	cnt++;
        if ( cnt == 5 )
            res.status(400).json("error","unstable bid number");
        var params = {
            TableName: "bidnumber",
            Key: {
                "id": "key"
	    }
	};
	docClient.get(params, function(err, data) {
            if ( err ) {
		console.log(err);
	    }
	    mybidnumber = data.Item.number;
	    var params = {
		TableName: "bidnumber",
		Item: {
		    "id": "key",
		    "number": data.Item.number+1
		},
		ConditionExpression: "(#numname = :num)",
		ExpressionAttributeValues: {
		    ":num": data.Item.number
		},
		ExpressionAttributeNames: {
		    "#numname": "number"
		}
	    };
	    docClient.put(params, function(err, data) {
		if ( err ) {
		    console.log(err);
		    put_user();
		} else {
		    var params = {
			TableName: "tickets",
			Item: {
			    "name": guest.name,
			    "foodRes": guest.foodRes,
			    "agegroup": guest.agegroup,
			    "buyer": guest.buyer,
			    "date": guest.date,
			    "login": guest.login,
			    "bidnumber": mybidnumber,
			    "boughtitems": []
			}
		    };

		    console.log(params);

		    docClient.put(params, function(err, data) {
			if (err) {
			    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
			    res.status(400).json({error: "Unable to add item. Error JSON:" + err});
			} else {
			    console.log("Added item:", JSON.stringify(data, null, 2));
			    res.status(200).json(data);
			}
		    });

		}
	    });
	});
    };
    put_user();
});

router.get("/findtickets/:email", function(req, res, next) {
    var params = {
	TableName: "tickets",
	IndexName: "useremail",
	KeyConditionExpression: "login = :email",
	ExpressionAttributeValues: {
	    ":email": req.params.email
	}
    };
    docClient.query(params, function(err, data) {
	if (err)  {
	    console.error(err);
	    res.status(401).json({error: err});
	} else {
	    console.log(data);
	    res.json(data.Items);
	}
    });
});


router.get('/guest/:guestid', function(req, res, next) {
    var params = {
	TableName: "tickets",
	Key: {
	    "bidnumber": req.params.guestid
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


router.post('/uploadphoto', function(req, res, next) {
    if ( !req.body.photo ) {
	res.status(400).json({message : "Please fill in a photo"});
    }
    if ( !req.body.filename ) {
	req.status(400).json({message: "Please fill in a filename"});
    }

    extension = req.body.filename.split('.').pop();
    new_filename = guid() + '.' + extension;
    var AWS2 = require("aws-sdk");
    var s3bucket = new AWS2.S3({params: {Bucket: 'svuus-photos'}});
    var buf = new Buffer(req.body.photo.split(',')[1], 'base64');
    var params = {Key: new_filename, Body: buf};
    s3bucket.upload(params, function(err, data) {
	if ( err ) {
	    res.status(400).json({message: err});
	} else {
	    res.json({photoid : params.Key});
	}
    });
});


router.post('/register', function(req, res, next) {
    if ( !req.body.email || !req.body.password ) {
	return res.status(400).json({message: 'Please fill out email and password.'});
    }

    salt = crypto.randomBytes(16).toString('hex');
    hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64).toString('hex');
    delete req.body.password;
    delete req.body.confirmPassword;
    req.body.hash = hash;
    req.body.salt = salt;

    var params = {
	TableName: "users",
	Item: req.body,
	ConditionExpression: "(attribute_not_exists(email))"
    };

    docClient.put(params, function(err, data) {

	if ( err ) {
	    console.log(err);
	    return res.status(401).json({message: "username already used."});
	} else {

	    var today = new Date();
	    var exp = new Date(today);
	    exp.setDate(today.getDate() + 1);

	    delete req.body.hash;
	    delete req.body.salt;
	    res.json({token: jwtsign.sign({
		email: req.body.email,
		user: req.body,
		exp: parseInt(exp.getTime()/1000),
	    }, 'SECRET')});
	}
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

	    delete user.salt;
	    delete user.hash;
	    res.json({token: jwtsign.sign({
		user: user,
		exp: parseInt(exp.getTime()/1000),
	    }, 'SECRET')});
	} else {
	    res.status(401).json(info);
	}
    })(req, res, next);
});

router.post('/submititem', auth, function(req, res, next) {
    item = req.body;
    item.id = guid();
    item.price = item.minvalue;
    item.buyers = [];

    var params = {
	TableName: "items",
	Item: item
    };

    docClient.put(params, function(err, data) {
	if ( err ) {
	    res.status(401).json({error: err});
	} else {
	    res.status(200).json({message: "item added"});
	}
    });
});


router.post('/tickets', function(req, res, next) {
    var keys = [];
    console.log(req.body);
    req.body.forEach(function(bidnumber) {
        keys.push({"bidnumber":Number(bidnumber)});
    });
    var params = {
        RequestItems: {
            tickets: {
                Keys: keys
            }
        }
    };
    console.log(params);
    console.log(keys);

    docClient.batchGet(params, function(err, data) {
        console.log(err);
        if ( err ) {
	    res.status(401).json({error: err});
	} else {
            console.log(data.Responses);
	    res.status(200).json(data.Responses.tickets);
	}
    });
});


router.post('/items', function(req, res, next) {
    var keys = [];
    req.body.forEach(function(item) {
	keys.push({"id":item});
    });
    var params = {
	"RequestItems": {
	    "items": {
		"Keys": keys
	    }
	}
    };

    docClient.batchGet(params, function(err, data) {
	if ( err ) {
	    res.status(401).json({error: err});
	} else {
	    res.status(200).json(data.Responses.items);
	}
    });
});


router.post('/addbuyer', auth, function(req, res, next) {
    guestid = req.body.guestid;
    itemid = req.body.itemid;

    var params = {
	TableName: "tickets",
	Key: {
	    bidnumber: guestid
	},
	UpdateExpression: "SET #b = list_append(#b, :v_itemid)",
	Item: {},
	ExpressionAttributeNames:{
	    "#b": "boughtitems"
	},
	ExpressionAttributeValues: {
	    ":v_itemid": [itemid]
	},
	ReturnValues: "UPDATED_NEW"
    };
    console.log(params);

    docClient.update(params, function(err, data) {
	if ( err ) {
	    console.log(err);
	    res.status(401).json({error: err});
	} else {
	    var item_params = {
		TableName: "items",
		Key: {
		    id: itemid
		},
		UpdateExpression: "SET #b = list_append(#b, :v_buyerid)",
		Item: {},
		ExpressionAttributeNames: {
		    "#b": "buyers"
		},
		ExpressionAttributeValues: {
		    ":v_buyerid": [guestid]
		},
		ReturnValues: "UPDATED_NEW"
	    };

	    console.log(item_params);

	    docClient.update(item_params, function(err, data) {
		if ( err ) {
		    console.log(err);
		    res.status(401).json({error: err});
		} else {
		    res.status(200).json({message: "item added"});
		}
	    });
	}
    });
});


module.exports = router;
