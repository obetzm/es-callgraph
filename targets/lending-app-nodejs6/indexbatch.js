'use strict';
var os = require('os');
var eol = os.EOL;
console.log('Loading function');

var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();
var SES = new AWS.SES({
    apiVersion: '2010-12-01'
});

var date = new Date();
date.setTime(date.getTime() + 32400000); // 1000 * 60 * 60 * 9(hour)

const tableName = process.env.TABLE_NAME;
const subject = process.env.SUBJECT;
const message1 = process.env.MESSAGE1;
const message2 = process.env.MESSAGE2;
const message3 = process.env.MESSAGE3;
const emailAdmin = process.env.EMAIL_ADMIN;
const emailCCAddress = process.env.EMAIL_CC_ADDRESS;
const notifiedNDaysAgo = process.env.NOTIFIED_N_DAYS_AGO;

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

exports.check = function (event, context, callback) {
    if (!tableName || !subject || !emailAdmin || !notifiedNDaysAgo || isNaN(notifiedNDaysAgo)) {
        var response;
        response = createResponse(500, 'parameter check error');
        callback(null, response);
        return;
    }
    var params = {
        TableName: tableName,
        ExpressionAttributeValues:{
            ':condition': 'on loan'
        },
        FilterExpression : 'return_date = :condition'
    };
    console.log('dynamoparams:' + JSON.stringify(params));
    dynamo.scan(params, (err, data) => {
        console.log('dynamodata:' + JSON.stringify(data));
        var response;
        if (err) {
            response = createResponse(500, err);
        } else {
            data.Items.forEach(function(record, index){
                console.log('new Date(record.scheduled_return_date).getTime():' + new Date(record.scheduled_return_date).getTime());
                if(new Date(record.scheduled_return_date).getTime() <= (date.getTime() + 1000 * 60 * 60 * 24 * Number(notifiedNDaysAgo))) {
                    if(!emailCCAddress) {
                        var eParams = {
                            Destination: {
                                ToAddresses: record.email
                            },
                            Message: {
                                Body: {
                                    Text: {
                                        Data: message1 + eol + eol + message2 + eol + record.scheduled_return_date + eol + eol + message3,
                                        Charset: 'utf-8'
                                    }
                                },
                                Subject: {
                                    Data: subject,
                                    Charset: 'utf-8'
                                }
                            },
                            Source: emailAdmin
                        };
                    } else {
                        eParams = {
                            Destination: {
                                ToAddresses: record.email,
                                CcAddresses: emailCCAddress
                            },
                            Message: {
                                Body: {
                                    Text: {
                                        Data: message1 + eol + eol + message2 + eol + record.scheduled_return_date + eol + eol + message3,
                                        Charset: 'utf-8'
                                    }
                                },
                                Subject: {
                                    Data: subject,
                                    Charset: 'utf-8'
                                }
                            },
                            Source: emailAdmin
                        };
                    }
                    console.log('seseParams:' + JSON.stringify(eParams));
                    SES.sendEmail(eParams, (err, data) => {
                        if (err)
                            response = createResponse(500, err);
                        else
                            response = createResponse(200, 'sesdata:' + data);
                    });
                }
            });
        }
        callback(null, response);
    });
};
