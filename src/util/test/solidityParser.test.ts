/* eslint-disable dot-notation */
import { assert } from 'chai'
import solidityParser from '../solidityParser'
import util from '../util'
import fsUtil from '../fsUtil'

describe('solidity parser', () => {
  describe('enum', () => {
    it('parse', async () => {
      const input = `
    contract test {
        uint256 a;
        function f() {}
    }`
      const parsed = solidityParser.parse(input)
      assert.equal((parsed as any).children.length, 1)
      const contract = (parsed as any).children[0]
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
      const ErrorCodes = solidityParser.parseEnum(input)
      assert.equal(ErrorCodes.NULL, 0, 'NULL')
      assert.equal(ErrorCodes[0], 'NULL', 'NULL')
      assert.equal(ErrorCodes.UNAUTHORIZED, 7, 'UNAUTHORIZED')
      assert.equal(ErrorCodes[7], 'UNAUTHORIZED', 'UNAUTHORIZED')
    })

    it('parse enum - from file', async () => {
      const filename = `${util.cwd}/lib/util/test/fixtures/solidityParser/ErrorCodes.sol`
      const source = fsUtil.get(filename)
      const parsedEnum = solidityParser.parseEnum(source)
      for (let i = 0; i < parsedEnum.length / 2; i++) {
        assert.equal(parsedEnum[parsedEnum[i]], i, parsedEnum[i])
      }
    })
  })

  describe('fields', () => {
    it('parse input', async () => {
      const input = `
    contract test {
        uint256 a;
        uint256 b = 1234;
        string c = 'ABCD';
        function f() {}
    }`
      const fields = solidityParser.parseFields(input)
      assert.equal(fields['b'], 1234)
      assert.equal(fields['1234'], 'b')
      assert.equal(fields['c'], 'ABCD')
      assert.equal(fields['ABCD'], 'c')
      assert.isUndefined(fields['a'])
      assert.isUndefined(fields['f'])
    })

    it('parse with prefix', async () => {
      const input = `
    contract test {
        uint256  a;
        uint256  b     = 1234;
        string   c     = 'ABCD';
        uint256  pre_b = 5678;
        string   pre_c = 'EFGH';
        function f() {}
    }`
      const fields = solidityParser.parseFields(input, 'pre_')
      assert.equal(fields['pre_b'], 5678)
      assert.equal(fields['5678'], 'pre_b')
      assert.equal(fields['pre_c'], 'EFGH')
      assert.equal(fields['EFGH'], 'pre_c')
      assert.isUndefined(fields['a'])
      assert.isUndefined(fields['b'])
      assert.isUndefined(fields['c'])
      assert.isUndefined(fields['f'])
    })

    it('parse fields - from file', async () => {
      const filename = `${util.cwd}/lib/util/test/fixtures/solidityParser/FieldsTest.sol`
      const source = fsUtil.get(filename)
      const fields = solidityParser.parseFields(source, 'PRE_')
      assert.equal(fields['PRE_A'], 'A')
      assert.equal(fields['A'], 'PRE_A')
      assert.equal(fields['PRE_B'], 'B')
      assert.equal(fields['B'], 'PRE_B')
    })
  })
})
