const ax = require('./axios-wrapper')

function getBlocUrl(options) {
  const node = options.node || 0
  const nodeUrls = options.config.nodes[node]
  return nodeUrls.blocUrl
}

async function users(args, options) {
  const url = getBlocUrl(options)
  return ax.get(url, '/users')
}

module.exports = {
  users,
}
