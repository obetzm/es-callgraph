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

exports.put = (event, context, callback) => {
    var response;
    if (!event.body) {
        response = createResponse(500, 'body existence check error');
        callback(null, response);
        return;
    }
    console.log('event:' + JSON.stringify(event));
    var body = JSON.parse(event.body);
    if(!body.returnDate){
        body.returnDate = "on loan";
    }
    if (!tableName || !body.loanDate || !body.scheduledReturnDate || !body.bookId || !body.name || !body.email || isNaN(body.bookId)) {
        response = createResponse(500, 'parameter check error');
        callback(null, response);
        return;
    }
    var item = {
        id: event.pathParameters.resourceId,
        loan_date: body.loanDate,
        scheduled_return_date: body.scheduledReturnDate,
        book_id: body.bookId,
        name: body.name,
        email: body.email,
        return_date: body.returnDate
    };

    var params = {
        TableName: tableName,
        Item: item
    };

    dynamo.put(params, (err, data) => {
        var response;
        if (err)
            response = createResponse(500, err);
        else
            response = createResponse(200, data);
        callback(null, response);
    });
};
