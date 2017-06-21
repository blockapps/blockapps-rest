const chai = require('chai');
chai.use(require('chai-bignumber')());
exports.assert = chai.assert;
exports.expect = chai.expect;
exports.should = require('chai').should();
exports.Promise = require('bluebird');
const BigNumber = require('bignumber.js');
exports.BigNumber = BigNumber;

const config = require('./config');
exports.config = config.configFile;
exports.constants = require('./constants');
const api = require('./api_2_1')(config.configFile);
// api.setDebug(exports.config.apiDebug); // can be modified at any time
exports.api = api;
const util = require('./util');
exports.util = util;
const fsutil = require('./fs-util');
exports.fsutil = fsutil;
exports.model = require('./model');
exports.itShould = require('./itShould.js')(api, config.configFile);

exports.importer = require('./importer');
exports.eparser = require('./eparser');

// assert improvements
exports.assert.address = function(address, message) {
  message = message || '';
  chai.assert.notEqual(address, 0, message + ' invalid address 0');
  chai.assert.ok(util.isAddress(address), message + ' invalid address ' + address);
}

exports.assert.apiNoError = function(err, res) {
  chai.assert.equal(err, null, JSON.stringify(err, null, 2));
  chai.assert.equal(res.error, false, JSON.stringify(res.error, null, 2));
}

exports.assert.apiError = function (res, status, mustContain) {
  res.should.be.json;
  chai.assert.notStrictEqual(res.body.success, undefined, 'Malformed body: success undefined');
  chai.assert.notOk(res.body.success, `API success should be false: ${JSON.stringify(res.body, null, 2)}`);
  chai.assert.equal(res.status, status, `HTTP status should be ${status} ${JSON.stringify(res.body.error)}`);
  chai.assert.notStrictEqual(res.body.error, undefined, 'Malformed body: error undefined');
  const message = res.body.error.toLowerCase();
  chai.assert.isAtLeast(message.indexOf(mustContain.toLowerCase()), 0, `error '${message}' must contain '${mustContain}' `);
}

exports.assert.apiSuccess = function (res) {
  res.should.be.json;
  chai.assert.notStrictEqual(res.body.success, undefined, 'Malformed body: success undefined');
  chai.assert.ok(res.body.success, `API success should be true ${JSON.stringify(res.body, null, 2)}`);
  chai.assert.equal(res.status, 200, `HTTP status should be 200`);
  chai.assert.strictEqual(res.body.error, undefined, `Error should be undefined `);
}

exports.assert.apiData = function(err, res) {
  chai.assert.apiNoError(err, res);
  chai.assert.apiSuccess(res);
  //chai.assert.isDefined()
  res.body.should.have.property('data');
  return res.body.data;
}
