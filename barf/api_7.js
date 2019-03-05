const BigNumber = require('bignumber.js')
const { constructMetadata, constructEndpoint, get, post, postue, getBlocUrl, getNodeUrl, getHeaders } = require('./api.util')
const ax = require('./axios-wrapper')

const Endpoint = {
  USERS: '/users',
  USER: '/users/:username',
  FILL: '/users/:username/:address/fill',
  CONTRACT: '/users/:username/:address/contract',
  CALL: '/users/:username/:address/contract/:contractName/:contractAddress/call',
  STATE: '/contracts/:name/:address/state',
  TXRESULTS: '/transactions/results',
  SEND: '/strato/v2.3/transaction',
  KEY: '/strato/v2.3/key',
}

async function getUsers(args, options) {
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(Endpoint.USERS, options)
  return get(url, endpoint, options)
}

async function getUser(args, options) {
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(Endpoint.USER, options, {
    username: args.username,
  })
  return get(url, endpoint, options)
}

async function createUser(args, options) {
  const url = getBlocUrl(options)
  const data = { password: args.password }
  const endpoint = constructEndpoint(Endpoint.USER, options, {
    username: args.username,
  })
  return ax.postue(url, endpoint, data, options)
}

async function fill(user, options) {
  const body = {}
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(Endpoint.FILL, options, {
    username: user.username,
    address: user.address,
  })
  return ax.postue(url, endpoint, body, options)
}

async function createContract(user, contract, options) {
  const body = {
    password: user.password,
    contract: contract.name,
    src: contract.source,
    args: contract.args,
    metadata: constructMetadata(options, contract.name),
  }
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(Endpoint.CONTRACT, options, {
    username: user.username,
    address: user.address,
  })
  return post(url, endpoint, body, options)
}

async function blocResults(hashes, options) { // TODO untested code
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(Endpoint.TXRESULTS, options)
  return post(url, endpoint, hashes, options)
}

async function getState(contract, options) {
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(Endpoint.STATE, options, {
    name: contract.name,
    address: contract.address,
  })
  return get(url, endpoint, options)
}

async function call(user, contract, method, args, value, options) {
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value
  const body = {
    password: user.password,
    method,
    args,
    value: valueFixed,
    metadata: constructMetadata(options, contract.name),
  }
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(Endpoint.CALL, options, {
    username: user.username,
    address: user.address,
    contractName: contract.name,
    contractAddress: contract.address,
  })
  return post(url, endpoint, body, options)
}

async function sendTransactions(user, body, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.SEND, options)
  return post(url, endpoint, body, getHeaders(user, options))
}

async function getKey(user, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.KEY, options)
  return get(url, endpoint, getHeaders(user, options))
}

async function createKey(user, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(Endpoint.KEY, options)
  const body = {}
  return post(url, endpoint, body, getHeaders(user, options))
}

module.exports = {
  getUsers,
  getUser,
  createUser,
  createContract,
  fill,
  blocResults,
  getState,
  call,
  sendTransactions,
  getKey,
  createKey
}
