import * as RestStatus from "http-status-codes";
import BigNumber from "bignumber.js";
import * as dotenv from "dotenv";
import rest from "../rest";
import assert from "../util/assert";
import util from "../util/util";
import fsUtil from "../util/fsUtil";
import factory from "./factory";
import { Options, Contract, TransactionResultHash, OAuthUser } from "../types";
import oauthUtil from "../util/oauth.util";
import { AccessToken } from "../util/oauth.util";

if (!process.env.USER_TOKEN) {
  const loadEnv = dotenv.config();
  assert.isUndefined(loadEnv.error);
}


const config = factory.getTestConfig();

const oauth:oauthUtil = oauthUtil.init(config.nodes[0].oauth);

const fixtures = factory.getTestFixtures();

describe("contracts", function() {
  this.timeout(config.timeout);
  let admin;
  const options:Options = { config };

  before(async () => {
    const oauth:oauthUtil = oauthUtil.init(config.nodes[0].oauth);
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const userArgs:OAuthUser = { token: accessToken.token.access_token };
    admin = await factory.createAdmin(userArgs, options);
  });

  it("create contract - async", async () => {
    const uid = util.uid();
    const contractArgs = factory.createContractArgs(uid);
    const asyncOptions = { config, isAsync: true };
    const pendingTxResult = <TransactionResultHash> await rest.createContract(
      admin,
      contractArgs,
      asyncOptions
    );
    assert.isOk(util.isHash(pendingTxResult.hash), "hash");
    // must resolve the tx before continuing to the next test
    await rest.resolveResult(admin, pendingTxResult, options);
  });

  it("create contract", async () => {
    const uid = util.uid();
    const contractArgs = factory.createContractArgs(uid);
    const contract = <Contract>await rest.createContract(admin, contractArgs, options);
    assert.equal(contract.name, contractArgs.name, "name");
    assert.isOk(util.isAddress(contract.address), "address");
  });

  it("create contract - detailed", async () => {
    const uid = util.uid();
    const contractArgs = factory.createContractArgs(uid);
    options.isDetailed = true;
    const contract = <Contract>await rest.createContract(admin, contractArgs, options);
    assert.equal(contract.name, contractArgs.name, "name");
    assert.isOk(util.isAddress(contract.address), "address");
    assert.isDefined(contract.src, "src");
    assert.isDefined(contract.bin, "bin");
    assert.isDefined(contract.codeHash, "codeHash");
    assert.isDefined(contract.chainId, "chainId");
  });

  it("create contract - BAD_REQUEST", async () => {
    const uid = util.uid();
    const contractArgs = factory.createContractSyntaxErrorArgs(uid);
    await assert.restStatus(
      async () => {
        return rest.createContract(admin, contractArgs, options);
      },
      RestStatus.BAD_REQUEST,
      /line (?=., column)/
    );
  });

  it("create contract - constructor args", async () => {
    const uid = util.uid();
    const constructorArgs = { arg_uint: 1234 };
    const contractArgs = factory.createContractConstructorArgs(
      uid,
      constructorArgs
    );
    const contract = <Contract>await rest.createContract(admin, contractArgs, options);
    assert.equal(contract.name, contractArgs.name, "name");
    assert.isOk(util.isAddress(contract.address), "address");
  });

  it("create contract - constructor args missing - BAD_REQUEST", async () => {
    const uid = util.uid();
    const contractArgs = factory.createContractConstructorArgs(uid);
    await assert.restStatus(
      async () => {
        return rest.createContract(admin, contractArgs, options);
      },
      RestStatus.BAD_REQUEST,
      /Argument names don't match - Expected Arguments: /
    );
  });
});

