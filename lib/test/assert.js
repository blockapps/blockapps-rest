import { assert } from 'chai'

assert.restStatus = async (func, expectedRestStatus, regex) => {
  let result
  try {
    result = await func()
  } catch (err) {
    assert.isDefined(err.response, 'err.response undefined - not a rest error')
    const restStatus = err.response.status
    assert.equal(restStatus, expectedRestStatus, 'expected rest status error')
    if (regex !== undefined) {
      const dataString = JSON.stringify(err.response.data)
      assert.isOk(regex.test(dataString), `${regex} not found in ${dataString}`)
    }
    return
  }
  assert.isUndefined(result, `REST call completed instead of REST error ${expectedRestStatus}`)
}

export default assert
