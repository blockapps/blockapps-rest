import * as RestStatus from "http-status-codes";
import rest from "../rest";
import assert from "../util/assert";
import util from "../util/util";
import factory from "./factory";
import { TxResultStatus } from "../constants";
import { Options, OAuthUser } from "../types";
import oauthUtil from "../util/oauth.util";
import { AccessToken } from "../util/oauth.util";

import dotenv from "dotenv";

if (!process.env.USER_TOKEN) {
  const loadEnv = dotenv.config();
  assert.isUndefined(loadEnv.error);
}

const config = factory.getTestConfig();
const fixtures = factory.getTestFixtures();

describe("rest_7", function () {
  this.timeout(config.timeout);
  let admin;
  const options:Options = { config };

  before(async () => {
    const oauth:oauthUtil = oauthUtil.init(config.nodes[0].oauth);
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const userArgs:OAuthUser = {token: accessToken.token.access_token};
    admin = await factory.createAdmin(userArgs, options);
  });

  describe("oauthPing", function () {
    it("ping - oauth authorized", async () => {
      const result = await rest.pingOauth(admin, options)
      assert.equal(result, "success")
    });
  });

  describe("getAccounts", function () {
    this.timeout(config.timeout);

    it("getAccounts - success", async () => {
      const result = await rest.getAccounts(admin, {
        config,
        isAsync: true,
        query: {
          address: admin.address
        }
      })
      assert.isArray(result, "should be array")
      assert.equal(result.length, 1, "should be 1")
      assert.equal(result[0].address, admin.address, "address")
    });

    it("getAccounts - missing query - BAD_REQUEST 400", async () => {
      await assert.restStatus(async () => {
        return await rest.getAccounts(admin, {
          config,
          isAsync: true
        });
      }, RestStatus.BAD_REQUEST, /Need one of: address, balance, minbalance, maxbalance, nonce, minnonce, maxnonce, maxnumber, code, index, codeHash, chainid/);
    });

  });

  describe("contract call", function () {
    this.timeout(config.timeout);
    let contract;
    const var1 = 2;
    const var2 = 5;
    const method = "multiply";

    before(async () => {
      const uid = util.uid();
      const constructorArgs = { var1 };
      const filename = `${fixtures}/CallMethod.sol`;
      const contractArgs = await factory.createContractFromFile(
        filename,
        uid,
        constructorArgs
      );

      contract = await rest.createContract(admin, contractArgs, options);
      assert.equal(contract.name, contractArgs.name, "name");
      assert.isOk(util.isAddress(contract.address), "address");
    });

    it("call - async", async () => {
      const callArgs = factory.createCallArgs(contract, method, { var2 });
      const asyncOptions:Options = { ...options, isAsync: true };
      const pendingTxResult = await rest.call(admin, callArgs, asyncOptions);
      assert.isOk(util.isHash(pendingTxResult.hash), "hash");
    });

    it("call - sync", async () => {
      const callArgs = factory.createCallArgs(contract, method, { var2 });
      const [result] = await rest.call(admin, callArgs, options);
      assert.equal(parseInt(result), var1 * var2, "call results");
    });

    it("callList - async", async () => {
      const callListArgs = factory.createCallListArgs(
        contract,
        method,
        { var2 },
        0,
        15
      );
      const asyncOptions:Options = { ...options, isAsync: true };
      const pendingTxResultList = await rest.callList(
        admin,
        callListArgs,
        asyncOptions
      );
      pendingTxResultList.forEach((pendingTxResult, index) => {
        assert.equal(
          pendingTxResult.status,
          TxResultStatus.PENDING,
          `single tx result ${index}`
        );
      });
      // must resolve the tx before continuing to the next test
      await rest.resolveResults(admin, pendingTxResultList, options);
    });

    it("callList - async - BAD_REQUEST", async () => {
      const callListArgs = factory.createCallListArgs(
        contract,
        method,
        { var2 },
        0,
        15
      );
      callListArgs[2].method = "BAD_METHOD";
      const asyncOptions:Options = { ...options, isAsync: true };
      await assert.restStatus(
        async () => {
          return rest.callList(admin, callListArgs, asyncOptions);
        },
        RestStatus.BAD_REQUEST,
        /Contract doesn't have a method named 'BAD_METHOD'/
      );
    });

    it("callList - sync", async () => {
      const callListArgs = factory.createCallListArgs(
        contract,
        method,
        { var2 },
        0,
        15
      );
      const callResultList = await rest.callList(admin, callListArgs, options);
      assert.isArray(callResultList);
      assert.equal(callResultList.length, callListArgs.length);
      const expected = var1 * var2;
      callResultList.forEach((callResult, index) => {
        assert.equal(callResult[0], expected, `call result ${index}`);
      });
    });

    it("callList - sync - BAD_REQUEST", async () => {
      const callListArgs = factory.createCallListArgs(
        contract,
        method,
        { var2 },
        0,
        15
      );
      callListArgs[2].method = "BAD_METHOD";
      await assert.restStatus(
        async () => {
          return rest.callList(admin, callListArgs, options);
        },
        RestStatus.BAD_REQUEST,
        /Contract doesn't have a method named 'BAD_METHOD'/
      );
    });

    it("compile contract - single contract", async () => {
      const count = 1;
      const contracts = factory.createCompileContractsArgs(count);
      const results = await rest.compileContracts(admin, contracts, { config });
      assert.isArray(results, "should be array");
      assert.equal(results.length, contracts.length, `should be ${count}`);
      results.forEach((contract, index) => {
        assert.equal(contract.contractName, contracts[index]['contractName'])
      })
    });

    it("compile contract - multiple contracts", async () => {
      const count = 4;
      const contracts = factory.createCompileContractsArgs(count);
      const results = await rest.compileContracts(admin, contracts, { config });
      assert.isArray(results, "should be array");
      assert.equal(results.length, contracts.length, `should be ${count}`);
      results.forEach((contract, index) => {
        assert.equal(contract.contractName, contracts[index]['contractName'])
      })
    });

    it("compile contract - BAD_REQUEST 400", async () => {
      const uid = util.uid();
      const contractName = `TestContract_${uid}`;
      // this contract does not have opening and closing brackets
      const source = `contract ${contractName}`;

      const contracts = [{ contractName, source }];
      await assert.restStatus(async () => {
        await rest.compileContracts(admin, contracts, { config });
      }, RestStatus.BAD_REQUEST);
    });

    it("create contract list - async - VM: EVM", async () => {
      const count = 5;
      const contracts = factory.createContractListArgs(count);
      // compile contracts
      await rest.compileContracts(admin, contracts, { config });
      const pendingResults = await rest.createContractList(admin, contracts, {
        config: { ...options.config, VM: "EVM" },
        isAsync: true
      });
      const verifyHashes = pendingResults.reduce(
        (a, r) => a && util.isHash(r.hash),
        true
      );
      assert.isOk(verifyHashes, "hash");
      const results = await rest.resolveResults(admin, pendingResults, options);
      const verifyStatus = results.reduce(
        (a, r) => a && r.status !== TxResultStatus.PENDING,
        true
      );
      assert.isOk(verifyStatus, "results");
    });

    it("create contracts list - sync - VM: EVM", async () => {
      const count = 5;
      const contracts = factory.createContractListArgs(count);
      // compile contracts
      await rest.compileContracts(admin, contracts, { config });
      const results = await rest.createContractList(admin, contracts, {
        config: { ...options.config, VM: "EVM" },
      });
      const verifyContracts = results.reduce(
        (a, r, i) =>
          a && util.isAddress(r.address) && r.name === contracts[i].name,
        true
      );
      assert.isOk(verifyContracts, "contracts");
    });

    it("create contract list - async - VM: SolidVM", async () => {
      const count = 2;
      const contracts = factory.createContractListArgs(count);
      const pendingResults = await rest.createContractList(admin, contracts, {
        config: { ...config, VM: "SolidVM" },
        isAsync: true,
      });
      const verifyHashes = pendingResults.reduce(
        (a, r) => a && util.isHash(r.hash),
        true
      );
      assert.isOk(verifyHashes, "hash");
      const results = await rest.resolveResults(admin, pendingResults, options);
      const verifyStatus = results.reduce(
        (a, r) => a && r.status !== TxResultStatus.PENDING,
        true
      );
      assert.isOk(verifyStatus, "results");
    });

    it("create contracts list - sync - VM: SolidVM", async () => {
      const count = 5;
      const contracts = factory.createContractListArgs(count);
      const results = await rest.createContractList(admin, contracts, {
        config: { ...config, VM: "SolidVM" }
      });
      const verifyContracts = results.reduce(
        (a, r, i) =>
          a && util.isAddress(r.address) && r.name === contracts[i].name,
        true
      );
      assert.isOk(verifyContracts, "contracts");
    });

    xit("create contract list - BAD_REQUEST 400 - EVM", async () => {
      const count = 5;
      const contracts = factory.createContractListArgs(count);

      // compile contracts
      await rest.compileContracts(admin, contracts, { config });

      await assert.restStatus(async () => {
        return rest.createContractList(admin, contracts, {
          config,
          isAsync: true
        });
      }, RestStatus.BAD_REQUEST);
    });
    // VM
    it("call - option VM", async () => {
      const callArgs = factory.createCallArgs(contract, method, { var2 });
      const [result] = await rest.call(admin, callArgs, {
        ...options,
        config: {
          ...options.config,
          VM: "SolidVM"
        }
      });
      assert.equal(parseInt(result), var1 * var2, "call results");
    });
    /* Commenting this test out, since typescript forbids this error from occurring
    // bad VM
    it("call - option VM - BAD_REQUEST", async () => {
      const callArgs = factory.createCallArgs(contract, method, { var2 });
      await assert.restStatus(
        async () => {
          return rest.call(admin, callArgs, {
            ...options,
            config: { ...options.config, VM: "BAD_VM" }
          });
        },
        RestStatus.BAD_REQUEST,
        /BAD_VM/
      );
    });
    */
  });

  describe("send", function () {
    this.timeout(config.timeout);
    let user2;

    before(async () => {
      const user2Args = { token: process.env.USER2_TOKEN };
      user2 = await factory.createAdmin(user2Args, options);
    });

    it("send - sync", async () => {
      const sendTxArgs = factory.createSendTxArgs(user2.address);
      const result = await rest.send(admin, sendTxArgs, options);

      assert.equal(sendTxArgs.toAddress, result.to, "address");
      assert.equal(sendTxArgs.value, result.value, "value");

      // TODO: verify balances
    });

    it("send - async", async () => {
      const sendTxArgs = factory.createSendTxArgs(user2.address);
      const pendingTxResult = await rest.send(admin, sendTxArgs, {
        ...options,
        isAsync: true
      });
      assert.isOk(util.isHash(pendingTxResult.hash), "hash");
      // must resolve the transaction before the next test
      await rest.resolveResult(admin, pendingTxResult, options);
    });

    it("sendMany - sync", async () => {
      const sendTxs = factory.createSendTxArgsArr(admin.address);
      const results = await rest.sendMany(admin, sendTxs, { config });

      // Assert every value that was sent
      results.forEach((result, index) => {
        assert.equal(sendTxs[index].toAddress, result.to, "address");
        assert.equal(sendTxs[index].value, result.value, "value");
      });

      // TODO: verify balances
    });

    it("sendMany - async", async () => {
      const sendTxs = factory.createSendTxArgsArr(admin.address);

      const results = await rest.sendMany(admin, sendTxs, { config });

      results.forEach((result, index) => {
        assert.isOk(util.isHash(result.hash), `hash ${index}`);
      });

      // TODO: wait for tx to resolve
    });
  });
});

