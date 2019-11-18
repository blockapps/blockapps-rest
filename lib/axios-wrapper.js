import axios from 'axios'
import queryString from 'query-string'
const { stringify} = require('flatted/cjs');


axios.defaults.headers.post['Content-Type'] = 'application/json'

const urlencodedHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' }
const nullLogger = { info: () => {}, debug: () => {}, error: () => {} }

function toJson(string) {
  try {
    return JSON.parse(string)
  } catch (err) {
    return string
  }
}

async function get(host, endpoint, options = {}) {
  const logger = options.logger || (options.config.apiDebug? console : nullLogger)
  const url = host + endpoint
  const request = {
    method: 'GET',
    url,
    headers: options.headers || null,
    params: options.params || null,
    transformResponse: [toJson],
  }
  try {
    logger.debug('### axios GET')
    logger.debug(requestFormatter(request))
    const response = await axios(request)
    logger.debug('### axios GET response')
    logger.debug(responseFormatter(response))
    return response.data
  } catch (err) {
    logger.error(errorFormatter(err))
    logger.debug('### axios GET error')
    logger.debug(errorFormatter(err))
    throw err
  }
}

async function post(host, endpoint, body, options) {
  const logger = options.logger || (options.config.apiDebug? console : nullLogger)
  const url = host + endpoint
  const request = {
    url,
    method: 'POST',
    headers: options.headers || null,
    data: body,
    transformResponse: [toJson],
  }
  try {
    logger.debug('### axios POST')
    logger.debug(requestFormatter(request))
    const response = await axios(request)
    logger.debug('### axios POST response')
    logger.debug(responseFormatter(response))
    return response.data
  } catch (err) {
    logger.debug('### axios POST error')
    logger.error(errorFormatter(err))
    throw err
  }
}

function requestFormatter(_request) {
  const request = JSON.parse(JSON.stringify(_request)) // deep copy
  if (request.headers && request.headers.Authorization) {
    const rhAuth = request.headers.Authorization
    if (rhAuth.startsWith('Bearer')) {
      const headerString = rhAuth.substring(0, 15) + '...truncted...' + rhAuth.substring(rhAuth.length - 10)
      request.headers.Authorization = headerString
    }
  }
  // if this is a contract - remove the source from the debug
  try {
    request.data.txs[0].payload.src = 'source removed.'
  } catch (e) {
  }
  return JSON.stringify(request, null, 2)
}

function responseFormatter(response) {
  // if this is a contract - remove the source from the debug
  try {
    response.data[0].data.contents.src = 'source removed.'
  } catch (e) {
  }
  if (response.data) {
    return JSON.stringify(response.data, null, 2)
  }
  return JSON.stringify(response, null, 2)
}

function errorFormatter(err) {
  // system error
  if (err.syscall) return err.message
  // rest error
  if (err.response) {
    const errResponse = {
      ...err.response,
      request: undefined,
    }
   return JSON.stringify(errResponse, null, 2)
  }
  // other
  return stringify(err)
}

async function postue(host, endpoint, data, _options) {
  const options = Object.assign({}, _options)
  options.headers = Object.assign({}, options.headers, urlencodedHeaders)
  return post(host, endpoint, queryString.stringify(data), options)
}

export default {
  get,
  post,
  postue,
}
