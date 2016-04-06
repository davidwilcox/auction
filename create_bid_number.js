var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-west-2"
});

var dynamodb = new AWS.DynamoDB();

var docClient = new AWS.DynamoDB.DocumentClient();

params = {
	TableName: "bidnumber",
	Item: {
		"id": "key",
		"number": 0
	}
};

docClient.put(params, function(err, data) {
	if ( err ) {
		console.log(err);
	}
	if ( data ) {
		console.log(data);
	}
});
