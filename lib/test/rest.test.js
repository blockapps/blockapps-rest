import RestStatus from 'http-status-codes'
import rest from '../rest'
import assert from './assert'
import util from '../util/util'
import factory from './factory'
import { TxResultStatus } from '../constants'

import dotenv from 'dotenv'

const loadEnv = dotenv.config()
assert.isUndefined(loadEnv.error)

const config = factory.getTestConfig()
const fixtures = factory.getTestFixtures()
const testAuth = true
const logger = console

describe('rest_7', function() {
  this.timeout(config.timeout)
  let admin
  const options = { config, logger }

  before(async () => {
    const uid = util.uid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  describe('contract call', function() {
    this.timeout(config.timeout)
    let contract
    const var1 = 2
    const var2 = 5
    const method = 'multiply'

    before(async () => {
      const uid = util.uid()
      const constructorArgs = { var1 }
      const filename = `${fixtures}/CallMethod.sol`
      const contractArgs = await factory.createContractFromFile(filename, uid, constructorArgs)

      contract = await rest.createContract(admin, contractArgs, options)
      assert.equal(contract.name, contractArgs.name, 'name')
      assert.isOk(util.isAddress(contract.address), 'address')
    })

    it('call - async', async () => {
      const callArgs = factory.createCallArgs(contract, method, { var2 })
      const asyncOptions = { ...options, isAsync: true }
      const pendingTxResult = await rest.call(admin, callArgs, asyncOptions)
      assert.isOk(util.isHash(pendingTxResult.hash), 'hash')
    })

    it('call - sync', async () => {
      const callArgs = factory.createCallArgs(contract, method, { var2 })
      const [result] = await rest.call(admin, callArgs, options)
      assert.equal(parseInt(result), var1 * var2, 'call results')
    })

    it('callList - async', async () => {
      const callListArgs = factory.createCallListArgs(contract, method, { var2 }, 0, 15)
      const asyncOptions = { ...options, isAsync: true }
      const pendingTxResultList = await rest.callList(admin, callListArgs, asyncOptions)
      pendingTxResultList.forEach((pendingTxResult, index) => {
        assert.equal(pendingTxResult.status, TxResultStatus.PENDING, `single tx result ${index}`)
      })
      // must resolve the tx before continuing to the next test
      await rest.resolveResults(pendingTxResultList, options)
    })

    it('callList - async - BAD_REQUEST', async () => {
      const callListArgs = factory.createCallListArgs(contract, method, { var2 }, 0, 15)
      callListArgs[2].method = 'BAD_METHOD'
      const asyncOptions = { ...options, isAsync: true }
      await assert.restStatus(async () => {
        return rest.callList(admin, callListArgs, asyncOptions)
      }, RestStatus.BAD_REQUEST, /Contract doesn't have a method named 'BAD_METHOD'/)
    })

    it('callList - sync', async () => {
      const callListArgs = factory.createCallListArgs(contract, method, { var2 }, 0, 15)
      const callResultList = await rest.callList(admin, callListArgs, options)
      assert.isArray(callResultList)
      assert.equal(callResultList.length, callListArgs.length)
      const expected = var1 * var2
      callResultList.forEach((callResult, index) => {
        assert.equal(callResult[0], expected, `call result ${index}`)
      })
    })

    it('callList - sync - BAD_REQUEST', async () => {
      const callListArgs = factory.createCallListArgs(contract, method, { var2 }, 0, 15)
      callListArgs[2].method = 'BAD_METHOD'
      await assert.restStatus(async () => {
        return rest.callList(admin, callListArgs, options)
      }, RestStatus.BAD_REQUEST, /Contract doesn't have a method named 'BAD_METHOD'/)
    })

    // Skipped because of platform issue. https://blockapps.atlassian.net/browse/STRATO-1331
    it.skip('create contract list - async - SKIPPED - STRATO-1331', async () => {
      const count = 5
      const contracts = factory.createContractListArgs(count)
      const pendingResults = await rest.createContractList(admin, contracts, { config, isAsync: true })
      const verifyHashes = pendingResults.reduce((a, r) => a && util.isHash(r.hash), true)
      assert.isOk(verifyHashes, 'hash')
      const results = await rest.resolveResults(pendingResults, options)
      const verifyStatus = results.reduce((a, r) => a && r.status !== TxResultStatus.PENDING, true)
      assert.isOk(verifyStatus, 'results')
    })

    // Skipped because of platform issue. https://blockapps.atlassian.net/browse/STRATO-1331
    it.skip('create contracts list - sync - SKIPPED - STRATO-1331', async () => {
      const count = 5
      const contracts = factory.createContractListArgs(count)
      const results = await rest.createContractMany(admin, contracts, { config })
      const verifyContracts = results.reduce((a, r, i) => a && util.isAddress(r.address) && r.name === contracts[i].name, true)
      assert.isOk(verifyContracts, 'contracts')
    })

    // when this test fails, the bug has been fixed and the above tests should be reactivated
    it('create contract list - INTERNAL_SERVER_ERROR 500 - when this test fails, STRATO-1331 was fixed', async () => {
      const count = 5
      const contracts = factory.createContractListArgs(count)
      await assert.restStatus(async () => {
        return rest.createContractList(admin, contracts, { config, isAsync: true })
      }, RestStatus.INTERNAL_SERVER_ERROR)
    })
    // VM
    it('call - option VM', async () => {
      const callArgs = factory.createCallArgs(contract, method, { var2 })
      const [result] = await rest.call(admin, callArgs, { ...options, VM: 'SolidVM' })
      assert.equal(parseInt(result), var1 * var2, 'call results')
    })
    // bad VM
    it('call - option VM - BAD_REQUEST', async () => {
      const callArgs = factory.createCallArgs(contract, method, { var2 })
      await assert.restStatus(async () => {
        return rest.call(admin, callArgs, { ...options, VM: 'BAD_VM' })
      }, RestStatus.BAD_REQUEST, /BAD_VM/)
    })
  })

  describe('send', function() {
    this.timeout(config.timeout)
    let user2

    before(async () => {
      const uid = util.uid()
      const user2Args = (testAuth) ? { token: process.env.USER2_TOKEN } : { uid }
      user2 = await factory.createAdmin(user2Args, options)
    })

    it('send - sync', async () => {
      const sendTxArgs = factory.createSendTxArgs(user2.address)
      const result = await rest.send(admin, sendTxArgs, options)

      assert.equal(sendTxArgs.toAddress, result.to, 'address')
      assert.equal(sendTxArgs.value, result.value, 'value')

      // TODO: verify balances
    })

    it('send - async', async () => {
      const sendTxArgs = factory.createSendTxArgs(user2.address)
      const pendingTxResult = await rest.send(admin, sendTxArgs, { ...options, isAsync: true })
      assert.isOk(util.isHash(pendingTxResult.hash), 'hash')
      // must resolve the transaction before the next test
      await rest.resolveResult(pendingTxResult, options)
    })

    it('sendMany - sync', async () => {
      const sendTxs = factory.createSendTxArgsArr(admin.address)
      const results = await rest.sendMany(admin, sendTxs, { config })

      // Assert every value that was sent
      results.forEach((result, index) => {
        assert.equal(sendTxs[index].toAddress, result.to, 'address')
        assert.equal(sendTxs[index].value, result.value, 'value')
      })

      // TODO: verify balances
    })

    it('sendMany - async', async () => {
      const sendTxs = factory.createSendTxArgsArr(admin.address)

      const results = await rest.sendMany(admin, sendTxs, { config })

      results.forEach((result, index) => {
        assert.isOk(util.isHash(result.hash), `hash ${index}`)
      })

      // TODO: wait for tx to resolve
    })
  })
})

describe('search until', function() {
  this.timeout(config.timeout)
  const options = { config, logger }
  let admin, contract

  before(async () => {
    const uid = util.uid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  beforeEach(async () => {
    const uid = util.uid()
    const filename = `${fixtures}/Search.sol`
    const args = {
      intValue: uid,
      stringValue: `_${uid}_`,
    }
    const contractArgs = await factory.createContractFromFile(filename, uid, args)
    contract = await rest.createContract(admin, contractArgs, options)
  })

  it('searchUntil - get response on first call', async () => {
    // predicate is created: to get response
    function predicate(data) {
      return data.length > 0
    }

    const result = await rest.searchUntil(contract, predicate, options)
    assert.isArray(result, 'should be array')
    assert.lengthOf(result, 1, 'array has length of 1')
    assert.equal(result[0].address, contract.address, 'address')
  })

  it('searchUntil - timeout error', async () => {
    // predicate is created: to wait until response is available otherwise throws the error
    function predicate() { }

    try {
      await rest.searchUntil(contract, predicate, options)
    } catch (err) {
      assert.equal(err.message, 'until: timeout 60000 ms exceeded', 'error message should be timeout')
    }
  })

  it('searchUntil - get response after five calls', async () => {
    // predicate is created: get response after five calls
    let i = 0

    function predicate(data) {
      if (i === 5) {
        return data
      }
      i += 1
      return false
    }

    const result = await rest.searchUntil(contract, predicate, options)
    assert.isArray(result, 'should be array')
    assert.lengthOf(result, 1, 'array has length of 1')
    assert.equal(result[0].address, contract.address, 'address')
  })
})

describe('search query', function() {
  this.timeout(config.timeout)
  const options = { config, logger }
  const count = 4
  let admin

  before(async () => {
    const uid = util.uid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  it('search multiple', async () => {
    const uid = util.uid()
    const contracts = []

    for (let i = 0; i < count; i++) {
      const contract = await createSearchContract(admin, uid, i, options)
      contracts.push(contract)
    }

    // wait for all contracts to be created
    function predicate(data) {
      return data.length >= count
    }

    const results = await rest.searchUntil(contracts[0], predicate, options)
    assert.isArray(results, 'should be array')
    assert.lengthOf(results, count, `array has length of ${count}`)
    // check all
    results.forEach((result, index) => {
      const intValue = uid * 100 + index
      assert.equal(result.address, contracts[index].address, 'address')
      assert.equal(result.intValue, intValue, 'intValue')
      assert.equal(result.stringValue, stringValue(intValue), 'stringValue')
    })
  })

  it('search by value', async () => {
    const uid = util.uid()
    const contracts = []

    for (let i = 0; i < count; i++) {
      const contract = await createSearchContract(admin, uid, i, options)
      contracts.push(contract)
    }

    // wait for all contracts to be created
    function predicate(data) {
      return data.length >= count
    }

    await rest.searchUntil(contracts[0], predicate, options)

    // search by address
    for (let i = 0; i < count; i++) {
      const contract = contracts[i]
      const query = { address: `eq.${contract.address}` }
      const results = await rest.search(contract, { query, ...options })
      assert.lengthOf(results, 1, 'one result')
      const result = results[0]
      const intValue = uid * 100 + i
      assert.equal(result.address, contract.address, 'address')
      assert.equal(result.intValue, intValue, 'intValue')
      assert.equal(result.stringValue, stringValue(intValue), 'stringValue')
    }
    // search by value
    for (let i = 0; i < count; i++) {
      const contract = contracts[i]
      const query = { intValue: `eq.${uid * 100 + i}` }
      const results = await rest.search(contract, { query, ...options })
      assert.lengthOf(results, 1, 'one result')
      const result = results[0]
      const intValue = uid * 100 + i
      assert.equal(result.address, contract.address, 'address')
      assert.equal(result.intValue, intValue, 'intValue')
      assert.equal(result.stringValue, stringValue(intValue), 'stringValue')
    }
    // search by both !
    for (let i = 0; i < count; i++) {
      const contract = contracts[i]
      const query = {
        intValue: `eq.${uid * 100 + i}`,
        address: `eq.${contract.address}`,
      }
      const results = await rest.search(contract, { query, ...options })
      assert.lengthOf(results, 1, 'one result')
      const result = results[0]
      const intValue = uid * 100 + i
      assert.equal(result.address, contract.address, 'address')
      assert.equal(result.intValue, intValue, 'intValue')
      assert.equal(result.stringValue, stringValue(intValue), 'stringValue')
    }
    // not found
    for (let i = 0; i < count; i++) {
      const contract = contracts[i]
      const query = {
        intValue: `eq.666`,
        address: `eq.${contract.address}`,
      }
      const results = await rest.search(contract, { query, ...options })
      assert.lengthOf(results, 0, 'no results')
    }
  })
})

async function createSearchContract(admin, uid, index, options) {
  const filename = `${fixtures}/Search.sol`
  const intValue = uid * 100 + index
  const args = {
    intValue,
    stringValue: stringValue(intValue),
  }
  const contractArgs = await factory.createContractFromFile(filename, uid, args)
  const contract = await rest.createContract(admin, contractArgs, options)
  return contract
}

function stringValue(intValue) {
  return `_${intValue}_`
}

describe('chain', function() {
  this.timeout(config.timeout)
  let admin, chainId, chainArgs
  const options = { config }

  async function createChain() {
    const uid = util.uid()
    const { chain, contractName: name } = factory.createChainArgs(uid, [admin.address])
    const contract = { name }
    chainArgs = chain
    const result = await rest.createChain(chain, contract, options)
    return result
  }

  before(async () => {
    const uid = util.uid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  beforeEach(async () => {
    chainId = await createChain()
  })

  it('create', async () => {
    assert.isOk(util.isHash(chainId), 'hash')
  })

  it('create and verify', async () => {
    assert.isOk(util.isHash(chainId), 'hash')

    // This is to wait until data is available on the chain
    await util.timeout(1000)

    // verify chain data
    const result = await rest.getChain(chainId, options)
    assert.equal(result.info.label, chainArgs.label, 'chain label')
    assert.equal(result.id, chainId, 'chainId')
  })

  it('list of chains', async () => {
    assert.isOk(util.isHash(chainId), 'hash')

    // This is to wait until data is available on the chain
    await util.timeout(1000)
    // get all chain
    const result = await rest.getChains([], options)

    assert.isArray(result, 'should be array')
    assert.isAbove(result.length, 0, 'should be greater than 0')
  })

  it('list of chains', async () => {
    assert.isOk(util.isHash(chainId), 'hash')

    // This is to wait until data is available on the chain
    await util.timeout(1000)
    // get all chain
    const result = await rest.getChains([chainId], options)

    assert.isArray(result, 'should be array')
    assert.equal(result.length, 1, 'should be 1')
  })
})
