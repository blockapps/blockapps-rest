const api = require('./api_7')
const constants = require('./constants')

function isTxSuccess(txResult) {
  return txResult.status === 'Success'
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

// /users/:username
async function createUser(args, options) {
  const address = await api.createUser(args, options)
  const user = Object.assign(args, { address })
  // async creation
  if (options.isAsync) {
    return user
  }
  // otherwise - block for faucet fill call
  const txResult = await fill(user, options)
  return user // TODO flow user object
}

async function fill(user, options) {
  const txResult = await api.fill(user, options)
  if (!isTxSuccess(txResult)) {
    throw new Error(JSON.stringify(txResult)) // TODO make a RestError
  }
  return txResult
}

async function createContract(user, contract, options) {
  const pendingTxResult = await api.createContract(user, contract, options)
  if (options.isAsync) {
    return pendingTxResult
  }

  const resolvedTxResult = await resolveResult(pendingTxResult, options)

  const result = (resolvedTxResult.length) ? resolvedTxResult[0] : resolvedTxResult

  if (result.status === constants.FAILURE) {
    throw new Error(result.txResult.message) // TODO throw RestError
  }
  // options.isDetailed - return all the data
  if (options.isDetailed) {
    return result.data.contents
  }
  // return basic contract object
  return { name: result.data.contents.name, address: result.data.contents.address }
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

async function resolveResult(result, options) {
  return (await resolveResults([result], options))[0]
}

async function resolveResults(results, _options = {}) {
  const options = Object.assign({ isAsync: true }, _options)
  let count = 0
  var res = results
  while (count < 60 && res.filter(r => {return r.status === constants.PENDING}).length !== 0) {
    res = await getBlocResults(res.map(r => {return r.hash}), options)
    await promiseTimeout(1000)
    count++
  }

  if (count >= 60) {
    throw new Error('Transaction did not resolve')
  }

  return res
}

async function getBlocResults(hashes, options = {}) {
  const result = await api.blocResults(hashes, options)
  return result
}

async function getState(contract, options) {
  const result = await api.getState(contract, options)
  return result
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
  const callTxResult = await api.call(user, contract, method, args, value, options)

  if (options.isAsync) {
    return callTxResult
  }

  const resolvedTxResult = await resolveResult(callTxResult, options)

  const result = (resolvedTxResult.length) ? resolvedTxResult[0] : resolvedTxResult

  if (result.status === constants.FAILURE) {
    throw new Error(result.txResult.message) // TODO throw RestError
  }
  // options.isDetailed - return all the data
  if (options.isDetailed) {
    return result
  }
  // return basic contract object
  return result.data.contents
}

function promiseTimeout(timeout) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve()
    }, timeout)
  })
}

module.exports = {
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
