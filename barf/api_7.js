import ax from './axios-wrapper'
import { BigNumber } from './index'
import { constructMetadata, constructEndpoint, get, post, postue, getNodeUrl, setAuthHeaders } from './api.util'
import { TxPayloadType } from './constants'

const Endpoint = {
  USERS: '/bloc/v2.2/users',
  USER: '/bloc/v2.2/users/:username',
  FILL: '/bloc/v2.2/users/:username/:address/fill',
  CONTRACT: '/bloc/v2.2/users/:username/:address/contract',
  CALL: '/bloc/v2.2/users/:username/:address/contract/:contractName/:contractAddress/call',
  STATE: '/bloc/v2.2/contracts/:name/:address/state',
  TXRESULTS: '/bloc/v2.2/transactions/results',
  SEND: '/strato/v2.3/transaction',
  KEY: '/strato/v2.3/key',
}

async function getUsers(args, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.USERS, options)
  return get(url, endpoint, options)
}

async function getUser(args, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.USER, options, {
    username: args.username,
  })
  return get(url, endpoint, options)
}

async function createUser(args, options) {
  const url = getNodeUrl(options)
  const data = { password: args.password }
  const endpoint = constructEndpoint(Endpoint.USER, options, {
    username: args.username,
  })
  return postue(url, endpoint, data, options)
}

async function fill(user, options) {
  const body = {}
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.FILL, options, {
    username: user.username,
    address: user.address,
  })
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
  const endpoint = constructEndpoint(Endpoint.CONTRACT, options, {
    username: user.username,
    address: user.address,
  })
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
  const endpoint = constructEndpoint(Endpoint.STATE, options, {
    name: contract.name,
    address: contract.address,
  })
  return get(url, endpoint, options)
}

async function callBloc(user, contract, method, args, value, options) {
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value
  const body = {
    password: user.password,
    method,
    args,
    value: valueFixed,
    metadata: constructMetadata(options, contract.name),
  }
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.CALL, options, {
    username: user.username,
    address: user.address,
    contractName: contract.name,
    contractAddress: contract.address,
  })
  return post(url, endpoint, body, options)
}

async function callAuth(user, contract, method, args, value, options) {
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value

  const payload = {
    contractName: contract.name,
    contractAddress: contract.address,
    value: valueFixed,
    method,
    args,
    metadata: constructMetadata(options, contract.name)
  }
  const body = {
    txs: [
      {
        payload,
        type: TxPayloadType.FUNCTION,
      }],
  }
  const contractTxResult = await sendTransactions(user, body, options)
  return contractTxResult
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
  sendTransactions,
  getKey,
  createKey,
}
