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

var jwtsign = require('jsonwebtoken');
var multiparty = require('connect-multiparty');
var multipartyMiddleware = multiparty();
const fs = require('fs');


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


module.exports.createguest = function(event, context, callback) {
    var req = event;
    var guest = req.body;
    if ( !('name' in guest) ) {
	callback({Message:"'name' attribute not defined."});
	return;
    } else if ( !('foodRes' in guest) ) {
	callback({Message:"'foodRes' attribute not defined."});
	return;
    } else if ( !('agegroup' in guest) ) {
	callback({Message:"'agegroup' attribute not defined."});
	return;
    } else if ( guest.agegroup != 'ADULT_TICKET' && guest.agegroup != 'HIGHSCHOOL_TICKET' && guest.agegroup != 'CHILD_TICKET' && guest.agegroup != "JUNIORHIGH_TICKET" ) {
	callback({Message:"'agegroup' should be set to 'ADULT_TICKET', 'HIGHSCHOOL_TICKET', 'HIGHSCHOOL_TICKET' or 'CHILD_TICKET'"});
	return;
    } else if ( guest.foodRes != 'NONE_FOOD' && guest.foodRes != 'VEGETARIAN_FOOD' && guest.foodRes != 'GLUTENFREE_FOOD' ) {
	callback({Message:"'foodRes' should be set to 'VEGETARIAN_FOOD', 'NONE_FOOD' or 'GLUTENFREE_FOOD'"});
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
		    callback({error: "Unable to add item. Error JSON:" + err});
		} else {
		    console.log("Added item:", JSON.stringify(data, null, 2));
		    callback(null,{
			statusCode: 200,data
		    });
		}
	    });
	};




        cnt++;
        if ( cnt == 5 ) {
            callback({error:"unstable bid number"});
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

};



module.exports.findtickets = function(event, context, callback) {
    //router.get("/findtickets/:email", function(req, res, next) {
    var req = event;
    
    var params = {
	TableName: "tickets",
	IndexName: "useremail",
	KeyConditionExpression: "login = :email",
	ExpressionAttributeValues: {
	    ":email": req.pathParameters.email
	}
    };
    docClient.query(params, function(err, data) {
	if (err || !data.Items) {
	    console.error(err);
	    callback({error: err});
	} else {
	    callback(null,{
		statusCode: 200,
		body:data.Items
	    });
	}
    });
};



module.exports.allitems = function(event, context, callback) {
//router.get('/allitems', function(req, res, next) {
    var req = event;
    var params = {
	TableName: "items"
    };

    if ( req.queryStringParameters ) {
	if ( req.queryStringParameters.searchname && req.queryStringParameters.searchitemnumber ) {
	    params.FilterExpression = "contains(#itemname, :itemname) AND (#itemnumber = :itemnumber)";
	    params.ExpressionAttributeValues =  {
		":itemname": req.queryStringParameters.searchname,
		":itemnumber": parseInt(req.queryStringParameters.searchitemnumber)
	    };
	    params.ExpressionAttributeNames = {
		"#itemname": "name",
		"#itemnumber": "number"
	    };
	}
	else if ( req.queryStringParameters.searchname ) {
	    params.FilterExpression = "contains(#itemname, :itemname)";
	    params.ExpressionAttributeValues =  {
		":itemname": req.queryStringParameters.searchname
	    };
	    params.ExpressionAttributeNames = {
		"#itemname": "name"
	    };
	} else if ( req.queryStringParameters.searchitemnumber ) {
	    params.FilterExpression = "(#itemnumber = :itemnumber)";
	    params.ExpressionAttributeValues =  {
		":itemnumber": parseInt(req.queryStringParameters.searchitemnumber)
	    };
	    params.ExpressionAttributeNames = {
		"#itemnumber": "number"
	    };
	}
    }
    docClient.scan(params, function(err, data) {
	if ( err ) {
	    console.error(err);
	} else {
	    callback(null,{
		statusCode: 200,
		body: data.Items
	    });
	}
    });
};


module.exports.allFromTable = function(event, context, callback) {
    //router.get("/all/:table", function(req, res, next) {
    var req = event;
    console.log(event);
    var params = {
	TableName: req.pathParameters.table
    };
    docClient.scan(params, function(err, data) {
	if (err) {
	    console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
	    callback(err);
	} else {
	    console.log(JSON.stringify(data.Items));
	    callback(null,{
		statusCode: 200,
		body: data.Items
	    });
	}
    });
};



