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

var AJV = require('ajv');

var aws = require('aws-sdk'); // eslint-disable-line import/no-unresolved, import/no-extraneous-dependencies


var BbPromise = require('bluebird');

var got = require('got');

var Twilio = require('twilio');

var url = require('url');
/**
 * AJV
 */
// TODO Get these from a better place later


var twilioRequestSchema = require('./twilio-request-schema.json');

var photoAssignmentSchema = require('./photo-assignment-schema.json'); // TODO generalize this?  it is used by but not specific to this module


var makeSchemaId = function makeSchemaId(schema) {
  return "".concat(schema.self.vendor, "/").concat(schema.self.name, "/").concat(schema.self.version);
};

var twilioRequestSchemaId = makeSchemaId(twilioRequestSchema);
var photoAssignmentSchemaId = makeSchemaId(photoAssignmentSchema);
var ajv = new AJV();
ajv.addSchema(twilioRequestSchema, twilioRequestSchemaId);
ajv.addSchema(photoAssignmentSchema, photoAssignmentSchemaId);
/**
 * AWS
 */

aws.config.setPromisesDependency(BbPromise);
var dynamo = new aws.DynamoDB.DocumentClient();
var kms = new aws.KMS();
var s3 = new aws.S3();
var stepfunctions = new aws.StepFunctions();
/**
 * Twilio
 */

var twilio = {
  authToken: undefined
  /**
   * Constants
   */

};
var constants = {
  // Errors
  ERROR_CLIENT: 'ClientError',
  ERROR_UNAUTHORIZED: 'Unauthorized',
  ERROR_USER: 'UserError',
  ERROR_SERVER: 'ServerError',
  ERROR_DATA_CORRUPTION: 'DATA CORRUPTION',
  ERROR_SECURITY_RISK: '!!!SECURITY RISK!!!',
  HASHES: '##########################################################################################',
  // Locations
  MODULE: 'receive.js',
  METHOD_HANDLER: 'handler',
  METHOD_DECRYPT: 'util.decrypt',
  METHOD_VALIDATE_TWILIO_REQUEST: 'impl.validateTwilioRequest',
  METHOD_GET_IMAGE_FROM_TWILIO: 'impl.getImageFromTwilio',
  METHOD_PLACE_IMAGE_IN_S3: 'impl.storeImage',
  METHOD_SEND_STEP_SUCCESS: 'impl.sendStepSuccess',
  // External
  ENDPOINT: process.env.ENDPOINT,
  IMAGE_BUCKET: process.env.IMAGE_BUCKET,
  TABLE_PHOTO_ASSIGNMENTS_NAME: process.env.TABLE_PHOTO_ASSIGNMENTS_NAME,
  TWILIO_AUTH_TOKEN_ENCRYPTED: process.env.TWILIO_AUTH_TOKEN_ENCRYPTED
  /**
   * Errors
   */

};

var ClientError =
/*#__PURE__*/
function (_Error) {
  _inherits(ClientError, _Error);

  function ClientError(message) {
    var _this;

    _classCallCheck(this, ClientError);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ClientError).call(this, message));
    _this.name = constants.ERROR_CLIENT;
    return _this;
  }

  return ClientError;
}(_wrapNativeSuper(Error));

var AuthError =
/*#__PURE__*/
function (_Error2) {
  _inherits(AuthError, _Error2);

  function AuthError(message) {
    var _this2;

    _classCallCheck(this, AuthError);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(AuthError).call(this, message));
    _this2.name = constants.ERROR_UNAUTHORIZED;
    return _this2;
  }

  return AuthError;
}(_wrapNativeSuper(Error));

var UserError =
/*#__PURE__*/
function (_Error3) {
  _inherits(UserError, _Error3);

  function UserError(message) {
    var _this3;

    _classCallCheck(this, UserError);

    _this3 = _possibleConstructorReturn(this, _getPrototypeOf(UserError).call(this, message));
    _this3.name = constants.ERROR_USER;
    return _this3;
  }

  return UserError;
}(_wrapNativeSuper(Error));

var ServerError =
/*#__PURE__*/
function (_Error4) {
  _inherits(ServerError, _Error4);

  function ServerError(message) {
    var _this4;

    _classCallCheck(this, ServerError);

    _this4 = _possibleConstructorReturn(this, _getPrototypeOf(ServerError).call(this, message));
    _this4.name = constants.ERROR_SERVER;
    return _this4;
  }

  return ServerError;
}(_wrapNativeSuper(Error));
/**
 * Utility Methods (Internal)
 */


