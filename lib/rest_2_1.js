const common = require('./common');
const api = common.api;
const util = common.util;
const fsutil = common.fsutil;
const eparser = common.eparser;
const importer = require('./importer');
const BigNumber = common.BigNumber;
const Promise = common.Promise;
const constants = common.constants;

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
      const message = err.status + ', ' + err.request.path + ', ' + JSON.stringify(err.data, null, 2).substring(0, 350);
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
function getState(name, node) {
  return function(scope) {
    const address = scope.contracts[name].address;
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

function getStateAddress(name, address, node) {
  return function(scope) {
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

/**
 * This function creates a user with given name and password and puts it on the scope.
 * @method{createUser}
 * @param {String} name the desired username
 * @param {String} password the user's password
 * @param {Number} node target node
 * @returns {()} scope[name] = {address: String, password: String}
 */
function createUser(name, password, node) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      verbose('createUser', {name, password, node});
      api.setNode(node);
      const isFaucet = true;
      return api.bloc.createUser({
          password: password,
        }, name, isFaucet)
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

/**
 * This function return's the string of the contract belonging to a given user.
 * @method{getContractString}
 * @param{String} name the username
 * @param{String} filename the filename of the contract
 * @returns{()} scope.contracts[name] = {contract : String}
*/
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

/**
 * This function calls a method from a users contract with given args.
 * @method{callMethod}
 * @param{String} userName the contract owner's username
 * @param{String} contractName the target contract
 * @param{String} methodName the target method
 * @param{Object} args the arguments to be supplied to the targer method
 * @param{Number} value
 * @param{Number} node target node
 * @returns{()} scope.contracts[contractName].calls[methodName] = result-of-method-call
 */

function callMethod(userName, contractName, methodName, args, value, node) {
  return function(scope) {
    const contractAddress = scope.contracts[contractName].address;
    return callMethodAddress(userName, contractName, contractAddress, methodName, args, value, node)(scope);
  }
}

function callMethodAddress(userName, contractName, contractAddress, methodName, args, value, node) {
  return function(scope) {
    const password = scope.users[userName].password;
    const userAddress = scope.users[userName].address;
    args = args || {};
    if (value === undefined) value = 0;
    return new Promise(function(resolve, reject) {
      verbose('callMethodAddress', {userName, contractName, methodName, args, value, node});
      api.setNode(node);
      return api.bloc.method({
          password: password,
          method: methodName,
          args: args,
          value: value,
        }, userName, userAddress, contractName, contractAddress)
        .then(function(result) {
          const RETURNS = 'returns';
          if (result[RETURNS] === undefined) throw new Error('callMethodAddress: returns field missing: ' + JSON.stringify(result, null, 2));
          if (scope.contracts[contractName] === undefined) scope.contracts[contractName] = {};
          if (scope.contracts[contractName].calls === undefined) scope.contracts[contractName].calls = {};
          scope.contracts[contractName].calls[methodName] = result[RETURNS];
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

/**
 * This function uploads a user's contract with args and transaction parameters.
 * @method{uploadContract}
 * @param{String} userName the owner's username
 * @param{String} password the owner's password
 * @param{String} contractName name of the contract
 * @param{Object} args initialization args
 * @param{Object} txParams {gasLimit: Number, gasPrice: Number}
 * @param{Number} node target nodeId
 * @returns{()} scope.contracts[contractName].address = new-contract's-address
*/
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

/**
 * This search for a given query
 * @method{query}
 * @param{String} query term to query
 * @param{Number} node target nodeId
 * @returns{()} scope.query = scope.query.push(result)
*/
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
/**
 * This function sends ether from one user to another.
 * @method{send}
 * @param{String} fromUser sender
 * @param{String} toUser recepient
 * @param{Number} valueEther amount to send
 * @param{Number} node target node
 * @returns{()} scope.tx = scope.tx.push({params: {fromUser: String, toUser: String, valueEther: Number, node: Number}, result: result-of-transaction})
*/
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
          const actualValueWei = new BigNumber(result.value);
          const expectedValueWei = new BigNumber(valueEther).times(constants.ETHER);
          if (! actualValueWei.equals(expectedValueWei)) {
            console.log('tx result', result);
            throw new Error('Insufficient Balance');
          }
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

function sendAddress(fromUser, password, fromAddress, toAddress, valueEther, node) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      verbose('send', {fromUser, password, fromAddress, toAddress, valueEther, node});
      api.setNode(node);
      return api.bloc.send({
          password: password,
          toAddress: toAddress,
          value: valueEther,
        }, fromUser, fromAddress)
        .then(function(result) {
          const actualValueWei = new BigNumber(result.value);
          const expectedValueWei = new BigNumber(valueEther).times(constants.ETHER);
          if (! actualValueWei.equals(expectedValueWei)) {
            console.log('tx result', result);
            throw new Error('Insufficient Balance');
          }
          var tx = {
            params: {fromUser, password, fromAddress, toAddress, valueEther, node},
            result: result,
          };
          scope.tx.push(tx);
          resolve(scope);
        }).catch(errorify(reject));
    });
  }
}

/**
 * This function compiles a list of contracts
 * @method{compileList}
 * @param{[Object]} compileList list of objects of type {searchable: [String], item: String} where item is the contract name
 * @param{Number} node target node
 * @returns{()} scope.compile = scope.compile.push(result-of-compilation)
 */

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

/**
 * This function gets the last account associated to the address
 * @method{getAccount}
 * @param{String} address
 * @param{Number} node target node
 * @returns{()} scope.accounts[address] = account where account has type http://developers.blockapps.net/strato-api/1.2/docs#get-account
 */
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

function waitQuery(queryString, count, timeoutMilli, node) {
  if (queryString === undefined) throw new Error('waitQuery: queryString undefined');
  if (count <= 0 ) throw new Error('waitQuery: illegal count');
  if (timeoutMilli === undefined) timeoutMilli = 60*1000;
  return function(scope) {
    verbose(`waitQuery`, `${queryString} : ${count}`);

    var currentCount = 0;
    var timeoutCount = 0;

    // return true to keep the while loop going
    function condition() {
      verbose(`waitQuery`, `condition: current ${currentCount} expected ${count} done: ${!(currentCount < count)}`);
      return currentCount < count;
    }

    function action() {
      verbose('waitQuery: action');

      return new Promise(function(resolve, reject) {
        query(queryString, node)(scope)
          .then(function(scope) {
            const results = scope.query.slice(-1)[0];
            verbose(`waitQuery: action`, `results.length ${results.length}`);
            currentCount = results.length;
            // query result is already larger then expected count
            if (currentCount > count) {
              throw new Error(`query results exceed expected count ${currentCount} ${count}`);
            }
            // condition satisfied - done
            if (!condition()) {
              resolve();
              return;
            }
            // check timeout
            verbose(`waitQuery: action`, `timeoutCount ${timeoutCount} timeoutMilli ${timeoutMilli} `);
            if (++timeoutCount * 1000 > timeoutMilli) {
              reject(new Error(`waitQuery: Timeout exceeded: record count expected ${count} actual ${currentCount}`));
              return;
            }
            // delay 1 second before checking again
            setTimeout(function() {
              resolve();
            }, 1000);
          }).catch(function(err) {
            reject(err);
          });
      });
    }

    const pWhile = new util.promiseWhile(Promise);
    return pWhile(condition, action, scope);
  }
}

function compileSearch(searchableArray, contractName, contractFilename) {
  return function(scope) {

    const compileList = [{
      searchable: searchableArray,
      contractName: contractName,
    }];

    return setScope(scope)
      .then(getContractString(contractName, contractFilename))
      .then(compile(compileList))
      .then(function(scope) {
        // make sure all searchable items have been compiled
        const result = scope.compile.slice(-1)[0];
        const compiled = result.map(function(compiledContract) {
          return compiledContract.contractName;
        });
        const notFound = searchableArray.filter(function(searchable) {
          return compiled.indexOf(searchable) == -1;
        });
        // if found any items in the searchable list, that are not included in the compile list results
        if (notFound.length > 0) throw new Error('some searchables were not compiled ' + JSON.stringify(notFound, null, 2));
        // all cool
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
  // bf
  callMethod: callMethod,
  callMethodAddress: callMethodAddress,
  compile: compile,
  compileSearch: compileSearch,
  createUser: createUser,
  getAccount: getAccount,
  getContractString: getContractString,
  getState: getState,
  getStateAddress: getStateAddress,
  uploadContract: uploadContract,
  query: query,
  send: send,
  sendAddress: sendAddress,
  waitQuery: waitQuery,
}