module.exports.uploadphoto = function(event, context, callback) {
    //router.post('/uploadphoto', multipartyMiddleware, function(req, res, next) {

    var req = JSON.parse(event.body);
    console.log(req);

    if ( !req.photo ) {
	callback({message : "Please fill in a photo"});
    }
    if ( !req.filename ) {
	callback({message: "Please fill in a filename"});
    }

    var extension = req.filename.split('.').pop();
    var new_filename = guid() + '.' + extension;
    var AWS2 = require("aws-sdk");
    var s3bucket = new AWS.S3({params: {Bucket: 'svuus-photos'}});
    
    //var buf = new Buffer(req.body.photo.split(',')[1], 'base64');
    var params = {Key: new_filename, Body: new Buffer(req.photo.data)};
    s3bucket.upload(params, function(err, data) {
	if ( err ) {
	    console.log(err);
	    callback({message: err});
	} else {
	    console.log("UPLOADED:" + JSON.stringify({
		statusCode: 200,
		body: {photoid : params.Key}}));
	    callback(null,{
		statusCode: 200,
		body: {photoid : params.Key}});
	}
    });
};


module.exports.register = function(event, context, callback) {
    //router.post('/register', function(req, res, next) {
    var req = event;
    if ( !req.body.email || !req.body.password ) {
	return callback({message: 'Please fill out email and password.'});
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
	    return callback({message: "username already used."});
	} else {

	    var today = new Date();
	    var exp = new Date(today);
	    exp.setDate(today.getDate() + 1);

	    delete req.body.hash;
	    delete req.body.salt;
	    callback(null,{
		statusCode: 200,
		body: {token: jwtsign.sign({
		    email: req.body.email,
		    user: req.body,
		    exp: parseInt(exp.getTime()/1000),
		}, 'SECRET')}});
	}
    });
};

/*
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
		callback(null, {exists: "true" } );
	    } else {
		callback(null, {exists: "false" } );
	    }
	}
    });
};
*/

var jwt = require('express-jwt');
var auth = jwt({secret: "SECRET", userProperty: "payload"});
var crypto = require('crypto');
//var passport = require('passport');



module.exports.ReplaceUserPhotoId = function(event, context, callback) {
    //router.post('/replace_user_photo_id', function(req, res, next) {
    var req = event;
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
	    callback(err);
	} else {
	    callback(null,
		     {
			 statusCode: 200,
			 body: { success: true }});
	}
    });
};



