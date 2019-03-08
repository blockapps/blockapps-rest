import api from './api_7'
import * as constants from './constants'
import { until } from './util'

function isTxSuccess(txResult) {
  return txResult.status === constants.SUCCESS
}

function isTxFailure(txResult) {
  return txResult.status === constants.FAILURE
}

// /users
async function getUsers(args, options) {
  const users = await api.getUsers(args, options)
  return users
}

// /users/:username
async function getUser(args, options) {
  const [address] = await api.getUser(args, options)
  return address
}

/*
  createUser
 */
async function createUser(args, options) {
  return (args.token)
    ? createUserAuth(args, options)
    : createUserBloc(args, options)
}

async function createUserBloc(args, options) {
  const address = await api.createUser(args, options)
  const user = Object.assign(args, { address })
  // async - do not resolve
  if (options.isAsync) {
    return user
  }
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
  if (!isTxSuccess(txResult)) {
    throw new Error(JSON.stringify(txResult)) // TODO make a RestError
  }
  return txResult
}

/*
  createContracts
 */
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
  if (isTxFailure(pendingTxResult)) {
    throw new Error(pendingTxResult.txResult.message) // TODO throw RestError
  }
  // async - do not resolve
  if (options.isAsync) {
    return pendingTxResult
  }
  // resolve - wait until not pending
  const resolvedTxResult = await resolveResult(pendingTxResult, options)
  // throw if FAILURE
  if (isTxFailure(resolvedTxResult)) {
    throw new Error(resolvedTxResult.txResult.message) // TODO throw RestError
  }
  // options.isDetailed - return all the data
  if (options.isDetailed) {
    return resolvedTxResult.data.contents
  }
  // return basic contract object
  return { name: resolvedTxResult.data.contents.name, address: resolvedTxResult.data.contents.address }
}

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

async function resolveResult(pendingTxResult, options) {
  return (await resolveResults([pendingTxResult], options))[0]
}

async function resolveResults(pendingResults, _options = {}) {
  const options = Object.assign({ isAsync: true }, _options)

  // wait until there are no more PENDING results
  const predicate = (results) => results.filter(r => r.status === constants.PENDING).length === 0
  const action = async () => getBlocResults(pendingResults.map(r => r.hash), options)
  const resolvedResults = await until(predicate, action, options)
  return resolvedResults
}

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
    result.push(...state[options.stateQuery.name])
  }
  return result
}

async function call(user, contract, method, args, value, options) {
  return (user.token)
    ? callAuth(user, contract, method, args, value, options)
    : callBloc(user, contract, method, args, value, options)
}

async function callAuth(user, contract, method, args, value, options) {
  const [pendingTxResult] = await api.callAuth(user, contract, method, args, value, options)
  return callResolve(pendingTxResult, options)
}

async function callBloc(user, contract, method, args, value, options) {
  const pendingTxResult = await api.callBloc(user, contract, method, args, value, options)
  return callResolve(pendingTxResult, options)
}

async function callResolve(pendingTxResult, options) {
  // throw if FAILURE
  if (isTxFailure(pendingTxResult)) {
    throw new Error(JSON.stringify(pendingTxResult.txResult)) // TODO throw RestError
  }
  // async - do not resolve
  if (options.isAsync) {
    return pendingTxResult
  }
  // resolve - wait until not pending
  const resolvedTxResult = await resolveResult(pendingTxResult, options)
  // throw if FAILURE
  if (isTxFailure(resolvedTxResult)) {
    throw new Error(JSON.stringify(resolvedTxResult.txResult)) // TODO throw RestError
  }
  // options.isDetailed - return all the data
  if (options.isDetailed) {
    return resolvedTxResult
  }
  // return basic contract object
  return resolvedTxResult.data.contents
}

export default  {
  getUsers,
  getUser,
  createUser,
  createContract,
  getState,
  getArray,
  call,
  //
  resolveResult,
  //
  getKey,
  createKey,
  createOrGetKey,
}
