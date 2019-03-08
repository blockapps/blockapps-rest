import queryString from 'query-string'
import ax from './axios-wrapper'
import * as constants from './constants'

function constructEndpoint(endpointTemplate, options = {}, params = {}) {
  // expand template
  const endpoint = Object.getOwnPropertyNames(params).reduce((acc, key) => {
    return acc.replace(`:${key}`, encodeURIComponent(params[key]))
  }, endpointTemplate)
  // concat query patameters
  const query = (options !== undefined) ? constructQuery(options) : ''
  return endpoint + query
}

function constructQuery(options) {
  const queryObject = Object.assign(
    { resolve: !options.isAsync, chainid: options.chainId },  // @samrit should we go to options.chainid ?
    options.stateQuery,
    options.query,
  )
  const query = `?${queryString.stringify(queryObject)}`
  return query
}

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

async function get(host, endpoint, options = {}) {
  return ax.get(host, endpoint, options)
}

async function postue(host, endpoint, data, options) {
  // TODO - @samrit do we need txParams here
  return ax.postue(host, endpoint, data, options)
}

export {
  constructEndpoint,
  constructMetadata,
  getBlocUrl,
  getHeaders,
  getApiUrl,
  getStratoUrl,
  getSearchUrl,
  getNodeUrl,
  get,
  post,
  postue,
}
