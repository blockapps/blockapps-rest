import axios from 'axios'

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

function transformRequest(requestJson) {
  const params = Object.keys(requestJson).map(key => `${key}=${requestJson[key]}`)
  return params.join('&')
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

async function postue(host, endpoint, data, options) {
  const logger = options.logger || nullLogger
  const url = host + endpoint
  try {
    const response = await axios.post(
      url,
      transformRequest(data),
      { headers: urlencodedHeaders },
    )
    logger.debug(url)
    return response.data
    logger.debug(response.data)
  } catch (err) {
    logger.debug(err.response.data)
    throw err
  }
}

export default {
  get,
  post,
  postue,
}
