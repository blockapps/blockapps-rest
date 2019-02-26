import ax from './axios-wrapper'

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
  const endpoint = (`/users/:username/:address/fill?resolve=${resolve}`).replace(':username', username).replace(':address', user.address)
  return ax.postue(url, endpoint, body, options)
}

async function createContract(user, contract, body, options) {
  const url = getBlocUrl(options)
  const username = encodeURIComponent(user.username)
  const endpoint = ('/users/:username/:address/contract?resolve').replace(':username', username).replace(':address', user.address)
  return ax.post(url, endpoint, body, options)
}

async function blocResults(hashes, options) { // TODO untested code
  const url = getBlocUrl(options)
  const resolve = !options.isAsync
  const endpoint = `/transactions/results?resolve=${resolve}`
  return ax.post(url, endpoint, hashes, options);
}

export default {
  getUsers,
  getUser,
  createUser,
  createContract,
  fill,
  blocResults,
}
