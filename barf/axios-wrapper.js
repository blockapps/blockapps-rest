// -----------------------------------
// axios wrapper
// -----------------------------------
const axios = require('axios');
axios.defaults.headers.post['Content-Type'] = 'application/json';

var isDebug = false;
var getLogger

function logError(message) {
  return function(err) {
    const data = err.data || ''
    message.error = {status: err.status, statusText: err.statusText, data }
    if (getLogger) getLogger().debug({ message })
    if (getLogger) getLogger().error({ message: err })
    throw(err)
  }
}

module.exports = {
  get: function(host, path, headers=null, debug) {
    const url = host + path;
    if (isDebug) console.log('curl -i ' + url);
    const message = {method: 'GET', host, path, headers} // MUST be named message
    if (getLogger) getLogger().debug({ message })
    return axios({
      url: url,
      headers: headers,
      transformResponse: [function(data) {
        try {
          return JSON.parse(data);
        } catch (e) {
          return data;
        }
      }],
    }).then(function(response) {
      if (isDebug) {
        console.log(JSON.stringify(response.data, null, 2));
        console.log();
      }
      message.response = response.data
      if (getLogger) getLogger().debug({ message })

      return response.data;
    }).catch( logError(message) );
  },

  post: function(host, body, path, headers=null) {
    const url = host + path;
    //if (isDebug) console.log('ax.post: body: ', JSON.stringify(body, null, 2));
    const config_gasLimit = 32100000000;
    const config_gasPrice = 1;
    if (body.txParams === undefined) {
      body.txParams = {gasLimit : config_gasLimit, gasPrice: config_gasPrice};  // FIXME should come from config
    } else {
      body.txParams.gasLimit = body.txParams.gasLimit || config_gasLimit;  // FIXME should come from config
      body.txParams.gasPrice = body.txParams.gasPrice || config_gasPrice;  // FIXME should come from config
    }
    if (isDebug) console.log('curl -i', toDataParams(body), url);
    const message = {method: 'POST', host, path, body, headers} // MUST be named message
    if (getLogger) getLogger().debug({ message })

    return axios({
      url: url,
      method: 'POST',
      headers: headers,
      data: body,
      transformResponse: [function(data) {
        try {
          return JSON.parse(data);
        } catch (e) {
          return data;
        }
      }],
    }).then(function(response) {
      if (isDebug) {
        console.log(JSON.stringify(response.data, null, 2));
        console.log();
      }
      message.response = response.data
      if (getLogger) getLogger().debug({ message })
      return response.data;
    }).catch( logError(message) );
  },

  postue: function(host, body, path) {
    const url = host + path;
    // if (isDebug) console.log('ax.postue: body: ', JSON.stringify(body, null, 2));
    // if (isDebug) console.log('curl -i', toDataParams(body), url);
    if (isDebug) console.log('curl -i', curlDataParams(body), url);
    const message = {method: 'POST', host, path, body} // MUST be named message
    if (getLogger) getLogger().debug({ message })

    function curlDataParams(body) {
      var str = [];
      for(var param in body)
        str.push(`-d "${param}=${body[param]}" `);
      return str.join('');
    }

    function transformRequest(body) {
      var str = [];
      for(var param in body)
        str.push(param + '=' + body[param]);
      return str.join("&");
    }

    return axios.post(
        url,
        transformRequest(body),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    .then(function(response) {
      if (isDebug) {
        console.log('response', JSON.stringify(response.data, null, 2));
      }
      message.response = response.data
      if (getLogger) getLogger().debug({ message })
      return response.data;
    }).catch( logError(message) );

    return axios({
      url: url,
      method: 'POST',
      data: body,
      transformResponse: [function(data) {
        try {
          return JSON.parse(data);
        } catch (e) {
          return data;
        }
      }],
    }).then(function(response) {
      if (isDebug) {
        console.log(JSON.stringify(response.data, null, 2));
        console.log();
      }
      if (getLogger) getLogger().debug('api response:', JSON.stringify(response.data, null, 2))
      return response.data;
    });
  },

  setDebug: function(_isDebug) {
    isDebug = _isDebug;
  },

  setLogger: function(_getLogger) {
    getLogger = _getLogger
  }
};

function toDataParams(obj) {
  var string = '';
  for (key in obj) {
    var value = obj[key];
    var valueString = (typeof value === "object") ? JSON.stringify(value) : (value === undefined ? 'undefined' : value.toString());
    valueString = valueString.replace(new RegExp('"', 'g'), '');
    string += '-d "' + key + '=' + valueString + '" ';
  }
  return string;
}
