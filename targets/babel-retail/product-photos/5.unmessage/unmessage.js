'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _construct(Parent, args, Class) { if (isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var aws = require('aws-sdk'); // eslint-disable-line import/no-unresolved, import/no-extraneous-dependencies


var BbPromise = require('bluebird');

var Twilio = require('twilio');
/**
 * AWS
 */


aws.config.setPromisesDependency(BbPromise);
var dynamo = new aws.DynamoDB.DocumentClient();
var kms = new aws.KMS();
/**
 * Twilio
 */

var twilio = {
  sdk: undefined,
  accountSid: undefined,
  authToken: undefined
  /**
   * Constants
   */

};
var constants = {
  // internal
  ERROR_SERVER: 'Server Error',
  // module and method names
  MODULE: 'unmessage.js',
  METHOD_HANDLER: 'handler',
  METHOD_ENSURE_TWILIO_INITIALIZED: 'ensureAuthTokenDecrypted',
  METHOD_SEND_MESSAGE: 'sendMessage',
  // external
  TABLE_PHOTO_REGISTRATIONS_NAME: process.env.TABLE_PHOTO_REGISTRATIONS_NAME,
  TWILIO_ACCOUNT_SID_ENCRYPTED: process.env.TWILIO_ACCOUNT_SID_ENCRYPTED,
  TWILIO_AUTH_TOKEN_ENCRYPTED: process.env.TWILIO_AUTH_TOKEN_ENCRYPTED,
  TWILIO_NUMBER: process.env.TWILIO_NUMBER
  /**
   * Errors
   */

};

var ServerError =
/*#__PURE__*/
function (_Error) {
  _inherits(ServerError, _Error);

  function ServerError(message) {
    var _this;

    _classCallCheck(this, ServerError);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ServerError).call(this, message));
    _this.name = constants.ERROR_SERVER;
    return _this;
  }

  return ServerError;
}(_wrapNativeSuper(Error));
/**
 * Utility Methods (Internal)
 */


