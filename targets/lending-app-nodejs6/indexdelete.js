'use strict';
console.log('Loading function');

var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TABLE_NAME;

const createResponse = (statusCode, body) => {
    return {
        "statusCode": statusCode,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
        },
        "body": JSON.stringify(body)
    };
};

exports.delete = (event, context, callback) => {
  var response;
  console.log('event:' + JSON.stringify(event));
  if (!tableName || !event.pathParameters.resourceId) {
      response = createResponse(500, 'parameter check error');
      callback(null, response);
      return;
  }
  var params = {
    TableName: tableName,
    Key: {
      id: event.pathParameters.resourceId
    }
  };
  dynamo.delete(params, (err, data) => {
    var response;
    if (err)
      response = createResponse(500, err);
    else
      response = createResponse(200, null);
    callback(null, response);
  });
};
