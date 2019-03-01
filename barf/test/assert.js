import { assert } from 'chai'

assert.restStatus = async (func, expectedRestStatus, regex) => {
  let result
  try {
    result = await func()
  } catch (err) {
    const restStatus = err.response.status
    assert.equal(restStatus, expectedRestStatus, 'expected rest status error')
    if (regex !== undefined) {
      assert.isOk(regex.test(err.response.data), regex)
    }
    return
  }
  assert.isUndefined(result, `REST call completed instead of REST error ${expectedRestStatus}`)
}

export default {
  assert,
}
