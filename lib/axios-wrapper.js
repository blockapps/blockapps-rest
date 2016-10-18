// -----------------------------------
// axios wrapper
// -----------------------------------
const axios = require('axios');
axios.defaults.headers.post['Content-Type'] = 'application/json';

var isDebug = false;

module.exports = {
  get: function(host, path, debug) {
    const url = host + path;
    if (isDebug) console.log('curl -i ' + url);
    return axios({
      url: url,
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
      return response.data;
    });
  },

  post: function(host, body, path) {
    const url = host + path;
    //if (isDebug) console.log('ax.post: body: ', body);
    if (body.txParams === undefined) {
      body.txParams = {gasLimit : 90000000};
    } else {
      body.txParams.gasLimit = body.txParams.gasLimit || 90000000;
    }
    if (isDebug) console.log('curl -i', toDataParams(body), url);

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
      return response.data;
    });
  },

  setDebug: function(_isDebug) {
    isDebug = _isDebug;
  }
};

function toDataParams(obj) {
  var string = '';
  for (key in obj) {
    var value = obj[key];
    var valueString = (typeof value === "object") ? JSON.stringify(value) : value.toString();
    valueString = valueString.replace(new RegExp('"', 'g'), '');
    string += '-d "' + key + '=' + valueString + '" ';
  }
  return string;
}
