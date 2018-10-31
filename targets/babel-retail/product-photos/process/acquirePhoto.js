'use strict';

var fs = require('fs');

var yaml = require('js-yaml'); // eslint-disable-line import/no-extraneous-dependencies


module.exports = {
  shim: function shim() {
    var aquirePhoto = yaml.safeLoad(fs.readFileSync('./acquirePhoto.yml', 'utf8'));
    return JSON.stringify(aquirePhoto);
  }
};