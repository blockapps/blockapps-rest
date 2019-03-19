import RestStatus from 'http-status-codes'
import api from './api'
import { TxResultStatus} from './constants'
import util from './util/util'
import { constructMetadata } from './util/api.util';
import { RestError } from './util/rest.util'

// =====================================================================
//   util
// =====================================================================

function isTxSuccess(txResult) {
  return txResult.status === TxResultStatus.SUCCESS
}

function isTxFailure(txResult) {
  return txResult.status === TxResultStatus.FAILURE
}

function assertTxResult(txResult) {
  if (isTxFailure(txResult)) {
    throw new RestError(RestStatus.BAD_REQUEST, txResult.txResult.message, txResult.txResult)
  }
  return txResult
}

function assertTxResultList(txResultList) {
  txResultList.forEach((txResult, index) => {
    if (isTxFailure(txResult)) {
      throw new RestError(RestStatus.BAD_REQUEST, `tx:${index}, message:${txResult.txResult.message}`, { index, txResult: txResult.txResult})
    }
  })
  return txResultList
}

async function resolveResult(pendingTxResult, options) {
  return (await resolveResults([pendingTxResult], options))[0]
}

async function resolveResults(pendingResults, _options = {}) {
  const options = Object.assign({ isAsync: true }, _options)

  // wait until there are no more PENDING results
  const predicate = (results) => results.filter(r => r.status === TxResultStatus.PENDING).length === 0
  const action = async () => getBlocResults(pendingResults.map(r => r.hash), options)
  const resolvedResults = await util.until(predicate, action, options)
  return resolvedResults
}

// =====================================================================
//   user
// =====================================================================

async function getUsers(args, options) {
  const users = await api.getUsers(args, options)
  return users
}

async function getUser(args, options) {
  const [address] = await api.getUser(args, options)
  return address
}

async function createUser(args, options) {
  return (args.token)
    ? createUserAuth(args, options)
    : createUserBloc(args, options)
}

async function createUserBloc(args, options) {
  const address = await api.createUser(args, options)
  const user = Object.assign(args, { address })
  // async - do not resolve
  if (options.isAsync) return user
  // otherwise - block for faucet fill call
  const txResult = await fill(user, options)
  return user // TODO flow user object
}

async function createUserAuth(args, options) {
  const address = await createOrGetKey(args, options)
  const user = Object.assign({}, args, { address })
  return user
}

async function fill(user, options) {
  const txResult = await api.fill(user, options)
  return assertTxResult(txResult)
}

// =====================================================================
//   contract
// =====================================================================

async function createContract(user, contract, options) {
  return (user.token)
    ? createContractAuth(user, contract, options)
    : createContractBloc(user, contract, options)
}

async function createContractBloc(user, contract, options) {
  const pendingTxResult = await api.createContractBloc(user, contract, options)
  return createContractResolve(pendingTxResult, options)
}

async function createContractAuth(user, contract, options) {
  const [pendingTxResult] = await api.createContractAuth(user, contract, options)
  return createContractResolve(pendingTxResult, options)
}

async function createContractResolve(pendingTxResult, options) {
  // throw if FAILURE
  assertTxResult(pendingTxResult)
  // async - do not resolve
  if (options.isAsync) return pendingTxResult
  // resolve - wait until not pending
  const resolvedTxResult = await resolveResult(pendingTxResult, options)
  // throw if FAILURE
  assertTxResult(pendingTxResult)
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResult.data.contents
  // return basic contract object
  return { name: resolvedTxResult.data.contents.name, address: resolvedTxResult.data.contents.address }
}

// =====================================================================
//   contract list
// =====================================================================

async function createContractList(user, contract, options) {
  return (user.token)
    ? createContractListAuth(user, contract, options)
    : createContractListBloc(user, contract, options)
}

async function createContractListBloc(user, contract, options) {
  throw new RestError(RestStatus.NOT_IMPLEMENTED, 'createContractListBloc')
}

async function createContractListAuth(user, contract, options) {
  const [pendingTxResult] = await api.createContractListAuth(user, contract, options)
  return createContractListResolve(pendingTxResult, options)
}

async function createContractListResolve(pendingTxResultList, options) {
  // throw if FAILURE
  assertTxResultList(pendingTxResultList) // @samrit what if 1 result failed ?
  // async - do not resolve
  if (options.isAsync) return pendingTxResultList
  // resolve - wait until not pending
  const resolvedTxResultList = await resolveResults(pendingTxResultList, options)
  // throw if FAILURE
  assertTxResultList(resolvedTxResultList)
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResultList
  // return a list basic contract object
  return resolvedTxResultList.map(resolvedTxResult => resolvedTxResult.data.contents)
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
    const response = await api.getKey(user, options)
    return response.address
  } catch (err) {
    const response = await api.createKey(user, options)
    await fill({ address: response.address }, { isAsync: false, ...options })
    return response.address
  }
}

