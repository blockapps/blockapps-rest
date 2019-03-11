import RestStatus from 'http-status-codes'
import api from './api_7'
import { TxResultStatus } from './constants'
import { until } from './util'
import { constructMetadata } from './api.util'

// =====================================================================
//   util
// =====================================================================

class RestError extends Error {
  constructor(status, statusText, data) {
    super(`${status} ${statusText}: ${JSON.stringify(data)}`)
    this.name = 'RestError'
    this.response = { status, statusText, data }
  }
}

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

async function resolveResult(pendingTxResult, options) {
  return (await resolveResults([pendingTxResult], options))[0]
}

async function resolveResults(pendingResults, _options = {}) {
  const options = Object.assign({ isAsync: true }, _options)

  // wait until there are no more PENDING results
  const predicate = (results) => results.filter(r => r.status === TxResultStatus.PENDING).length === 0
  const action = async () => getBlocResults(pendingResults.map(r => r.hash), options)
  const resolvedResults = await until(predicate, action, options)
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

async function createContractMany(user, contracts, options) {
  const results = await api.sendTransactions(
    user, 
    {
      txs: contracts.map(contract => {
        return {
          payload: {
            ...contract,
            metadata: constructMetadata(options, contract.name)
          },
          type: 'CONTRACT'
        }
      })
    },
    options
  )
  if(options.isAsync) {
    return results.map(r => r.hash)
  }

  const resolvedResults = await resolveResults(results, options)
  return resolveResults.map(r => r.data.contents)
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
//   send
// =====================================================================

async function send(user, sendTx, options) {
  const results = await api.sendTransactions(
    user, 
    {
      txs: [{
        payload: sendTx,
        type: 'TRANSFER'
      }]
    },
    options
  )

  if(!options.isAsync) {
    return results[0].hash
  }

  const resolvedResult = await resolveResult(results[0], options)
  return resolvedResult.data.contents
}

async function sendMany(user, sendTxs, options) {
  const results = await api.sendTransactions(
    user, 
    {
      txs: sendTxs.map(tx => {
        return {
          payload: tx,
          type: 'TRANSFER'
        }   
      })
    },
    options
  )

  if(!options.isAsync) {
    return results.map(r => r.hash)
  }

  const resolvedResults = await resolveResults(results, options)
  return resolvedResults.map(r => r.data.contents)
}

// =====================================================================
//   search
// =====================================================================

async function search(contract, options) {
  try {
    const results = await api.search(contract, options)
    return results
  } catch(err) {
    if(err.status && err.status === 404) {
      return []
    }
  }
}

async function searchUntil(contract, predicate, options) {
  const action = async function(o) {
    return await search(contract, o)
  }
  const results = await until(
    predicate,
    action,
    options
  )
  return results
}

// =====================================================================
//   Call Method
// =====================================================================

async function callMethod(user, method, options) {
  const results = await api.sendTransactions(
    user,
    {
      txs: [
        {
          payload: {
            ...method,
            metadata: constructMetadata(options, method.contractName)
          },
          type: 'FUNCTION'
        }
      ]
    },
    options
  )

  if(!options.isAsync) {
    return results[0].hash
  }

  const resolvedResult = await resolveResult(results[0], options)
  return resolvedResult
}

async function callMethodMany(user, methods, options) {
  const results = await api.sendTransactions(
    user,
    {
      txs: methods.map(method => {
        return { 
          payload: {
            ...method,
            metadata: constructMetadata(options, method.contractName)
          },
          type: 'FUNCTION'
        }
      })
    },
    options
  )

  if(!options.isAsync) {
    return results.map(r => r.hash)
  }

  const resolvedResults = await resolveResults(results, options)
  return resolvedResults.map(r => r.data.contents)
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
    src: contract.src,
    args: contract.args,
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
  createContractMany,
  getState,
  getArray,
  call,
  //
  resolveResult,
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
  callMethod,
  callMethodMany,
  // 
  createChain,
  getChain,
  getChains,
}
