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
    if (isDebug) console.log('ax.post: body: ', JSON.stringify(body, null, 2));
    const config_gasLimit = 100000000;
    const config_gasPrice = 1;
    if (body.txParams === undefined) {
      body.txParams = {gasLimit : config_gasLimit, gasPrice: config_gasPrice};  // FIXME should come from config
    } else {
      body.txParams.gasLimit = body.txParams.gasLimit || config_gasLimit;  // FIXME should come from config
      body.txParams.gasPrice = body.txParams.gasPrice || config_gasPrice;  // FIXME should come from config
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

  postue: function(host, body, path) {
    const url = host + path;
    // if (isDebug) console.log('ax.postue: body: ', JSON.stringify(body, null, 2));
    //if (isDebug) console.log('curl -i', toDataParams(body), url);

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
        return response.data;
      });


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
    var valueString = (typeof value === "object") ? JSON.stringify(value) : (value === undefined ? 'undefined' : value.toString());
    valueString = valueString.replace(new RegExp('"', 'g'), '');
    string += '-d "' + key + '=' + valueString + '" ';
  }
  return string;
}
