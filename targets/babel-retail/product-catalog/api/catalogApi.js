'use strict';

var AJV = require('ajv');

var aws = require('aws-sdk'); // eslint-disable-line import/no-unresolved, import/no-extraneous-dependencies
// TODO Get these from a better place later


var categoryRequestSchema = require('./categories-request-schema.json');

var categoryItemsSchema = require('./category-items-schema.json');

var productsRequestSchema = require('./products-request-schema.json');

var productItemsSchema = require('./product-items-schema.json'); // TODO generalize this?  it is used by but not specific to this module


var makeSchemaId = function makeSchemaId(schema) {
  return "".concat(schema.self.vendor, "/").concat(schema.self.name, "/").concat(schema.self.version);
};

var categoryRequestSchemaId = makeSchemaId(categoryRequestSchema);
var categoryItemsSchemaId = makeSchemaId(categoryItemsSchema);
var productsRequestSchemaId = makeSchemaId(productsRequestSchema);
var productItemsSchemaId = makeSchemaId(productItemsSchema);
var ajv = new AJV();
ajv.addSchema(categoryRequestSchema, categoryRequestSchemaId);
ajv.addSchema(categoryItemsSchema, categoryItemsSchemaId);
ajv.addSchema(productsRequestSchema, productsRequestSchemaId);
ajv.addSchema(productItemsSchema, productItemsSchemaId);
var dynamo = new aws.DynamoDB.DocumentClient();
var constants = {
  // self
  MODULE: 'product-catalog/catalogApi.js',
  // methods
  METHOD_CATEGORIES: 'categories',
  METHOD_PRODUCTS: 'products',
  // resources
  TABLE_PRODUCT_CATEGORY_NAME: process.env.TABLE_PRODUCT_CATEGORY_NAME,
  TABLE_PRODUCT_CATALOG_NAME: process.env.TABLE_PRODUCT_CATALOG_NAME,
  //
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
    return impl.response(400, "".concat(constants.METHOD_CATEGORIES, " ").concat(constants.INVALID_REQUEST, " could not validate request to '").concat(schemaId, "' schema. Errors: '").concat(ajvErrors, "' found in event: '").concat(JSON.stringify(event), "'") // eslint-disable-line comma-dangle
    );
  },
  dynamoError: function dynamoError(err) {
    console.log(err);
    return impl.response(500, "".concat(constants.METHOD_CATEGORIES, " - ").concat(constants.INTEGRATION_ERROR));
  },
  securityRisk: function securityRisk(schemaId, ajvErrors, items) {
    console.log(constants.HASHES);
    console.log(constants.SECURITY_RISK);
    console.log("".concat(constants.METHOD_CATEGORIES, " ").concat(constants.DATA_CORRUPTION, " could not validate data to '").concat(schemaId, "' schema. Errors: ").concat(ajvErrors));
    console.log("".concat(constants.METHOD_CATEGORIES, " ").concat(constants.DATA_CORRUPTION, " bad data: ").concat(JSON.stringify(items)));
    console.log(constants.HASHES);
    return impl.response(500, "".concat(constants.METHOD_CATEGORIES, " - ").concat(constants.INTEGRATION_ERROR));
  },
  success: function success(items) {
    return impl.response(200, JSON.stringify(items));
  }
};
var api = {
  // TODO deal with pagination
  categories: function categories(event, context, callback) {
    if (!ajv.validate(categoryRequestSchemaId, event)) {
      // bad request
      callback(null, impl.clientError(categoryRequestSchemaId, ajv.errorsText()), event);
    } else {
      var params = {
        TableName: constants.TABLE_PRODUCT_CATEGORY_NAME,
        AttributesToGet: ['category']
      };
      dynamo.scan(params, function (err, data) {
        if (err) {
          // error from dynamo
          callback(null, impl.dynamoError(err));
        } else if (!ajv.validate(categoryItemsSchemaId, data.Items)) {
          // bad data in dynamo
          callback(null, impl.securityRisk(categoryItemsSchemaId, ajv.errorsText()), data.Items); // careful if the data is sensitive
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
        TableName: constants.TABLE_PRODUCT_CATALOG_NAME,
        IndexName: 'Category',
        ProjectionExpression: '#i, #b, #n, #d',
        KeyConditionExpression: '#c = :c',
        ExpressionAttributeNames: {
          '#i': 'id',
          '#c': 'category',
          '#b': 'brand',
          '#n': 'name',
          '#d': 'description'
        },
        ExpressionAttributeValues: {
          ':c': event.queryStringParameters.category
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
  categories: api.categories,
  products: api.products
};