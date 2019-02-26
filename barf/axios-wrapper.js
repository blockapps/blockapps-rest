import axios from 'axios'

axios.defaults.headers.post['Content-Type'] = 'application/json'

const urlencodedHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' }

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
    console.log(err)
    throw err
  }
}

async function post(host, endpoint, body, options) {
  const url = host + endpoint

  // TODO generalize txParams
  const config_gasLimit = 32100000000
  const config_gasPrice = 1

  if (body.txParams === undefined) {
    body.txParams = { gasLimit: config_gasLimit, gasPrice: config_gasPrice }  // TODO generalize txParams
  } else {
    body.txParams.gasLimit = body.txParams.gasLimit || config_gasLimit  // TODO generalize txParams
    body.txParams.gasPrice = body.txParams.gasPrice || config_gasPrice  // TODO generalize txParams
  }

  const request = {
    url,
    method: 'POST',
    headers: options.headers || null,
    data: body,
    transformResponse: [toJson],
  }
  try {
    const response = await axios(request)
    return response.data
  } catch (err) {
    // TODO log error
    console.log(err)
    throw err
  }
}

async function postue(host, endpoint, data, options) {
  const url = host + endpoint

  const response = await axios.post(
    url,
    transformRequest(data),
    { headers: urlencodedHeaders },
  )
  return response.data
}

export default {
  get,
  post,
  postue,
}
