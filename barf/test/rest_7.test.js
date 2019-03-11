import rest from '../rest_7'
import assert from './assert'
import { cwd, uid, isHash, isAddress } from '../util'
import fsUtil from '../fsUtil'
import factory from './factory'

import dotenv from 'dotenv'
const loadEnv = dotenv.config();
assert.isUndefined(loadEnv.error)

const config = fsUtil.getYaml(`${cwd}/barf/test/config.yaml`)

describe('rest_7', function () {
  this.timeout(config.timeout)
  let admin
  let tokenUser
  const options = { config }

  before(async () => {
    assert.isDefined(process.env.USER_TOKEN)
    const address = await rest.createOrGetKey({ token: process.env.USER_TOKEN }, options);
    assert.isOk(isAddress(address))

    admin = await factory.createAdmin(uid(), options)
    tokenUser = { token: process.env.USER_TOKEN }
  })

  describe('contracts', function () {

    let contract;
    const args = {
      _var1: 2,
      _var2: 5
    };

    before(async () => {

      const constructorArgs = { var1: args._var1 }
      const filename = `${cwd}/barf/test/fixtures/CallMethod.sol`
      const contractArgs = await factory.createContractFromFile(filename, uid(), constructorArgs)

      contract = await rest.createContract(admin, contractArgs, options)
      assert.equal(contract.name, contractArgs.name, 'name')
      assert.isOk(isAddress(contract.address), 'address')

    })

    it('callMethod - async', async () => {
      const callMethod = factory.createCallMethodArgs(contract, { _var2: args._var2 });

      const result = await rest.callMethod(tokenUser, callMethod, { config, isAsync: true });
      assert.isOk(isHash(result.hash), 'hash')
      assert.equal(parseInt(result.data.contents[0]), args._var1 * args._var2, 'should be equal')
    })

    it('callMethod - sync', async () => {
      const callMethod = factory.createCallMethodArgs(contract, { _var2: args._var2 });

      const result = await rest.callMethod(tokenUser, callMethod, { config });
      assert.isOk(isHash(result), 'hash')

    })

    it('callMethodMany - async', async () => {

      const callMethodArgs = factory.createCallMethodArgsArr(contract, { _var2: args._var2 });
      const result = await rest.callMethodMany(tokenUser, callMethodArgs, { config: config, isAsync: true });

      result.forEach((value, index) => {
        assert.equal(parseInt(result[index]), args._var1 * args._var2, 'should be equal')
      })
    });

    it('callMethodMany - sync', async () => {
      const callMethodArgs = factory.createCallMethodArgsArr(contract, { _var2: args._var2 });
      const result = await rest.callMethodMany(tokenUser, callMethodArgs, { config: config });

      assert.isArray(result);
      result.forEach((value, index) => {
        assert.isOk(isHash(result[index]), 'hash')
      })
    })
  });

  xit('createContractMany', async () => {
    //  TODO: need some clarification

    // Create multiple contract
    const contracts = [factory.createContractArgs(uid()), factory.createContractArgs(uid())];

    const result = await rest.createContractMany(tokenUser, contracts, { config, isAsync: false });
  })


  it('send - async', async () => {
    const sendTxArgs = factory.createSendTxArgs(admin.address);
    const result = await rest.send(tokenUser, sendTxArgs, { config, isAsync: true });

    assert.equal(sendTxArgs.toAddress, result.to, 'address')
    assert.equal(sendTxArgs.value, result.value, 'value')
  })

  it('send - sync', async () => {
    const sendTxArgs = factory.createSendTxArgs(admin.address);
    const result = await rest.send(tokenUser, sendTxArgs, { config });
    assert.isOk(isHash(result), 'hash')
  })

  it('sendMany - async', async () => {
    const sendTxs = factory.createSendTxArgsArr(admin.address);
    const results = await rest.sendMany(tokenUser, sendTxs, { config, isAsync: true });

    // Assert every value that was sent
    results.forEach((result, index) => {
      assert.equal(sendTxs[index].toAddress, result.to, 'address')
      assert.equal(sendTxs[index].value, result.value, 'value')
    })
  })

  it('sendMany - sync', async () => {
    const sendTxs = factory.createSendTxArgsArr(admin.address);

    const result = await rest.sendMany(tokenUser, sendTxs, { config });
    assert.isOk(isHash(result), 'hash')
  })

})