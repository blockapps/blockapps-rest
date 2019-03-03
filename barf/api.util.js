import qs from 'query-string'

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

function getStratoUrl(options) {
  return getApiUrl(options, 'strato');
}


function getSearchUrl(options) {
  return getApiUrl(options, 'search');
}

function getNodeUrl(options) {
  return getApiUrl(options, 'node');
}

function getBlocUrl(options) {
  const node = options.node || 0
  const nodeUrls = options.config.nodes[node]
  return nodeUrls.blocUrl
}

function constructEndpoint(endpoint, params = {}, queryParams = {}) {
  const url = Object.getOwnPropertyNames(params).reduce((acc, key) =>  {
    return acc.replace(`:${key}`, encodeURIComponent(params[key]))
  }, endpoint)
  return `${url}?${qs.stringify(queryParams)}`;
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

export default {
  constructMetadata,
  getBlocUrl,
  getHeaders,
  getApiUrl,
  getStratoUrl,
  getSearchUrl,
  getNodeUrl,
  constructEndpoint,
  endpoints
}
