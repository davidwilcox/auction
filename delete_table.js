var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2"
});

var dynamodb = new AWS.DynamoDB();

["tickets", "items", "users", "bidnumber"].forEach(function(name) {
	console.log(name);
	var params = {
		TableName : name
	};

	dynamodb.deleteTable(params, function(err, data) {
		if (err) {
			console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
		}
	});
});
