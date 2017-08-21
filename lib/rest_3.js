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
  const state = yield api.bloc.state(contract.name, contract.address, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return state;
}

class HttpError extends Error {
  constructor(e) {
    super(`${e.status} ${e.statusText}: ${JSON.stringify(e.data)}: ${e.config.url}`);
    this.name = 'HttpError';
    this.status = e.status;
    this.statusText = e.statusText;
    this.data = e.data;
    this.url = e.config.url;
  }
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
  const isFaucet = true; // always on
  const address = yield api.bloc.createUser({
      password: password,
    }, name, isFaucet, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // validate address
  if (!util.isAddress(address))
    throw new Error('create user should produce a valid address ' + JSON.stringify(address));
  const user = {name: name, password: password, address: address};
  return user;
}

function* getUsers(node) {
  verbose('getUsers', {node});
  const result = yield api.bloc.users(node);
  return result;
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

function* call(user, contract, methodName, args, value, node) {
  verbose('call', {user, contract, methodName, args, value, node});

  args = args || {};
  if (value === undefined) value = 0;
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value;

  const result = yield api.bloc.call({
      password: user.password,
      method: methodName,
      args: args,
      value: valueFixed,
    }, user.name, user.address, contract.name, contract.address, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  const RETURNS = 'returns';
  if (result[RETURNS] === undefined) throw new Error('callMethodAddress: returns field missing: ' + JSON.stringify(result, null, 2));
  return result[RETURNS];
}

function* callMethod(user, contract, methodName, args, value, node) {
  return yield call(user, contract, methodName, args, value, node);
}

/*
{
  "resolve": true,
  "password": "MyPassword",
  "txs": [
    {
      "contractAddress": "00000000000000000000000000000000deadbeef",
      "args": {
        "age": 52,
        "user": "Bob"
      },
      "contractName": "HorroscopeApp",
      "methodName": "getHoroscope",
      "value": "10"
    }
  ]
}
*/
function* callList(user, address, txs, resolve, node) {
  verbose('callList', {user, txs, resolve, node});

  //callList: function(body, from, address) {
  const result = yield api.bloc.callList({
      password: user.password,
      txs: txs,
      resolve: resolve,
    }, user.name, address, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
    // verity results
    verifyListResult(txs, resolve, result);
    return result;
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
  const address = yield api.bloc.contract({
      password: user.password,
      src: contractSrc,
      args: args,
      contract: contractName,
      txParams: txParams,
    }, user.name, user.address, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  // validate address
  if (!util.isAddress(address))
    new Error('upload contract should produce a valid address ' + JSON.stringify(address));
  const contract = {name: contractName, src: contractSrc, address: address};
  contract.src = 'removed'; // not really needed
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
function* query(query, node) {
  verbose('query', {query, node});
  const results = api.search.query(query, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  return results;
}

// send a transaction
/**
 * This function sends wei from one user to another.
 * @method{send}
 * @param{String} fromUser sender
 * @param{String} toUser recepient
 * @param{Number} value amount to send in wei
 * @param{Number} node target node
 * @returns{()} scope.tx = scope.tx.push({params: {fromUser: String, toUser: String, value: Number, node: Number}, result: result-of-transaction})
*/
function* send(fromUser, toUser, value, nonce, node) {
  verbose('send', {fromUser, toUser, value, node});
  const result = yield api.bloc.send({
      password: fromUser.password,
      toAddress: toUser.address,
      value: value,
      txParams: {nonce: nonce},
    }, fromUser.name, fromUser.address, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return result;
}

function* sendList(fromUser, txs, txresolve, node) {
  verbose('sendList', {fromUser, txs, txresolve, node});
  const result = yield api.bloc.sendList({
      password: fromUser.password,
      txs: txs,
      resolve: txresolve,
    }, fromUser.name, fromUser.address, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  // verity results
  verifyListResult(txs, txresolve, result);
  return result;
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
    if (typeof result[0]['senderBalance'] !== 'string') throw new Error('List result: non-resolved values must be hash strings ' + (typeof result[0]));
  }
}


function* transactionResult(hash, node) {
  verbose('transactionResult', {hash, node});
  const result = yield api.strato.transactionResult(hash, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return result;
}

function* transactionResult(hash, node) {
  verbose('transactionResult', {hash, node});
  const result = yield api.strato.transactionResult(hash, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return result;
}

/**
 * This function compiles a list of contracts
 * @method{compileList}
 * @param{[Object]} compileList list of objects of type {searchable: [String], item: String} where item is the contract name
 * @param{Number} node target node
 * @returns{()} scope.compile = scope.compile.push(result-of-compilation)
 */

function* compile(compileList, node) {
  verbose('compile', {compileList, node});
  const result = yield api.bloc.compile(compileList, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return result;
}

function* isCompiled(contractName) {
  try {
    const queryResult = yield query(`${contractName}`);
    return true;
  } catch(err) {
    if (err.status == 404) {
      console.log(typeof err.status, err.status);
      return false;
    }
    throw err;
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
   const accounts = yield api.strato.account(address, node)
     .catch(function(e) {
       throw (e instanceof Error) ? e : new HttpError(e);
     });
   if (accounts.length <= 0) throw new Error('No account found at ' + address);
   return accounts;
 }

 function* getBalance(address, accountIndex, node) {
   accountIndex = accountIndex || 0;
   verbose('getBalance', {address, accountIndex, node});
   const accounts = yield api.strato.account(address, node);
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
      throw new Error(`waitQuery: query results count ${results.length} exceed expected count ${count}`);
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

function* waitTransactionResult(hash, timeoutMilli, node) {
  if (hash === undefined) throw new Error('waitTransactionResult: hash undefined');
  if (timeoutMilli === undefined) timeoutMilli = 60*1000;

  const sleep = 1*1000; // 1 sec
  const retries = timeoutMilli / sleep;
  for (var i = 0; i < retries ; i++) {
    // transactionResult
    var results = yield transactionResult(hash, node);
    // got one - done
    if (results.length > 0) {
      return results;
    }
    // not yet - sleep
    verbose('waitTransactionResult: waiting');
    yield promiseTimeout(sleep);
  }
  // retries exceeded - timeout
  throw new Error(`waitTransactionResult: timeout ${timeoutMilli}ms exceeded`);
}

function* compileSearch(searchableArray, contractName, contractFilename, node) {
  // get the contract string
  const source = yield getContractString(contractName, contractFilename);
  const compileList = [{
    searchable: searchableArray,
    contractName: contractName,
    source: source,
  }];
  // compile
  const compileResults = yield compile(compileList, node);
  // test if all compiled
  const compiledContractNames = compileResults.map(function(compiledContract) {
    return compiledContract.contractName;
  });
  const notFound = searchableArray.filter(function(searchable) {
    return compiledContractNames.indexOf(searchable) == -1;
  });
  // throw - if found any items in the searchable list, that are not included in the compile list results
  if (notFound.length > 0)
    throw new Error('some searchables were not compiled ' + JSON.stringify(notFound, null, 2));
  // all cool
  return compileResults;
}


function* getAbi(contract, node) {
  verbose('getAbi', {contract, node});
  const abi = yield api.bloc.abi(contract.name, contract.address, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return abi;
}

function* getAbiEnums(contract, node) {
  verbose('getAbiEnums', {contract, node});
  const abi = yield getAbi(contract, node);
  var enums = {};
  for (let t in abi.xabi.types) {
    const m = abi.xabi.types[t];
    if (m.type == 'Enum') {
      enums[t] = parseEnum(m.names);
    }
  }
  return enums;

  function parseEnum(names) {
    //  create cross-ref { 1:'key', key:1 }
    var crossRef = {};
    names.map((name, index) => {
      crossRef[index] = name;
      crossRef[name] = index;
    });
    return crossRef;
  }
}

module.exports = {
  // util
  verbose: verbose,
  getEnum: getEnum,
  getEnums: getEnums,
  // bf
  callMethod: callMethod,
  callList: callList,
  compile: compile,
  compileSearch: compileSearch,
  createUser: createUser,
  getAccount: getAccount,
  getAbi: getAbi,
  getAbiEnums: getAbiEnums,
  getBalance: getBalance,
  getContractString: getContractString,
  getState: getState,
  getUsers: getUsers,
  isCompiled: isCompiled,
  uploadContract: uploadContract,
  uploadContractString: uploadContractString,
  query: query,
  send: send,
  sendList: sendList,
  transactionResult: transactionResult,
  waitQuery: waitQuery,
  waitTransactionResult: waitTransactionResult,
}
