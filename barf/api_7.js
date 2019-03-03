import ax from './axios-wrapper'
import qs from 'query-string'

function getHeaders(user, options) {
  return {
    headers: {
      ...options.header,
      'Authorization': `Bearer ${user.token}`
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

const endpoints = {
  getUsers: '/users',
  getUser: '/users/:username',
  createUser: '/users/:username',
  fill: '/users/:username/:address/fill',
  createContract: '/users/:username/:address/contract',
  blocResults: '/transactions/results',
  getState: '/contracts/:name/:address/state',
  sendTransactions: '/strato/v2.3/transaction',
  getKey:  '/strato/v2.3/key',
  createKey: '/strato/v2.3/key'
}

function constructEndpoint(endpoint, params = {}, queryParams = {}) {
  const url = Object.getOwnPropertyNames(params).reduce((acc, key) =>  {
    return acc.replace(`:${key}`, encodeURIComponent(params[key]))
  }, endpoint)
  return `${url}?${qs.stringify(queryParams)}`;
}

async function getUsers(options) {
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(endpoints.getUsers)
  return ax.get(url, endpoint, options)
}

async function getUser(user, options) {
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(endpoints.getUser, user)
  return ax.get(url, endpoint, options)
}

async function createUser(user, options) {
  const url = getBlocUrl(options)
  const data = { password: user.password }
  const endpoint = constructEndpoint(endpoints.createUser, user)
  return ax.postue(url, endpoint, data, options)
}

async function fill(user, body, options) {
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(endpoints.fill, user, {resolve: !options.isAsync})
  return ax.postue(url, endpoint, body, options)
}

async function createContract(user, body, options) {
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(endpoints.createContract, user, {resolve: true})
  return ax.post(url, endpoint, body, options)
}

async function blocResults(hashes, options) { // TODO untested code
  const url = getBlocUrl(options)
  const resolve = !options.isAsync
  const endpoint = constructEndpoint(endpoints.blocResults, {}, {resolve})
  return ax.post(url, endpoint, hashes, options)
}

async function getState(contract, options) {
  const url = getBlocUrl(options)
  const query = qs.stringify(options.query)
  const endpoint = constructEndpoint(endpoints.getState, contract, options.query)
  return ax.get(url, endpoint, options)
}

async function sendTransactions(user, body, options) {
  const url = getNodeUrl(options);
  const resolve = !options.isAsync
  const endpoint = constructEndpoint(endpoints.sendTransactions, {}, {
    ...options.query,
    resolve
  }) 
  return ax.post(
    url, 
    endpoint, 
    body, 
    getHeaders(user, options)
  ) 
}

async function getKey(user, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(endpoints.getKey, {}, options.query) 
  return ax.get(
    url,
    endpoint,
    getHeaders(user, options)
  )
}

async function createKey(user, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(endpoints.getKey, {}, options.query) 
  return ax.post(
    url,
    endpoint,
    {},
    getHeaders(user, options)
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
  createKey,
  getState,
}
