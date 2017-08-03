const ax = require('./axios-wrapper');
const util = require('./util');

function setDebug(isDebug) {
  ax.setDebug(isDebug);
};

module.exports = function(config) {
  setDebug(config.apiDebug);

  return {
    search: {
      get: function(url, node) {
        return ax.get(config.getSearchUrl(node), '/' + url);
      },
      post: function(body, url, node) {
        return ax.post(config.getSearchUrl(node), body, '/' + url);
      },
      query: function(query, node) {
        return ax.get(config.getSearchUrl(node), '/search/' + query);
      },
    },

    explorer: {
      get: function(url, node) {
        return ax.get(config.getExplorerUrl(node), '/' + url);
      },
      post: function(body, url, node) {
        return ax.post(config.getExplorerUrl(node), body, '/' + url);
      },
      home: function(node) {
        return ax.get(config.getExplorerUrl(node), '/');
      },
      nodes: function(node) {
        return ax.get(config.getExplorerUrl(node), '/api/nodes');
      },
    },

    strato: {
      home: function(node) {
        return ax.get(config.getStratoUrl(node), '/');
      },
      account: function(address, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/account?address=' + address);
      },
      block: function(number, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/block?number=' + number);
      },
      last: function(number, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/block/last/' + number);
      },
      transaction: function(args, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transaction?'+args);
      },
      transactionLast: function(number, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transaction/last/' + number);
      },
      transactionResult: function(hash, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transactionResult/'+hash);
      },
      faucet: function(body, node) {
        return ax.postue(config.getStratoUrl(node), body, '/eth/v1.2/faucet');
      },
      storage: function(attr, value, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/storage?'+attr+'='+value);
      },
      search: function(code, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/account?code=' + code);
      },
    },

    bloc: {
      contract: function(body, from, address, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/contract');
      },
      uploadList: function(body, from, address, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/uploadList');
      },
      import: function(body, from, address, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/import');
      },
      home: function(node) {
        return ax.get(config.getBlocUrl(node), '/');
      },
      call: function(body, name, address, contractName, contractAddress, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + encodeURIComponent(name) + '/' + address + '/contract/' + contractName + '/' + contractAddress + '/call');
      },
      method: function(body, name, address, contractName, contractAddress, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + encodeURIComponent(name) + '/' + address + '/contract/' + contractName + '/' + contractAddress + '/call');
      },
      callList: function(body, from, address, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/callList');
      },
      send: function(body, from, address, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/send');
      },
      sendList: function(body, from, address, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/sendList');
      },
      contracts: function(name, node) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name);
      },
      abi: function(name, address, node) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address);
      },
      state: function(name, address, node) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address + '/state');
      },
      stateLookup: function(name, address, mapping, key, node) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address + '/state/' + mapping + '/' + key);
      },
      users: function(node) {
        return ax.get(config.getBlocUrl(node), '/users');
      },
      createUser: function(body, name, isFaucet, node) {
        const faucet = (isFaucet) ? '?faucet' : '';
        return ax.postue(config.getBlocUrl(node), body, '/users/' + encodeURIComponent(name) + faucet);
      },
      compile: function(body, node) {
        return ax.post(config.getBlocUrl(node), body, '/contracts/compile');
      },
      search: function(name, node) {
        return ax.get(config.getBlocUrl(node), '/search/' + name + '/state');
      },
      searchReduced: function(name, reducedProperties, node) {
        var props = '';
        if(reducedProperties && reducedProperties.length >= 1){
          props = '?props=' + reducedProperties[0];
          for (var i =1; i < reducedProperties.length; i++) {
            props = props + '&props=' + reducedProperties[i]
          }
        }
        return ax.get(config.getBlocUrl(node), '/search/' + name + '/state/reduced' + props);
      },
    },

    setDebug: setDebug,
    getTxParams: function() {
      return {
        gasLimit: 100000000,
        gasPrice: 1
      };
    },
  };
};
