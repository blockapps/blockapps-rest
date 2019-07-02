import { BigNumber } from "bignumber.js";
import RestStatus from "http-status-codes";
import api from "./api";
import { TxResultStatus } from "./constants";
import util from "./util/util";
import { constructMetadata, setAuthHeaders } from "./util/api.util";
import { RestError, response } from "./util/rest.util";
import jwt from "jsonwebtoken";

// =====================================================================
//   util
// =====================================================================

function isTxSuccess(txResult) {
  return txResult.status === TxResultStatus.SUCCESS;
}

function isTxFailure(txResult) {
  return txResult.status === TxResultStatus.FAILURE;
}

function assertTxResult(txResult) {
  if (isTxFailure(txResult)) {
    throw new RestError(
      RestStatus.BAD_REQUEST,
      txResult.txResult.message,
      txResult.txResult
    );
  }
  return txResult;
}

function assertTxResultList(txResultList) {
  txResultList.forEach((txResult, index) => {
    if (isTxFailure(txResult)) {
      throw new RestError(
        RestStatus.BAD_REQUEST,
        `tx:${index}, message:${txResult.txResult.message}`,
        { index, txResult: txResult.txResult }
      );
    }
  });
  return txResultList;
}

async function resolveResult(user, pendingTxResult, options) {
  return (await resolveResults(user, [pendingTxResult], options))[0];
}

async function resolveResults(user, pendingResults, _options = {}) {
  const options = Object.assign({ isAsync: true }, _options);

  // wait until there are no more PENDING results
  const predicate = results =>
    results.filter(r => r.status === TxResultStatus.PENDING).length === 0;
  const action = async () =>
    getBlocResults(user, pendingResults.map(r => r.hash), options);
  const resolvedResults = await util.until(predicate, action, options);
  return resolvedResults;
}

// =====================================================================
//   user
// =====================================================================

async function getUsers(args, options) {
  const users = await api.getUsers(args, options);
  return users;
}

async function getUser(args, options) {
  const [address] = await api.getUser(args, options);
  return address;
}

async function createUser(args, options) {
  const address = await createOrGetKey(args, options);
  const user = Object.assign({}, args, { address });
  return user;
}

async function fill(user, options) {
  const txResult = await api.fill(user, options);
  return assertTxResult(txResult);
}

// =====================================================================
//   contract
// =====================================================================

async function createContract(user, contract, options) {
  const [pendingTxResult] = await api.createContract(user, contract, options);
  return createContractResolve(user, pendingTxResult, options);
}

async function createContractResolve(user, pendingTxResult, options) {
  // throw if FAILURE
  assertTxResult(pendingTxResult);
  // async - do not resolve
  if (options.isAsync) return pendingTxResult;
  // resolve - wait until not pending
  const resolvedTxResult = await resolveResult(user, pendingTxResult, options);
  // throw if FAILURE
  assertTxResult(pendingTxResult);
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResult.data.contents;
  // return basic contract object
  return {
    name: resolvedTxResult.data.contents.name,
    address: resolvedTxResult.data.contents.address
  };
}

// =====================================================================
//   contract list
// =====================================================================

async function createContractList(user, contract, options) {
  const [pendingTxResult] = await api.createContractList(
    user,
    contract,
    options
  );
  return createContractListResolve(pendingTxResult, options);
}

async function createContractListResolve(pendingTxResultList, options) {
  // throw if FAILURE
  assertTxResultList(pendingTxResultList); // @samrit what if 1 result failed ?
  // async - do not resolve
  if (options.isAsync) return pendingTxResultList;
  // resolve - wait until not pending
  const resolvedTxResultList = await resolveResults(
    user,
    pendingTxResultList,
    options
  );
  // throw if FAILURE
  assertTxResultList(resolvedTxResultList);
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResultList;
  // return a list basic contract object
  return resolvedTxResultList.map(
    resolvedTxResult => resolvedTxResult.data.contents
  );
}

// =====================================================================
//   key
// =====================================================================

async function getKey(user, options) {
  const response = await api.getKey(user, options);
  return response.address;
}

async function createKey(user, options) {
  const response = await api.createKey(user, options);
  return response.address;
}

async function createOrGetKey(user, options) {
  try {
    const response = await api.getKey(user, options);

    const balance = await api.getBalance({ ...user, ...response }, options);
    if (balance.isEqualTo(0)) {
      await fill({ ...user, ...response }, { isAsync: false, ...options });
    }
    return response.address;
  } catch (err) {
    const response = await api.createKey(user, options);
    await fill({ ...user, ...response }, { isAsync: false, ...options });
    return response.address;
  }
}

// =====================================================================
//   state
// =====================================================================

async function getBlocResults(user, hashes, options) {
  return api.blocResults(user, hashes, options);
}

async function getState(user, contract, options) {
  return api.getState(user, contract, options);
}

