'use strict';

var aws = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies


var HttpsProxyAgent = require('https-proxy-agent'); // eslint-disable-line import/no-extraneous-dependencies


var url = require('url');

var yaml = require('js-yaml'); // eslint-disable-line import/no-extraneous-dependencies


var fs = require('fs');

var secrets = yaml.safeLoad(fs.readFileSync('../private.yml', 'utf8'));
aws.config.region = secrets.region;
aws.config.credentials = new aws.SharedIniFileCredentials({
  profile: secrets.profile
});
var proxyOptions = url.parse(secrets.proxyServer);
proxyOptions.secureEndpoint = true;
aws.config.httpOptions.agent = new HttpsProxyAgent(proxyOptions);
var kinesis = new aws.Kinesis();

function writeToKinesis(streamName, data, partitionKey) {
  var recordParams = {
    Data: data,
    PartitionKey: partitionKey,
    StreamName: streamName
  };
  kinesis.putRecord(recordParams, function (err, res) {
    if (err) {
      console.error(err);
    } else {
      console.log('kinesis response: ', res);
    }
  });
}

if (process.argv.length < 5) {
  console.log('Missing arguments.  Usage: node put-retail-stream-event.js < streamName > < path to json file with event data > < partitionKey >.');
  console.log('Example: $ node put-retail-stream-event.js BIMXStream ./product-create-event.json 9000002');
} else {
  var event = require(process.argv[3]); // eslint-disable-line global-require, import/no-dynamic-require


  writeToKinesis(process.argv[2], JSON.stringify(event), process.argv[4]); // eslint-disable-line global-require, import/no-dynamic-require
}