import api from './api_7'
import * as constants from './constants'

function isTxSuccess(txResult) {
  return txResult.status === 'Success'
}

// TODO: remove old user and tx endpoints after STRATO switched to oauth

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
async function createUser(user, options) {
  const address = await api.createUser(user, options)
  const user = Object.assign(user, { address })
  // async creation
  if (options.isAsync) {
    return { address, user: user }
  }
  // otherwise - block for faucet fill call
  const txResult = await fill(user, options)
  return { address, user: user } // TODO flow user object
}

async function fill(user, options) {
  const body = {}
  const txResult = await api.fill(user, body, options)
  if (!isTxSuccess(txResult)) {
    throw new Error(JSON.stringify(txResult)) // TODO make a RestError
  }
  return txResult
}

async function createContract(user, contract, options) {
  const txParams = options.txParams || {} // TODO generalize txParams
  const body = {
    contract: contract.name,
    src: contract.source,
    args: contract.args,
    metadata: constructMetadata(options, contract.name),
  }

  let contractTxResult = user.token 
    ? await api.sendTransactions(
        user, 
        {
          txs: [{
            payload: body,
            type: 'CONTRACT'
          }],
          txParams
        },
        options
      )
    : await api.createContract(
        user, 
        {
          password: user.password,
          ...body,
          txParams
        },
        options
      )

  if(options.isAsync) {
    return { hash: contractTxResult.hash }
  }

  const resolvedTxResult = await resolveResult(contractTxResult, options)

  const result = (resolvedTxResult.length) ? resolvedTxResult[0] : resolvedTxResult

  if (result.status === constants.FAILURE) {
    throw new Error(result.txResult.message) // TODO throw RestError
  }
  // TODO: Recommend removing isDetailed, since the platform is returning
  // this data anyway
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
  let response;

  try {
    response = await api.getKey(user, options)
  } catch (err) {
    response = await api.createKey(user, options)
    await fill(
      {
        address: response.address
      }, 
      { isAsync: false, ...options}
    )
  }
  return response.address
}

async function resolveResult(result, options) {
  return (await resolveResults([result], options))[0]
}


async function resolveResults(results, options = {}) {
  options.doNotResolve = true
  var count = 0
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
  options.query = { name, length: true }
  const state = await getState(contract, options)
  const length = state[name]
  const result = []
  for (let segment = 0; segment < length / MAX_SEGMENT_SIZE; segment++) {
    options.stateQuery = { name, offset: segment * MAX_SEGMENT_SIZE, count: MAX_SEGMENT_SIZE }
    const state = await getState(contract, options)
    result.push(...state[options.query.name])
  }
  return result
}

function promiseTimeout(timeout) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve()
    }, timeout)
  })
}

/////////////////////////////////////////////// util

/**
 * This function constructes metadata that can be used to control the history and index flags
 * @method{constructMetadata}
 * @param{Object} options flags for history and indexing
 * @param{String} contractName
 * @returns{()} metadata
 */
function constructMetadata(options, contractName) {
  if (options === {}) return options

  const {
    history,
    noindex
  } = options
  
  // history flag (default: off)
  if (options.enableHistory) {
    history = [ ...history, contractName]
  }

  // index flag (default: on)
  if (options.hasOwnProperty('enableIndex') && !options.enableIndex) {
    noindex = [ ...noindex, contractName]
  }
  
  return {history, noindex}
}

/////////////////////////////////////////////// tests

async function testAsync(args) {
  return args
}

async function testPromise(args) {
  return new Promise((resolve, reject) => {
    if (args.success) {
      resolve(args)
    } else {
      reject(args)
    }
  })
}

export default  {
  testAsync,
  testPromise,
  getUsers,
  getUser,
  createUser,
  createContract,
  createKey,
  getKey,
  createOrGetKey
  getState,
  getArray,
}

