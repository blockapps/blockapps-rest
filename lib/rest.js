const common = require('./common');
const api = common.api;
const util = common.util;
const fsutil = common.fsutil;
const eparser = common.eparser;
const importer = require('./importer');

// ========== util =========

// unify error messages
function errorify(reject) {
  return function(err) {
    // got an error object
    if (err.code !== undefined) {
      reject(err);
    }
    // got a BA error json - format an Error
    if (err.status !== undefined) {
      const message = err.status + ', ' + err.request.path + ', ' + err.data.substring(0, 50);
      reject(new Error(message));
    }
    // unknown test - wrap in Error object
    reject(new Error(err));
  };
}

// setup the common containers in the scope for chained blockapps promise calls
function setScope(scope) {
  return new Promise(function(resolve, reject) {
    console.log('setup');
    if (scope.states === undefined) scope.states = [];
    if (scope.users === undefined) scope.users = [];
    if (scope.contracts === undefined) scope.contracts = [];
    resolve(scope);
  });
}

function getEnum(path, name) {
  return eparser.getEnumsSync(path)[name];
}

// ========= bf ==========
function getState(name, address, node) {
  console.log('getState', arguments);
  return function(scope) {
    return new Promise(function(resolve, reject) {
      api.setNode(node);
      return api.bloc.state(name, address)
        .then(function(state) {
          scope.states[name] = state;
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

function createUser(name, password, node) {
  console.log('createUser', arguments);
  return function(scope) {
    return new Promise(function(resolve, reject) {
      api.setNode(node);
      return api.bloc.createUser({
          faucet: '1',
          password: password,
        }, name)
        .then(function(address) {
          if (!util.isAddress(address))
            throw new Error('create user should produce a valid address ' + JSON.stringify(address));
          scope.users[name] = {
            address: address,
            password: password
          };
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

function getContractString(name, filename) {
  console.log('getContractString', arguments);
  return function(scope) {
    return new Promise(function(resolve, reject) {
      return importer.getBlob(filename)
        .then(function(string){
          scope.contracts[name] = {string:string}
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

function callMethod(userName, contractName, methodName, args, value, node) {
  console.log('callMethod', arguments);
  return function(scope) {
    const password = scope.users[userName].password;
    const userAddress = scope.users[userName].address;
    const contractAddress = scope.contracts[contractName].address;
    args = args || {};
    value = value || 0.1;
    return new Promise(function(resolve, reject) {
      api.setNode(node);
      return api.bloc.method({
          password: password,
          method: methodName,
          args: args,
          value: value,
        }, userName, userAddress, contractName, contractAddress)
        .then(function(result) {
          scope.contracts[contractName].calls = scope.contracts[contractName].calls || [];
          scope.contracts[contractName].calls[methodName] = result;
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}


function uploadContract(userName, password, contractName, args, txParams, node) {
  console.log('uploadContract', arguments);
  return function(scope) {
    const src = scope.contracts[contractName].string;
    const userAddress = scope.users[userName].address;
    args = args || {};
    txParams = txParams || {};
    return new Promise(function(resolve, reject) {
      api.setNode(node);
      return api.bloc.contract({
          password: password,
          src: src,
          args: args,
          contract: contractName,
          txParams: txParams,
        }, userName, userAddress)
        .then(function(address) {
          if (!util.isAddress(address))
            throw new Error('upload contract should produce a valid address ' + JSON.stringify(address));
          scope.contracts[contractName].address = address;
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

module.exports = {
  // util
  setScope: setScope,
  getEnum: getEnum,
  // bf
  callMethod: callMethod,
  createUser: createUser,
  getState: getState,
  getContractString: getContractString,
  uploadContract: uploadContract,
}
