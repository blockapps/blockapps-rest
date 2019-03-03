import ax from './axios-wrapper'
import qs from 'query-string'
import apiUtil from './api.util'

const { 
  constructMetadata, 
  getBlocUrl,
  getNodeUrl,
  constructEndpoint,
  endpoints,
  getHeaders
} = apiUtil


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

async function fill(user, options) {
  const body = {}
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
