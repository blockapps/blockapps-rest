const ax = require('./axios-wrapper');
const util = require('./util');

function setDebug(isDebug) {
  ax.setDebug(isDebug);
};

module.exports = function(config) {
  var node = 0;
  setDebug(config.apiDebug);

  return {
    search: {
      get: function(url) {
        return ax.get(config.getSearchUrl(node), '/' + url);
      },
      post: function(body, url) {
        return ax.post(config.getSearchUrl(node), body, '/' + url);
      },
      query: function(query) {
        return ax.get(config.getSearchUrl(node), '/search/' + query);
      },
    },

    explorer: {
      get: function(url) {
        return ax.get(config.getExplorerUrl(node), '/' + url);
      },
      post: function(body, url) {
        return ax.post(config.getExplorerUrl(node), body, '/' + url);
      },
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
      last: function(number) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/block/last/' + number);
      },
      transaction: function(args) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transaction?'+args);
      },
      transactionLast: function(number) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transaction/last/' + number);
      },
      transactionResult: function(hash) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transactionResult/'+hash);
      },
      faucet: function(body) {
        return ax.postue(config.getStratoUrl(node), body, '/eth/v1.2/faucet');
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
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/contract');
      },
      uploadList: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/uploadList');
      },
      import: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/import');
      },
      home: function() {
        return ax.get(config.getBlocUrl(node), '/');
      },
      method: function(body, name, address, contractName, contractAddress) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + name + '/' + address + '/contract/' + contractName + '/' + contractAddress + '/call');
      },
      methodList: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/callList');
      },
      send: function(body, from, address) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/send');
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
      createUser: function(body, name, isFaucet) {
        const faucet = (isFaucet) ? '?faucet' : '';
        return ax.postue(config.getBlocUrl(node), body, '/users/' + name + faucet);
      },
      compile: function(body) {
        return ax.post(config.getBlocUrl(node), body, '/contracts/compile');
      },
      search: function(name) {
        return ax.get(config.getBlocUrl(node), '/search/' + name + '/state');
      },
      searchReduced: function(name, reducedProperties) {
        var props = '';
        if(reducedProperties && reducedProperties.length >= 1){
          props = '?props=' + reducedProperties[0];
          for (var i =1; i < reducedProperties.length; i++) {
            props = props + '&props=' + reducedProperties[i]
          }
        }
        return ax.get(config.getBlocUrl(node), '/search/' + name + '/state/reduced' + props);
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
    getTxParams: function() {
      return {
        gasLimit: 100000000,
        gasPrice: 1
      };
    },
  };
};