async function createSearchContract(
  admin,
  uid,
  index,
  options,
  specialCharacters = ""
) {
  const filename = `${fixtures}/Search.sol`;
  const args = {
    intValue: intValue(uid, index),
    stringValue: stringValue(uid, index) + specialCharacters
  };
  const contractArgs = await factory.createContractFromFile(
    filename,
    uid,
    args
  );
  const contract = await rest.createContract(admin, contractArgs, options);
  return contract;
}

function intValue(uid, index) {
  return uid * 1000 + index;
}

function stringValue(uid, index) {
  return `_${intValue(uid, index)}_`;
}

describe("search until", function () {
  this.timeout(config.timeout);
  const options:Options = { config };
  let admin, contract;

  before(async () => {
    const oauth:oauthUtil = oauthUtil.init(config.nodes[0].oauth);
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const userArgs:OAuthUser = {token: accessToken.token.access_token};
    admin = await factory.createAdmin(userArgs, options);
  });

  beforeEach(async () => {
    const uid = util.uid();
    const filename = `${fixtures}/Search.sol`;
    const args = {
      intValue: uid,
      stringValue: `_${uid}_`
    };
    const contractArgs = await factory.createContractFromFile(
      filename,
      uid,
      args
    );
    contract = await rest.createContract(admin, contractArgs, options);
  });

  it("searchUntil - get response on first call", async () => {
    // predicate is created: to get response
    function predicate(data) {
      return data.length > 0;
    }
    const result = await rest.searchUntil(admin, contract, predicate, options);
    assert.isArray(result, "should be array");
    assert.lengthOf(result, 1, "array has length of 1");
    assert.equal(result[0].address, contract.address, "address");
  });

  it("searchUntil - timeout error", async () => {
    // predicate is created: to wait until response is available otherwise throws the error
    function predicate() { }

    try {
      await rest.searchUntil(admin, contract, predicate, options);
    } catch (err) {
      assert.equal(
        err.message,
        "until: timeout 60000 ms exceeded",
        "error message should be timeout"
      );
    }
  });

  it("searchUntil - get response after five calls", async () => {
    // predicate is created: get response after five calls
    let i = 0;

    function predicate(data) {
      if (i === 5) {
        return data;
      }
      i += 1;
      return false;
    }

    const result = await rest.searchUntil(admin, contract, predicate, options);
    assert.isArray(result, "should be array");
    assert.lengthOf(result, 1, "array has length of 1");
    assert.equal(result[0].address, contract.address, "address");
  });
});

