const queryString = require('query-string')
const BigNumber = require('bignumber.js');
const ax = require('./axios-wrapper')

/**
 * This function constructes metadata that can be used to control the history and index flags
 * @method{constructMetadata}
 * @param{Object} options flags for history and indexing
 * @param{String} contractName
 * @returns{()} metadata
 */
function constructMetadata(options, contractName) {
  const metadata = {}
  if (options === {}) return metadata

  // history flag (default: off)
  if (options.enableHistory) {
    metadata['history'] = contractName
  }
  if (options.hasOwnProperty('history')) {
    const newContracts = options['history'].filter(contract => contract !== contractName).join()
    metadata['history'] = `${options['history']},${newContracts}`
  }

  // index flag (default: on)
  if (options.hasOwnProperty('enableIndex') && !options.enableIndex) {
    metadata['noindex'] = contractName
  }
  if (options.hasOwnProperty('noindex')) {
    const newContracts = options['noindex'].filter(contract => contract !== contractName).join()
    metadata['noindex'] = `${options['noindex']},${newContracts}`
  }

  //TODO: construct the "nohistory" and "index" fields for metadata if needed
  // The current implementation only constructs "history" and "noindex"

  return metadata
}


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

async function fill(user, options) {
  const body = {}
  const url = getBlocUrl(options)
  const username = encodeURIComponent(user.username)
  const resolve = !options.isAsync
  const query = queryString.stringify({ resolve })
  const endpoint = (`/users/:username/:address/fill?${query}`).replace(':username', username).replace(':address', user.address)
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

async function call(user, contract, method, args, value, options) {
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value;
  const body = {
    password: user.password,
    method,
    args,
    value: valueFixed,
    metadata: constructMetadata(options, contract.name),
  }
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
