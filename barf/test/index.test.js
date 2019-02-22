const config = {}
const { rest } = require('../index.js')
const { assert } = require('chai')

describe('user', () => {
  it('/user', async () => {
    const args = { a: 'b' }
    const result = await rest.user(args)
    assert.deepEqual(result, args, 'test async')
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

