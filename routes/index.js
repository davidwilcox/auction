var express = require('express');
var router = express.Router();
var Promise = require('bluebird');

//var simpledb = require('simpledb');
//var sdb		 = new simpledb.SimpleDB();
var AWS = require("aws-sdk");
AWS.config.update({
    region: "us-west-2"
});

var stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();
var Q = require('q');


// Get reference to AWS clients
var ses = new AWS.SES();


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
    } else if ( guest.foodRes != 'NONE_FOOD' && guest.foodRes != 'VEGETARIAN_FOOD' && guest.foodRes != 'GLUTENFREE_FOOD' ) {
	res.status(300).send({Message:"'foodRes' should be set to 'VEGETARIAN_FOOD', 'NONE_FOOD' or 'GLUTENFREE_FOOD'"});
	return;
    }

    var cnt = 0;
    var put_user = function() {


        var purchase_ticket = function(bidnum) {
	    var params = {
		TableName: "tickets",
		Item: {
		    firstname: guest.firstname,
		    lastname: guest.lastname,
		    foodRes: guest.foodRes,
		    agegroup: guest.agegroup,
		    buyer: guest.buyer,
		    date: guest.date,
		    login: guest.login,
		    bidnumber: bidnum,
		    stripe_customer_id: guest.customer_id,
		    gluten: guest.gluten,
		    boughtitems: {}
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
	};




        cnt++;
        if ( cnt == 5 ) {
            res.status(400).json("error","unstable bid number");
	    return;
	}

        if ( guest.agegroup != 'ADULT_TICKET' ) {
            var t = Math.round(Math.random(1000,10000000)*1000000+1000);
            purchase_ticket(t);
        }
        else {
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
                console.log(data);
	        var mybidnumber = data.Item.number;
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
                console.log(params);
                docClient.put(params, function(err, data) {
		    if ( err ) {
		        console.log(err);
		        put_user();
		    } else {
                        purchase_ticket(mybidnumber);
                    }
	        });
            });
        }
    };
    put_user();
});

