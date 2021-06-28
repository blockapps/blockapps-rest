import { BigNumber } from "bignumber.js";
import {
  Endpoint,
  constructMetadata,
  constructEndpoint,
  get,
  put,
  post,
  postue,
  httpDelete,
  getNodeUrl,
  setAuthHeaders
} from "./util/api.util";
import { TxPayloadType } from "./constants";
import {
  Options,
  StratoUser,
  OAuthUser,
  BlockChainUser,
  Contract,
  ContractDefinition,
  CallArgs,
  SendTx
} from "./types";


async function createUser(user:StratoUser, options:Options) {
  const url = getNodeUrl(options);
  const data = {
    password: user.password
  };
  const urlParams = {
    username: user.username
  };
  const endpoint = constructEndpoint(Endpoint.USER, options, urlParams);
  return postue(url, endpoint, data, options);
}

async function fill(user, options:Options) {
  const body = {};
  const url = getNodeUrl(options);
  const urlParams = {
    address: user.address
  };
  const endpoint = constructEndpoint(Endpoint.FILL, options, urlParams);
  return postue(url, endpoint, body, setAuthHeaders(user, options));
}

function getCreateArgs(contract:ContractDefinition, options:Options) {
  const src = options.config.VM === "EVM" ? {} : { src: contract.source };

  const payload = {
    ...src,
    contract: contract.name,
    args: contract.args,
    chainid: contract.chainid,
    txParams: contract.txParams,
    metadata: constructMetadata(options, contract.name)
  };

  const tx = {
    payload,
    type: TxPayloadType.CONTRACT
  };
  return tx;
}

async function compileContracts(user:OAuthUser, contracts:ContractDefinition[], options:Options) {
  const body = contracts.map(contract => ({
    contractName: contract.name,
    source: contract.source
  }));

  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.COMPILE, options);
  return post(url, endpoint, body, setAuthHeaders(user, options));
}

async function createContract(user, contract:ContractDefinition, options:Options) {
  const tx = getCreateArgs(contract, options);
  const body = {
    txs: [tx]
  };
  const pendingTxResult = await sendTransactions(user, body, options);
  return pendingTxResult;
}

async function createContractList(user:BlockChainUser, contracts:ContractDefinition[], options:Options) {
  const txs = contracts.map(contract => getCreateArgs(contract, options));
  const body = {
    txs
  };
  const pendingTxResultList = await sendTransactions(user, body, options);
  return pendingTxResultList;
}

async function blocResults(user:OAuthUser, hashes, options:Options) {
  // TODO untested code
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.TXRESULTS, options);
  return post(url, endpoint, hashes, setAuthHeaders(user, options));
}

async function getAccounts(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.ACCOUNT, options);
  return get(url, endpoint, setAuthHeaders(user, options));
}


async function getHealth(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.HEALTH, options);
  return get(url, endpoint, setAuthHeaders(user, options));
}
async function getStatus(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.STATUS, options);
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function getVersion(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.VERSION, options);
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function getBalance(user:OAuthUser, bcuser:BlockChainUser | null, options:Options) {
  let address;
  if (!bcuser) {
    const response = await getKey(user, options);
    address = response.address;
  }
  else address = bcuser.address;
  
  const accounts = await getAccounts(user, {
    ...options,
    // this endpoint does not accept the resolve flag
    isAsync: true,
    query: {
      address
    }
  });
  if (accounts.length == 0) {
    return new BigNumber(0);
  }

  return new BigNumber(accounts[0].balance);
}

async function getState(user:OAuthUser, contract, options:Options) {
  const url = getNodeUrl(options);
  const urlParams = {
    name: contract.name,
    address: contract.address
  };
  const endpoint = constructEndpoint(Endpoint.STATE, options, urlParams);
  return get(url, endpoint, setAuthHeaders(user, options));
}


function getCallArgs(callMethodArgs:CallArgs, options:Options) {
  const { contract, method, args, value, chainid, txParams } = callMethodArgs;
  const valueFixed = value instanceof BigNumber ? value.toFixed(0) : value;
  const payload = {
    contractName: contract.name,
    contractAddress: contract.address,
    chainid,
    value: valueFixed,
    method,
    args,
    txParams,
    metadata: constructMetadata(options, contract.name)
  };
  const tx = {
    payload,
    type: TxPayloadType.FUNCTION
  };
  return tx;
}

