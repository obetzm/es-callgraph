'use strict';

var AJV = require('ajv');

var aws = require('aws-sdk'); // eslint-disable-line import/no-unresolved, import/no-extraneous-dependencies


var productsRequestSchema = require('./products-request-schema.json');

var productItemsSchema = require('./product-items-schema.json');

var makeSchemaId = function makeSchemaId(schema) {
  return "".concat(schema.self.vendor, "/").concat(schema.self.name, "/").concat(schema.self.version);
};

var productsRequestSchemaId = makeSchemaId(productsRequestSchema);
var productItemsSchemaId = makeSchemaId(productItemsSchema);
var ajv = new AJV();
ajv.addSchema(productsRequestSchema, productsRequestSchemaId);
ajv.addSchema(productItemsSchema, productItemsSchemaId);
var dynamo = new aws.DynamoDB.DocumentClient();
var constants = {
  // self
  MODULE: 'cart/cartApi.js',
  METHOD_PRODUCTS: 'products',
  TABLE_CART_NAME: process.env.TABLE_CART_NAME,
  INVALID_REQUEST: 'Invalid Request',
  INTEGRATION_ERROR: 'Integration Error',
  HASHES: '##########################################################################################',
  SECURITY_RISK: '!!!SECURITY RISK!!!',
  DATA_CORRUPTION: 'DATA CORRUPTION'
};
var impl = {
  response: function response(statusCode, body) {
    return {
      statusCode: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        // Required for CORS support to work
        'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS

      },
      body: body
    };
  },
  clientError: function clientError(schemaId, ajvErrors, event) {
    return impl.response(400, "".concat(constants.METHOD_PRODUCTS, " ").concat(constants.INVALID_REQUEST, " could not validate request to '").concat(schemaId, "' schema. Errors: '").concat(ajvErrors, "' found in event: '").concat(JSON.stringify(event), "'") // eslint-disable-line comma-dangle
    );
  },
  dynamoError: function dynamoError(err) {
    console.log(err);
    return impl.response(500, "".concat(constants.METHOD_PRODUCTS, " - ").concat(constants.INTEGRATION_ERROR));
  },
  securityRisk: function securityRisk(schemaId, ajvErrors, items) {
    console.log(constants.HASHES);
    console.log(constants.SECURITY_RISK);
    console.log("".concat(constants.METHOD_PRODUCTS, " ").concat(constants.DATA_CORRUPTION, " could not validate data to '").concat(schemaId, "' schema. Errors: ").concat(ajvErrors));
    console.log("".concat(constants.METHOD_PRODUCTS, " ").concat(constants.DATA_CORRUPTION, " bad data: ").concat(JSON.stringify(items)));
    console.log(constants.HASHES);
    return impl.response(500, "".concat(constants.METHOD_PRODUCTS, " - ").concat(constants.INTEGRATION_ERROR));
  },
  success: function success(items) {
    return impl.response(200, JSON.stringify(items));
  }
};
var api = {
  // TODO deal with pagination
  categories: function categories(event, context, callback) {
    if (!ajv.validate(productsRequestSchemaId, event)) {
      // bad request
      callback(null, impl.clientError(productsRequestSchemaId, ajv.errorsText()), event);
    } else {
      var params = {
        TableName: constants.TABLE_CART_NAME,
        AttributesToGet: ['userId']
      };
      dynamo.scan(params, function (err, data) {
        if (err) {
          // error from dynamo
          callback(null, impl.dynamoError(err));
        } else if (!ajv.validate(productItemsSchemaId, data.Items)) {
          // bad data in dynamo
          callback(null, impl.securityRisk(productItemsSchemaId, ajv.errorsText()), data.Items); // careful if the data is sensitive
        } else {
          // valid
          callback(null, impl.success(data.Items));
        }
      });
    }
  },
  // TODO this is only filter/query impl, also handle single item request
  // TODO deal with pagination
  products: function products(event, context, callback) {
    if (!ajv.validate(productsRequestSchemaId, event)) {
      // bad request
      callback(null, impl.clientError(productsRequestSchemaId, ajv.errorsText(), event));
    } else {
      var params = {
        TableName: constants.TABLE_CART_NAME,
        IndexName: 'userId',
        ProjectionExpression: '#p, #c, #q, #up',
        KeyConditionExpression: '#u = :u',
        ExpressionAttributeNames: {
          '#u': 'userId',
          '#p': 'productId',
          '#c': 'createdAt',
          '#q': 'quantity',
          '#up': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':u': event.queryStringParameters.userId
        }
      };
      dynamo.query(params, function (err, data) {
        if (err) {
          // error from dynamo
          callback(null, impl.dynamoError(err));
        } else if (!ajv.validate(productItemsSchemaId, data.Items)) {
          // bad data in dynamo
          callback(null, impl.securityRisk(productItemsSchemaId, ajv.errorsText()), data.Items); // careful if the data is sensitive
        } else {
          // valid
          callback(null, impl.success(data.Items));
        }
      });
    }
  }
};
module.exports = {
  products: api.products
};