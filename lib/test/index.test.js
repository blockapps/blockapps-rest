import RestStatus from "http-status-codes";
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import rest from "../rest";
import assert from "../util/assert";
import util from "../util/util";
import fsUtil from "../util/fsUtil";
import factory from "./factory";

if (!process.env.USER_TOKEN) {
  const loadEnv = dotenv.config();
  assert.isUndefined(loadEnv.error);
}

const config = factory.getTestConfig();

const fixtures = factory.getTestFixtures();
const logger = console;

describe("contracts", function() {
  this.timeout(config.timeout);
  let admin;
  const options = { config, logger };

  before(async () => {
    const userArgs = { token: process.env.USER_TOKEN };
    admin = await factory.createAdmin(userArgs, options);
  });

  it("create contract - async", async () => {
    const uid = util.uid();
    const contractArgs = factory.createContractArgs(uid);
    const asyncOptions = { config, isAsync: true };
    const pendingTxResult = await rest.createContract(
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
    const contract = await rest.createContract(admin, contractArgs, options);
    assert.equal(contract.name, contractArgs.name, "name");
    assert.isOk(util.isAddress(contract.address), "address");
  });

  it("create contract - detailed", async () => {
    const uid = util.uid();
    const contractArgs = factory.createContractArgs(uid);
    options.isDetailed = true;
    const contract = await rest.createContract(admin, contractArgs, options);
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
    const contract = await rest.createContract(admin, contractArgs, options);
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
      /argument names don't match:/
    );
  });
});

describe("state", function() {
  this.timeout(config.timeout);
  let admin;
  const options = { config, logger };

  before(async () => {
    const userArgs = { token: process.env.USER_TOKEN };
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
    const state = await rest.getState(admin, contract, options);
    assert.equal(state.var_uint, constructorArgs.arg_uint);
  });

  it("get state - BAD_REQUEST - bad contract name", async () => {
    const uid = util.uid();
    await assert.restStatus(
      async () => {
        return rest.getState(admin, { name: uid, address: 0 }, options);
      },
      RestStatus.BAD_REQUEST,
      /Couldn't find/
    );
  });

  it("get state - large array", async () => {
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
      const state = await rest.getState(admin, contract, options);
      assert.isDefined(state[options.stateQuery.name]);
      assert.equal(state.array.length, MAX_SEGMENT_SIZE);
    }
    {
      options.stateQuery = { name, length: true };
      const state = await rest.getState(admin, contract, options);
      assert.isDefined(state[options.stateQuery.name]);
      assert.equal(state.array, SIZE, "array size");
    }
    {
      options.stateQuery = { name, length: true };
      const state = await rest.getState(admin, contract, options);
      const length = state[options.stateQuery.name];
      const all = [];
      for (let segment = 0; segment < length / MAX_SEGMENT_SIZE; segment++) {
        options.stateQuery = {
          name,
          offset: segment * MAX_SEGMENT_SIZE,
          count: MAX_SEGMENT_SIZE
        };
        const state = await rest.getState(admin, contract, options);
        all.push(...state[options.stateQuery.name]);
      }
      assert.equal(all.length, length, "array size");
      const mismatch = all.filter((entry, index) => entry != index);
      assert.equal(mismatch.length, 0, "no mismatches");
    }
  });

  it("get state - getArray", async () => {
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
    const result = await rest.getArray(admin, contract, name, options);
    assert.equal(result.length, SIZE, "array size");
    const mismatch = result.filter((entry, index) => entry != index);
    assert.equal(mismatch.length, 0, "no mismatches");
  });
});

