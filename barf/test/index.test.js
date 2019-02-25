const { rest, assert } = require('../index')
const util = require('../util')
const fsUtil = require('../fsUtil')

const config = fsUtil.getYaml('barf/test/config.yaml')
const password = '1234'

describe('contracts', () => {
  let admin
  const options = { config }

  before(async () => {
    const uid = util.uid()
    const username = `admin_${uid}`
    const args = { username, password }
    const { user } = await rest.createUser(args, options)
    admin = user
  })

  it('create contract', async () => {
    const uid = util.uid()
    const contract = createTestContract(uid)
    const args = {}
    const { name, hash } = await rest.createContract(admin, contract, args, options)
    assert.equal(name, contract.name, 'name')
    assert.isDefined(hash, 'name') // TODO add util.isHash for testing
  })
})

describe('user', () => {
  it('get all users', async () => {
    const args = {}
    const options = { config }
    const result = await rest.getUsers(args, options)
    assert.equal(Array.isArray(result), true, 'return value is an array')
  })

  it('create user', async () => {
    const uid = util.uid()
    const username = `user_${uid}`
    const args = { username, password }
    const options = { config }
    const { address, user } = await rest.createUser(args, options)
    const isAddress = util.isAddress(address)
    assert.equal(isAddress, true, 'user is valid eth address')
    assert.equal(user.username, args.username, 'username')
    assert.equal(user.password, args.password, 'password')
    assert.equal(user.address, address, 'address')
  })

  it('get user', async () => {
    // create a new user
    const uid = util.uid()
    const username = `user_${uid}`
    const args = { username, password }
    const options = { config }
    const address = await rest.createUser(args, options)
    // get the user
    const args2 = { username }
    const options2 = { config }
    const address2 = await rest.getUser(args2, options2)
    assert.equal(address, address2, 'user is valid eth address')
  })
})

describe('include rest', () => {
  it('testAsync', async () => {
    const args = { a: 'b' }
    const result = await rest.testAsync(args)
    assert.deepEqual(result, args, 'test async')
  })

  it('testPromise', async () => {
    const args = { success: true }
    const result = await rest.testPromise(args)
    assert.deepEqual(result, args, 'test promise')

    args.success = false
    try {
      await rest.testPromise(args)
    } catch (err) {
      assert.deepEqual(err, args, 'test promise')
    }
  })
})

function createTestContract(uid) {
  const name = `TestContract${uid}`
  const source = `contract ${name} { }`
  return { name, source }
}