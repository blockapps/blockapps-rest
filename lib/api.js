const ax = require('./axios-wrapper');
const util = require('./util');

// some calls return http status 200, even when there was an error
// be more rfc2616 compliant by parsing the return value, and generating an error when needed
// @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
// TODO remove when https://www.pivotaltracker.com/story/show/124404871 is resolved

// return value should be an address
function rfc2616Address(data) {
  return new Promise(function(resolve, reject) {
    if (util.isAddress(data)) {
      resolve(data);
    } else {
      reject(new Error(JSON.stringify(data)));
    }
  });
}
// return value should be a transaction
function rfc2616Tx(data) {
  return new Promise(function(resolve, reject) {
    if (util.isTx(data)) {
      resolve(data);
    } else {
      reject(new Error(JSON.stringify(data)));
    }
  });
}
// return value should be a value
function rfc2616Method(data) {
  //console.log('data', typeof data, data);
  return new Promise(function(resolve, reject) {
    const prefix = 'transaction returned: ';

    try {
      var threw = data.message.indexOf('InvalidJump') !== -1
      if(threw){
        resolve('throw')
      }
    } catch (_){
    }
    if (typeof data === "string" && data.indexOf(prefix) == 0) {
      resolve(data.substring(prefix.length));
    } else {
      reject(new Error('Method call returned bad value. ' + JSON.stringify(data)));
    }
  });
}

function setDebug(isDebug) {
  ax.setDebug(isDebug);
};

module.exports = function(config) {
  var node = 0;
  setDebug(config.apiDebug);

  return {
    explorer: {
      home: function() {
        return ax.get(config.getExplorerUrl(node), '/');
      },
      nodes: function() {
        return ax.get(config.getExplorerUrl(node), '/api/nodes');
      },
    },

    strato: {
      home: function() {
        return ax.get(config.getStratoUrl(node), '/');
      },
      account: function(address) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/account?address=' + address);
      },
      block: function(number) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/block?number=' + number);
      },
      faucet: function(body) {
        return ax.post(config.getStratoUrl(node), body, '/eth/v1.2/faucet');
      },
      storage: function(attr, value) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/storage?'+attr+'='+value);
      },
      search: function(code) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/account?code=' + code);
      },
    },

    bloc: {
      contract: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/contract').then(rfc2616Address);
      },
      uploadList: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/uploadList');
      },
      import: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/import').then(rfc2616Address);
      },
      home: function() {
        return ax.get(config.getBlocUrl(node), '/');
      },
      import: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/import');
      },
      method: function(body, name, address, contractName, contractAddress) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + name + '/' + address + '/contract/' + contractName + '/' + contractAddress + '/call').then(rfc2616Method);
      },
      send: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/send').then(rfc2616Tx);
      },
      sendList: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/sendList');
      },
      contracts: function(name) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name);
      },
      abi: function(name, address) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address);
      },
      state: function(name, address) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address + '/state');
      },
      stateLookup: function(name, address, mapping, key) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address + '/state/' + mapping + '/' + key);
      },
      users: function() {
        return ax.get(config.getBlocUrl(node), '/users');
      },
      createUser: function(body, name) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + name);
      },
      search: function(name) {
        return ax.get(config.getBlocUrl(node), '/search/' + name + '/state');
      },
      searchReduced: function(name) {
        return ax.get(config.getBlocUrl(node), '/search/' + name + '/state/reduced');
      },
      searchSummary: function(name, wellName) {
        var well = wellName ? '?well=' + wellName : '';
        return ax.get(config.getBlocUrl(node), '/search/' + name + '/state/summary' + well);
      }
    },

    setDebug: setDebug,
    setNode: function(_node) {
      if (_node === undefined) return;
      node = _node;
    },
  };
};
