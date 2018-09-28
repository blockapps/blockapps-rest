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
      contract: function(body, from, address, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/contract' + res);
      },
      uploadList: function(body, from, address, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/uploadList' + res);
      },
      import: function(body, from, address, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/import');
      },
      home: function(node) {
        return ax.get(config.getBlocUrl(node), '/');
      },
      call: function(body, name, address, contractName, contractAddress, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.post(config.getBlocUrl(node), body, '/users/' + encodeURIComponent(name) + '/' + address + '/contract/' + contractName + '/' + contractAddress + '/call' + res);
      },
      method: function(body, name, address, contractName, contractAddress, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.post(config.getBlocUrl(node), body, '/users/' + encodeURIComponent(name) + '/' + address + '/contract/' + contractName + '/' + contractAddress + '/call' + res);
      },
      callList: function(body, from, address, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/callList' + res);
      },
      send: function(body, from, address, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/send' + res);
      },
      sendList: function(body, from, address, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/sendList' + res);
      },
      result: function(hash, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.get(config.getBlocUrl(node), '/transactions/' + hash + '/result' + res);
      },
      results: function(hashes, resolve, node) {
        const res = (resolve) ? '?resolve' : '';
        return ax.post(config.getBlocUrl(node), hashes, '/transactions/results' + res);
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
      stateVar: function(name, address, varName, varCount, varOffset, varLength, node) {
        vName = varName ? `?name=${varName}` : null;
        vCount = varCount ? `&count=${varCount}` : '';
        vOffset = varOffset ? `&offset=${varOffset}` : '';
	vLength = varLength ? '&length' : '';
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address + '/state' + (vName ? vName + vCount + vOffset + vLength : ''));
      },
      stateLookup: function(name, address, mapping, key, node) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address + '/state/' + mapping + '/' + key);
      },
      users: function(node) {
        return ax.get(config.getBlocUrl(node), '/users');
      },
      createUser: function(body, name, node) {
        return ax.postue(config.getBlocUrl(node), body, '/users/' + encodeURIComponent(name));
      },
      fill: function(body, name, address, resolve, node) {
        const isResolve = (resolve) ? true : false;
        return ax.postue(config.getBlocUrl(node), body, `/users/${encodeURIComponent(name)}/${address}/fill?resolve=${isResolve}` );
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
      keystore: function(body, name, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + name + '/' + '/keystore');
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