// =====================================================================
//   state
// =====================================================================

async function getBlocResults(hashes, options) {
  return api.blocResults(hashes, options)
}

async function getState(contract, options) {
  return api.getState(contract, options)
}

async function getArray(contract, name, options) {
  const MAX_SEGMENT_SIZE = 100
  options.stateQuery = { name, length: true }
  const state = await getState(contract, options)
  const length = state[name]
  const result = []
  for (let segment = 0; segment < length / MAX_SEGMENT_SIZE; segment++) {
    options.stateQuery = { name, offset: segment * MAX_SEGMENT_SIZE, count: MAX_SEGMENT_SIZE }
    const state = await getState(contract, options)
    result.push(...state[name])
  }
  return result
}

// =====================================================================
//   call
// =====================================================================

async function call(user, callArgs, options) {
  return (user.token)
    ? callAuth(user, callArgs, options)
    : callBloc(user, callArgs, options)
}

async function callAuth(user, callArgs, options) {
  const [pendingTxResult] = await api.callAuth(user, callArgs, options)
  return callResolve(pendingTxResult, options)
}

async function callBloc(user, callArgs, options) {
  const pendingTxResult = await api.callBloc(user, callArgs, options)
  return callResolve(pendingTxResult, options)
}

async function callResolve(pendingTxResult, options) {
  // throw if FAILURE
  assertTxResult(pendingTxResult)
  // async - do not resolve
  if (options.isAsync) return pendingTxResult
  // resolve - wait until not pending
  const resolvedTxResult = await resolveResult(pendingTxResult, options)
  // throw if FAILURE
  assertTxResult(pendingTxResult)
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResult
  // return basic contract object
  return resolvedTxResult.data.contents
}

// =====================================================================
//   call list
// =====================================================================

async function callList(user, callListArgs, options) {
  return (user.token)
    ? callListAuth(user, callListArgs, options)
    : callListBloc(user, callListArgs, options)
}

async function callListAuth(user, callListArgs, options) {
  const pendingTxResultList = await api.callListAuth(user, callListArgs, options)
  return callListResolve(pendingTxResultList, options)
}

async function callListBloc(user, callListArgs, options) {
  const pendingTxResultList = await api.callListBloc(user, callListArgs, options)
  return callListResolve(pendingTxResultList, options)
}

async function callListResolve(pendingTxResultList, options) {
  // throw if FAILURE
  assertTxResultList(pendingTxResultList) // @samrit what if 1 result failed ?
  // async - do not resolve
  if (options.isAsync) return pendingTxResultList
  // resolve - wait until not pending
  const resolvedTxResultList = await resolveResults(pendingTxResultList, options)
  // throw if FAILURE
  assertTxResultList(resolvedTxResultList)
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResultList
  // return a list basic contract object
  return resolvedTxResultList.map(resolvedTxResult => resolvedTxResult.data.contents)
}

// =====================================================================
//   send
// =====================================================================

async function send(user, sendTx, options) {

  const [pendingTxResult] = await api.send(user, sendTx, options)

  if (options.isAsync) {
    return pendingTxResult
  }

  const resolvedResult = await resolveResult(pendingTxResult, options)
  return resolvedResult.data.contents
}

async function sendMany(user, sendTxs, options) {
  const pendingTxResults = await api.sendTransactions(
    user,
    {
      txs: sendTxs.map(tx => {
        return {
          payload: tx,
          type: 'TRANSFER',
        }
      }),
    },
    options,
  )

  if (options.isAsync) {
    return pendingTxResults.map(r => r.hash)
  }

  const resolvedResults = await resolveResults(pendingTxResults, options)
  return resolvedResults.map(r => r.data.contents)
}

// =====================================================================
//   search
// =====================================================================

async function search(contract, options) {
  try {
    const results = await api.search(contract, options)
    return results
  } catch (err) {
    if (err.status && err.status === RestStatus.NOT_FOUND) {
      return []
    }
    throw err
  }
}

async function searchUntil(contract, predicate, options) {
  const action = async (o) => {
    return search(contract, o)
  }
  
  const results = await util.until(predicate, action, options)
  return results
}

// =====================================================================
//   Chains
// =====================================================================

async function getChain(chainId, options) {
  const results = await api.getChains([chainId], options)
  return results && results.length > 0 ? results[0] : {}
}

async function getChains(chainIds, options) {
  const results = await api.getChains(chainIds, options)
  return results
}

async function createChain(chain, contract, options) {
  const result = await api.createChain({
    ...chain,
    contract: contract.name,
    metadata: constructMetadata(options, contract.name)
  }, options)
  return result;
}

export default  {
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
  RestError,
}
