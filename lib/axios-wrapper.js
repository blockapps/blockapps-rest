import axios from 'axios'
import queryString from 'query-string'

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
  const logger = options.logger || nullLogger
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
    logger.debug(err.response.data)
    throw err
  }
}

async function post(host, endpoint, body, options) {
  const logger = options.logger || nullLogger
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
    logger.debug(err.response.data)
    throw err
  }
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
