const BigNumber = require('bignumber.js')
const { constructMetadata, createQuery, post, getBlocUrl } = require('./api.util')
const ax = require('./axios-wrapper')

async function getUsers(args, options) {
  const url = getBlocUrl(options)
  const endpoint = '/users'
  return ax.get(url, endpoint, options)
}

async function getUser(args, options) {
  const url = getBlocUrl(options)
  const username = encodeURIComponent(args.username)
  const endpoint = ('/users/:username')
    .replace(':username', username)
  return ax.get(url, endpoint, options)
}

async function createUser(args, options) {
  const url = getBlocUrl(options)
  const username = encodeURIComponent(args.username)
  const data = { password: args.password }
  const endpoint = ('/users/:username')
    .replace(':username', username)
  return ax.postue(url, endpoint, data, options)
}

async function fill(user, options) {
  const body = {}
  const url = getBlocUrl(options)
  const username = encodeURIComponent(user.username)
  const query = createQuery(options)
  const endpoint = ('/users/:username/:address/fill')
    .replace(':username', username)
    .replace(':address', user.address)
    .concat(query)
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
  const username = encodeURIComponent(user.username)
  const query = createQuery(options)
  const endpoint = ('/users/:username/:address/contract')
    .replace(':username', username)
    .replace(':address', user.address)
    .concat(query)
  return post(url, endpoint, body, options)
}

async function blocResults(hashes, options) { // TODO untested code
  const url = getBlocUrl(options)
  const query = createQuery(options)
  const endpoint = ('/transactions/results')
    .concat(query)
  return post(url, endpoint, hashes, options)
}

async function getState(contract, options) {
  const url = getBlocUrl(options)
  const query = createQuery(options)
  const endpoint = ('/contracts/:name/:address/state')
    .replace(':name', contract.name)
    .replace(':address', contract.address)
    .concat(query)
  return ax.get(url, endpoint, options)
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
  const username = encodeURIComponent(user.username)
  const query = createQuery(options)
  const endpoint = ('/users/:username/:address/contract/:contractName/:contractAddress/call')
    .replace(':username', username)
    .replace(':address', user.address)
    .replace(':contractName', contract.name)
    .replace(':contractAddress', contract.address)
    .concat(query)
  return post(url, endpoint, body, options)
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
}
