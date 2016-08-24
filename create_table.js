var AWS = require("aws-sdk");

AWS.config.update({
    region: "us-west-2"//,
    //endpoint: "http://localhost:8000"
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "bidnumber",
    KeySchema: [
        { AttributeName: "id", KeyType: "HASH"}
    ],
    AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    }
};

result = dynamodb.createTable(params, function(err, data) {
	console.log(err);
	console.log(data);
});

var params = {
    TableName: "transactions",
    KeySchema: [
	{ AttributeName: "transactionid", KeyType: "HASH" }
    ],
    AttributeDefinitions: [
	{ AttributeName: "bidnumber", AttributeType: "N" },
	{ AttributeName: "itemid", AttributeType: "S" },
	{ AttributeName: "transactionid", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
	ReadCapacityUnits: 1,
	WriteCapacityUnits: 1
    },
    GlobalSecondaryIndexes: [
	{
	    IndexName: "itemindex",
	    KeySchema: [
		{AttributeName: "itemid", KeyType: "HASH"},
		{ AttributeName: "bidnumber", KeyType: "RANGE" },
	    ],
	    Projection: {
		"ProjectionType": "ALL"
	    },
	    ProvisionedThroughput: {
		"ReadCapacityUnits": 1,"WriteCapacityUnits": 1
	    }
	}
    ]
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
	console.error("Unable to create table transactions. Error JSON:", JSON.stringify(err, null, 2));
    } else {
	console.log("Created Table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});

var params = {
    TableName : "users",
    KeySchema: [
        { AttributeName: "email", KeyType: "HASH"}
    ],
    AttributeDefinitions: [
        { AttributeName: "email", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});

var params = {
    TableName : "tickets",
	AttributeDefinitions: [{
	    AttributeName: "bidnumber",
	    AttributeType: "N"
	},{
	    AttributeName: "login",
	    AttributeType: "S"
	}],
    KeySchema: [{
	AttributeName: "bidnumber",
        KeyType: "HASH"
    }, {
	AttributeName: "login",
	KeyType: "RANGE"
    }],
    GlobalSecondaryIndexes: [
	{
	    IndexName: "useremail",
	    KeySchema: [
		{AttributeName: "login", KeyType: "HASH"}
	    ],
	    Projection: {
		"ProjectionType": "ALL"
	    },
	    ProvisionedThroughput: {
		"ReadCapacityUnits": 1,"WriteCapacityUnits": 1
	    }
	}
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table tickets. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});

var params = {
    TableName : "items",
    KeySchema: [
        { AttributeName: "id", KeyType: "HASH"}
    ],
    AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});