async function getArray(user, contract, name, options) {
  const MAX_SEGMENT_SIZE = 100;
  options.stateQuery = { name, length: true };
  const state = await getState(user, contract, options);
  const length = state[name];
  const result = [];
  for (let segment = 0; segment < length / MAX_SEGMENT_SIZE; segment++) {
    options.stateQuery = {
      name,
      offset: segment * MAX_SEGMENT_SIZE,
      count: MAX_SEGMENT_SIZE
    };
    const state = await getState(user, contract, options);
    result.push(...state[name]);
  }
  return result;
}

// =====================================================================
//   call
// =====================================================================

async function call(user, callArgs, options) {
  const [pendingTxResult] = await api.call(user, callArgs, options);
  return callResolve(user, pendingTxResult, options);
}

async function callResolve(user, pendingTxResult, options) {
  // throw if FAILURE
  assertTxResult(pendingTxResult);
  // async - do not resolve
  if (options.isAsync) return pendingTxResult;
  // resolve - wait until not pending
  const resolvedTxResult = await resolveResult(user, pendingTxResult, options);
  // throw if FAILURE
  assertTxResult(pendingTxResult);
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResult;
  // return basic contract object
  return resolvedTxResult.data.contents;
}

// =====================================================================
//   call list
// =====================================================================

async function callList(user, callListArgs, options) {
  const pendingTxResultList = await api.callList(user, callListArgs, options);
  return callListResolve(user, pendingTxResultList, options);
}

async function callListResolve(user, pendingTxResultList, options) {
  // throw if FAILURE
  assertTxResultList(pendingTxResultList); // @samrit what if 1 result failed ?
  // async - do not resolve
  if (options.isAsync) return pendingTxResultList;
  // resolve - wait until not pending
  const resolvedTxResultList = await resolveResults(
    user,
    pendingTxResultList,
    options
  );
  // throw if FAILURE
  assertTxResultList(resolvedTxResultList);
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResultList;
  // return a list basic contract object
  return resolvedTxResultList.map(
    resolvedTxResult => resolvedTxResult.data.contents
  );
}

// =====================================================================
//   send
// =====================================================================

async function send(user, sendTx, options) {
  const [pendingTxResult] = await api.send(user, sendTx, options);

  if (options.isAsync) {
    return pendingTxResult;
  }

  const resolvedResult = await resolveResult(user, pendingTxResult, options);
  return resolvedResult.data.contents;
}

async function sendMany(user, sendTxs, options) {
  const pendingTxResults = await api.sendTransactions(
    user,
    {
      txs: sendTxs.map(tx => {
        return {
          payload: tx,
          type: "TRANSFER"
        };
      })
    },
    options
  );

  if (options.isAsync) {
    return pendingTxResults.map(r => r.hash);
  }

  const resolvedResults = await resolveResults(user, pendingTxResults, options);
  return resolvedResults.map(r => r.data.contents);
}

// =====================================================================
//   search
// =====================================================================

async function search(user, contract, options) {
  try {
    const results = await api.search(user, contract, options);
    return results;
  } catch (err) {
    if (err.response && err.response.status === RestStatus.NOT_FOUND) {
      return [];
    }
    throw err;
  }
}

async function searchUntil(user, contract, predicate, options) {
  const action = async o => {
    return search(user, contract, o);
  };

  const results = await util.until(predicate, action, options);
  return results;
}

// =====================================================================
//   Chains
// =====================================================================

async function getChain(user, chainId, options) {
  const results = await api.getChains([chainId], setAuthHeaders(user, options));
  return results && results.length > 0 ? results[0] : {};
}

async function getChains(user, chainIds, options) {
  const results = await api.getChains(chainIds, setAuthHeaders(user, options));
  return results;
}

async function createChain(user, chain, contract, options) {
  const result = await api.createChain(
    {
      ...chain,
      contract: contract.name,
      metadata: constructMetadata(options, contract.name)
    },
    setAuthHeaders(user, options)
  );
  return result;
}

// =====================================================================
//   OAuth
// =====================================================================

async function pingOauth(user, options) {
  const response = await api.pingOauth(user, options);
  return response;
}


// =====================================================================
//   Common patterns used in applications
// =====================================================================

async function waitForAddress(user, contract, _options) {
  const options = Object.assign(
    {
      query: {
        address: `eq.${contract.address}`
      }
    },
    _options
  );

  function predicate(response) {
    return (
      response !== undefined &&
      response.length != undefined &&
      response.length > 0
    );
  }

  const results = await searchUntil(user, contract, predicate, options);
  return results[0];
}

export default {
  getUsers,
  getUser,
  createUser,
  createContract,
  createContractList,
  getState,
  getArray,
  call,
  callList,
  //
  resolveResult,
  resolveResults,
  //
  getKey,
  createKey,
  createOrGetKey,
  //
  send,
  sendMany,
  //
  search,
  searchUntil,
  //
  createChain,
  getChain,
  getChains,
  //
  pingOauth,
  //
  RestError,
  response,
  //
  waitForAddress
};
