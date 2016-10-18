const common = require('../../lib/common');
const config = common.config;
const util = common.util;
const assert = common.assert;

var should = require('chai').should();
var rest = require('../index');

describe('business functions', function() {
  this.timeout(config.timeout);
  //  itShould.checkAvailability(); // in case bloc crashed on the previous test

  it('should create a user', function(done) {
    const adminName = util.uid('Admin');
    const adminPassword = '1234';
    const scope = {};
    return rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(function(scope) {
        console.log('scope', scope);
        should.exist(scope.users[adminName], 'admin user ' + adminName);
        should.equal(scope.users[adminName].password, adminPassword, 'admin password');
        done();
      })
      .catch(done);
  });

  it('should get a contract string', function(done) {
    const scope = {};
    const contractFilename = './blockapps-rest/test/fixtures/SimpleStorage.sol';
    const contractName = 'SimpleStorage';
    return rest.setScope(scope)
      .then(rest.getContractString(contractName, contractFilename))
      .then(function(scope) {
        should.exist(scope.contracts[contractName], 'contract for ' + contractName);
        should.exist(scope.contracts[contractName].string, 'contract string for ' + contractName);
        done();
      })
      .catch(done);
  });

  it('should upload a contract', function(done) {
    const adminName = util.uid('Admin');
    const adminPassword = '1234';
    const contractFilename = './blockapps-rest/test/fixtures/SimpleStorage.sol';
    const contractName = 'SimpleStorage';
    const scope = {};
    return rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName))
      .then(function(scope) {
        console.log('scope', scope);
        should.exist(scope.contracts[contractName], 'contract for ' + contractName);
        should.exist(scope.contracts[contractName].address, 'contract address for ' + contractName);
        assert.address(scope.contracts[contractName].address, 'contract address for ' + contractName);
        done();
      })
      .catch(done);
  });

  it('should call a method - set', function(done) {
    const adminName = util.uid('Admin');
    const adminPassword = '1234';
    const contractFilename = './blockapps-rest/test/fixtures/SimpleStorage.sol';
    const contractName = 'SimpleStorage';
    const methodName = 'set';
    const args = {
      x: 17
    };
    const scope = {};
    return rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName))
      .then(function(scope) {
        return rest.callMethod(adminName, contractName, methodName, args)(scope);
      })
      .then(function(scope) {
        console.log('scope', scope.contracts[contractName].calls);
        should.exist(scope.contracts[contractName].calls, 'calls for ' + contractName);
        should.exist(scope.contracts[contractName].calls[methodName], 'call for ' + methodName);
        assert.equal(scope.contracts[contractName].calls[methodName], 'null', 'return value for ' + methodName);
        done();
      })
      .catch(done);
  });

  it('should call a method - get', function(done) {
    const adminName = util.uid('Admin');
    const adminPassword = '1234';
    const contractFilename = './blockapps-rest/test/fixtures/SimpleStorage.sol';
    const contractName = 'SimpleStorage';
    const methodName = 'get';
    const expectedValue = '123';
    const scope = {};
    return rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName))
      .then(function(scope) {
        return rest.callMethod(adminName, contractName, methodName)(scope);
      })
      .then(function(scope) {
        console.log('scope', scope.contracts[contractName].calls);
        should.exist(scope.contracts[contractName].calls, 'calls for ' + contractName);
        should.exist(scope.contracts[contractName].calls[methodName], 'call for ' + methodName);
        assert.equal(scope.contracts[contractName].calls[methodName], expectedValue, 'return value for ' + methodName);
        done();
      })
      .catch(done);
  });

  it('should call a method - set/get', function(done) {
    const adminName = util.uid('Admin');
    const adminPassword = '1234';
    const contractFilename = './blockapps-rest/test/fixtures/SimpleStorage.sol';
    const contractName = 'SimpleStorage';
    const scope = {};
    return rest.setScope(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName))
      .then(rest.callMethod(adminName, contractName, 'set', {x:666}))
      .then(rest.callMethod(adminName, contractName, 'get'))
      .then(function(scope) {
        console.log('scope', scope.contracts[contractName].calls);
        assert.equal(scope.contracts[contractName].calls['get'], 666, 'return value for get');
        done();
      })
      .catch(done);
  });
});
