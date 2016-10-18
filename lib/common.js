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
const api = require('./api')(config.configFile);
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
