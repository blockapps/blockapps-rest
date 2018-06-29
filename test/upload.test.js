require('co-mocha');
const ba = require('../index');
const rest = ba.rest;
const common = ba.common;
const config = common.config;
const assert = common.assert;
const util = common.util;
const path = require('path');
const constants = common.constants;

describe('Upload contract list test', function(){

  this.timeout(config.timeout);
  let user;
  const password = '1234';

  const batchSize = 10;
  const contractName = "SimpleStorage";
  const contractFilename = path.join(config.contractsPath, "SimpleStorage.sol");
  const searchableArray = [contractName]
  const txs = [];

  before(function * () {
    const username = `user_${util.uid()}`;
    // create user
    user = yield rest.createUser(username, password, false);
    // compile contract - upload contract list assumes bloc has knowledge of contract being uploaded
    yield rest.compileSearch(searchableArray, contractName, contractFilename);
    // construct tx array
    for(let i = 0; i < batchSize; i++) {
      txs.push({
        args: {},
        contractName: contractName
      });
    }
  });

  it('should upload multiple SimpleStorage contracts and resolve', function * () {

    const response = yield rest.uploadContractList(user, txs);

    const addressesAreValid = response.reduce((result, contract) => {
      if(!result) {
        return result;
      }
      return result && util.isAddress(contract.address);
    }, true)

    assert.isOk(addressesAreValid, 'Should get back valid addresses');
    
  })

  it('should upload multiple SimpleStorage contracts without resolve', function * () {
    const response = yield rest.uploadContractList(user, txs, true);

    const hashesAreValid = response.reduce((result, hash) => {
      console.log(hash);
      if(!result) {
        return result;
      }
      return result && util.isTxHash(hash);
    }, true)

    assert.isOk(hashesAreValid, 'Should get back valid hashes');
    
  })

    it('should upload and resolve multiple contracts', function * () {
        const response = yield rest.uploadContractList(user, txs, true);

        const hashesAreValid = response.reduce((result, hash) => {
            console.log(hash);
            if(!result) {
                return result;
            }
            return result && util.isTxHash(hash);
        }, true)

        assert.isOk(hashesAreValid, 'Should get back valid hashes');

        const results = response.map(r => {return {hash: r}})
        const resolved = yield rest.resolveResults(results)

        const allAreResolved = resolved.reduce((result, res) => {
            console.log(res)
            if(!result) {
                return result;
            }
            return result && (res.statue !== constants.PENDING)
        }, true)

        assert.isOk(allAreResolved, 'Should resolve all transactions');
    })

});
