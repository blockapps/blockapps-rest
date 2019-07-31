import { assert } from 'chai'
const { stringify} = require('flatted/cjs');

assert.restStatus = async (func, expectedRestStatus, regex, expectedStatusText) => {
  let result
  try {
    result = await func()
  } catch (err) {
    assert.isDefined(err.response, 'err.response undefined - not a rest error')
    const restStatus = err.response.status
    assert.equal(restStatus, expectedRestStatus, 'expected rest status error')
    if (regex !== undefined) {
      const dataString = stringify(err.response.data)
      assert.isOk(regex.test(dataString), `${regex} not found in ${dataString}`)
    }
    if (expectedStatusText) {
      const restStatusText = err.response.statusText
      assert.equal(restStatusText, expectedStatusText, 'expected rest status error')
    }
    return
  }
  assert.isUndefined(result, `REST call completed instead of REST error ${expectedRestStatus}`)
}

export default assert
