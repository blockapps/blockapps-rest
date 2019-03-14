import { BigNumber } from 'bignumber.js'
import { constructMetadata, constructEndpoint, get, post, postue, getNodeUrl, setAuthHeaders } from './api.util'
import { TxPayloadType } from './constants'

const Endpoint = {
  USERS: '/bloc/v2.2/users',
  USER: '/bloc/v2.2/users/:username',
  FILL: '/bloc/v2.2/users/:username/:address/fill',
  CONTRACT: '/bloc/v2.2/users/:username/:address/contract',
  CALL: '/bloc/v2.2/users/:username/:address/contract/:contractName/:contractAddress/call',
  CALL_LIST: '/bloc/v2.2/users/:username/:address/callList',
  STATE: '/bloc/v2.2/contracts/:name/:address/state',
  TXRESULTS: '/bloc/v2.2/transactions/results',
  SEND: '/strato/v2.3/transaction',
  KEY: '/strato/v2.3/key',
  SEARCH: '/bloc/v2.2/search/:name',
  CHAIN: '/bloc/v2.2/chain',
}

async function getUsers(args, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.USERS, options)
  return get(url, endpoint, options)
}

async function getUser(args, options) {
  const url = getNodeUrl(options)
  const urlParams = {
    username: args.username,
  }
  const endpoint = constructEndpoint(Endpoint.USER, options, urlParams)
  return get(url, endpoint, options)
}

async function createUser(args, options) {
  const url = getNodeUrl(options)
  const data = { password: args.password }
  const urlParams = {
    username: args.username,
  }
  const endpoint = constructEndpoint(Endpoint.USER, options, urlParams)
  return postue(url, endpoint, data, options)
}

async function fill(user, options) {
  const body = {}
  const url = getNodeUrl(options)
  const urlParams = {
    username: user.username,
    address: user.address,
  }
  const endpoint = constructEndpoint(Endpoint.FILL, options, urlParams)
  return postue(url, endpoint, body, options)
}

async function createContractBloc(user, contract, options) {
  const body = {
    password: user.password,
    contract: contract.name,
    src: contract.source,
    args: contract.args,
    metadata: constructMetadata(options, contract.name),
  }
  const url = getNodeUrl(options)
  const urlParams = {
    username: user.username,
    address: user.address,
  }
  const endpoint = constructEndpoint(Endpoint.CONTRACT, options, urlParams)
  return post(url, endpoint, body, options)
}

async function createContractAuth(user, contract, options) {
  const payload = {
    contract: contract.name,
    src: contract.source,
    args: contract.args,
    metadata: constructMetadata(options, contract.name),
  }
  const body = {
    txs: [
      {
        payload,
        type: TxPayloadType.CONTRACT,
      }],
  }
  const contractTxResult = await sendTransactions(user, body, options)
  return contractTxResult
}

async function blocResults(hashes, options) { // TODO untested code
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.TXRESULTS, options)
  return post(url, endpoint, hashes, options)
}

async function getState(contract, options) {
  const url = getNodeUrl(options)
  const urlParams = {
    name: contract.name,
    address: contract.address,
  }
  const endpoint = constructEndpoint(Endpoint.STATE, options, urlParams)
  return get(url, endpoint, options)
}

async function callBloc(user, callMethodArgs, options) {
  const { contract, method, args, value } = callMethodArgs
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value
  const body = {
    password: user.password,
    method,
    args,
    value: valueFixed,
    metadata: constructMetadata(options, contract.name),
  }
  const url = getNodeUrl(options)
  const urlParams = {
    username: user.username,
    address: user.address,
    contractName: contract.name,
    contractAddress: contract.address,
  }
  const endpoint = constructEndpoint(Endpoint.CALL, options, urlParams)
  return post(url, endpoint, body, options)
}

async function callAuth(user, callMethodArgs, options) {
  const { contract, method, args, value } = callMethodArgs
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value
  const payload = {
    contractName: contract.name,
    contractAddress: contract.address,
    value: valueFixed,
    method,
    args,
    metadata: constructMetadata(options, contract.name)
  }
  const tx = {
    payload,
    type: TxPayloadType.FUNCTION,
  }
  const body = {
    txs: [tx],
  }
  const contractTxResult = await sendTransactions(user, body, options)
  return contractTxResult
}

async function callListAuth(user, callListArgs, options) {
  const txs = callListArgs.map(callArgs => {
    const { contract, method, args, value } = callArgs
    const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value
    const payload = {
      contractName: contract.name,
      contractAddress: contract.address,
      value: valueFixed,
      method,
      args,
      metadata: constructMetadata(options, contract.name)
    }
    const tx = {
      payload,
      type: TxPayloadType.FUNCTION,
    }
    return tx
  })
  const body = {
    txs,
  }
  const contractTxResult = await sendTransactions(user, body, options)
  return contractTxResult
}

async function callListBloc(user, callListArgs, options) {
  let nonce = 1
  const txs = callListArgs.map(callArgs => {
    const { contract, method, args, value } = callArgs
    const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value
    const tx = {
      contractName: contract.name,
      contractAddress: contract.address,
      methodName: method,
      args,
      value: valueFixed,
      txParams: { nonce },
      metadata: constructMetadata(options, contract.name),
    }
    nonce += 1
    return tx
  })
  const body = {
    password: user.password,
    txs,
    resolve: !options.isAsync,
  }
  const url = getNodeUrl(options)
  const urlParams = {
    username: user.username,
    address: user.address,
  }
  const endpoint = constructEndpoint(Endpoint.CALL_LIST, options, urlParams)
  return post(url, endpoint, body, options)
}

async function sendTransactions(user, body, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.SEND, options)
  return post(url, endpoint, body, setAuthHeaders(user, options))
}

async function getKey(user, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.KEY, options)
  return get(url, endpoint, setAuthHeaders(user, options))
}

async function createKey(user, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.KEY, options)
  const body = {}
  return post(url, endpoint, body, setAuthHeaders(user, options))
}

async function search(contract, options) {
  const url = getNodeUrl(options);
  const urlParams = {
    name: contract.name,
  }
  const endpoint = constructEndpoint(Endpoint.SEARCH, options, urlParams)
  return get(url, endpoint, options)
}

// TODO: check options.params and options.headers in axoos wrapper.
async function getChains(chainIds, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.CHAIN, { config: options.config, chainIds })
  return get(url, endpoint, options)
}

async function createChain(body, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.CHAIN, options)
  return await post(url, endpoint, body, options)
}

export default {
  getUsers,
  getUser,
  createUser,
  createContractBloc,
  createContractAuth,
  fill,
  blocResults,
  getState,
  callBloc,
  callAuth,
  callListAuth,
  callListBloc,
  sendTransactions,
  getKey,
  createKey,
  search,
  getChains,
  createChain,
}
