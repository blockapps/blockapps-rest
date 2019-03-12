import rest from '../rest_7'
import assert from './assert'
import { cwd, isHash, isAddress, uid as getUid } from '../util'
import fsUtil from '../fsUtil'
import factory from './factory'

import dotenv from 'dotenv'
const loadEnv = dotenv.config();
assert.isUndefined(loadEnv.error)

const config = fsUtil.getYaml(`${cwd}/barf/test/config.yaml`)
const testAuth = true

describe('rest_7', function () {
  this.timeout(config.timeout)
  let admin
  const options = { config }

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
    });

    it('callMethodList - sync', async () => {
      const callListArgs = factory.createCallListArgs(contract, { var2 })
      const callResultList = await rest.callList(admin, callListArgs, options)

      assert.isArray(callResultList)
      assert.equal(callResultList.length, callListArgs.length)
      const expected = var1 * var2
      callResultList.forEach((callResult, index) => {
        assert.equal(callResult, expected, `call result ${index}`)
      })
    })
  });

  xit('createContractMany', async () => {
    //  TODO: need some clarification

    // Create multiple contract
    const contracts = [factory.createContractArgs(uid()), factory.createContractArgs(uid())];

    const result = await rest.createContractMany(tokenUser, contracts, { config, isAsync: false });
  })


  it('send - async', async () => {
    const sendTxArgs = factory.createSendTxArgs(admin.address);
    const result = await rest.send(tokenUser, sendTxArgs, { config, isAsync: true });

    assert.equal(sendTxArgs.toAddress, result.to, 'address')
    assert.equal(sendTxArgs.value, result.value, 'value')
  })

  it('send - sync', async () => {
    const sendTxArgs = factory.createSendTxArgs(admin.address);
    const result = await rest.send(tokenUser, sendTxArgs, { config });
    assert.isOk(isHash(result), 'hash')
  })

  it('sendMany - async', async () => {
    const sendTxs = factory.createSendTxArgsArr(admin.address);
    const results = await rest.sendMany(tokenUser, sendTxs, { config, isAsync: true });

    // Assert every value that was sent
    results.forEach((result, index) => {
      assert.equal(sendTxs[index].toAddress, result.to, 'address')
      assert.equal(sendTxs[index].value, result.value, 'value')
    })
  })

  it('sendMany - sync', async () => {
    const sendTxs = factory.createSendTxArgsArr(admin.address);

    const result = await rest.sendMany(tokenUser, sendTxs, { config });
    assert.isOk(isHash(result), 'hash')
  })
})

describe('search', function () {
  this.timeout(config.timeout)
  let contract;
  const options = { config }

  before(async () => {
    const randomId = uid();

    assert.isDefined(process.env.USER_TOKEN)
    const address = await rest.createOrGetKey({ token: process.env.USER_TOKEN }, options);
    assert.isOk(isAddress(address))

    let admin = await factory.createAdmin(randomId, options)

    const contractArgs = await factory.createContractArgs(randomId)
    contract = await rest.createContract(admin, contractArgs, options)
    assert.equal(contract.name, contractArgs.name, 'name')
    assert.isOk(isAddress(contract.address), 'address')
  })

  it('search - contract exists', async () => {
    const result = await rest.search(contract, { config });
    assert.isArray(result, 'should be array')
    assert.lengthOf(result, 1, 'array has length of 1');
    assert.equal(result[0].address, contract.address, 'address');
  })

  it('searchUntil - get response on first call', async () => {
    // predicate is created: to get response
    function predicate(data) {
      return data;
    }

    const result = await rest.searchUntil(contract, predicate, { config });
    assert.isArray(result, 'should be array')
    assert.lengthOf(result, 1, 'array has length of 1');
    assert.equal(result[0].address, contract.address, 'address');
  })

  it('searchUntil - throws an error', async () => {
    // predicate is created: to wait until response is available otherwise throws the error
    function predicate() { }

    try {
      await rest.searchUntil(contract, predicate, { config });
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

    const result = await rest.searchUntil(contract, predicate, { config });
    assert.isArray(result, 'should be array')
    assert.lengthOf(result, 1, 'array has length of 1');
    assert.equal(result[0].address, contract.address, 'address');
  })
})
