import api from './api_7'
import apiUtil from './api.util'
import * as constants from './constants'

const {
  constructMetadata,
  promiseTimeout,
  until
} = apiUtil

function isTxSuccess(txResult) {
  return txResult.status === 'Success'
}

// TODO: remove old user and tx endpoints after STRATO switched to oauth

// /users
async function getUsers(options) {
  const users = await api.getUsers(options)
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
  const newUser = Object.assign(user, { address })
  // async creation
  if (options.isAsync) {
    return newUser
  }
  // otherwise - block for faucet fill call
  const txResult = await fill(user, options)
  return newUser // TODO flow user object
}

async function fill(user, options) {
  const txResult = await api.fill(user, options)
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

async function callMethod(user, method, options) {
  const results = await api.sendTransactions(
    user,
    {
      txs: [
        {
          payload: {
            ...methodArgs,
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
    options.query = { name, offset: segment * MAX_SEGMENT_SIZE, count: MAX_SEGMENT_SIZE }
    const state = await getState(contract, options)
    result.push(...state[options.query.name])
  }
  return result
}

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
  createChain,
  getChain,
  getChains,
  getUsers,
  getUser,
  callMethod,
  callMethodMany,
  createUser,
  createContract,
  createContractMany,
  createKey,
  getKey,
  createOrGetKey,
  getState,
  getArray,
  search,
  searchUntil,
  send,
  sendMany,
  //
  resolveResult,
}
