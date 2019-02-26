import ax from './axios-wrapper'
import qs from 'query-string'

function getHeaders(options) {
  return {
    headers: {
      ...options.header,
      'Authorization': `Bearer ${options.auth.token}`
    }
  }
}

function getApiUrl(options, apiSelector) {
  const node = options.node || 0
  const nodeUrls = options.config.nodes[node]
  return nodeUrls[`${apiSelector}Url`]
}

function getBlocUrl(options) {
  return getApiUrl(options, 'bloc');
}

function getStratoUrl(options) {
  return getApiUrl(options, 'strato');
}


function getSearchUrl(options) {
  return getApiUrl(options, 'search');
}

function getNodeUrl(options) {
  return getApiUrl(options, 'node');
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
  const endpoint = (`/users/:username/:address/fill?resolve=${resolve}`).replace(':username', username).replace(':address', user.address)
  return ax.postue(url, endpoint, body, options)
}

async function createContract(body, options) {
  const url = getBlocUrl(options)
  const username = encodeURIComponent(options.auth.username)
  const endpoint = ('/users/:username/:address/contract?resolve').replace(':username', username).replace(':address', options.auth.address)
  return ax.post(url, endpoint, body, options)
}

async function blocResults(hashes, options) { // TODO untested code
  const url = getBlocUrl(options)
  const resolve = !options.isAsync
  const endpoint = `/transactions/results?resolve=${resolve}`
  return ax.post(url, endpoint, hashes, options);
}

async function sendTransactions(body, options) {
  const url = getNodeUrl(options);
  const resolve = !options.isAsync
  const endpoint = `/strato/v2.3/transaction?resolve=${resolve}&${qs.stringify(options.query)}`
  return ax.post(
    url, 
    endpoint, 
    body, 
    getHeaders(options)
  ) 
}

async function getKey(options) {
  const url = getNodeUrl(options)
  const endpoint = `/strato/v2.3/key?${qs.stringify(options.query)}`
  return ax.get(
    url,
    endpoint,
    getHeaders(options)
  )
}

async function createKey(options) {
  const url = getNodeUrl(options)
  const endpoint = `/strato/v2.3/key?${qs.stringify(options.query)}`
  return ax.post(
    url,
    endpoint,
    {},
    getHeaders(options)
  )
}

export default {
  getUsers,
  getUser,
  createUser,
  createContract,
  fill,
  blocResults,
  sendTransactions,
  getKey,
  createKey
}
