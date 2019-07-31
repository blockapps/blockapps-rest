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
    logger.debug(request)
    const response = await axios(request)
    logger.debug(response.data)
    return response.data
  } catch (err) {
    logger.error(errorFormatter(err))
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
    logger.debug(request)
    const response = await axios(request)
    logger.debug(response.data)
    return response.data
  } catch (err) {
    logger.error(errorFormatter(err))
    throw err
  }
}

function errorFormatter(err) {
  // system error
  if (err.syscall) return err.message
  // rest error
  if (err.response && err.response.data) return err.response.data
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
