import RestStatus from 'http-status-codes'
import queryString from 'query-string'
import ax from './axios-wrapper'
import { RestError } from './rest.util'

function constructEndpoint(endpointTemplate, options = {}, params = {}) {
  // expand template
  const endpoint = Object.getOwnPropertyNames(params).reduce((acc, key) => {
    return acc.replace(`:${key}`, encodeURIComponent(params[key]))
  }, endpointTemplate)
  // concat query patameters
  const query = (options !== undefined) ? constructQuery(options) : ''
  return `${endpoint}${query}`
}

function constructQuery(options) {
  const queryObject = Object.assign(
    { resolve: !options.isAsync, chainid: options.chainIds },  // @samrit should we go to options.chainid ?
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
  // VM
  if (options.hasOwnProperty('VM')) {
    if (!(['EVM', 'SolidVM'].includes(options.VM))) {
      throw new RestError(RestStatus.BAD_REQUEST, `Illegal VM type ${options.VM}`, { options })
    }
    metadata.VM = options.VM
  }

  // TODO: construct the "nohistory" and "index" fields for metadata if needed
  // The current implementation only constructs "history" and "noindex"

  return metadata
}

function setAuthHeaders(user, _options) {
  const options = Object.assign({}, _options)
  options.headers = Object.assign({}, _options.headers, { Authorization: `Bearer ${user.token}` })
  return options
}

/*
  get the url for the node by node id#
 */
function getNodeUrl(options) {
  const nodeId = options.node || 0
  const nodeObject = options.config.nodes[nodeId]
  return nodeObject.url
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
  setAuthHeaders,
  getNodeUrl,
  get,
  post,
  postue,
}