describe("state", function() {
  this.timeout(config.timeout);
  let admin;
  const options:Options = { config };

  before(async () => {
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const userArgs = { token: accessToken.token.access_token };
    admin = await factory.createAdmin(userArgs, options);
  });

  it("get state", async () => {
    const uid = util.uid();
    const constructorArgs = { arg_uint: 1234 };
    const contractArgs = factory.createContractConstructorArgs(
      uid,
      constructorArgs
    );
    const contract = await rest.createContract(admin, contractArgs, options);
    const state = await rest.getState(admin, contract as Contract, options);
    assert.equal(state.var_uint, constructorArgs.arg_uint);
  });

  it("get state - BAD_REQUEST - bad contract name", async () => {
    const uid = util.uid();
    await assert.restStatus(
      async () => {
        return rest.getState(admin, { name: uid, address: "0" }, options);
      },
      RestStatus.BAD_REQUEST
    );
  });

  it.skip("get state - large array", async () => {
    const MAX_SEGMENT_SIZE = 100;
    const SIZE = MAX_SEGMENT_SIZE * 2 + 30;
    const name = "array";
    const uid = util.uid();
    const constructorArgs = { size: SIZE };
    const filename = `${fixtures}/LargeArray.sol`;
    const contractArgs = await factory.createContractFromFile(
      filename,
      uid,
      constructorArgs
    );
    const contract = await rest.createContract(admin, contractArgs, options);
    {
      options.stateQuery = { name };
      const state = await rest.getState(admin, contract as Contract, options);
      assert.isDefined(state[options.stateQuery.name]);
      assert.equal(state.array.length, MAX_SEGMENT_SIZE);
    }
    {
      options.stateQuery = { name, length: true };
      const state = await rest.getState(admin, contract as Contract, options);
      assert.isDefined(state[options.stateQuery.name]);
      assert.equal(state.array, SIZE, "array size");
    }
    {
      options.stateQuery = { name, length: true };
      const state = await rest.getState(admin, contract as Contract, options);
      const length = state[options.stateQuery.name];
      const all = [];
      for (let segment = 0; segment < length / MAX_SEGMENT_SIZE; segment++) {
        options.stateQuery = {
          name,
          offset: segment * MAX_SEGMENT_SIZE,
          count: MAX_SEGMENT_SIZE
        };
        const state = await rest.getState(admin, contract as Contract, options);
        all.push(...state[options.stateQuery.name]);
      }
      assert.equal(all.length, length, "array size");
      const mismatch = all.filter((entry, index) => entry != index);
      assert.equal(mismatch.length, 0, "no mismatches");
    }
  });

  it.skip("get state - getArray", async () => {
    const SIZE = 230;
    const name = "array";
    const uid = util.uid();
    const constructorArgs = { size: SIZE };
    const contractArgs = await factory.createContractFromFile(
      `${fixtures}/LargeArray.sol`,
      uid,
      constructorArgs
    );
    const contract = await rest.createContract(admin, contractArgs, options);
    const result = await rest.getArray(admin, contract as Contract, name, options);
    assert.equal(result.length, SIZE, "array size");
    const mismatch = result.filter((entry, index) => entry != index);
    assert.equal(mismatch.length, 0, "no mismatches");
  });
});

describe("call", function() {
  this.timeout(config.timeout);
  let admin;
  const options:Options = { config };
  const var1 = 1234;
  const var2 = 5678;

  before(async () => {
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const userArgs = { token: accessToken.token.access_token };
    admin = await factory.createAdmin(userArgs, options);
  });

  async function createContract(uid, admin, constructorArgs, options:Options) {
    const filename = `${fixtures}/CallMethod.sol`;
    const contractArgs = await factory.createContractFromFile(
      filename,
      uid,
      constructorArgs
    );
    const contract = await rest.createContract(admin, contractArgs, options);
    return contract;
  }

  it("call method", async () => {
    // create contract
    const uid = util.uid();
    const constructorArgs = { var1: 1234 };
    const contract = await createContract(uid, admin, constructorArgs, options);
    // call method
    const methodArgs = { var2: 5678 };
    const method = "multiply";
    const callArgs = factory.createCallArgs(contract, method, methodArgs);
    const [result] = await rest.call(admin, callArgs, options);
    const expected = constructorArgs.var1 * methodArgs.var2;
    assert.equal(result, expected, "method call results");
  });

  it("call method with value", async () => {
    // create contract
    const uid = util.uid();
    const constructorArgs = { var1: 1234 };
    const contract = await createContract(uid, admin, constructorArgs, options);
    // call method
    const methodArgs = { var2: 5678 };
    const value = 10;
    const method = "multiplyPayable";
    const callArgs = factory.createCallArgs(
      contract,
      method,
      methodArgs,
      new BigNumber(value)
    );
    const [result] = await rest.call(admin, callArgs, options);
    const expected = constructorArgs.var1 * methodArgs.var2;
    assert.equal(result, expected, "method call results");
  });

  // skipping for gasOn=false mode (which is the new default)
  xit("call method with value - BAD_REQUEST - low account balance", async () => {
    // create contract
    const uid = util.uid();
    const constructorArgs = { var1: 1234 };
    const contract = await createContract(uid, admin, constructorArgs, options);
    // call method
    const methodArgs = { var2: 5678 };
    const value = new BigNumber(10 ** 25);
    const method = "multiplyPayable";
    const callArgs = factory.createCallArgs(
      contract,
      method,
      methodArgs,
      value
    );
    await assert.restStatus(
      async () => {
        return rest.call(admin, callArgs, options);
      },
      RestStatus.BAD_REQUEST,
      /low account balance/
    );
  });
});