describe("search query", function () {
  this.timeout(config.timeout);
  const options:Options = { config };
  const count = 4;
  let admin;

  before(async () => {
    const oauth:oauthUtil = oauthUtil.init(config.nodes[0].oauth);
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const userArgs:OAuthUser = {token: accessToken.token.access_token};
    admin = await factory.createAdmin(userArgs, options);
  });

  it("search multiple", async () => {
    const uid = util.uid();
    const contracts = [];

    for (let i = 0; i < count; i++) {
      const contract = await createSearchContract(admin, uid, i, options);
      contracts.push(contract);
    }

    // wait for all contracts to be created
    function predicate(data) {
      return data.length >= count;
    }

    const results = await rest.searchUntil(
      admin,
      contracts[0],
      predicate,
      options
    );
    assert.isArray(results, "should be array");
    assert.lengthOf(results, count, `array has length of ${count}`);
    // check all
    results.forEach((result, index) => {
      assert.equal(result.address, contracts[index].address, "address");
      assert.equal(result.intValue, intValue(uid, index), "intValue");
      assert.equal(result.stringValue, stringValue(uid, index), "stringValue");
    });
  });

  it("search multiple with content range", async () => {
    const uid = util.uid();
    const contracts = [];

    for (let i = 0; i < count; i++) {
      const contract = await createSearchContract(admin, uid, i, options);
      contracts.push(contract);
    }

    // wait for all contracts to be created
    function predicate(response) {
      return response.data.length >= count;
    }

    const results = await rest.searchWithContentRangeUntil(
      admin,
      contracts[0],
      predicate,
      options
    );
    const { data, contentRange } = results
    assert.isDefined(contentRange, "contentRange should be defined");
    assert.equal(contentRange.count, count, "contentRange.count should be equal to count");
    assert.equal(contentRange.start, 0, "contentRange.start should be equal to 0");
    assert.equal(contentRange.end, count - 1, "contentRange.end should be equal to count - 1");
    assert.isArray(data, "should be array");
    assert.lengthOf(data, count, `array has length of ${count}`);
    // check all
    data.forEach((result, index) => {
      assert.equal(result.address, contracts[index].address, "address");
      assert.equal(result.intValue, intValue(uid, index), "intValue");
      assert.equal(result.stringValue, stringValue(uid, index), "stringValue");
    });
  });

  it("search with content range - no results", async () => {
    const uid = util.uid();
    const contracts = [];

    for (let i = 0; i < count; i++) {
      const contract = await createSearchContract(admin, uid, i, options);
      contracts.push(contract);
    }

    // wait for all contracts to be created
    function predicate(response) {
      return true;
    }

    const query = { stringValue: 'eq.ThIs Is NoT a ReAl VaLuE' }
    const dummySearchOptions:Options = { ...options, query }
    const results = await rest.searchWithContentRangeUntil(
      admin,
      contracts[0],
      predicate,
      dummySearchOptions
    );
    const { data, contentRange } = results
    assert.isDefined(contentRange, "contentRange should be defined");
    assert.equal(contentRange.count, 0, "count should be 0");
    assert.isUndefined(contentRange.start, "start should be undefined");
    assert.isUndefined(contentRange.end, "end should be undefined");
    assert.isArray(data, "should be array");
    assert.lengthOf(data, 0, `array has length of ${count}`);
  });

  it("search by value", async () => {
    const uid = util.uid();
    const contracts = [];

    for (let i = 0; i < count; i++) {
      const contract = await createSearchContract(admin, uid, i, options);
      contracts.push(contract);
    }

    // wait for all contracts to be created
    function predicate(data) {
      return data.length >= count;
    }

    await rest.searchUntil(admin, contracts[0], predicate, options);

    // search by address
    for (let i = 0; i < count; i++) {
      const contract = contracts[i];
      const result = await rest.waitForAddress(admin, contract, options);
      assert.isDefined(result, "Result should be defined");
      assert.isDefined(result.address, "Result.address should be defined");
      assert.equal(result.address, contract.address, "address");
      assert.equal(result.intValue, intValue(uid, i), "intValue");
      assert.equal(result.stringValue, stringValue(uid, i), "stringValue");
    }
    // search by int value
    for (let i = 0; i < count; i++) {
      const contract = contracts[i];
      const query = {
        intValue: `eq.${intValue(uid, i)}`
      };
      const results = await rest.search(admin, contract, { query, ...options });
      assert.lengthOf(results, 1, "one result");
      const result = results[0];
      assert.equal(result.address, contract.address, "address");
      assert.equal(result.intValue, intValue(uid, i), "intValue");
      assert.equal(result.stringValue, stringValue(uid, i), "stringValue");
    }
    // search by string value
    for (let i = 0; i < count; i++) {
      const contract = contracts[i];
      const query = {
        stringValue: `eq.${stringValue(uid, i)}`
      };
      const results = await rest.search(admin, contract, { query, ...options });
      assert.lengthOf(results, 1, "one result");
      const result = results[0];
      assert.equal(result.address, contract.address, "address");
      assert.equal(result.intValue, intValue(uid, i), "intValue");
      assert.equal(result.stringValue, stringValue(uid, i), "stringValue");
    }
    // search by both !
    for (let i = 0; i < count; i++) {
      const contract = contracts[i];
      const query = {
        intValue: `eq.${intValue(uid, i)}`,
        stringValue: `eq.${stringValue(uid, i)}`,
        address: `eq.${contract.address}`
      };
      const results = await rest.search(admin, contract, { query, ...options });
      assert.lengthOf(results, 1, "one result");
      const result = results[0];
      assert.equal(result.address, contract.address, "address");
      assert.equal(result.intValue, intValue(uid, i), "intValue");
      assert.equal(result.stringValue, stringValue(uid, i), "stringValue");
    }
    // not found
    for (let i = 0; i < count; i++) {
      const contract = contracts[i];
      const query = {
        intValue: `eq.666`,
        address: `eq.${contract.address}`
      };
      const results = await rest.search(admin, contract, { query, ...options });
      assert.lengthOf(results, 0, "no results");
    }
    // search by like
    const query = {
      stringValue: `like._${uid}*`
    };
    const results = await rest.search(admin, contracts[0], {
      query,
      ...options
    });
    assert.lengthOf(results, count, "all found");
  });

  it("search special characters", async () => {
    const uid = util.uid();
    const contracts = [];
    const specialCharacters = "!@#$% ?/<>~`+=_^&*()-";

    for (let i = 0; i < count; i++) {
      const contract = await createSearchContract(
        admin,
        uid,
        i,
        options,
        specialCharacters
      );
      contracts.push(contract);
    }

    // wait for all contracts to be created
    function predicate(data) {
      return data.length >= count;
    }

    await rest.searchUntil(admin, contracts[0], predicate, options);

    // search by address
    for (let i = 0; i < count; i++) {
      const contract = contracts[i];
      const query = {
        stringValue: `eq.${stringValue(uid, i) + specialCharacters}`
      };
      const results = await rest.search(admin, contract, { query, ...options });
      assert.lengthOf(results, 1, "one result");
      const result = results[0];
      assert.equal(result.address, contract.address, "address");
      assert.equal(result.intValue, intValue(uid, i), "intValue");
      assert.equal(
        result.stringValue,
        stringValue(uid, i) + specialCharacters,
        "stringValue"
      );
    }
  });
});