var util = {
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
  securityRisk: function securityRisk(schemaId, ajvErrors, items) {
    console.log(constants.HASHES);
    console.log(constants.ERROR_SECURITY_RISK);
    console.log("".concat(constants.METHOD_TODO, " ").concat(constants.ERROR_DATA_CORRUPTION, " could not validate data to '").concat(schemaId, "' schema. Errors: ").concat(ajvErrors));
    console.log("".concat(constants.METHOD_TODO, " ").concat(constants.ERROR_DATA_CORRUPTION, " bad data: ").concat(JSON.stringify(items)));
    console.log(constants.HASHES);
    return util.response(500, constants.ERROR_SERVER);
  },
  decrypt: function decrypt(field, value) {
    return kms.decrypt({
      CiphertextBlob: new Buffer(value, 'base64')
    }).promise().then(function (data) {
      return BbPromise.resolve(data.Plaintext.toString('ascii'));
    }, function (err) {
      return BbPromise.reject(new ServerError("Error decrypting '".concat(field, "': ").concat(err)));
    } // eslint-disable-line comma-dangle
    );
  }
  /**
   * Implementation (Internal)
   */

};
var impl = {
  /**
   * Validate that the given event validates against the request schema
   * @param event The event representing the HTTPS request from Twilio (SMS sent notification)
   */
  validateApiGatewayRequest: function validateApiGatewayRequest(event) {
    if (!ajv.validate(twilioRequestSchemaId, event)) {
      // bad request
      return BbPromise.reject(new ClientError("could not validate request to '".concat(twilioRequestSchemaId, "' schema. Errors: '").concat(ajv.errorsText(), "' found in event: '").concat(JSON.stringify(event), "'")));
    } else {
      return BbPromise.resolve(event);
    }
  },

  /**
   * Ensure that we have decrypted the Twilio credentials and initialized the SDK with them
   * @param event The event representing the HTTPS request from Twilio (SMS sent notification)
   */
  ensureAuthTokenDecrypted: function ensureAuthTokenDecrypted(event) {
    if (!twilio.authToken) {
      return util.decrypt('authToken', constants.TWILIO_AUTH_TOKEN_ENCRYPTED).then(function (authToken) {
        twilio.authToken = authToken;
        return BbPromise.resolve(event);
      });
    } else {
      return BbPromise.resolve(event);
    }
  },

  /**
   * Validate the request as having a proper signature from Twilio.  This provides authentication that the request came from Twillio.
   * @param event The event representing the HTTPS request from Twilio (SMS sent notification)
   */
  validateTwilioRequest: function validateTwilioRequest(event) {
    var body = url.parse("?".concat(event.body), true).query;

    if (!Twilio.validateRequest(twilio.authToken, event.headers['X-Twilio-Signature'], constants.ENDPOINT, body)) {
      return BbPromise.reject(new AuthError('Twilio message signature validation failure!'));
    } else if (body.NumMedia < 1) {
      return BbPromise.reject(new UserError('Oops!  We were expecting a product image.  Please send one!  :D'));
    } else if (body.NumMedia < 1) {
      return BbPromise.reject(new UserError('Oops!  We can only handle one image.  Sorry... can you please try again?  :D'));
    } else if (!body.MediaContentType0 || !body.MediaContentType0.startsWith('image/')) {
      return BbPromise.reject(new UserError('Oops!  We can only accept standard images.  We weren\'t very creative...'));
    } else if (!body.From) {
      return BbPromise.reject(new ServerError('Request from Twilio did not contain the phone number the image came from.'));
    } else {
      return BbPromise.resolve({
        event: event,
        body: body
      });
    }
  },
  getResources: function getResources(results) {
    return BbPromise.all([impl.getImageFromTwilio(results), impl.getAssignment(results)]);
  },

  /**
   * Twilio sends a URI from which a user's image can downloaded.  Download it.
   * @param results The event representing the HTTPS request from Twilio (SMS sent notification)
   */
  getImageFromTwilio: function getImageFromTwilio(results) {
    var uri = url.parse(results.body.MediaUrl0);

    if (aws.config.httpOptions.agent) {
      uri.agent = aws.config.httpOptions.agent;
    }

    return got.get(uri, {
      encoding: null
    }).then(function (res) {
      return BbPromise.resolve({
        contentType: results.body.MediaContentType0,
        data: res.body
      });
    } // eslint-disable-line comma-dangle
    );
  },

  /**
   * The Twilio request doesn't contain any of the original product creation event that caused the assignment.  Obtain the
   * assignment associated with the number that this message/image is being received from.
   * @param results The event representing the HTTPS request from Twilio (SMS sent notification)
   */
  getAssignment: function getAssignment(results) {
    var params = {
      Key: {
        number: results.body.From
      },
      TableName: constants.TABLE_PHOTO_ASSIGNMENTS_NAME,
      AttributesToGet: ['taskToken', 'taskEvent'],
      ConsistentRead: false,
      ReturnConsumedCapacity: 'NONE'
    };
    return dynamo.get(params).promise().then(function (data) {
      if (!data.Item) {
        return BbPromise.reject(new UserError('Oops!  We couldn\'t find your assignment.  If you have registered and not completed your assignments, we will send one shortly.'));
      } else {
        var item = data.Item;
        item.taskEvent = JSON.parse(item.taskEvent);
        return BbPromise.resolve(item);
      }
    }, function (ex) {
      return BbPromise.reject(new ServerError("Failed to retrieve assignment: ".concat(ex)));
    } // eslint-disable-line comma-dangle
    );
  },

  /**
   * Using the results of the `getImageFromTwilio` and `getAssignment` invocations, place the obtained image into the
   * proper location of the bucket for use in the web UI.
   * @param results An array of results obtained from `getResources`.  Details:
   *          results[0] = image       // The user's image that was downloaded from Twilio
   *          results[1] = assignment  // The assignment associated with the given request's phone number
   */
  storeImage: function storeImage(results) {
    var image = results[0];
    var assignment = results[1];
    var bucketKey = "i/p/".concat(assignment.taskEvent.data.id);
    var params = {
      Bucket: constants.IMAGE_BUCKET,
      Key: bucketKey,
      Body: image.data,
      ContentType: image.contentType,
      Metadata: {
        from: assignment.taskEvent.photographer.phone
      }
    };
    return s3.putObject(params).promise().then(function () {
      return BbPromise.resolve({
        assignment: assignment,
        image: "".concat(constants.IMAGE_BUCKET, "/").concat(bucketKey) // TODO this assumes parity between bucket name and website URI

      });
    }, function (ex) {
      return BbPromise.reject(new ServerError("Error placing image into S3: ".concat(ex)));
    } // eslint-disable-line comma-dangle
    );
  },

  /**
   * Indicate the successful completion of the photographer's image assignment to the StepFunction
   * @param results The results of the placeImage, containing the assignment and new image location
   */
  sendStepSuccess: function sendStepSuccess(results) {
    var taskEvent = results.assignment.taskEvent;
    taskEvent.image = results.image;
    taskEvent.success = 'true';
    var params = {
      output: JSON.stringify(taskEvent),
      taskToken: results.assignment.taskToken
    };
    return stepfunctions.sendTaskSuccess(params).promise().then(function () {
      return BbPromise.resolve(taskEvent);
    }, function (err) {
      return BbPromise.reject("Error sending success to Step Function: ".concat(err));
    } // eslint-disable-line comma-dangle
    );
  },
  userErrorResp: function userErrorResp(error) {
    var msg = new Twilio.TwimlResponse();
    msg.message(error.message);
    return msg.toString();
  },
  thankYouForImage: function thankYouForImage(taskEvent) {
    var msg = new Twilio.TwimlResponse();
    msg.message("Thanks so much ".concat(taskEvent.photographer.name, "!"));
    return msg.toString();
  }
  /**
   * API (External)
   */

};
module.exports = {
  handler: function handler(event, context, callback) {
    impl.validateApiGatewayRequest(event).then(impl.ensureAuthTokenDecrypted).then(impl.validateTwilioRequest).then(impl.getResources).then(impl.storeImage).then(impl.sendStepSuccess).then(impl.thankYouForImage).then(function (msg) {
      var response = util.response(200, msg);
      response.headers['Content-Type'] = 'text/xml';
      callback(null, response);
    }).catch(ClientError, function (ex) {
      console.log("".concat(constants.MODULE, " - ").concat(ex.stack));
      callback(null, util.response(400, "".concat(ex.name, ": ").concat(ex.message)));
    }).catch(AuthError, function (ex) {
      console.log("".concat(constants.MODULE, " - ").concat(ex.stack));
      callback(null, util.response(403, constants.ERROR_UNAUTHORIZED));
    }).catch(UserError, function (ex) {
      console.log("".concat(constants.MODULE, " - ").concat(ex.stack));
      var response = util.response(200, impl.userErrorResp(ex));
      response.headers['Content-Type'] = 'text/xml';
      callback(null, response);
    }).catch(ServerError, function (ex) {
      console.log("".concat(constants.MODULE, " - ").concat(ex.stack));
      callback(null, util.response(500, ex.name));
    }).catch(function (ex) {
      console.log("".concat(constants.MODULE, " - Uncaught exception: ").concat(ex.stack));
      callback(null, util.response(500, constants.ERROR_SERVER));
    });
  }
};