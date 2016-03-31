var AWS = require("aws-sdk");

AWS.config.update({
	region: "us-west-2"
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "bidnumber"
};

/*
dynamodb.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
	}
*/
		
	params = {
		TableName : "bidnumber",
		KeySchema: [
			{ AttributeName: "id", KeyType: "HASH"}
		],
		AttributeDefinitions: [
			{ AttributeName: "id", AttributeType: "S" }
		],
		ProvisionedThroughput: {
			ReadCapacityUnits: 10,
			WriteCapacityUnits: 10
		}
	};

	dynamodb.createTable(params, function(err, data) {
		if (err) {
			console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
		}
		var docClient = new AWS.DynamoDB.DocumentClient();

		params = {
			TableName: "bidnumber",
			Item: {
				"id": "key",
				"num": 0
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
	});

//});