async function call(user:BlockChainUser, callMethodArgs:CallArgs, options:Options) {
  const tx = getCallArgs(callMethodArgs, options);
  const body = {
    txs: [tx]
  };
  const pendingTxResult = await sendTransactions(user, body, options);
  return pendingTxResult;
}

async function callList(user:BlockChainUser, callListArgs:CallArgs[], options:Options) {
  const txs = callListArgs.map(callArgs => getCallArgs(callArgs, options));
  const body = {
    txs
  };
  const pendingTxResultList = await sendTransactions(user, body, options);
  return pendingTxResultList;
}

async function sendTransactions(user:OAuthUser, body, options:Options) {
  const url = getNodeUrl(options);
  const { cacheNonce, ...sendOptions } = options;

  let endpoint;
  if (cacheNonce) {
    endpoint = constructEndpoint(Endpoint.SEND_PARALLEL, sendOptions);
  } else {
    endpoint = constructEndpoint(Endpoint.SEND, sendOptions);
  }

  return post(url, endpoint, body, setAuthHeaders(user, sendOptions));
}

function getSendArgs(sendTx:SendTx, options:Options) {
  const tx = {
    payload: sendTx,
    type: TxPayloadType.TRANSFER
  };
  return tx;
}

async function send(user, sendTx:SendTx, options:Options) {
  const tx = getSendArgs(sendTx, options);
  const body = {
    txs: [tx]
  };
  return sendTransactions(user, body, options);
}

async function getKey(user:OAuthUser, options:Options):Promise<BlockChainUser | null> {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.KEY, options);
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function createKey(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.KEY, options);
  const body = {};
  return post(url, endpoint, body, setAuthHeaders(user, options));
}

async function search(user:OAuthUser, contract:Contract, options:Options) {
  const url = getNodeUrl(options);
  const urlParams = {
    name: contract.name
  };
  const endpoint = constructEndpoint(Endpoint.SEARCH, options, urlParams);
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function searchWithContentRange(user:OAuthUser, contract, options:Options) {
  const url = getNodeUrl(options);
  const urlParams = {
    name: contract.name
  };
  const endpoint = constructEndpoint(Endpoint.SEARCH, options, urlParams);
  const headersWithCount = { ...options.headers, Prefer: "count=exact" };
  const optionsWithCount = {
    ...options,
    headers: headersWithCount,
    getFullResponse: true
  };
  const { data, headers } = await get(
    url,
    endpoint,
    setAuthHeaders(user, optionsWithCount)
  );
  const contentRangeStr = headers["content-range"];
  const [range, countStr] = contentRangeStr.split("/");
  const count = parseInt(countStr, 10);
  if (range === "*") {
    const contentRange = { count };
    return { data, contentRange };
  }
  const [start, end] = range.split("-").map(s => parseInt(s, 10));
  const contentRange = { start, end, count };
  return { data, contentRange };
}

// TODO: check options.params and options.headers in axoos wrapper.
async function getChains(chainIds, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.CHAIN, {
    config: options.config,
    chainIds
  });
  return get(url, endpoint, options);
}

async function createChain(body, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.CHAIN, options);
  return await post(url, endpoint, body, options);
}

async function createChains(body, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.CHAINS, options);
  return await post(url, endpoint, body, options);
}

async function uploadExtStorage(body, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.EXT_UPLOAD, options);
  return await post(url, endpoint, body, options);
}

async function attestExtStorage(body, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.EXT_ATTEST, options);
  return await post(url, endpoint, body, options);
}

