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

// ========= enums ==========
function getEnum(path, name) {
  return eparser.getEnumsSync(path, true)[name];
}

function getEnums(path) {
  return eparser.getEnumsSync(path, true);
}

// ========= bf ==========
function* getState(contract, node) {
  verbose('getState', {contract, node});
  api.setNode(node);
  const state = yield api.bloc.state(contract.name, contract.address)
  return state;
}

/**
 * This function creates a user with given name and password on a given node
 * @method{createUser}
 * @param {String} name the desired username
 * @param {String} password the user's password
 * @param {Number} node target node
 * @returns User
 */
function* createUser(name, password, node) {
  verbose('createUser', {name, password, node});
  api.setNode(node);
  const isFaucet = true; // always on
  const address = yield api.bloc.createUser({
      password: password,
    }, name, isFaucet)
    .catch(function(e) { // promise rejection must be handled here
      throw new Error(`${e.status} ${e.statusText}: ${e.data}`);
    });
  // validate address
  if (!util.isAddress(address))
    throw new Error('create user should produce a valid address ' + JSON.stringify(address));
  const user = {name: name, password: password, address: address};
  return user;
}


/**
 * This function return's the string of the contract belonging to a given user.
 * @method{getContractString}
 * @param{String} name the username
 * @param{String} filename the filename of the contract
 * @returns{()} scope.contracts[name] = {contract : String}
*/
function* getContractString(name, filename) {
  verbose('getContractString', {name, filename});
  const string = yield importer.getBlob(filename);
  return string;
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

function* callMethod(user, contract, methodName, args, value, node) {
  verbose('callMethodAddress', {user, contract, methodName, args, value, node});
  args = args || {};
  if (value === undefined) value = 0;

  api.setNode(node);
  const result = yield api.bloc.method({
      password: user.password,
      method: methodName,
      args: args,
      value: value,
    }, user.name, user.address, contract.name, contract.address)
    .catch(function(e) { // promise rejection must be handled here
      throw new Error(`${e.status} ${e.statusText}: ${e.data}`);
    });
  const RETURNS = 'returns';
  if (result[RETURNS] === undefined) throw new Error('callMethodAddress: returns field missing: ' + JSON.stringify(result, null, 2));
  return result[RETURNS];
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
function* uploadContractString(user, contractName, contractSrc, args, txParams, node) {
  args = args || {};
  txParams = txParams || {};
  verbose('uploadContractString', {user, contractName, args, txParams, node});
  api.setNode(node);
  const address = yield api.bloc.contract({
      password: user.password,
      src: contractSrc,
      args: args,
      contract: contractName,
      txParams: txParams,
    }, user.name, user.address)
    .catch(function(e) { // promise rejection must be handled here
      throw new Error(`${e.status} ${e.statusText}: ${e.data}`);
    });
  // validate address
  if (!util.isAddress(address))
    new Error('upload contract should produce a valid address ' + JSON.stringify(address));
  const contract = {name: contractName, src: contractSrc, address: address};
  return contract;
}

function* uploadContract(user, contractName, contractFilename, args, txParams, node) {
  verbose('uploadContract', {user, contractName, contractFilename, args, txParams, node});
  // get the source
  const contractSrc = yield getContractString(contractName, contractFilename);
  // upload
  return yield uploadContractString(user, contractName, contractSrc, args, txParams, node);
}

/**
 * This search for a given query
 * @method{query}
 * @param{String} query term to query
 * @param{Number} node target nodeId
 * @returns{()} scope.query = scope.query.push(result)
*/
function query(query, node) {
      verbose('query', {query});
      api.setNode(node);
      const results = api.search.query(query);
      return results;
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
function* send(fromUser, toUser, valueEther, node) {
  verbose('send', {fromUser, toUser, valueEther, node});
  api.setNode(node);
  const result = yield api.bloc.send({
      password: fromUser.password,
      toAddress: toUser.address,
      value: valueEther,
    }, fromUser.name, fromUser.address);
  const actualValueWei = new BigNumber(result.value);
  const expectedValueWei = new BigNumber(valueEther).times(constants.ETHER);

  if (! actualValueWei.equals(expectedValueWei)) {
    console.log('tx result', result);
    throw new Error('Insufficient Balance');
  }
  return result;
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
 function* getAccount(address, node) {
   verbose('getAccount', {address, node});
   api.setNode(node);
   const account = yield api.strato.account(address);
   return account;
 }

 function* getBalance(address, accountIndex, node) {
   accountIndex = accountIndex || 0;
   verbose('getBalance', {address, accountIndex, node});
   api.setNode(node);
   const accounts = yield api.strato.account(address);
   const balance = new BigNumber(accounts[accountIndex].balance);
   return balance;
 }

function promiseTimeout(timeout) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve();
    }, timeout);
  });
}

function* waitQuery(queryString, count, timeoutMilli, node) {
  if (queryString === undefined) throw new Error('waitQuery: queryString undefined');
  if (count <= 0 ) throw new Error('waitQuery: illegal count');
  if (timeoutMilli === undefined) timeoutMilli = 60*1000;

  const sleep = 1*1000; // 1 sec
  const retries = timeoutMilli / sleep;
  for (var i = 0; i < retries ; i++) {
    // query
    var results = yield query(queryString, node);
    // abort if exceeded the count - unexpected records exist
    if (results.length > count) {
      throw new Error(`waitQuery: query results count ${results.lenght} exceed expected count ${count}`);
    }
    // count reached - done
    if (results.length == count) {
      return results;
    }
    // count not reached - sleep
    verbose('waitQuery', `query results count ${results.lenght}, expected count ${count}`);
    yield promiseTimeout(sleep);
  }
  // retries exceeded - timeout
  throw new Error(`waitQuery: timeout ${timeoutMilli}ms exceeded`);
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
  getEnum: getEnum,
  getEnums: getEnums,
  // bf
  callMethod: callMethod,
  compile: compile,
  compileSearch: compileSearch,
  createUser: createUser,
  getAccount: getAccount,
  getBalance: getBalance,
  getContractString: getContractString,
  getState: getState,
  uploadContract: uploadContract,
  uploadContractString: uploadContractString,
  query: query,
  send: send,
  sendAddress: sendAddress,
  waitQuery: waitQuery,
}