describe("call", function() {
  this.timeout(config.timeout);
  let admin;
  const options = { config, logger };
  const var1 = 1234;
  const var2 = 5678;

  before(async () => {
    const userArgs = { token: process.env.USER_TOKEN };
    admin = await factory.createAdmin(userArgs, options);
  });

  async function createContract(uid, admin, constructorArgs, options) {
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
      value
    );
    const [result] = await rest.call(admin, callArgs, options);
    const expected = constructorArgs.var1 * methodArgs.var2;
    assert.equal(result, expected, "method call results");
  });

  it("call method with value - BAD_REQUEST - low account balance", async () => {
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
  const options = { config, logger };
  const user = { token: process.env.USER_TOKEN };

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
    const address = await rest.createOrGetKey(
      { token: process.env.USER_TOKEN },
      options
    );
    const isValidAddress = util.isAddress(address);
    assert.equal(isValidAddress, true, "user is valid eth address");
  });
});

describe("history", function() {
  this.timeout(config.timeout);
  let admin;
  const options = { config, logger };

  before(async () => {
    const userArgs = { token: process.env.USER_TOKEN };
    admin = await factory.createAdmin(userArgs, options);
  });

  it("test history", async () => {
    const filename = `${fixtures}/sampleDapp.sol`;
    const contractArgs = {
      name: "AdminInterface",
      source: fsUtil.get(filename),
      args: {
        uid: Math.floor(Math.random() * 100)
      }
    };
    const historyOptions = {
      ...options,
      history: ["Event", "Ticket", "Transaction"]
    };

    const contract = await rest.createContract(
      admin,
      contractArgs,
      historyOptions
    );

    assert.equal(contract.name, contractArgs.name, "name");
    assert.isOk(util.isAddress(contract.address), "address");

    // get state for Dapp
    const state = await rest.getState(admin, contract, options);

    assert.isOk(util.isAddress(state.eventManager), "address");
    assert.isOk(util.isAddress(state.ticketManager), "address");
    assert.isOk(util.isAddress(state.transactionManager), "address");

    // create event
    const eMethodArgs = { someInt: contractArgs.args.uid, someString: "hello" };
    const eMethod = "createEvent";

    const eCallArgs = factory.createCallArgs(
      { name: "EventManager", address: state.eventManager },
      eMethod,
      eMethodArgs
    );
    const eResult = await rest.call(admin, eCallArgs, options);
    console.log(eResult);

    // create ticket

    const tMethodArgs = {
      pnr: `${contractArgs.args.uid}5678`,
      ticketNumber: `${contractArgs.args.uid}1234`
    };
    const tMethod = "createTicket";

    const tCallArgs = factory.createCallArgs(
      { name: "TicketManager", address: state.ticketManager },
      tMethod,
      tMethodArgs
    );
    const tResult = await rest.call(admin, tCallArgs, options);

    // create transaction

    const txMethodArgs = {
      transactionId: `${contractArgs.args.uid}0000`
    };
    const txMethod = "createTransaction";

    const txCallArgs = factory.createCallArgs(
      { name: "TransactionManager", address: state.transactionManager },
      txMethod,
      txMethodArgs
    );
    const txResult = await rest.call(admin, txCallArgs, options);

    const eventHistory = await rest.search(
      admin,
      { name: `history@Event` },
      {
        ...options,
        query: {
          someInt: `eq.${eMethodArgs.someInt}`
        }
      }
    );
    assert.isArray(eventHistory);
    assert.equal(eventHistory.length, 1);

    const ticketHistory = await rest.search(
      admin,
      { name: `history@Ticket` },
      {
        ...options,
        query: {
          pnr: `eq.${tMethodArgs.pnr}`,
          ticketNumber: `eq.${tMethodArgs.ticketNumber}`
        }
      }
    );
    assert.isArray(ticketHistory);
    assert.equal(ticketHistory.length, 1);

    const txHistory = await rest.search(
      admin,
      { name: `history@Transaction` },
      {
        ...options,
        query: {
          transactionId: `eq.${txMethodArgs.transactionId}`
        }
      }
    );
    assert.isArray(txHistory);
    assert.equal(txHistory.length, 1);
  });
});