async function verifyExtStorage(user:OAuthUser, contract, options:Options) {
  const url = getNodeUrl(options);
  const params = {
    contractAddress: contract.address
  };
  const endpoint = constructEndpoint(Endpoint.EXT_VERIFY, options, params);
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function downloadExtStorage(user:OAuthUser, contract, options:Options) {
  const url = getNodeUrl(options);
  const params = {
    contractAddress: contract.address
  };
  const endpoint = constructEndpoint(Endpoint.EXT_DOWNLOAD, options, params);
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function listExtStorage(user:OAuthUser, args, options:Options) {
  const url = getNodeUrl(options);
  const { limit, offset } = args;
  const params = {
    limit,
    offset
  };
  const endpoint = constructEndpoint(Endpoint.EXT_LIST, options, params);
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function pingOauth(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.KEY, options);
  const result = await get(url, endpoint, setAuthHeaders(user, options));
  return result.status;
}

async function debugStatus(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_STATUS, options, {});
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function debugPause(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_PAUSE, options, {});
  return put(url, endpoint, {}, setAuthHeaders(user, options));
}

async function debugResume(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_RESUME, options, {});
  return put(url, endpoint, {}, setAuthHeaders(user, options));
}

async function debugGetBreakpoints(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_BREAKPOINTS, options, {});
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function debugPutBreakpoints(user:OAuthUser, args, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_BREAKPOINTS, options, {});
  return put(url, endpoint, args, setAuthHeaders(user, options));
}

async function debugDeleteBreakpoints(user:OAuthUser, args, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_BREAKPOINTS, options, {});
  return httpDelete(url, endpoint, args, setAuthHeaders(user, options));
}

async function debugClearBreakpoints(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_BREAKPOINTS, options, {});
  return httpDelete(url, endpoint, [], setAuthHeaders(user, options));
}

async function debugClearBreakpointsPath(user:OAuthUser, path:string, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_BREAKPOINTS_PATH, options, {path});
  return httpDelete(url, endpoint, {}, setAuthHeaders(user, options));
}

async function debugStepIn(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_STEP_IN, options, {});
  return postue(url, endpoint, {}, setAuthHeaders(user, options));
}

async function debugStepOver(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_STEP_OVER, options, {});
  return postue(url, endpoint, {}, setAuthHeaders(user, options));
}

async function debugStepOut(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_STEP_OUT, options, {});
  return postue(url, endpoint, {}, setAuthHeaders(user, options));
}

async function debugGetStackTrace(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_STACK_TRACE, options, {});
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function debugGetVariables(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_VARIABLES, options, {});
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function debugGetWatches(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_WATCHES, options, {});
  return get(url, endpoint, setAuthHeaders(user, options));
}

async function debugPutWatches(user:OAuthUser, args, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_WATCHES, options, {});
  return put(url, endpoint, args, setAuthHeaders(user, options));
}

async function debugDeleteWatches(user:OAuthUser, args, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_WATCHES, options, {});
  return httpDelete(url, endpoint, args, setAuthHeaders(user, options));
}

async function debugClearWatches(user:OAuthUser, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_WATCHES, options, {});
  return httpDelete(url, endpoint, [], setAuthHeaders(user, options));
}

async function debugPostEval(user:OAuthUser, args, options:Options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(Endpoint.DEBUG_EVAL, options);
  return post(url, endpoint, args, setAuthHeaders(user, options));
}

export default {
  getAccounts,
  getHealth,
  getStatus,
  getVersion,
  getBalance,
  createUser,
  getCreateArgs,
  compileContracts,
  createContract,
  createContractList,
  fill,
  blocResults,
  getState,
  getCallArgs,
  call,
  callList,
  getSendArgs,
  send,
  sendTransactions,
  getKey,
  createKey,
  search,
  searchWithContentRange,
  getChains,
  createChain,
  createChains,
  uploadExtStorage,
  attestExtStorage,
  verifyExtStorage,
  downloadExtStorage,
  listExtStorage,
  pingOauth,
  debugStatus,
  debugPause,
  debugResume,
  debugGetBreakpoints,
  debugPutBreakpoints,
  debugDeleteBreakpoints,
  debugClearBreakpoints,
  debugClearBreakpointsPath,
  debugStepIn,
  debugStepOver,
  debugStepOut,
  debugGetStackTrace,
  debugGetVariables,
  debugGetWatches,
  debugPutWatches,
  debugDeleteWatches,
  debugClearWatches,
  debugPostEval
};
