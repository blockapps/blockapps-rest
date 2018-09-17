const ax = require('./axios-wrapper');
const util = require('./util');

function setDebug(isDebug) {
  ax.setDebug(isDebug);
};

function chainResolveQuery(chainId, resolve) {
  return util.buildQueryParams(
    [ util.toParam(chainId, 'chainid=' + chainId)
    , util.toParam(resolve, 'resolve')
    ]);
}

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
      account: function(address, chainIds, node) {
        var ops = [];
        if (chainIds && chainIds.length){
          for (var i = 0; i < chainIds.length; i++) {
            ops.push(util.toParam(chainIds[i], "chainid=" + chainIds[i]));
          }
        }
        ops.push(util.toParam(address, "address=" + address));
        const query = util.buildQueryParams(ops);
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/account' + query);
      },
      block: function(number, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/block?number=' + number);
      },
      last: function(number, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/block/last/' + number);
      },
      transaction: function(args, chainId, node) {
        const query = util.buildParam(chainId, "chainid=" + chainId);
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transaction?'+args);
      },
      transactionLast: function(number, chainId, node) {
        const query = util.buildParam(chainId, "chainid=" + chainId);
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transaction/last/' + number);
      },
      transactionResult: function(hash, chainId, node) {
        const query = util.buildParam(chainId, "chainid=" + chainId);
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/transactionResult/'+hash);
      },
      faucet: function(body, node) {
        return ax.postue(config.getStratoUrl(node), body, '/eth/v1.2/faucet');
      },
      storage: function(attr, value, chainIds, node) {
        var ops = [];
        if (chainIds && chainIds.length){
          for (var i = 0; i < chainIds.length; i++) {
            ops.push(util.toParam(chainIds[i], "chainid=" + chainIds[i]));
          }
        }
        ops.push(util.toParam(attr && value, attr+'='+value));
        const query = util.buildQueryParams(ops);
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/storage' + query);
      },
      search: function(code, node) {
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/account?code=' + code);
      },
      chain: function(chainIds, node) {
        const ops = []; 
        if (chainIds && chainIds.length) {
          chainIds.forEach(function(cid) {
            ops.push(util.toParam(cid, "chainid=" + cid));
          });
	}
        const query = util.buildQueryParams(ops);
        return ax.get(config.getStratoUrl(node), '/eth/v1.2/chain' + query);
      },
      createChain: function(body, node) {
        return ax.post(config.getStratoUrl(node), body, '/eth/v1.2/chain');
      }
    },

    bloc: {
      contract: function(body, from, address, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/contract' + query);
      },
      uploadList: function(body, from, address, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/uploadList' + query);
      },
      import: function(body, from, address, node) {
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/import');
      },
      home: function(node) {
        return ax.get(config.getBlocUrl(node), '/');
      },
      call: function(body, name, address, contractName, contractAddress, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.post(config.getBlocUrl(node), body, '/users/' + encodeURIComponent(name) + '/' + address + '/contract/' + contractName + '/' + contractAddress + '/call' + query);
      },
      method: function(body, name, address, contractName, contractAddress, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.post(config.getBlocUrl(node), body, '/users/' + encodeURIComponent(name) + '/' + address + '/contract/' + contractName + '/' + contractAddress + '/call' + query);
      },
      callList: function(body, from, address, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/callList' + query);
      },
      send: function(body, from, address, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/send' + query);
      },
      sendList: function(body, from, address, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.post(config.getBlocUrl(node), body, '/users/' + from + '/' + address + '/sendList' + query);
      },
      result: function(hash, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.get(config.getBlocUrl(node), '/transactions/' + hash + '/result' + query);
      },
      results: function(hashes, resolve, chainId, node) {
        const query = chainResolveQuery(chainId, resolve);
        return ax.post(config.getBlocUrl(node), hashes, '/transactions/results' + query);
      },
      contracts: function(name, node) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name);
      },
      abi: function(name, address, node) {
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address);
      },
      state: function(name, address, chainId, node) {
        const query = util.buildParam(chainId, "chainid=" + chainId);
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address + '/state' + query);
      },
      stateVar: function(name, address, varName, varCount, varOffset, varLength, chainId, node) {
        const cid = util.toParam(chainId,"chainid=" + chainId);
        const vName = util.toParam(varName, "name=" + varName);
        const vCount = util.toParam(varCount, "count=" + varCount);
        const vOffset = util.toParam(varOffset, "offset=" + varOffset);
        const vLength = util.toParam(varLength, "length");
        const query = util.buildQueryParams([cid,vName,vCount,vOffset,vLength]);
        return ax.get(config.getBlocUrl(node), '/contracts/' + name + '/' + address + '/state' + query);
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
      chain: function(chainIds, node) {
        const ops = []; 
        if (chainIds && chainIds.length) {
          chainIds.forEach(function(cid) {
            ops.push(util.toParam(cid, "chainid=" + cid));
          });
	}
        const query = util.buildQueryParams(ops);
        return ax.get(config.getBlocUrl(node), '/chain' + query);
      },
      createChain: function(body, node) {
        return ax.post(config.getBlocUrl(node), body, '/chain');
      }
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
