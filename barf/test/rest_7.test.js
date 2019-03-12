import rest from '../rest_7'
import assert from './assert'
import { cwd, isHash, isAddress, uid as getUid, timeout } from '../util'
import fsUtil from '../fsUtil'
import factory from './factory'

import dotenv from 'dotenv'
const loadEnv = dotenv.config();
assert.isUndefined(loadEnv.error)

const config = fsUtil.getYaml(`${cwd}/barf/test/config.yaml`)
const testAuth = true
const logger = console

describe('rest_7', function () {
  this.timeout(config.timeout)
  let admin
  const options = { config, logger }

  before(async () => {
    const uid = getUid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  describe('contracts', function () {

    let contract
    const var1 = 2
    const var2 = 5

    before(async () => {
      const uid = getUid()
      const constructorArgs = { var1 }
      const filename = `${cwd}/barf/test/fixtures/CallMethod.sol`
      const contractArgs = await factory.createContractFromFile(filename, uid, constructorArgs)

      contract = await rest.createContract(admin, contractArgs, options)
      assert.equal(contract.name, contractArgs.name, 'name')
      assert.isOk(isAddress(contract.address), 'address')
    })

    it('call - async', async () => {
      const callArgs = factory.createCallArgs(contract, { var2 });
      const asyncOptions = { config, isAsync: true }
      const pendingTxResult = await rest.call(admin, callArgs, asyncOptions);
      assert.isOk(isHash(pendingTxResult.hash), 'hash')
    })

    it('callMethod - sync', async () => {
      const callArgs = factory.createCallArgs(contract, { var2 })
      const [result] = await rest.call(admin, callArgs, options)
      assert.equal(parseInt(result), var1 * var2, 'call results')
    })

    it('callMethodList - async', async () => {
      const callListArgs = factory.createCallListArgs(contract, { var2 })
      const asyncOptions = { config, isAsync: true }
      const pendingTxResultList = await rest.callList(admin, callListArgs, asyncOptions)
      pendingTxResultList.forEach((pendingTxResult) => {
        assert.equal(pendingTxResult.status, 'Pending', 'single tx result')
      })

      // TODO wait for txs to resolve
    });

    it('callMethodList - sync', async () => {
      const callListArgs = factory.createCallListArgs(contract, { var2 })
      const callResultList = await rest.callList(admin, callListArgs, options)

      assert.isArray(callResultList)
      assert.equal(callResultList.length, callListArgs.length)
      const expected = var1 * var2
      callResultList.forEach((callResult, index) => {
        assert.equal(callResult[0], expected, `call result ${index}`)
      })
    })
  });

  // Skipped because of platform issue. https://blockapps.atlassian.net/browse/STRATO-1331
  it.skip('create many contracts - async', async () => {
    const contracts = [...Array(manyLength).keys()].map((a) => {
      const uid = util.uid()
      const contract = factory.createContractArgs(uid);
      return contract
    })
    const pendingResults = await rest.createContractMany(admin, contracts, { config, isAsync: true })
    const verifyHashes = pendingResults.reduce((a, r) => a && util.isHash(r.hash), true)
    assert.isOk(verifyHashes, 'hash')
    const results = await rest.resolveResults(pendingResults, options);
    const verifyStatus = results.reduce((a, r) => a && r.status !== TxResultStatus.PENDING, true)
    assert.isOk(verifyStatus, 'results')
  })

  // Skipped because of platform issue. https://blockapps.atlassian.net/browse/STRATO-1331
  it.skip('create many contracts - sync', async () => {
    const contracts = [...Array(manyLength).keys()].map((a) => {
      const uid = util.uid()
      const contract = factory.createContractArgs(uid);
      return contract
    })
    const results = await rest.createContractMany(admin, contracts, { config })
    const verifyContracts = results.reduce((a, r, i) => a && util.isAddress(r.address) && r.name === contracts[i].name, true)
    assert.isOk(verifyContracts, 'contracts')
  })


  it('send - sync', async () => {
    const sendTxArgs = factory.createSendTxArgs(admin.address);
    const result = await rest.send(admin, sendTxArgs, { config });

    assert.equal(sendTxArgs.toAddress, result.to, 'address')
    assert.equal(sendTxArgs.value, result.value, 'value')
  })

  it('send - async', async () => {
    const sendTxArgs = factory.createSendTxArgs(admin.address);
    const result = await rest.send(admin, sendTxArgs, { config, isAsync: true });
    assert.isOk(isHash(result.hash), 'hash')
    // TODO: wait for tx to resolve
  })

  it('sendMany - sync', async () => {
    const sendTxs = factory.createSendTxArgsArr(admin.address);
    const results = await rest.sendMany(admin, sendTxs, { config });

    // Assert every value that was sent
    results.forEach((result, index) => {
      assert.equal(sendTxs[index].toAddress, result.to, 'address')
      assert.equal(sendTxs[index].value, result.value, 'value')
    })
  })

  it('sendMany - async', async () => {
    const sendTxs = factory.createSendTxArgsArr(admin.address);

    const results = await rest.sendMany(admin, sendTxs, { config });

    results.forEach((result, index) => {
      assert.isOk(isHash(result.hash), 'hash')
    })

    // TODO: wait for tx to resolve
  })
})

describe('search', function () {
  this.timeout(config.timeout)
  const options = { config, logger }
  let admin, contract

  before(async () => {
    const uid = getUid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  beforeEach(async () => {
    const uid = getUid()
    const filename = `${cwd}/barf/test/fixtures/Search.sol`
    const contractArgs = await factory.createContractFromFile(filename, uid, {})
    contract = await rest.createContract(admin, contractArgs, options)
  })

  it('searchUntil - get response on first call', async () => {
    // predicate is created: to get response
    function predicate(data) {
      return data;
    }
    const result = await rest.searchUntil(contract, predicate, options);
    assert.isArray(result, 'should be array')
    assert.lengthOf(result, 1, 'array has length of 1');
    assert.equal(result[0], contract.address, 'address');
  })

  it('searchUntil - throws an error', async () => {
    // predicate is created: to wait until response is available otherwise throws the error
    function predicate() { }

    try {
      await rest.searchUntil(contract, predicate, options);
    } catch (err) {
      assert.equal(err.message, 'until: timeout 60000 ms exceeded', 'error message should be timeout');
    }
  })

  it('searchUntil - get response after five calls', async () => {
    // predicate is created: get response after five calls
    let i = 0;
    function predicate(data) {
      if (i === 5) {
        return data;
      }
      i++;
    }

    const result = await rest.searchUntil(contract, predicate, options);
    assert.isArray(result, 'should be array')
    assert.lengthOf(result, 1, 'array has length of 1');
    assert.equal(result[0], contract.address, 'address');
  })
})

describe('chain', function () {
  this.timeout(config.timeout)
  let admin;
  const options = { config }

  before(async () => {
    const uid = getUid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  it('create', async () => {
    const uid = getUid();
    const { chain, contractName: name } = factory.createChainArgs(uid, [admin.address]);
    const contract = { name };

    const result = await rest.createChain(chain, contract, options);
    assert.isOk(isHash(result), 'hash')
  })

  it('create and verify', async () => {
    const uid = getUid()
    
    // Create chain and verify
    const { chain, contractName: name } = factory.createChainArgs(uid, [admin.address]);
    const contract = { name };
    
    let chainId = await rest.createChain(chain, contract, options);
    assert.isOk(isHash(chainId), 'hash')
    
    // This is to wait until data is available on the chain 
    await timeout(5000);

    // verify chain data
    const result = await rest.getChain(chainId, options);
    assert.equal(result.info.label, chain.label, 'chain label');
    assert.equal(result.id, chainId, 'chainId');
  })

  it('list of chains', async () => {
    // get all chain
    const result = await rest.getChains([], options);

    assert.isArray(result, 'should be array')
    assert.isAbove(result.length, 1, 'should be greater than 1');
  })

}) 