describe("auth user", function() {
  this.timeout(config.timeout);
  const options:Options = { config };

  let user:OAuthUser;

  before(async () => {
    const oauth:oauthUtil = oauthUtil.init(config.nodes[0].oauth);
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    user = { token: accessToken.token.access_token };
  });

  it("getKey", async () => {
    const address = await rest.getKey(user, options);
    const isValidAddress = util.isAddress(address);
    assert.equal(isValidAddress, true, "user is valid eth address");
  });

  it("getKey - unknown token - FORBIDDEN", async () => {
    const badUser = { token: "1234" };
    await assert.restStatus(
      async () => {
        return rest.getKey(badUser, options);
      },
      RestStatus.FORBIDDEN,
      /invalid jwt/
    );
  });

  // note - this can only be tested after a fresh install/wipe of strato
  it("createKey", async () => {
    try {
      await rest.getKey(user, options);
    } catch (err) {
      const address = await rest.createKey(user, options);
      const isValidAddress = util.isAddress(address);
      assert.equal(isValidAddress, true, "user is valid eth address");
    }
  });

  it("createKey - unknown token - FORBIDDEN", async () => {
    const badUser = { token: "1234" };
    await assert.restStatus(
      async () => {
        return rest.createKey(badUser, options);
      },
      RestStatus.FORBIDDEN,
      /invalid jwt/
    );
  });

  it("createOrGetKey", async () => {
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const address = await rest.createOrGetKey(
      { token: accessToken.token.access_token },
      options
    );
    const isValidAddress = util.isAddress(address);
    assert.equal(isValidAddress, true, "user is valid eth address");
  });
});

describe("history", function() {
  this.timeout(config.timeout);
  let admin;
  const options:Options = { config };

  before(async () => {
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const userArgs = { token: accessToken.token.access_token };
    admin = await factory.createAdmin(userArgs, options);
  });

  it("test history", async () => {
    const filename = `${fixtures}/TestHistory.sol`;
    const fst = Math.floor(Math.random() * 100)
    const scd = fst + 1
    const contractArgs = {
      name: "TestHistory",
      source: fsUtil.get(filename),
      args: {
        _x: fst,
      }
    };
    const historyOptions:Options = {
      ...options,
      history: ["TestHistory"]
    };

    const contract = <Contract> await rest.createContract(
      admin,
      contractArgs,
      historyOptions
    );

    assert.equal(contract.name, contractArgs.name, "name");
    assert.isOk(util.isAddress(contract.address), "address");

    // call a function
    const methodArgs = { x: scd };
    const method = "setX";

    const callArgs = factory.createCallArgs(
      { name: "TestHistory", address: contract.address },
      method,
      methodArgs
    );
    const result = await rest.call(admin, callArgs, options);
    console.log(result);

      
    const contractHistory = await rest.searchUntil(
      admin,
      { name: `history@TestHistory` },
      (r) => r.length > 1,
      {
        ...options,
        query: {
          address: `eq.${contract.address}`
        }
      }
    );
    assert.isArray(contractHistory);
    assert.equal(contractHistory.length, 2);

    const filteredContractHistory = await rest.searchUntil(
      admin,
      { name: `history@TestHistory` },
      (r) => r.length > 0,
      {
        ...options,
        query: {
          x: `eq.${scd}`,
          address: `eq.${contract.address}`
        }
      }
    );
    assert.isArray(filteredContractHistory);
    assert.equal(filteredContractHistory.length, 1);
  });
});