router.get("/findticket/:bidnumber", function(req, res, next) {
    var params = {
	TableName: "tickets",
	Key: {
	    "bidnumber": Number(req.params.bidnumber)
	}
    };
    docClient.get(params, function(err, data) {
	if ( data )
	    res.status(200).json(data.Item);
	else {
	    console.log(err);
	    res.status(401).json(err);
	}
    });
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
	if (err || !data.Items) {
	    console.error(err);
	    res.status(401).json({error: err});
	} else {
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


router.get('/allitems', function(req, res, next) {
    var params = {
	TableName: "items"
    };

    if ( req.query.searchname && req.query.searchitemnumber ) {
	params.FilterExpression = "contains(#itemname, :itemname) AND (#itemnumber = :itemnumber)";
	params.ExpressionAttributeValues =  {
	    ":itemname": req.query.searchname,
	    ":itemnumber": parseInt(req.query.searchitemnumber)
	};
	params.ExpressionAttributeNames = {
	    "#itemname": "name",
	    "#itemnumber": "number"
	};
    }
    else if ( req.query.searchname ) {
	params.FilterExpression = "contains(#itemname, :itemname)";
	params.ExpressionAttributeValues =  {
	    ":itemname": req.query.searchname
	};
	params.ExpressionAttributeNames = {
	    "#itemname": "name"
	};
    } else if ( req.query.searchitemnumber ) {
	params.FilterExpression = "(#itemnumber = :itemnumber)";
	params.ExpressionAttributeValues =  {
	    ":itemnumber": parseInt(req.query.searchitemnumber)
	};
	params.ExpressionAttributeNames = {
	    "#itemnumber": "number"
	};
    }
    console.log(params);
    docClient.scan(params, function(err, data) {
	if ( err ) {
	    console.error(err);
	} else {
	    res.json(data.Items);
	}
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

var multiparty = require('connect-multiparty');
var multipartyMiddleware = multiparty();
const fs = require('fs');

router.post('/uploadphoto', multipartyMiddleware, function(req, res, next) {

    if ( !req.files.photo ) {
	res.status(400).json({message : "Please fill in a photo"});
    }
    if ( !req.body.filename ) {
	res.status(400).json({message: "Please fill in a filename"});
    }

    var extension = req.body.filename.split('.').pop();
    var new_filename = guid() + '.' + extension;
    var AWS2 = require("aws-sdk");
    var s3bucket = new AWS2.S3({params: {Bucket: 'svuus-photos'}});
    fs.readFile(req.files.photo.path, function(err, buf) {
        if ( err )
            res.status(400).json({message: "could not read file."});
        //var buf = new Buffer(req.body.photo.split(',')[1], 'base64');
        var params = {Key: new_filename, Body: buf};
        s3bucket.upload(params, function(err, data) {
	    if ( err ) {
	        res.status(400).json({message: err});
	    } else {
	        res.json({photoid : params.Key});
	    }
        });
    });
});


router.post('/register', function(req, res, next) {
    if ( !req.body.email || !req.body.password ) {
	return res.status(400).json({message: 'Please fill out email and password.'});
    }

    var salt = crypto.randomBytes(16).toString('hex');
    var hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64).toString('hex');
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

	console.log(err);
	console.log(data);

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



router.post('/replace_user_photo_id', function(req, res, next) {
    var params = {
	TableName: "users",
	Key: {
	    email: req.body.email
	},
	UpdateExpression: "SET #b = :v_photoid",
	ExpressionAttributeNames: {
	    "#b": "photoid"
	},
	ExpressionAttributeValues: {
	    ":v_photoid": req.body.photoid
	},
	ReturnValues: "UPDATED_NEW"
    };

    console.log(params);

    docClient.update(params, function(err, data) {
	if ( err ) {
	    res.status(401).json(err);
	} else {
	    res.status(200).json({ success: true });
	}
    });
});


router.post('/charge_all_users', function(req, res, next) {

    var get_all = function(table) {
	var p = new Promise(function(resolve, reject) {
	    var params = {
		TableName: table
	    };
	    docClient.scan(params, function(err, data) {
		if (err) {
		    reject(err);
		    //console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
		} else {
		    resolve(data.Items);
		}
	    });
	});
	return p;
    };

    var promises = [];
    promises.push(get_all("tickets"));
    promises.push(get_all("items"));
    promises.push(get_all("transactions"));

    Promise.all(promises).then(function(data) {
	var m = new Map();
	for(var idx in data[2]) {
	    var transaction = data[2][idx];
	    if ( transaction.sellprice ) {
		if ( !(transaction.bidnumber in m) )
		    m[transaction.bidnumber] = 0;
		m[transaction.bidnumber] += parseInt(transaction.sellprice)*100;
	    }
	}

	var customermap = new Map();
	var chargemap = new Map();
	for(var idx in data[0]) {
	    var ticket = data[0][idx];
	    console.log(ticket);
	    if ( ticket.stripe_customer_id in m ) {
		if ( !(ticket.stripe_customer_id in customermap) )
		    chargemap[ticket.stripe_customer_id] = 0;
		chargemap[ticket.stripe_customer_id] = m[ticket.bidnumber];
		customermap[ticket.stripe_customer_id] += ticket.email;
	    }
	}

	var charges = [];
	for(var customerid in customermap) {
	    console.log("charging");
	    var charge = {
		amount: chargemap[customerid],
		currency: "usd",
		customer: customerid,
		description: "purchase auction items for " + customermap[customerid]
	    };
	    console.log(charge);
	    charges.push(new Promise(function(resolve, reject) {
		stripe.charges.create(charge, function(charge_err, charge) {
		    if ( charge_err ) {
			reject({err: charge_err});
		    }
		    else if ( cust_err ) {
			reject({err: cust_err});
		    } else {
			resolve({charge_id: charge.id});
		    }
		});
	    }));
	}

	Promise.all(charges).then(function(data) {
	    res.status(200).json({success: true});
	}, function(err) {
	    console.log(err);
	});
    });
});

router.post('/addadmin', function(req, res, next) {

    var params = {
	TableName: "users",
	Key: {
	    email: req.body.email
	},
	UpdateExpression: "SET #b = :v_isadmin",
	Item: {},
	ExpressionAttributeNames:{
	    "#b": "admin"
	},
	ExpressionAttributeValues: {
	    ":v_isadmin": true
	},
        ConditionExpression: "(attribute_exists(email))",
	ReturnValues: "UPDATED_NEW"
    };

    console.log(params);

    docClient.update(params, function(err, data) {
	if ( err ) {
	    console.log(err);
	    res.json( {err: err, success: false } );
	} else {
	    res.json( {success: true} );
	}
    });
});


router.post('/login', function(req, res, next) {
    if ( !req.body.email || !req.body.password ) {
	return res.status(400).json({message: "Please fill out both 'email' and 'password'"});
    }

    req.body.username = req.body.email;
    passport.authenticate('local', function(err, user, info) {

	console.log(err);
	console.log(user);
	console.log(info);
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

router.post('/assignitemtype', auth, function(req, res, next) {
    var itemid = req.body.itemid;
    var type = req.body.type;

    
    var params = {
        TableName: "items",
        Key: {
            id: itemid
        },
        UpdateExpression: "SET #t = :v_type",
        ExpressionAttributeNames: {
            "#t": "type"
        },
        ExpressionAttributeValues:  {
            ":v_type": type
        },
        ReturnValues: "UPDATED_NEW"
    };

    docClient.update(params, function(err, data) {
	if ( err ) {
	    console.log(err);
	    res.json( {err: err, success: false } );
	} else {
	    res.json( {success: true} );
	}
    });
});

router.post('/submititem', auth, function(req, res, next) {
    var item = req.body;
    if ( !item.id )
        item.id = guid();

    if ( item.pricingnotes == '' )
	delete item.pricingnotes;

    var params = {
	TableName: "items",
	Item: item
    };

    docClient.put(params, function(err, data) {
	if ( err ) {
            console.log("err");
            console.log(err);
	    res.status(401).json({error: err});
	} else {
            res.status(200).json({message: "item added"});
	}
    });
});


router.post('/tickets', function(req, res, next) {
    var keys = [];
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



router.post('/chargecustomer', auth, function(req, res, next) {




    var add_ticket = function(guest) {

	var deferred = new Promise(function(resolve, reject) {

	    if ( !('name' in guest) ) {
		reject({Message:"'name' attribute not defined."});
		return;
	    } else if ( !('foodRes' in guest) ) {
		reject({Message:"'foodRes' attribute not defined."});
		return;
	    } else if ( !('agegroup' in guest) ) {
		reject({Message:"'agegroup' attribute not defined."});
		return;
	    } else if ( guest.agegroup != 'ADULT_TICKET' && guest.agegroup != 'HIGHSCHOOL_TICKET' && guest.agegroup != 'CHILD_TICKET' && guest.agegroup != "JUNIORHIGH_TICKET" ) {
		reject({Message:"'agegroup' should be set to 'ADULT_TICKET', 'HIGHSCHOOL_TICKET', 'HIGHSCHOOL_TICKET' or 'CHILD_TICKET'"});
		return;
	    } else if ( guest.foodRes != 'NONE_FOOD' && guest.foodRes != 'VEGETARIAN_FOOD' && guest.foodRes != 'VEGAN' && guest.foodRes != 'GLUTENFREE_FOOD' ) {
		reject({Message:"'foodRes' should be set to 'VEGETARIAN_FOOD', 'NONE_FOOD' or 'GLUTENFREE_FOOD'"});
		return;
	    }

	    var cnt = 0;
	    var put_user = function() {

		var purchase_ticket = function(bidnum) {
		    var params = {
			TableName: "tickets",
			Item: {
			    firstname: guest.firstname,
			    lastname: guest.lastname,
			    foodRes: guest.foodRes,
			    agegroup: guest.agegroup,
			    buyer: guest.buyer,
			    date: guest.date,
			    login: guest.login,
			    bidnumber: bidnum,
			    stripe_customer_id: guest.customer_id,
			    gluten: guest.gluten,
			    boughtitems: {}
			}
		    };

		    docClient.put(params, function(err, data) {
			if (err) {
			    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
			    reject({error: "Unable to add item. Error JSON:" + err});
			} else {
			    console.log("Added item:", JSON.stringify(data, null, 2));
			    resolve(data);
			}
		    });
		};




		cnt++;
		if ( cnt == 5 ) {
		    reject({"error":"unstable bid number"});
		    return;
		}

		if ( guest.agegroup != 'ADULT_TICKET' ) {
		    var t = Math.round(Math.random(1000,10000000)*1000000+1000);
		    purchase_ticket(t);
		}
		else {
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
			console.log(data);
			var mybidnumber = data.Item.number;
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
			console.log(params);
			docClient.put(params, function(err, data) {
			    if ( err ) {
				console.log(err);
				put_user();
			    } else {
				purchase_ticket(mybidnumber);
			    }
			});
		    });
		}
	    };
	    put_user();
	});
	return deferred;
    };






    var purchaser = req.body.purchaser;
    var stripe_token = req.body.stripe_token;
    var amount = req.body.amount;

    stripe.customers.create({
        description: purchaser,
        source: stripe_token
    }, function(cust_err, customer) {
	console.log(cust_err);
	console.log(customer);
        stripe.charges.create({
            amount: amount,
            currency: "usd",
            customer: customer.id,
            description: "purchase auction tickets for " + purchaser
        }, function(charge_err, charge) {
	    
	    if ( charge_err ) {
                res.status(401).json({err: charge_err});
            }
            else if ( cust_err ) {
                res.status(401).json({err: cust_err});
            } else {

		var tickets = req.body.tickets;
		var purch = function(num) {
		    var ticket = tickets[num];
		    ticket.charge_id = charge.id;
		    ticket.customer_id = customer.id;

		    var p = add_ticket(ticket);
		    p.then(function(data) {
			if ( num == tickets.length - 1 ) {
			    var subject = "Tickets Bought";
			    ses.sendEmail({
				Source: "admin@auction.svuus.org",
				Destination: {
				    ToAddresses: [
					purchaser
				    ]
				},
				Message: {
				    Subject: {
					Data: subject
				    },
				    Body: {
					Html: {
					    Data: '<html><head>'
						+ '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />'
						+ '<title>' + subject + '</title>'
						+ '</head><body>'
						+ 'This email confirms your purchase of tickets for the SVUUS auction. You bought tickets for: ' + tickets.reduce(function(prevValue,curValue) {
						    return prevValue + "," + curValue.firstname
							+ " " + curValue.lastname;
						}, '').substring()
						+ "<br>Cya at the auction!";
						+ '</body></html>'
					}
				    }
				}
			    }, function(err, data) {
				if ( err )
				    console.log(err);
				return res.status(200).json({added: true});
			    });

			} else {
			    purch(num+1);
			}
		    }, function(err) {
			res.status(400).json(err);
		    });
		};
		purch(0);
            }
        } );
    });
});



router.post('/deletebidder', auth, function(req, res, next) {
    var bidnum = req.body.bidnumber;
    var transactions = req.body.transactions;

    var promises = [];

    transactions.forEach(function(transaction) {
	var deferred = new Promise(function(resolve, reject) {
	    var params = {
		TableName: "transactions",
		Key: {
		    transactionid: transaction.transactionid
		}
	    };

	    docClient.delete(params, function(err, data) {
		if ( err )
		    reject(err);
		if ( data )
		    resolve(data);
	    });
	});
	promises.push(deferred);
    });

    promises.push(new Promise(function(resolve, reject) {
	var item_params = {
	    TableName: "tickets",
	    Key: {
		bidnumber: bidnum
	    }
	};
        docClient.delete(item_params, function(err, data) {
	    if ( err )
		reject(err);
	    if ( data )
		resolve(data);
	});
    }));
    Promise.all(promises).then(function(data) {
	res.status(200).json(data);
    }, function(err) {
	console.log(err);
	res.status(401).json(err);
    });
});


router.post('/deleteitem', auth, function(req, res, next) {
    var itemid = req.body.id;
    var transactions = req.body.transactions;

    var promises = [];

    transactions.forEach(function(transaction) {
	var deferred = new Promise(function(resolve, reject) {
	    var params = {
		TableName: "transactions",
		Key: {
		    transactionid: transaction.transactionid
		}
	    };
	    console.log(params);

	    docClient.delete(params, function(err, data) {
		if ( err )
		    reject(err);
		if ( data )
		    resolve(data);
	    });
	});
	promises.push(deferred);
    });
    promises.push(new Promise(function(resolve, reject) {
	var item_params = {
	    TableName: "items",
	    Key: {
		id: itemid
	    }
	};
	console.log(item_params);
	docClient.delete(item_params, function(err, data) {
	    if ( err )
		reject(err);
	    if ( data )
		resolve(data);
	});
    }));
    Promise.all(promises).then(function(data) {
	console.log(data);
	res.status(200).json(data);
    }, function(err) {
	console.log(err);
	res.status(401).json(err);
    });
});



router.post('/deletetransaction', auth, function(req, res, next) {
    var transactionid = req.body.transactionid;

    var params = {
        TableName: "transactions",
        Key: {
            transactionid: transactionid
        }
    };
    console.log(params);

    docClient.delete(params, function(err, data) {
	if ( err ) {
	    console.log(err);
	    res.status(401).json({error: err});
	} else {
	    res.status(200).json({data: data});
	}
    });
});



router.post('/addbuyer', auth, function(req, res, next) {
    var bidnumber = req.body.bidnumber;
    var itemid = req.body.itemid;
    var sellprice = req.body.sellprice;
    var tid = req.body.transactionid;

    var it = {
	bidnumber: Number(bidnumber),
	itemid: itemid,
	transactionid: guid(),
	sellprice: sellprice
    };

    if ( tid )
	it.transactionid = tid;
    

    var params = {
	TableName: "transactions",
	Item: it,
    };

    docClient.put(params, function(err, data) {
	if ( err ) {
	    console.log(err);
	    res.status(401).json({error: err});
	} else {
	    console.log(data);
	    res.status(200).json(it);
	}
    });
});





function getUser(email, fn) {
    dynamodb.getItem({
	TableName: "users",
	Key: {
	    email: {
		S: email
	    }
	}
    }, function(err, data) {
	if (err) return fn(err);
	else {
	    if ('Item' in data) {
		fn(null, email);
	    } else {
		fn(null, null); // User not found
	    }
	}
    });
}

function storeLostToken(email, fn) {
    // Bytesize
    var len = 128;
    crypto.randomBytes(len, function(err, token) {
	if (err) return fn(err);
	token = token.toString('hex');
	dynamodb.updateItem({
	    TableName: "users",
	    Key: {
		email: {
		    S: email
		}
	    },
	    AttributeUpdates: {
		lostToken: {
		    Action: 'PUT',
		    Value: {
			S: token
		    }
		}
	    }
	},
			    function(err, data) {
				if (err) return fn(err);
				else fn(null, token);
			    });
    });
}

function sendLostPasswordEmail(email, token, fn) {
    var subject = 'Password Lost for SVUUS Auction';
    var lostLink = ' https://auction.svuus.org/#/reset_password/' + encodeURIComponent(email) + '/' + token;

    ses.sendEmail({
	Source: "admin@auction.svuus.org",
	Destination: {
	    ToAddresses: [
		email
	    ]
	},
	Message: {
	    Subject: {
		Data: subject
	    },
	    Body: {
		Html: {
		    Data: '<html><head>'
			+ '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />'
			+ '<title>' + subject + '</title>'
			+ '</head><body>'
			+ 'Please <a href="' + lostLink + '">click here to reset your password</a> or copy & paste the following link in a browser:'
			+ '<br><br>'
			+ '<a href="' + lostLink + '">' + lostLink + '</a>'
			+ '</body></html>'
		}
	    }
	}
    }, fn);
}

router.post('/lost_password', function(req, res, next) {
    var email = req.body.email;

    getUser(email, function(err, emailFound) {
	if (err) {
	    res.status(401).text('Error in getUserFromEmail: ' + err);
	} else if (!emailFound) {
	    console.log('User not found: ' + email);
	    res.status(401).json({
		sent: false
	    });
	} else {
	    storeLostToken(email, function(err, token) {
		if (err) {
		    res.status(401).text('Error in storeLostToken: ' + err);
		} else {
		    sendLostPasswordEmail(email, token, function(err, data) {
			if (err) {
			    res.status(401).text('Error in sendLostPasswordEmail: ' + err);
			} else {
			    console.log('User found: ' + email);
			    res.status(200).json({
				sent: true
			    });
			}
		    });
		}
	    });
	}
    });
});





function computeHash(password, salt, fn) {
    crypto.pbkdf2(password, salt, 1000, 64, function(err, derivedKey) {
	if (err) return fn(err);
	else fn(null, salt, derivedKey.toString('hex'));
    });
}

function getUserLost(email, fn) {
    dynamodb.getItem({
	TableName: "users",
	Key: {
	    email: {
		S: email
	    }
	}
    }, function(err, data) {
	console.log(data);
	if (err) return fn(err);
	else {
	    if (('Item' in data) && ('lostToken' in data.Item)) {
		var lostToken = data.Item.lostToken.S;
		fn(null, lostToken);
	    } else {
		fn(null, null); // User or token not found
	    }
	}
    });
}

function updateUser(email, password, salt, fn) {
    console.log(password);
    dynamodb.updateItem({
	TableName: "users",
	Key: {
	    email: {
		S: email
	    }
	},
	AttributeUpdates: {
	    hash: {
		Action: 'PUT',
		Value: {
		    S: password
		}
	    },
	    salt: {
		Action: 'PUT',
		Value: {
		    S: salt
		}
	    },
	    lostToken: {
		Action: 'DELETE'
	    }
	}
    },
			fn);
}

router.post('/reset_password', function(req, res, next) {
    var event = req.body;
    var email = event.email;
    var lostToken = event.lost;
    var newPassword = event.password;

    getUserLost(email, function(err, correctToken) {
	console.log(correctToken);
	console.log(lostToken);
	if (err) {
	    res.status(401).text('Error in getUserLost: ' + err);
	} else if (!correctToken) {
	    console.log('No lostToken for user: ' + email);
	    res.status(200).json({
		changed: false
	    });
	} else if (lostToken != correctToken) {
	    // Wrong token, no password lost
	    console.log('Wrong lostToken for user: ' + email);
	    res.status(200).json({
		changed: false
	    });
	} else {
	    console.log('User logged in: ' + email);
	    var salt = crypto.randomBytes(16).toString('hex');
	    computeHash(newPassword, salt, function(err, newSalt, newHash) {
		if (err) {
		    res.status(401).text('Error in computeHash: ' + err);
		} else {
		    updateUser(email, newHash, newSalt, function(err, data) {
			if (err) {
			    res.status(401).text('Error in updateUser: ' + err);
			} else {
			    console.log('User password changed: ' + email);
			    res.status(200).json({
				changed: true
			    });
			}
		    });
		}
	    });
	}
    });
});




module.exports = router;
