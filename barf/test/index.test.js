import RestStatus from 'http-status-codes'
import rest from '../rest_7'
import assert from './assert'
import util from '../util'
import fsUtil from '../fsUtil'
import factory from './factory'

import dotenv from 'dotenv'
const loadEnv = dotenv.config();
assert.isUndefined(loadEnv.error)


const { cwd, usc } = util

const config = fsUtil.getYaml(`${cwd}/barf/test/config.yaml`)

describe('contracts', function() {
  this.timeout(config.timeout)
  let admin
  let tokenUser
  const options = { config }

  before(async () => {
    const uid = util.uid()

    assert.isDefined(process.env.USER_TOKEN)
    const address = await rest.createOrGetKey({ token: process.env.USER_TOKEN },options);
    assert.isOk(util.isAddress(address))

    admin = await factory.createAdmin(uid, options)
    tokenUser = {token: process.env.USER_TOKEN}
  })

  it('create contract - async', async () => {
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
    const contract = await rest.createContract(admin, contractArgs, {config})
    assert.equal(contract.name, contractArgs.name, 'name')
    assert.isOk(util.isAddress(contract.address), 'address')
  })

  it('create contract - sync - detailed', async () => {
    const uid = util.uid()
    const contractArgs = factory.createContractArgs(uid)
    const detailedOptions = {
      isDetailed: true,
      config
    }
    const contract = await rest.createContract(admin, contractArgs, detailedOptions)
    assert.equal(contract.name, contractArgs.name, 'name')
    assert.isOk(util.isAddress(contract.address), 'address')
    assert.isDefined(contract.src, 'src')
    assert.isDefined(contract.bin, 'bin')
    assert.isDefined(contract.codeHash, 'codeHash')
    assert.isDefined(contract.chainId, 'chainId')
  })

  it('create contract - oauth', async() => {
    const uid = util.uid()
    const contractArgs = factory.createContractArgs(uid)
    const oauthOptions = {
      isDetailed: true,
      config
    }
    const contract = await rest.createContract(
      tokenUser,
      contractArgs, 
      oauthOptions
    )
    assert.equal(contract.name, contractArgs.name, 'name')
    assert.isOk(util.isAddress(contract.address), 'address')
    assert.isDefined(contract.src, 'src')
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
})

describe('state', function() {
  this.timeout(config.timeout)
  let admin
  const options = { config }

  before(async () => {
    const uid = util.uid()
    admin = await factory.createAdmin(uid, options)
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
      options.query = { name }
      const state = await rest.getState(contract, options)
      assert.isDefined(state[options.query.name])
      assert.equal(state.array.length, MAX_SEGMENT_SIZE)
    }
    {
      options.query = { name, length: true }
      const state = await rest.getState(contract, options)
      assert.isDefined(state[options.query.name])
      assert.equal(state.array, SIZE, 'array size')
    }
    {
      options.query = { name, length: true }
      const state = await rest.getState(contract, options)
      const length = state[options.query.name]
      const all = []
      for (let segment = 0; segment < length / MAX_SEGMENT_SIZE; segment++) {
        options.query = { name, offset: segment * MAX_SEGMENT_SIZE, count: MAX_SEGMENT_SIZE }
        const state = await rest.getState(contract, options)
        all.push(...state[options.query.name])
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

describe('user', function() {
  this.timeout(config.timeout)
  const options = { config }
  const password = '1234'

  it('get all users', async () => {
    const args = {}
    const result = await rest.getUsers(options)
    assert.equal(Array.isArray(result), true, 'return value is an array')
  })

  it('create user', async () => {
    const uid = util.uid()
    const username = `user_${uid}`
    const args = { username, password }
    const options = { config }
    const createdUser = await rest.createUser(args, options)
    const isAddress = util.isAddress(createdUser.address)
    assert.equal(isAddress, true, 'user is valid eth address')
    assert.equal(createdUser.username, args.username, 'username')
    assert.equal(createdUser.password, args.password, 'password')
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
