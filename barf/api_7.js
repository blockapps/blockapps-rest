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
  createKey: '/strato/v2.3/key',
  search: '/search/:name'
}

function constructEndpoint(endpoint, params = {}, options = {}) {
  const url = Object.getOwnPropertyNames(params).reduce((acc, key) =>  {
    return acc.replace(`:${key}`, encodeURIComponent(params[key]))
  }, endpoint)
  return `${url}?${options.isAsync ? '' : 'resolve&'}${options.chainId ? `chainid=${options.chainId}&` : ''}${queryString.stringify(options.query)}`;
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
  const endpoint = constructEndpoint(endpoints.fill, user, options)
  return ax.postue(url, endpoint, body, options)
}

async function createContract(user, body, options) {
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(endpoints.createContract, user, options)
  return ax.post(url, endpoint, body, options)
}

async function blocResults(hashes, options) { // TODO untested code
  const url = getBlocUrl(options)
  const endpoint = constructEndpoint(endpoints.blocResults, {}, options)
  return ax.post(url, endpoint, hashes, options)
}

async function getState(contract, options) {
  const url = getBlocUrl(options)
  const query = queryString.stringify(options.query)
  const endpoint = constructEndpoint(endpoints.getState, contract, options)
  return ax.get(url, endpoint, options)
}

async function sendTransactions(user, body, options) {
  const url = getNodeUrl(options);
  const endpoint = constructEndpoint(endpoints.sendTransactions, {}, options) 
  return ax.post(
    url, 
    endpoint, 
    body, 
    getHeaders(user, options)
  ) 
}

async function getKey(user, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(endpoints.getKey, {}, options) 
  return ax.get(
    url,
    endpoint,
    getHeaders(user, options)
  )
}

async function createKey(user, options) {
  const url = getNodeUrl(options)
  const endpoint = constructEndpoint(endpoints.getKey, {}, options) 
  return ax.post(
    url,
    endpoint,
    {},
    getHeaders(user, options)
  )
}

async function search(contract, options) {
  const url = getSearchUrl(options);
  const endpoint = constructEndpoint(endpoints.search, contract, options)
  return ax.get(
    url,
    endpoint
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
  getState,
  search
}
