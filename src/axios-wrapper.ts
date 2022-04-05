import axios, { AxiosRequestConfig } from 'axios'
import * as queryString from 'query-string'
const { stringify} = require('flatted/cjs');
import { Options } from "./types";

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

async function get(host, endpoint, options:Options) {
  const logger = options.logger || (options.config.apiDebug? console : nullLogger)
  const url = host + endpoint
  const request:AxiosRequestConfig = {
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
    if (typeof(response.data) !== 'object') throw new Error("Call to Strato API did not return a JSON object:\n" + response.data);
    logger.debug(responseFormatter(response))
    return options.getFullResponse ? response : response.data
  } catch (err) {
    logger.debug('### axios GET error')
    console.error(errorFormatter(err))
    throw err
  }
}

async function put(host, endpoint, body, options:Options) {
  const logger = options.logger || (options.config.apiDebug? console : nullLogger)
  const url = host + endpoint
  const request:AxiosRequestConfig = {
    url,
    method: 'PUT',
    headers: options.headers || null,
    data: body,
    transformResponse: [toJson],
  }
  try {
    logger.debug('### axios PUT')
    logger.debug(requestFormatter(request))
    const response = await axios(request)
    logger.debug('### axios PUT response')
    logger.debug(responseFormatter(response))
    return options.getFullResponse ? response : response.data
  } catch (err) {
    logger.debug('### axios PUT error')
    console.error(errorFormatter(err))
    throw err
  }
}

async function post(host, endpoint, body, options:Options) {
  const logger = options.logger || (options.config.apiDebug? console : nullLogger)
  const url = host + endpoint
  const request:AxiosRequestConfig = {
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
    return options.getFullResponse ? response : response.data
  } catch (err) {
    logger.debug('### axios POST error')
    console.error(errorFormatter(err))
    throw err
  }
}

async function httpDelete(host, endpoint, body, options:Options) {
  const logger = options.logger || (options.config.apiDebug? console : nullLogger)
  const url = host + endpoint
  const request:AxiosRequestConfig = {
    url,
    method: 'DELETE',
    headers: options.headers || null,
    data: body,
    transformResponse: [toJson],
  }
  try {
    logger.debug('### axios DELETE')
    logger.debug(requestFormatter(request))
    const response = await axios(request)
    logger.debug('### axios DELETE response')
    logger.debug(responseFormatter(response))
    return options.getFullResponse ? response : response.data
  } catch (err) {
    logger.debug('### axios DELETE error')
    console.error(errorFormatter(err))
    throw err
  }
}

function requestFormatter(_request) {
  const request = JSON.parse(JSON.stringify(_request)) // deep copy
  if (request.headers && request.headers.Authorization) {
    const rhAuth = request.headers.Authorization
    if (rhAuth.startsWith('Bearer')) {
      const headerString = rhAuth.substring(0, 15) + '...truncated...' + rhAuth.substring(rhAuth.length - 10)
      request.headers.Authorization = headerString
    }
  }
  let parsedRequest = request;
  // if this is a contract - remove the source from the debug
  if (request.hasOwnProperty('data')) {
    if (request.data.hasOwnProperty('txs')) {
      parsedRequest.data.txs = request.data.txs.map((tx) => {
        return {
          ...tx,
          payload: {
            ...tx.payload,
            src: 'source removed.'
          }
        }
      })
    }
    replaceKeyIfExists(parsedRequest.data, 'src', 'source removed.')
  }
  return JSON.stringify(parsedRequest, null, 2)
}

function responseFormatter(response) {
  // if this is a contract - remove the source from the debug
  let parsedResponse = response
  const removedFields = ['src', 'bin', 'bin-runtime', 'xabi']
  if (response.hasOwnProperty('data') && Array.isArray(response.data)) {
    parsedResponse.data = response.data.map((el) => {
      let newEl = el
      if (el.hasOwnProperty('data') && el.data !== null && el.data !== undefined) {
        if (el.data.hasOwnProperty('contents')) {
          const contents = el.data.contents
          removedFields.forEach((field) => replaceKeyIfExists(contents, field, `${field} removed.`))
          newEl.data.contents = contents
        }
        replaceKeyIfExists(el.data, 'src', 'source removed.')
      }
      return newEl
    })
  }
  if (parsedResponse.data) {
    return JSON.stringify(parsedResponse.data, null, 2)
  }
  return JSON.stringify(parsedResponse, null, 2)
}

function replaceKeyIfExists(obj:object, key:string, rep:string) {
  if (obj !== null && obj !== undefined && obj.hasOwnProperty(key)) {
    obj[key] = rep
  }
  return obj
}

function errorFormatter(err) {
  // If the error comes from the REST server, we should include the server's error description
  if (err.response) return err.toString() + ": " + err.response.data;
  
  return err.toString();
}

async function putue(host, endpoint, data, _options:Options) {
  const options = Object.assign({}, _options)
  options.headers = Object.assign({}, options.headers, urlencodedHeaders)
  return put(host, endpoint, queryString.stringify(data), options)
}

async function postue(host, endpoint, data, _options:Options) {
  const options = Object.assign({}, _options)
  options.headers = Object.assign({}, options.headers, urlencodedHeaders)
  return post(host, endpoint, queryString.stringify(data), options)
}

async function httpDeleteue(host, endpoint, data, _options:Options) {
  const options = Object.assign({}, _options)
  options.headers = Object.assign({}, options.headers, urlencodedHeaders)
  return httpDelete(host, endpoint, queryString.stringify(data), options)
}

export default {
  get,
  put,
  putue,
  post,
  postue,
  httpDelete,
  httpDeleteue,
}
