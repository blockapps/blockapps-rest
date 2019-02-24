const axios = require('axios')

axios.defaults.headers.post['Content-Type'] = 'application/json'

function toJson(string) {
  try {
    return JSON.parse(string)
  } catch (err) {
    return string
  }
}

async function get(host, endpoint, options = {}) {
  const url = host + endpoint
  const request = {
    method: 'GET',
    url,
    headers: options.headers || null,
    params: options.params || null,
    transformResponse: [toJson],
  }
  try {
    const response = await axios(request)
    return response.data
  } catch (err) {
    // TODO log error
    throw err
  }
}

async function post(host, endpoint, data, options) {
  const url = host + endpoint

  const config_gasLimit = 32100000000
  const config_gasPrice = 1

  if (data.txParams === undefined) {
    data.txParams = { gasLimit: config_gasLimit, gasPrice: config_gasPrice }  // FIXME should come from config
  } else {
    data.txParams.gasLimit = data.txParams.gasLimit || config_gasLimit  // FIXME should come from config
    data.txParams.gasPrice = data.txParams.gasPrice || config_gasPrice  // FIXME should come from config
  }

  const request = {
    url,
    method: 'POST',
    headers: options.headers || null,
    data,
    transformResponse: [toJson],
  }

  const response = await axios(request)
  return response.data
}

async function postue(host, endpoint, body) {
  const url = host + endpoint

  function transformRequest(requestJson) {
    const params = Object.keys(requestJson).map(key => `${key}=${requestJson[key]}`)
    return params.join('&')
  }

  const response = await axios.post(
    url,
    transformRequest(body),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )
  return response.data
}

module.exports = {

  get,
  post,
  postue,
}