function send_invoice(req, res, msg, subject, do_charge) {
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
	var m = {};

	var items = data[1];
	var bidder_to_items = {};
	var indexed_items = {};
	for(var idx in items) {
	    var item = items[idx];
	    indexed_items[item.id] = item;
	}
	var indexed_bidders = {};
	for(var idx in data[0]) {
	    var ticket = data[0][idx];
	    indexed_bidders[ticket.bidnumber] = ticket;
	}

	for(var idx in data[2]) {
	    var transaction = data[2][idx];
	    if ( transaction.sellprice ) {
		if ( !(transaction.bidnumber in m) )
		    m[transaction.bidnumber] = 0;
		m[transaction.bidnumber] += parseFloat(transaction.sellprice)*100;

		if ( !(transaction.bidnumber in bidder_to_items) )
		    bidder_to_items[transaction.bidnumber] = []
		var transitem = JSON.parse(JSON.stringify(indexed_items[transaction.itemid]));
		transitem.buyername = indexed_bidders[transaction.bidnumber].firstname + " " + indexed_bidders[transaction.bidnumber].lastname;
		transitem.sellprice = transaction.sellprice;
		bidder_to_items[transaction.bidnumber].push(transitem);
	    }
	}

	var customermap = {};
	var chargemap = {};
	var customer_to_bidnums = {};
	for(var idx in data[0]) {
	    var ticket = data[0][idx];
	    var name = ticket.firstname + " " + ticket.lastname;
	    if ( ticket.bidnumber in m && ticket.stripe_customer_id ) {
		if ( !(ticket.stripe_customer_id in customermap) ) {
		    chargemap[ticket.stripe_customer_id] = 0;
		    customer_to_bidnums[ticket.stripe_customer_id] = [];
		}
		chargemap[ticket.stripe_customer_id] += m[ticket.bidnumber];
		customermap[ticket.stripe_customer_id] = ticket.buyer.email;
		customer_to_bidnums[ticket.stripe_customer_id].push(ticket.bidnumber);
 	    }
	}

	var charges = [];
	for(var customerid in customermap) {
	    var charge = {
		amount: chargemap[customerid],
		currency: "usd",
		customer: customerid,
		description: "purchase auction items for " + customermap[customerid]
	    };


	    charges.push(new Promise(function(resolve, reject) {

		var message = '';
		for(var idx in customer_to_bidnums[customerid]) {
		    var bidnum = customer_to_bidnums[customerid][idx];
		    for(var idx in bidder_to_items[bidnum]) {
			var item = bidder_to_items[bidnum][idx];
			message += "<tr><td>" + item.buyername + "</td><td>" + item.name + "</td><td>$" + item.sellprice + "</td></tr>";
		    }
		}
		
		ses.sendEmail({
		    Source: "kristenamay@gmail.com",
		    Destination: {
			ToAddresses: [
			    customermap[customerid]
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
				    + msg + chargemap[customerid]/100 + '. Here is an itemized list:'
				    + '<table>'
				    + message
				    + "</table>"
				    + '</body></html>'
			    }
			}
		    }
		}, function(err, data) {
		    if ( err ) {
			console.log(err);
			reject(err);
		    }
		    if ( data )
			resolve(data);
		});
	    }));
	}


	if ( do_charge ) {


	    charges.push(new Promise(function(resolve, reject) {
		stripe.charges.create(charge, function(charge_err, charge) {
		    if ( charge_err ) {
			reject({err: charge_err});
		    } else {
			resolve({charge_id: charge.id});
		    }
		});
	    }));
	}

	Promise.all(charges).then(function(data) {
	    callback(null,{
		statusCode: 200,
		body: {success: true}
	    });
	}, function(err) {
	    console.log(err);
	});
    });
}

module.exports.ChargeAllUsers = function(event, context, callback) {
    //router.post('/charge_all_users', function(req, res, next) {
    var req = event.body;
    send_invoice(req,res,'This email confirms your purchase of items for the SVUUS auction. Your credit card has been charged for $',"SVUUS Auction Items Purchased.",true);
};

module.exports.SendInvoice = function(event, context, callback) {
    //router.post('/send_invoice', function(req, res, next) {
    var req = event.body;
    send_invoice(req,res,'This email details items that you bid on at the SVUUS auction. Please let us know if there are any problems with this invoice. Your credit card will be charged for $',"SVUUS Auction Invoice", false);
};


module.exports.addadmin = function(event, context, callback) {
    //router.post('/addadmin', function(req, res, next) {
    var req = event;

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
	    callback(null, {err: err, success: false } );
	} else {
	    callback(null, {
		statusCode: 200,
		body: {success: true}
	    });
	}
    });
};


module.exports.SubmitItem = function(event, context, callback) {
    //router.post('/submititem', auth, function(req, res, next) {
    var req = event;
    var item = req.body;
    if ( !item.id )
        item.id = guid();

    if ( item.pricingnotes == '' )
	delete item.pricingnotes;
    if ( item.eventtypedtime == '' )
	delete item.eventtypedtime;

    var params = {
	TableName: "items",
	Item: item
    };

    docClient.put(params, function(err, data) {
	if ( err ) {
            console.log("err");
            console.log(err);
	    callback({error: err});
	} else {
            callback(null,{
		statusCode: 200,
		body: {message: "item added"}
	    });
	}
    });
};


module.exports.ChargeCustomer = function(event, context, callback) {
    //router.post('/chargecustomer', auth, function(req, res, next) {
    var req = event;

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
                callback({err: charge_err});
            }
            else if ( cust_err ) {
                callback({err: cust_err});
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
						+ 'This email confirms your purchase of tickets for the SVUUS auction. Your credit card has been charged for $' + amount/100 + '. You bought tickets for: ' + tickets.reduce(function(prevValue,curValue) {
						    return prevValue + "," + curValue.firstname
							+ " " + curValue.lastname;
						}, '').substring(1)
						+ "<br>Cya at the auction!"
						+ '</body></html>'
					}
				    }
				}
			    }, function(err, data) {
				if ( err )
				    console.log(err);
				return callback(null,{
				    statusCode: 200,
				    body: {added: true}});
			    });

			} else {
			    purch(num+1);
			}
		    }, function(err) {
			callback(err);
		    });
		};
		purch(0);
            }
        } );
    });
};