var util = {
  decrypt: function decrypt(field, value) {
    return kms.decrypt({
      CiphertextBlob: new Buffer(value, 'base64')
    }).promise().then(function (data) {
      return BbPromise.resolve(data.Plaintext.toString('ascii'));
    }, function (error) {
      return BbPromise.reject({
        field: field,
        error: error
      });
    } // eslint-disable-line comma-dangle
    );
  }
  /**
   * Implementation (Internal)
   */

};
var impl = {
  /**
   * Ensure that we have decrypted the Twilio credentials and initialized the SDK with them
   * @param event The event containing the photographer assignment
   */
  ensureAuthTokenDecrypted: function ensureAuthTokenDecrypted(event) {
    if (!twilio.sdk) {
      return BbPromise.all([util.decrypt('accountSid', constants.TWILIO_ACCOUNT_SID_ENCRYPTED), util.decrypt('authToken', constants.TWILIO_AUTH_TOKEN_ENCRYPTED)]).then(function (values) {
        twilio.accountSid = values[0];
        twilio.authToken = values[1];
        twilio.sdk = Twilio(twilio.accountSid, twilio.authToken);
        twilio.messagesCreate = BbPromise.promisify(twilio.sdk.messages.create);
        return BbPromise.resolve(event);
      }).catch(function (err) {
        return BbPromise.reject("".concat(constants.METHOD_ENSURE_TWILIO_INITIALIZED, " - Error decrypting '").concat(err.field, "': ").concat(err.error));
      } // eslint-disable-line comma-dangle
      );
    } else {
      return BbPromise.resolve(event);
    }
  },
  failAssignment: function failAssignment(event) {
    var updated = Date.now();
    var params = {
      TableName: constants.TABLE_PHOTO_REGISTRATIONS_NAME,
      Key: {
        id: event.photographer.id
      },
      ConditionExpression: '#aa=:aa',
      UpdateExpression: ['set', '#u=:u,', '#ub=:ub', 'remove', '#aa'].join(' '),
      ExpressionAttributeNames: {
        '#u': 'updated',
        '#ub': 'updatedBy',
        '#aa': 'assignment'
      },
      ExpressionAttributeValues: {
        ':u': updated,
        ':ub': event.origin,
        ':aa': event.data.id.toString()
      },
      ReturnValues: 'NONE',
      ReturnConsumedCapacity: 'NONE',
      ReturnItemCollectionMetrics: 'NONE'
    };
    return dynamo.update(params).promise().then(function () {
      return BbPromise.resolve(event);
    }, function (err) {
      return BbPromise.reject(new ServerError("error removing assignment from registration: ".concat(err)));
    } // eslint-disable-line comma-dangle
    );
  },

  /**
   * Send a message, generated by the given event, to the assigned photographer
   * @param event The event containing the photographer assignment
   */
  sendMessage: function sendMessage(event) {
    return twilio.messagesCreate({
      to: event.photographer.phone,
      from: constants.TWILIO_NUMBER,
      body: ["Hello ".concat(event.photographer.name, "."), 'You are unassigned.', 'We will send an assignment soon!'].join('\n')
    }).catch(function (ex) {
      return BbPromise.reject("".concat(constants.METHOD_SEND_MESSAGE, " - Error sending message to photographer via Twilio: ").concat(ex));
    } // eslint-disable-line comma-dangle
    );
  } // Example event:
  // {
  //   schema: 'com.nordstrom/retail-stream/1-0-0',
  //   origin: 'hello-retail/product-producer-automation',
  //   timeOrigin: '2017-01-12T18:29:25.171Z',
  //   data: {
  //     schema: 'com.nordstrom/product/create/1-0-0',
  //     id: 4579874,
  //     brand: 'POLO RALPH LAUREN',
  //     name: 'Polo Ralph Lauren 3-Pack Socks',
  //     description: 'PAGE:/s/polo-ralph-lauren-3-pack-socks/4579874',
  //     category: 'Socks for Men',
  //   },
  //   photographers: ['Erik'],
  //   photographer: {
  //     name: 'Erik',
  //     phone: '+<num>',
  //   },
  // }
  // Example Message Create Success Response:
  // {
  //   sid: '<mid>',
  //   date_created: 'Tue, 14 Feb 2017 01:32:57 +0000',
  //   date_updated: 'Tue, 14 Feb 2017 01:32:57 +0000',
  //   date_sent: null,
  //   account_sid: '<sid>',
  //   to: '+<to_num>',
  //   from: '+<from_num>',
  //   messaging_service_sid: null,
  //   body: 'Hello ${photographer.name}!\\nPlease snap a pic of:\\n Polo Ralph Lauren 3-Pack Socks',
  //   status: 'queued',
  //   num_segments: '1',
  //   num_media: '0',
  //   direction: 'outbound-api',
  //   api_version: '2010-04-01',
  //   price: null,
  //   price_unit: 'USD',
  //   error_code: null,
  //   error_message: null,
  //   uri: '/2010-04-01/Accounts/<sid>/Messages/<mid>.json',
  //   subresource_uris: {
  //     media: '/2010-04-01/Accounts/<sid>/Messages/<mid>/Media.json',
  //   },
  //   dateCreated: '2017-02-14T01:32:57.000Z',
  //   dateUpdated: '2017-02-14T01:32:57.000Z',
  //   dateSent: null,
  //   accountSid: '<sid>',
  //   messagingServiceSid: null,
  //   numSegments: '1',
  //   numMedia: '0',
  //   apiVersion: '2010-04-01',
  //   priceUnit: 'USD',
  //   errorCode: null,
  //   errorMessage: null,
  //   subresourceUris: {
  //     media: '/2010-04-01/Accounts/<sid>/Messages/<mid>/Media.json',
  //   },
  // }
  // Example Error Response:
  // {
  //   Error: 'HandledError',
  //   Cause: {
  //     errorMessage: {
  //       status: 400,
  //       message: 'The From phone number <from_num> is not a valid, SMS-capable inbound phone number or short code for your account.',
  //       code: 21606,
  //       moreInfo: 'https://www.twilio.com/docs/errors/21606'
  //     },
  //   },
  // }

};
module.exports = {
  handler: function handler(event, context, callback) {
    console.log(JSON.stringify(event, null, 2));
    impl.ensureAuthTokenDecrypted(event).then(impl.failAssignment).then(impl.sendMessage).then(function (message) {
      console.log("Success: ".concat(JSON.stringify(message, null, 2)));
      var result = event;
      delete result.photographer;

      if (!result.unassignments) {
        // keep track of how many times we've unassigned this product photo
        result.unassignments = 1;
      } else {
        result.unassignments += 1;
      } // TODO something interesting with unassignments?  Perhaps in StepFunction, exiting after N failures?


      callback(null, result);
    }).catch(function (ex) {
      var err = "".concat(constants.MODULE, " ").concat(ex.message, ":\n").concat(ex.stack);
      console.log(err);
      callback(err);
    });
  }
};