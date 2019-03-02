const queryString = require('query-string')
const ax = require('./axios-wrapper')

async function post(url, endpoint, _body, options) {

  function createBody(_body, options) {
    // array
    if (Array.isArray(_body)) return _body
    // object
    const body = Object.assign({}, _body)
    const configTxParams = (options.config) ? options.config.txParams : undefined
    // in order of priority: 1:body, 2:options, 3:config, 4:default
    body.txParams = Object.assign(
      { gasLimit: 32100000000, gasPrice: 1 },
      configTxParams,
      options.txParams,
      _body.txParams,
    )
    return body
  }

  const body = createBody(_body, options)

  return ax.post(url, endpoint, body, options)
}

function getBlocUrl(options) {
  const node = options.node || 0
  const nodeUrls = options.config.nodes[node]
  return nodeUrls.blocUrl
}

async function getUsers(args, options) {
  const url = getBlocUrl(options)
  const endpoint = '/users'
  return ax.get(url, endpoint, options)
}

async function getUser(args, options) {
  const url = getBlocUrl(options)
  const username = encodeURIComponent(args.username)
  const endpoint = ('/users/:username').replace(':username', username)
  return ax.get(url, endpoint, options)
}

async function createUser(args, options) {
  const url = getBlocUrl(options)
  const username = encodeURIComponent(args.username)
  const data = { password: args.password }
  const endpoint = ('/users/:username').replace(':username', username)
  return ax.postue(url, endpoint, data, options)
}

async function fill(user, body, options) {
  const url = getBlocUrl(options)
  const username = encodeURIComponent(user.username)
  const resolve = !options.isAsync
  const query = queryString.stringify({ resolve })
  const endpoint = (`/users/:username/:address/fill?${query}`).replace(':username', username).replace(':address', user.address)
  return ax.postue(url, endpoint, body, options)
}

async function createContract(user, contract, body, options) {
  const url = getBlocUrl(options)
  const username = encodeURIComponent(user.username)
  const resolve = !options.isAsync
  const query = queryString.stringify({ resolve })
  const endpoint = (`/users/:username/:address/contract?${query}`).replace(':username', username).replace(':address', user.address)
  return post(url, endpoint, body, options)
}

async function blocResults(hashes, options) { // TODO untested code
  const url = getBlocUrl(options)
  const resolve = !options.isAsync
  const query = queryString.stringify({ resolve })
  const endpoint = `/transactions/results?${query}`
  return post(url, endpoint, hashes, options)
}

async function getState(contract, options) {
  const url = getBlocUrl(options)
  const query = queryString.stringify(options.stateQuery)
  const endpoint = (`/contracts/:name/:address/state?${query}`).replace(':name', contract.name).replace(':address', contract.address)
  return ax.get(url, endpoint, options)
}

async function call(user, contract, body, options) {
  const url = getBlocUrl(options)
  const resolve = !options.isAsync
  const query = queryString.stringify({ resolve })
  const username = encodeURIComponent(user.username)
  const endpoint = (`/users/:username/:address/contract/:contractName/:contractAddress/call?${query}`).replace(':username', username)
    .replace(':address', user.address)
    .replace(':contractName', contract.name)
    .replace(':contractAddress', contract.address)
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
