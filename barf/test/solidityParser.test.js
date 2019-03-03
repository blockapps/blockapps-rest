import solidityParser from '../solidityParser'
import assert  from './assert'
import util from '../util'
import fsUtil from '../fsUtil'

describe('solidity parser', () => {

  it('parse', async () => {
    const input = `
    contract test {
        uint256 a;
        function f() {}
    }`
    const parsed = await solidityParser.parse(input)
    assert.equal(parsed.children.length, 1)
    const contract = parsed.children[0]
    assert.equal(contract.name, 'test')
  })

  it('parse enum', async () => {
    const input = `
contract ErrorCodes {

    enum ErrorCodes {
        NULL,
        SUCCESS,
        ERROR,
        NOT_FOUND,
        EXISTS,
        RECURSIVE,
        INSUFFICIENT_BALANCE,
        UNAUTHORIZED
    }
}`
    const ErrorCodes = await solidityParser.parseEnum(input)
    assert.equal(ErrorCodes.NULL, 0, 'NULL')
    assert.equal(ErrorCodes[0], 'NULL', 'NULL')
    assert.equal(ErrorCodes.UNAUTHORIZED, 7, 'UNAUTHORIZED')
    assert.equal(ErrorCodes[7], 'UNAUTHORIZED', 'UNAUTHORIZED')
  })

  it('parse enum - from file', async () => {
    const filename = `${util.cwd}/barf/test/fixtures/ErrorCodes.sol`
    const source = fsUtil.get(filename)
    const parsedEnum = await solidityParser.parseEnum(source)
    for (let i = 0; i < parsedEnum.length/2; i++) {
      assert.equal(parsedEnum[parsedEnum[i]], i, parsedEnum[i])
    }
  })
})
