const common = require('./common');
const api = common.api;
const util = common.util;
const fsutil = common.fsutil;
const eparser = common.eparser;
const importer = require('./importer');
const BigNumber = common.BigNumber;
const Promise = common.Promise;

// ========== util =========

function verbose(prompt, args) {
  if (common.config.apiDebug) {
    args = args || '';
    const string = (typeof args === 'string') ? args : JSON.stringify(args, null, 2);
    console.log('### '+prompt+':', string);
  }
}

// unify error messages
function errorify(reject) {
  return function(err) {
    // console.log('errorify', err);
    // got an error object
    if (err.code !== undefined) {
      reject(err);
    }
    // got a BA error json - format an Error
    if (err.status !== undefined) {
      const message = err.status + ', ' + err.request.path + ', ' + JSON.stringify(err.data, null, 2).substring(0, 50);
      reject(new Error(message));
    }
    // unknown test - wrap in Error object
    reject(new Error(err));
  };
}

// setup the common containers in the scope for chained blockapps promise calls
function setScope(scope) {
  if (scope === undefined) {
    scope = {};
  }
  return new Promise(function(resolve, reject) {
    verbose('setup');
    if (scope.states === undefined) scope.states = [];
    if (scope.users === undefined) scope.users = [];
    if (scope.contracts === undefined) scope.contracts = [];
    if (scope.accounts === undefined) scope.accounts = [];
    if (scope.balances === undefined) scope.balances = [];
    if (scope.tx === undefined) scope.tx = [];
    if (scope.compile === undefined) scope.compile = [];
    if (scope.query === undefined) scope.query = [];
    resolve(scope);
  });
}

// ========= enums ==========
function getEnum(path, name) {
  return eparser.getEnumsSync(path, true)[name];
}

function getEnums(path) {
  return eparser.getEnumsSync(path, true);
}


