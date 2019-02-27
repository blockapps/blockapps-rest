const { assert } = require('chai')

assert.restStatus = async (func, expectedRestStatus) => {
  let result
  try {
    result = await func()
  } catch (err) {
    const restStatus = err.response.status
    assert.equal(restStatus, expectedRestStatus, 'expected rest status error')
    return
  }
  assert.isUndefined(result, `REST call completed instead of REST error ${expectedRestStatus}`)
}

module.exports = {
  assert,
}
