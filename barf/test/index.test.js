import RestStatus from 'http-status-codes'
import dotenv from 'dotenv'
import rest from '../rest_7'
import assert from './assert'
import * as util from '../util'
import fsUtil from '../fsUtil'
import factory from './factory'
import { BigNumber } from '../index'
import { TxResultStatus } from '../constants';

const loadEnv = dotenv.config()
assert.isUndefined(loadEnv.error)

const { cwd, usc } = util
const config = fsUtil.getYaml(`${cwd}/barf/test/config.yaml`)
const testAuth = true
const manyLength = 5;

const logger = console

describe('contracts', function() {
  this.timeout(config.timeout)
  let admin
  const options = { config, logger }

  before(async () => {
    const uid = util.uid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  it.only('create contract - async', async () => {
    const uid = util.uid()
    const contractArgs = factory.createContractArgs(uid)
    const asyncOptions = { config, isAsync: true }
    const pendingTxResult = await rest.createContract(admin, contractArgs, asyncOptions)
    assert.isOk(util.isHash(pendingTxResult.hash), 'hash')
    // must resolve the tx before continuing to the next test
    await rest.resolveResult(pendingTxResult, options)
  })

  it('create contract - sync', async () => {
    const uid = util.uid()
    const contractArgs = factory.createContractArgs(uid)
    const contract = await rest.createContract(admin, contractArgs, options)
    assert.equal(contract.name, contractArgs.name, 'name')
    assert.isOk(util.isAddress(contract.address), 'address')
  })

  it('create contract - sync - detailed', async () => {
    const uid = util.uid()
    const contractArgs = factory.createContractArgs(uid)
    options.isDetailed = true
    const contract = await rest.createContract(admin, contractArgs, options)
    assert.equal(contract.name, contractArgs.name, 'name')
    assert.isOk(util.isAddress(contract.address), 'address')
    assert.isDefined(contract.src, 'src')
    assert.isDefined(contract.bin, 'bin')
    assert.isDefined(contract.codeHash, 'codeHash')
    assert.isDefined(contract.chainId, 'chainId')
  })

  it('create contract - sync - BAD_REQUEST', async () => {
    const uid = util.uid()
    const contractArgs = factory.createContractSyntaxErrorArgs(uid)
    await assert.restStatus(async () => {
      return rest.createContract(admin, contractArgs, options)
    }, RestStatus.BAD_REQUEST, /line (?=., column)/)
  })

  it('create contract - constructor args', async () => {
    const uid = util.uid()
    const constructorArgs = { arg_uint: 1234 }
    const contractArgs = factory.createContractConstructorArgs(uid, constructorArgs)
    const contract = await rest.createContract(admin, contractArgs, options)
    assert.equal(contract.name, contractArgs.name, 'name')
    assert.isOk(util.isAddress(contract.address), 'address')
  })

  it('create contract - constructor args missing - BAD_REQUEST', async () => {
    const uid = util.uid()
    const contractArgs = factory.createContractConstructorArgs(uid)
    await assert.restStatus(async () => {
      return rest.createContract(admin, contractArgs, options)
    }, RestStatus.BAD_REQUEST, /argument names don't match:/)
  })

  // Skipped because of platform issue. https://blockapps.atlassian.net/browse/STRATO-1331
  it.skip('create many contracts - async', async () => {
    const contracts = [...Array(manyLength).keys()].map((a) => {
      const uid = util.uid()
      const contract = factory.createContractArgs(uid);
      return contract
    }) 
    const pendingResults = await rest.createContractMany(admin, contracts, { config, isAsync: true })
    const verifyHashes = pendingResults.reduce((a,r) => a && util.isHash(r.hash), true)
    assert.isOk(verifyHashes, 'hash')
    const results = await rest.resolveResults(pendingResults, options);
    const verifyStatus = results.reduce((a,r) => a && r.status !== TxResultStatus.PENDING, true)
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
    const verifyContracts = results.reduce((a,r,i) => a && util.isAddress(r.address) && r.name === contracts[i].name, true)
    assert.isOk(verifyContracts, 'contracts') 
  })

})

describe('state', function() {
  this.timeout(config.timeout)
  let admin
  const options = { config, logger }

  before(async () => {
    const uid = util.uid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  it('get state', async () => {
    const uid = util.uid()
    const constructorArgs = { arg_uint: 1234 }
    const contractArgs = factory.createContractConstructorArgs(uid, constructorArgs)
    const contract = await rest.createContract(admin, contractArgs, options)
    const state = await rest.getState(contract, options)
    assert.equal(state.var_uint, constructorArgs.arg_uint)
  })

  it('get state - BAD_REQUEST - bad contract name', async () => {
    const uid = util.uid()
    await assert.restStatus(async () => {
      return rest.getState({ name: uid, address: 0 }, options)
    }, RestStatus.BAD_REQUEST, /Couldn't find/)
  })

  it('get state - large array', async () => {
    const MAX_SEGMENT_SIZE = 100
    const SIZE = MAX_SEGMENT_SIZE * 2 + 30
    const name = 'array'
    const uid = util.uid()
    const constructorArgs = { size: SIZE }
    const filename = `${cwd}/barf/test/fixtures/LargeArray.sol`
    const contractArgs = await factory.createContractFromFile(filename, uid, constructorArgs)
    const contract = await rest.createContract(admin, contractArgs, options)
    {
      options.stateQuery = { name }
      const state = await rest.getState(contract, options)
      assert.isDefined(state[options.stateQuery.name])
      assert.equal(state.array.length, MAX_SEGMENT_SIZE)
    }
    {
      options.stateQuery = { name, length: true }
      const state = await rest.getState(contract, options)
      assert.isDefined(state[options.stateQuery.name])
      assert.equal(state.array, SIZE, 'array size')
    }
    {
      options.stateQuery = { name, length: true }
      const state = await rest.getState(contract, options)
      const length = state[options.stateQuery.name]
      const all = []
      for (let segment = 0; segment < length / MAX_SEGMENT_SIZE; segment++) {
        options.stateQuery = { name, offset: segment * MAX_SEGMENT_SIZE, count: MAX_SEGMENT_SIZE }
        const state = await rest.getState(contract, options)
        all.push(...state[options.stateQuery.name])
      }
      assert.equal(all.length, length, 'array size')
      const mismatch = all.filter((entry, index) => entry != index)
      assert.equal(mismatch.length, 0, 'no mismatches')
    }
  })

  it('get state - getArray', async () => {
    const SIZE = 230
    const name = 'array'
    const uid = util.uid()
    const constructorArgs = { size: SIZE }
    const contractArgs = await factory.createContractFromFile(`${cwd}/barf/test/fixtures/LargeArray.sol`, uid, constructorArgs)
    const contract = await rest.createContract(admin, contractArgs, options)
    const result = await rest.getArray(contract, name, options)
    assert.equal(result.length, SIZE, 'array size')
    const mismatch = result.filter((entry, index) => entry != index)
    assert.equal(mismatch.length, 0, 'no mismatches')
  })
})

describe('call', function() {
  this.timeout(config.timeout)
  let admin
  const options = { config, logger }

  before(async () => {
    const uid = util.uid()
    const userArgs = (testAuth) ? { token: process.env.USER_TOKEN } : { uid }
    admin = await factory.createAdmin(userArgs, options)
  })

  async function createContract(uid, admin, constructorArgs, options) {
    const filename = `${cwd}/barf/test/fixtures/CallMethod.sol`
    const contractArgs = await factory.createContractFromFile(filename, uid, constructorArgs)
    const contract = await rest.createContract(admin, contractArgs, options)
    return contract
  }

  it('call method', async () => {
    // create contract
    const uid = util.uid()
    const constructorArgs = { var1: 1234 }
    const contract = await createContract(uid, admin, constructorArgs, options)
    // call method
    const callArgs = { var2: 5678 }
    const method = 'multiply'
    const [result] = await rest.call(admin, contract, method, usc(callArgs), 0, options)
    const expected = constructorArgs.var1 * callArgs.var2
    assert.equal(result, expected, 'method call results')
  })

  it('call method with value', async () => {
    // create contract
    const uid = util.uid()
    const constructorArgs = { var1: 1234 }
    const contract = await createContract(uid, admin, constructorArgs, options)
    // call method
    const callArgs = { var2: 5678 }
    const value = 10
    const method = 'multiplyPayable'
    const [result] = await rest.call(admin, contract, method, usc(callArgs), value, options)
    const expected = constructorArgs.var1 * callArgs.var2
    assert.equal(result, expected, 'method call results')
  })

  it('call method with value - BAD_REQUEST - low account balance', async () => {
    // create contract
    const uid = util.uid()
    const constructorArgs = { var1: 1234 }
    const contract = await createContract(uid, admin, constructorArgs, options)
    // call method
    const callArgs = { var2: 5678 }
    const value = new BigNumber(10 ** 25);
    const method = 'multiplyPayable'
    await assert.restStatus(async () => {
      return rest.call(admin, contract, method, usc(callArgs), value, options)
    }, RestStatus.BAD_REQUEST, /low account balance/)
  })
})

describe('bloc user', function() {
  if (testAuth) return

  this.timeout(config.timeout)
  const options = { config, logger }
  const password = '1234'

  it('get all bloc users', async () => {
    const args = {}
    const result = await rest.getUsers(args, options)
    assert.equal(Array.isArray(result), true, 'return value is an array')
  })

  it('create bloc user', async () => {
    const uid = util.uid()
    const username = `user_${uid}`
    const args = { username, password }
    const user = await rest.createUser(args, options)
    const isAddress = util.isAddress(user.address)
    assert.equal(isAddress, true, 'user is valid eth address')
    assert.equal(user.username, args.username, 'username')
    assert.equal(user.password, args.password, 'password')
  })

  it('get user', async () => {
    // create a new user
    const uid = util.uid()
    const username = `user_${uid}`
    const args = { username, password }
    const user = await rest.createUser(args, options)
    // get the user
    const args2 = { username }
    const address = await rest.getUser(args2, options)
    assert.equal(address, user.address, 'user is valid eth address')
  })
})

describe('auth user', function () {
  if (!testAuth) return

  this.timeout(config.timeout)
  const options = { config, logger }
  const user = { token: process.env.USER_TOKEN }

  it('getKey', async () => {
    const address = await rest.getKey(user, options)
    const isAddress = util.isAddress(address)
    assert.equal(isAddress, true, 'user is valid eth address')
  })

  it('getKey - unknown token - FORBIDDEN', async () => {
    const badUser = { token: '1234' }
    await assert.restStatus(async () => {
      return rest.getKey(badUser, options)
    }, RestStatus.FORBIDDEN, /invalid jwt/)
  })

  // note - this can only be tested after a fresh install/wipe of strato
  it('createKey', async () => {
    try {
      await rest.getKey(user, options)
    } catch (err) {
      const address = await rest.createKey(user, options)
      const isAddress = util.isAddress(address)
      assert.equal(isAddress, true, 'user is valid eth address')
    }
  })

  it('createKey - unknown token - FORBIDDEN', async () => {
    const badUser = { token: '1234' }
    await assert.restStatus(async () => {
      return rest.createKey(badUser, options)
    }, RestStatus.FORBIDDEN, /invalid jwt/)
  })

  it('createOrGetKey', async () => {
    const address = await rest.createOrGetKey({ token: process.env.USER_TOKEN }, options)
    const isAddress = util.isAddress(address)
    assert.equal(isAddress, true, 'user is valid eth address')
  })
})