// ========= bf ==========
function getState(name, address, node) {
  return function(scope) {
    address = address || scope.contracts[name].address;
    return new Promise(function(resolve, reject) {
      verbose('getState', {name, address, node});
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
  return function(scope) {
    return new Promise(function(resolve, reject) {
      verbose('createUser', {name, password, node});
      api.setNode(node);
      return api.bloc.createUser({
          faucet: '1',
          password: password,
        }, name)
        .then(function(address) {
          if (!util.isAddress(address))
            reject(new Error('create user should produce a valid address ' + JSON.stringify(address)));
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
  return function(scope) {
    return new Promise(function(resolve, reject) {
      verbose('getContractString', {name, filename});
      return importer.getBlob(filename)
        .then(function(string){
          scope.contracts[name] = {string:string}
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

function callMethod(userName, contractName, methodName, args, value, node) {
  return function(scope) {
    const password = scope.users[userName].password;
    const userAddress = scope.users[userName].address;
    const contractAddress = scope.contracts[contractName].address;
    args = args || {};
    value = value || 0.1;
    return new Promise(function(resolve, reject) {
      verbose('callMethod', {userName, contractName, methodName, args, value, node});
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
  return function(scope) {
    const src = scope.contracts[contractName].string;
    const userAddress = scope.users[userName].address;
    args = args || {};
    txParams = txParams || {};
    return new Promise(function(resolve, reject) {
      verbose('uploadContract', {userName, password, contractName, args, txParams, node});
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
            reject(new Error('upload contract should produce a valid address ' + JSON.stringify(address)));
          scope.contracts[contractName].address = address;
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}
// search query
function query(query, node) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      verbose('query', {query});
      api.setNode(node);
      return api.search.query(query)
        .then(function(result) {
          scope.query.push(result);
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}


// send a transaction
function send(fromUser, toUser, valueEther, node) {
  return function(scope) {
    const password = scope.users[fromUser].password;
    const toAddress = scope.users[toUser].address;
    const fromAddress = scope.users[fromUser].address;
    return new Promise(function(resolve, reject) {
      verbose('send', {fromUser, toUser, valueEther, node});
      api.setNode(node);
      return api.bloc.send({
          password: password,
          toAddress: toAddress,
          value: valueEther,
        }, fromUser, fromAddress)
        .then(function(result) {
          var tx = {
            params: {fromUser, toUser, valueEther, node},
            result: result,
          };
          scope.tx.push(tx);
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

// send a transaction list
function sendList(fromUser, txs, txresolve, node) {
  return function(scope) {
    const password = scope.users[fromUser].password;
    const fromAddress = scope.users[fromUser].address;
    return new Promise(function(resolve, reject) {
      verbose('sendList', {fromUser, txs, txresolve, node});
      api.setNode(node);
      return api.bloc.sendList({
          password: password,
          txs: txs,
          resolve: txresolve,
        }, fromUser, fromAddress)
        .then(function(result) {
          // store reslut
          var tx = {
            params: {fromUser, txs, txresolve, node},
            result: result,
          };
          scope.tx.push(tx);
          // verity results
          verifyListResult(txs, txresolve, result);
          // succcess
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

// upload a list of contracts
function uploadContractList(fromUser, txs, txresolve, node) {
  return function(scope) {
    const password = scope.users[fromUser].password;
    const fromAddress = scope.users[fromUser].address;
    return new Promise(function(resolve, reject) {
      verbose('uploadList', {fromUser, txs, txresolve, node});
      api.setNode(node);
      return api.bloc.uploadList({
          password: password,
          contracts: txs,
          resolve: txresolve,
        }, fromUser, fromAddress)
        .then(function(result) {
          // store result
          var tx = {
            params: {fromUser, txs, txresolve, node},
            result: result,
          };
          scope.tx.push(tx);
          // verity results
          verifyListResult(txs, txresolve, result);
          // succcess
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

// upload a list of contracts
function callMethodList(fromUser, txs, txresolve, node) {
  return function(scope) {
    const password = scope.users[fromUser].password;
    const fromAddress = scope.users[fromUser].address;
    return new Promise(function(resolve, reject) {
      verbose('callMethodList', {fromUser, txs, txresolve, node});
      api.setNode(node);
      return api.bloc.methodList({
          password: password,
          txs: txs,
          resolve: txresolve,
        }, fromUser, fromAddress)
        .then(function(result) {
          // store result
          var tx = {
            params: {fromUser, txs, txresolve, node},
            result: result,
          };
          scope.tx.push(tx);
          // verity results
          verifyListResult(txs, txresolve, result);
          // succcess
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

function verifyListResult(txs, txresolve, result) {
  // if result is a string - error
  if (typeof result === 'string')
    throw new Error (`List result error: ${result}`);
  // if sent / received mismatch
  if (txs.length != result.length)
    throw new Error (`List result: size mismatch. Expected ${txs.length} actual ${result.length} `);
  // check resolved
  if (txresolve) {
    // resolved - result must be a list of objects
    if (typeof result[0] === 'string') throw new Error('List result: resolved values must be objects');
  } else {
    // not resolved - result must be a list of hashes (strings)
    if (typeof result[0] !== 'string') throw new Error('List result: non-resolved values must be hash strings');
  }
}

function compile( compileList, node) {
  verbose('compile', {compileList});
  return function(scope) {
    // set the source for the contracts by name
    compileList.forEach(function(item) {
      item.source = scope.contracts[item.contractName].string;
    });
    return new Promise(function(resolve, reject) {
      verbose('compile', {compileList});
      api.setNode(node);
      return api.bloc.compile(compileList)
        .then(function(result) {
          scope.compile.push(result);
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

function getLastBlock(number, node) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      verbose('getLastBlock', {number, node});
      api.setNode(node);
      return api.strato.last(number == undefined ? 0 : number)
        .then(function(block) {
          if(scope.blocks == undefined) scope.blocks = [];
          scope.blocks.push(block);
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

function getAccount(address, node) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      verbose('getAccount', {address, node});
      api.setNode(node);
      return api.strato.account(address)
        .then(function(account) {
          scope.accounts[address] = account;
          // user.balance = new BigNumber(accounts[0].balance);
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

function getBalance(address, node) {
  return function(scope) {
    verbose('getBalance', {address, node});
    return getAccount(address, node)(scope)
    .then(function(scope) {
      const balance = new BigNumber(scope.accounts[address][0].balance);
      verbose('getBalance: balance', {address, balance});
      if (scope.balances[address] === undefined) scope.balances[address] = [];
      scope.balances[address].push(balance);
      return scope;
    });
  }
}

function getLastBlockNumber(node) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      verbose('getLastBlockNumber');
      api.setNode(node);
      return api.strato.last(0)
        .then(function(result) {
          const block = result[0];
          verbose(`getLastBlockNumber: last # ${block.blockData.number}`);
          scope.lastBlockNumber = block.blockData.number;
          resolve(scope);
      }).catch(errorify(reject));
    });
  };
}

function waitNextBlock(node) {
  return function(scope) {
    verbose('waitNextBlock');
    var currentBlockNumber, previousBlockNumber;

    // return true to keep the while loop going
    function condition() {
      const message = (previousBlockNumber == currentBlockNumber) ? 'not yet' : 'next block found';
      verbose(`waitNextBlock: condition ${previousBlockNumber} ${currentBlockNumber} ${message}`);
      if (currentBlockNumber === undefined) return true;
      if (previousBlockNumber === undefined) return true;
      // keep going while current is same as previous
      return previousBlockNumber == currentBlockNumber ;
    }

    function action() {
      verbose('waitNextBlock: action');

      return new Promise(function(resolve, reject) {
        getLastBlockNumber(node)(scope)
          .then(function(scope) {
            verbose(`waitNextBlock: last block # ${scope.lastBlockNumber}`);
            previousBlockNumber = currentBlockNumber;
            currentBlockNumber = scope.lastBlockNumber;
            // condition satisfied - done
            if (!condition()) {
              resolve();
            } else {
              // delay 1 second before checking again
              verbose('waitNextBlock: start timeout');
              setTimeout(function() {
                verbose('waitNextBlock: end timeout');
                resolve();
              }, 1000);
            }
          });
      });
    }

    const pWhile = new util.promiseWhile(Promise);

    return pWhile(condition, action)
      .then(function() {
        return scope;
      });
  }
}



module.exports = {
  // util
  verbose: verbose,
  setScope: setScope,
  getEnum: getEnum,
  getEnums: getEnums,
  waitNextBlock: waitNextBlock,
  // bf
  callMethod: callMethod,
  callMethodList: callMethodList,
  compile: compile,
  createUser: createUser,
  getAccount: getAccount,
  getBalance: getBalance,
  getLastBlock: getLastBlock,
  getLastBlockNumber: getLastBlockNumber,
  getState: getState,
  getContractString: getContractString,
  query: query,
  send: send,
  sendList: sendList,
  uploadContract: uploadContract,
  uploadContractList: uploadContractList,
}