describe("chain", function () {
  this.timeout(config.timeout);
  let admin, chainId, chainArgs;
  const options:Options = { config };

  async function createChain() {
    const uid = util.uid();
    const { chain, contractName: name } = factory.createChainArgs(uid, [
      admin.address
    ]);
    const contract = { name };
    chainArgs = chain;
    const result = await rest.createChain(admin, chain, contract, options);
    return result;
  }

  before(async () => {
    const oauth:oauthUtil = oauthUtil.init(config.nodes[0].oauth);
    let accessToken:AccessToken = await oauth.getAccessTokenByClientSecret();
    const userArgs:OAuthUser = {token: accessToken.token.access_token};
    admin = await factory.createAdmin(userArgs, options);
  });

  beforeEach(async () => {
    chainId = await createChain();
  });

  it("create", async () => {
    assert.isOk(util.isHash(chainId), "hash");
  });

  it("create and verify", async () => {
    assert.isOk(util.isHash(chainId), "hash");

    // This is to wait until data is available on the chain
    await util.timeout(1000);

    // verify chain data
    const result = await rest.getChain(admin, chainId, options);
    assert.equal(result.info.label, chainArgs.label, "chain label");
    assert.equal(result.id, chainId, "chainId");
  });

  it("list of chains", async () => {
    assert.isOk(util.isHash(chainId), "hash");

    // This is to wait until data is available on the chain
    await util.timeout(1000);
    // get all chain
    const result = await rest.getChains(admin, [], options);

    assert.isArray(result, "should be array");
    assert.isAbove(result.length, 0, "should be greater than 0");
  });

  it("list of chains", async () => {
    assert.isOk(util.isHash(chainId), "hash");

    // This is to wait until data is available on the chain
    await util.timeout(1000);
    // get all chain
    const result = await rest.getChains(admin, [chainId], options);

    assert.isArray(result, "should be array");
    assert.equal(result.length, 1, "should be 1");
  });
});
