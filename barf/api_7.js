const ax = require('./axios-wrapper')

function getBlocUrl(options) {
  const node = options.node || 0
  const nodeUrls = options.config.nodes[node]
  return nodeUrls.blocUrl
}

async function getUsers(args, options) {
  const url = getBlocUrl(options)
  const endpoint = '/users'
  return ax.get(url, endpoint)
}

async function getUser(args, options) {
  const url = getBlocUrl(options)
  const endpoint = ('/users/:username').replace(':username', args.username)
  return ax.get(url, endpoint)
}

module.exports = {
  getUsers,
  getUser,
}
