const BigNumber = require('bignumber.js');
exports.BigNumber = BigNumber;
const chai = require('chai');
chai.use(require('chai-bignumber')(BigNumber));
exports.assert = chai.assert;
exports.expect = chai.expect;
exports.should = require('chai').should();
exports.Promise = require('bluebird');

const config = require('./config');
exports.config = config.configFile;
exports.constants = require('./constants');
const api = require('./api_5')(config.configFile);
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

const path = require('path');
exports.cwd = path.resolve(process.cwd());

// assert improvements
exports.assert.address = function (address, message) {
  message = message || '';
  chai.assert.notEqual(address, 0, message + ' invalid address 0');
  chai.assert.ok(util.isAddress(address), message + ' invalid address ' + address);
}

exports.assert.apiNoError = function (err, res) {
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

exports.assert.apiData = function (err, res) {
  chai.assert.apiNoError(err, res);
  chai.assert.apiSuccess(res);
  //chai.assert.isDefined()
  res.body.should.have.property('data');
  return res.body.data;
}

// save the original 'equal'
exports.assert.original_equal = chai.assert.equal;
// make 'equal' check 'undefined' too !
exports.assert.equal = function (actual, expected, message) {
  chai.assert.isDefined(actual, message);
  chai.assert.original_equal(actual, expected, message);
}

// execute a generator function that should throw an error
exports.assert.shouldThrowGen = function* (func, errorObject, message) {
  var result;
  try {
    result = yield func();
  } catch (err) {
    chai.assert.equal(err.toString(), errorObject.toString(), message);
    return; // all good
  }
  // should not have succeeded
  if (message === undefined) message = '';
  chai.assert(false, `${message}. Should have thrown error: ${errorObject.toString()} instead got ${JSON.stringify(result)}`);
}

// execute a generator function that should throw a REST error
exports.assert.shouldThrowRest = function* (func, status, statusText, _message) {
  let result;
  const message = _message || '';
  try {
    result = yield func();
  } catch (err) {
    chai.assert.equal(err.status, status, message);
    if (statusText != undefined) {
      chai.assert.equal(err.statusText, statusText, message);
    }
    return; // got the right error status - all good
  }
  // should not have succeeded
  chai.assert(false, `${message}. Should have thrown error: ${status} instead got ${JSON.stringify(result)}`);
}

/* Retry a generator function (func) for a given timeout (timeoutSeconds).
   Allow an optional error (expectedError). */
exports.assert.retry = function* (func, timeoutSeconds, expectedError) {
  for (var i = 0; i < timeoutSeconds; i++) {
    try {
      // if condition met - return
      const conditionMet = yield func();
      if (conditionMet) return;
    } catch (err) {
      // no error expected
      if (expectedError === undefined) {
        throw (err);
      }
      // check expected error
      const status = err.response.error.status;
      chai.assert.equal(status, expectedError, 'Error must be ' + expectedError);
    }
    // sleep
    yield util.sleep(1 * 1000);
  }
  chai.assert(false, 'assert.retry() timeout: ' + timeoutSeconds );
}
