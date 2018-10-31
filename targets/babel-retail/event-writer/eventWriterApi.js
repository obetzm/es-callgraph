'use strict';

var aws = require('aws-sdk'); // eslint-disable-line import/no-unresolved, import/no-extraneous-dependencies
// TODO Make a dynamoDB in a service that holds all of the schema and a schema-getter and validator, instead of listing them out here


var AJV = require('ajv');

var ajv = new AJV();

var makeSchemaId = function makeSchemaId(schema) {
  return "".concat(schema.self.vendor, "/").concat(schema.self.name, "/").concat(schema.self.version);
};

var productPurchaseSchema = require('./schemas/product-purchase-schema.json');

var productCreateSchema = require('./schemas/product-create-schema.json');

var userLoginSchema = require('./schemas/user-login-schema.json');

var updatePhoneSchema = require('./schemas/user-update-phone-schema.json');

var addRoleSchema = require('./schemas/user-add-role-schema.json'); // const addCartSchema = require('./schemas/product-cart-schema.json')


var removeCartSchema = require('./schemas/cart-remove-schema.json');

var addCartSchema = require('./schemas/cart-add-schema.json');

var productPurchaseSchemaId = makeSchemaId(productPurchaseSchema);
var productCreateSchemaId = makeSchemaId(productCreateSchema);
var userLoginSchemaId = makeSchemaId(userLoginSchema);
var updatePhoneSchemaId = makeSchemaId(updatePhoneSchema);
var addRoleSchemaId = makeSchemaId(addRoleSchema);
var addCartSchemaId = makeSchemaId(addCartSchema);
var removeCartSchemaId = makeSchemaId(removeCartSchema);
ajv.addSchema(productPurchaseSchema, productPurchaseSchemaId);
ajv.addSchema(productCreateSchema, productCreateSchemaId);
ajv.addSchema(userLoginSchema, userLoginSchemaId);
ajv.addSchema(updatePhoneSchema, updatePhoneSchemaId);
ajv.addSchema(addRoleSchema, addRoleSchemaId);
ajv.addSchema(addCartSchema, addCartSchemaId);
ajv.addSchema(removeCartSchema, removeCartSchemaId);
var constants = {
  INVALID_REQUEST: 'Invalid Request: could not validate request to the schema provided.',
  INTEGRATION_ERROR: 'Kinesis Integration Error',
  API_NAME: 'Retail Stream Event Writer'
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
  clientError: function clientError(error, event) {
    return impl.response(400, "".concat(constants.API_NAME, " ").concat(constants.INVALID_REQUEST, "  ").concat(error, ".  Event: '").concat(JSON.stringify(event), "'"));
  },
  kinesisError: function kinesisError(schemaName, err) {
    console.log(err);
    return impl.response(500, "".concat(constants.API_NAME, " - ").concat(constants.INTEGRATION_ERROR, " trying to write an event for '").concat(JSON.stringify(schemaName), "'"));
  },
  success: function success(response) {
    return impl.response(200, JSON.stringify(response));
  },
  validateAndWriteKinesisEventFromApiEndpoint: function validateAndWriteKinesisEventFromApiEndpoint(event, callback) {
    console.log(JSON.stringify(event));
    var eventData = JSON.parse(event.body);
    console.log(eventData);
    var origin = eventData.origin;
    console.log(origin);
    delete eventData.origin;

    if (!eventData.schema || typeof eventData.schema !== 'string') {
      callback(null, impl.clientError('Schema name is missing or not a string in received event.', event));
    } else {
      var schema = ajv.getSchema(eventData.schema);

      if (!schema) {
        callback(null, impl.clientError("Schema name ".concat(eventData.schema, " is not registered."), event));
      } else if (!ajv.validate(eventData.schema, eventData)) {
        callback(null, impl.clientError("Could not validate event to the schema ".concat(eventData.schema, ".  Errors: ").concat(ajv.errorsText()), event));
      } else {
        var kinesis = new aws.Kinesis();
        var newEvent = {
          Data: JSON.stringify({
            schema: 'com.nordstrom/retail-stream-ingress/1-0-0',
            timeOrigin: new Date().toISOString(),
            data: eventData,
            origin: origin // TODO mask any PII here

          }),
          PartitionKey: eventData.id,
          // TODO if some schema use id field something other than the partition key, the schema need to have a keyName field and here code should be eventData[eventData.keyName]
          StreamName: process.env.STREAM_NAME
        };
        kinesis.putRecord(newEvent, function (err, data) {
          if (err) {
            callback(null, impl.kinesisError(eventData.schema, err));
          } else {
            callback(null, impl.success(data));
          }
        });
      }
    }
  }
};
var api = {
  /**
   * Send the retail event to the retail stream.  Example events:
   *
   * product-purchase:
   {
     "schema": "com.nordstrom/product/purchase/1-0-0",
     "id": "4579874"
   }
   *
   * product-create:
   {
     "schema": "com.nordstrom/product/create/1-0-0",
     "id": "4579874",
     "brand": "POLO RALPH LAUREN",
     "name": "Polo Ralph Lauren 3-Pack Socks",
     "description": "PAGE:/s/polo-ralph-lauren-3-pack-socks/4579874",
     "category": "Socks for Men"
   }
   *
   * user-login:
   {
     "schema": "com.nordstrom/user-info/create/1-0-0",
     "id": "amzn1.account.AHMNGKVGNQYJUV7BZZZMFH3HP3KQ",
     "name": "Greg Smith"
   }
   *
   * update-phone:
   {
     "schema": "com.nordstrom/user-info/create/1-0-0",
     "id": "amzn1.account.AHMNGKVGNQYJUV7BZZZMFH3HP3KQ",
     "phone": "4255552603"
   }
   *
   * @param event The API Gateway lambda invocation event describing the event to be written to the retail stream.
   * @param context AWS runtime related information, e.g. log group id, timeout, request id, etc.
   * @param callback The callback to inform of completion: (error, result).
   */
  eventWriter: function eventWriter(event, context, callback) {
    impl.validateAndWriteKinesisEventFromApiEndpoint(event, callback);
  }
};
module.exports = {
  eventWriter: api.eventWriter
};