module.exports.ModifyTicket = function(event, context, callback) {
    //router.post('/modify_ticket', auth, function(req, res, next) {
    var req = event;

    var ticket = req.body.ticket;
    var params = {
	TableName: "tickets",
	Item: ticket
    };

    console.log(params);

    docClient.put(params, function(err, data) {
	if ( err ) {
            console.log("err");
            console.log(err);
	    callback({error: err});
	} else {
            callback(null,{
		statusCode: 200,
		body: {message: "ticket added"}});
	}
    });

};



module.exports.DeleteBidder = function(event, context, callback) {
    //router.post('/deletebidder', auth, function(req, res, next) {
    var req = event;
    var bidnum = req.body.bidnumber;
    var transactions = req.body.transactions;

    var promises = [];

    if ( transactions ) {
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
    }

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
	callback(null,{
	    statusCode: 200,
	    body: data});
    }, function(err) {
	console.log(err);
	callback(err);
    });
};


module.exports.DeleteItem = function(event, context, callback) {
    //router.post('/deleteitem', auth, function(req, res, next) {
    var req = event;
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
	callback(null,{
	    statusCode: 200,
	    body: data});
    }, function(err) {
	console.log(err);
	callback(err);
    });
};



module.exports.DeleteTransaction = function(event, context, callback) {
    //router.post('/deletetransaction', auth, function(req, res, next) {
    var req = event;
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
	    callback({error: err});
	} else {
	    callback(null,{
		statusCode: 200,
		body: {data: data}
	    });
	}
    });
};



module.exports.AddBuyer = function(event, context, callback) {
    //router.post('/addbuyer', auth, function(req, res, next) {
    var req = event;
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
	    callback({error: err});
	} else {
	    console.log(data);
	    callback(null,{
		statusCode: 200,
		body: it});
	}
    });
};





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

module.exports.LostPassword = function(event, context, callback) {
    //router.post('/lost_password', function(req, res, next) {
    var email = req.body.email;

    getUser(email, function(err, emailFound) {
	if (err) {
	    callback({err:'Error in getUserFromEmail: ' + err});
	} else if (!emailFound) {
	    console.log('User not found: ' + email);
	    callback({
		statusCode: 200,
		body: {
		    sent: false
		}});
	} else {
	    storeLostToken(email, function(err, token) {
		if (err) {
		    callback({err:'Error in storeLostToken: ' + err});
		} else {
		    sendLostPasswordEmail(email, token, function(err, data) {
			if (err) {
			    callback({err:'Error in sendLostPasswordEmail: ' + err});
			} else {
			    console.log('User found: ' + email);
			    callback(null,{
				statusCode: 200,
				body: {
				    sent: true
				}});
			}
		    });
		}
	    });
	}
    });
};





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


module.exports.ResetPassword = function(event, context, callback) {
    //router.post('/reset_password', function(req, res, next) {
    var req = event;
    var event = req.body;
    var email = event.email;
    var lostToken = event.lost;
    var newPassword = event.password;

    getUserLost(email, function(err, correctToken) {
	console.log(correctToken);
	console.log(lostToken);
	if (err) {
	    callback({err:'Error in getUserLost: ' + err});
	} else if (!correctToken) {
	    console.log('No lostToken for user: ' + email);
	    callback(null,{
		statusCode: 200,body: {
		    changed: false
		}});
	} else if (lostToken != correctToken) {
	    // Wrong token, no password lost
	    console.log('Wrong lostToken for user: ' + email);
	    callback(null,{
		statusCode: 200,
		body: {
		    changed: false
		}});
	} else {
	    console.log('User logged in: ' + email);
	    var salt = crypto.randomBytes(16).toString('hex');
	    computeHash(newPassword, salt, function(err, newSalt, newHash) {
		if (err) {
		    callback({err:'Error in computeHash: ' + err});
		} else {
		    updateUser(email, newHash, newSalt, function(err, data) {
			if (err) {
			    callback({err:'Error in updateUser: ' + err});
			} else {
			    console.log('User password changed: ' + email);
			    callback(null,{
				statusCode: 200,body: {
				    changed: true
				}});
			}
		    });
		}
	    });
	}
    });
};




//module.exports = router;
