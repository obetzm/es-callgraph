'use strict';
/* eslint-env node, mocha */
// const expect = require('chai').expect;
// const catalog = require('./catalog.js');

describe('Product Catalog Processor Unit Tests', function () {
  var consoleLog;
  before(function () {
    consoleLog = console.log;

    console.log = function () {};
  });
  after(function () {
    console.log = consoleLog;
  });
  it('should have some tests', function () {});
});