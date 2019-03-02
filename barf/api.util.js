const queryString = require('query-string')
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
    metadata.history = contractName
  }
  if (options.hasOwnProperty('history')) {
    const newContracts = options.history.filter(contract => contract !== contractName).join()
    metadata.history = `${options.history},${newContracts}`
  }

  // index flag (default: on)
  if (options.hasOwnProperty('enableIndex') && !options.enableIndex) {
    metadata.noindex = contractName
  }
  if (options.hasOwnProperty('noindex')) {
    const newContracts = options.noindex.filter(contract => contract !== contractName).join()
    metadata.noindex = `${options.noindex},${newContracts}`
  }

  // TODO: construct the "nohistory" and "index" fields for metadata if needed
  // The current implementation only constructs "history" and "noindex"

  return metadata
}

function createQuery(options) {
  const queryObject = Object.assign(
    { resolve: !options.isAsync },
    options.stateQuery,
  )
  const query = `?${queryString.stringify(queryObject)}`
  return query
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

module.exports = {
  constructMetadata,
  createQuery,
  getBlocUrl,
  post,
}
