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

function getFields(path, prefix) {
  return eparser.getFieldsSync(path, prefix);
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

function* getStateVar(contract, varName, varCount, varOffset, varLength, node) {
  verbose('getState', {contract, varName, varCount, varOffset, varLength, node});
  const state = yield api.bloc.stateVar(contract.name, contract.address, varName, varCount, varOffset, varLength, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return state;
}

class RestError extends Error {
  constructor(status, statusText, data) {
    super(`${status} ${statusText}: ${JSON.stringify(data)}`);
    this.name = 'RestError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
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

class HttpError202 extends Error {
  constructor(url) {
    super(`202 Accepted: ${url}`);
    this.name = 'HttpError202';
    this.status = 202;
    this.statusText = 'Accepted';
    this.url = url;
  }
}

class HttpError400 extends Error {
  constructor(msg, url) {
    super(`400 Bad Request: ${msg}`);
    this.name = 'HttpError400';
    this.status = 400;
    this.statusText = `Bad Request ${msg}`;
    this.url = url;
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
function* createUser(name, password, isAsync, node) {
  verbose('createUser', {name, password, node});
  const address = yield api.bloc.createUser({
      password: password,
    }, name, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // validate address
  if (!util.isAddress(address))
    throw new Error('create user should produce a valid address ' + JSON.stringify(address));
  const user = {name: name, password: password, address: address};

  // if isAsync - return with no faucet fill call
  if (isAsync) {
    return user;
  }
  // otherwise - block for faucet fill call
  const txResult = yield fill(user, true, node);
  return user;
}

/*
blocResult: {
  "status": "Pending",
  "hash": "b2ee9d8a28ffbc8841a3d7ee33a04e6b5ef666b0e0fcafa610a3ccde1ae58814",
  "txResult": null,
  "data": null
}
*/
function* fill(user, resolve, node) {
  verbose('fill', {user, resolve, node});
  const blocResult = yield api.bloc.fill({ // FIXME - update to latest bloch
  }, user.name, user.address, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return blocResult;
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
 * @param{Boolean} doNotResolve tell bloc to wait for resolution or return immediately
 * @param{Number} node target node
 * @returns{()} doNotResolve=true: [transaction hash] (String), doNotResolve=false: [method call return vals] (String|Int)
 */

function* call(user, contract, methodName, args, value, doNotResolve, node) {
  const resolve = (doNotResolve) ? false : true;
  verbose('call', {user, contract, methodName, args, value, resolve, node});

  args = args || {};
  if (value === undefined) value = 0;
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value;

  var result = yield api.bloc.call({
      password: user.password,
      method: methodName,
      args: args,
      value: valueFixed,
    }, user.name, user.address, contract.name, contract.address, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When resolve=true, expect bloc to only return once transaction has either succeeded or failed.
  // When resolve=false, bloc will return the transaction hash immeidately, and it is the caller's responibility to check it.
  if(resolve) {

    result = yield resolveResult(result);

    if(result.status === constants.FAILURE) {
      throw new HttpError400(result.txResult.message);
    }
    return result.data.contents;
  }
  return result.hash;
}

function* callMethod(user, contract, methodName, args, value, doNotResolve, node) {
  return yield call(user, contract, methodName, args, value, doNotResolve, node);
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
function* callList(user, txs, doNotResolve, node) {
  const resolve = (doNotResolve) ? false : true;
  verbose('callList', {user, txs, resolve, node});

  //callList: function(body, from, address) {
  const results = yield api.bloc.callList({
      password: user.password,
      txs: txs,
      resolve: resolve,
    }, user.name, user.address, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  // verity results
  verifyListResult(txs, resolve, results);

  // When resolve=true, expect bloc to only return once transaction has either succeeded or failed.
  // When resolve=false, bloc will return the transaction hash immeidately, and it is the caller's responibility to check it.
  if(resolve) {
    const resolvedResults = yield resolveResults(results);

    resolvedResults.map(function(result){
      if(result.status === constants.FAILURE) {
        throw new HttpError400(result.txResult.message);
      }
    });
    return resolvedResults.map(function(result){return result.data.contents;});
  }
  else return results.map(function(result){return result.hash;});
}


/**
 * This function uploads a user's contract with args and transaction parameters.
 * @method{uploadContract}
 * @param{String} userName the owner's username
 * @param{String} password the owner's password
 * @param{String} contractName name of the contract
 * @param{Object} args initialization args
 * @param{Boolean} doNotResolve tell bloc to wait for resolution or return immediately
 * @param{Object} txParams {gasLimit: Number, gasPrice: Number}
 * @param{Number} node target nodeId
 * @returns{()} doNotResolve=true: [transaction hash] (String), doNotResolve=false: [uploaded contract details]
*/
function* uploadContractString(user, contractName, contractSrc, args, doNotResolve, txParams, node) {
  const resolve = (doNotResolve) ? false : true;
  args = args || {};
  txParams = txParams || {};
  verbose('uploadContractString', {user, contractName, args, txParams, resolve, node});

  var result = yield api.bloc.contract({
      password: user.password,
      src: contractSrc,
      args: args,
      contract: contractName,
      txParams: txParams,
    }, user.name, user.address, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When resolve=true, expect bloc to only return once transaction has either succeeded or failed.
  // When resolve=false, bloc will return the transaction hash immeidately, and it is the caller's responibility to check it.
  if(resolve) {

    result = yield resolveResult(result);

    if(result.status === constants.FAILURE) {
      throw new HttpError400(result.txResult.message);
    }

    const address = result.data.contents.address;

    // validate address
    if (!util.isAddress(address))
      new Error('upload contract should produce a valid address ' + JSON.stringify(address));
    const contract = {name: contractName, src: contractSrc, address: address, codeHash:result.data.contents.codeHash};
    contract.src = 'removed'; // not really needed
    return contract;
  }

  return result.hash;
}

function* uploadContract(user, contractName, contractFilename, args, doNotResolve, txParams, node) {
  verbose('uploadContract', {user, contractName, contractFilename, args, doNotResolve, txParams, node});
  // get the source
  const contractSrc = yield getContractString(contractName, contractFilename);
  // upload
  return yield uploadContractString(user, contractName, contractSrc, args, doNotResolve, txParams, node);
}

/**
 * This function uploads a list of contracts.
 * Assumes that contracts have already been compiled and uploaded to bloc. Uses contractName to fetch
 * latest contract xabi from bloc to upload to STRATO.
 * @method{uploadContractList}
 * @param {Object} user - The ba-rest user object
 * @param {Object[]} txs - List of contracts formatted as tx objects. { contractName, args }
 * @param {boolean} doNotResolve - Flag that tells ba-rest to wait for response or not. false == wait (default)
 * @param {number} node - Target node index
 */
function *  uploadContractList(user, txs, doNotResolve, node){
  const resolve = doNotResolve ? false : true;
  verbose('uploadContractList', {user, txs, resolve, node})
  const results = yield api.bloc.uploadList({
      password: user.password,
      contracts: txs,
      resolve: resolve
    }, user.name, user.address, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  if(resolve) {
    const resolvedResults = yield resolveResults(results);

    resolvedResults.map(function(result){
        if(result.status === constants.FAILURE) {
            throw new HttpError400(result.txResult.message);
        }
    });
    return resolvedResults.map(function(result){return result.data.contents;});
  }
  return results.map(function(r){return r.hash;});
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
 * @param{Boolean} doNotResolve tell bloc to wait for resolution or return immediately
 * @param{Number} node target node
 * @returns{()} doNotResolve=true: transaction hash (String), doNotResolve=false: {status:String, hash:String, txResult:object, data: object}
*/
function* send(fromUser, toUser, value, doNotResolve, nonce, node) {
  verbose('send', {fromUser, toUser, value, doNotResolve, node});
  const resolve = (doNotResolve) ? false : true;
  var result = yield api.bloc.send({
      password: fromUser.password,
      toAddress: toUser.address,
      value: value,
      txParams: {nonce: nonce},
    }, fromUser.name, fromUser.address, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When resolve=true, expect bloc to only return once transaction has either succeeded or failed.
  // When resolve=false, bloc will return the transaction hash immeidately, and it is the caller's responibility to check it.
  if(resolve) {

    result = yield resolveResult(result);

    if(result.status === constants.FAILURE) {
      throw new HttpError400(result.txResult.message);
    }
    return result.data.contents;
  }
  return result.hash;
}

function* sendList(fromUser, txs, doNotResolve, node) {
  const resolve = (doNotResolve) ? false : true;
  verbose('sendList', {fromUser, txs, resolve, node});
  const results = yield api.bloc.sendList({
      password: fromUser.password,
      txs: txs,
      resolve: resolve,
    }, fromUser.name, fromUser.address, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // verify results
  verifyListResult(txs, resolve, results);

  // When resolve=true, expect bloc to only return once transaction has either succeeded or failed.
  // When resolve=false, bloc will return the transaction hash immeidately, and it is the caller's responibility to check it.
  if(resolve) {
    const resolvedResults = yield resolveResults(results);

    resolvedResults.map(function(result){
        if(result.status === constants.FAILURE) {
            throw new HttpError400(result.txResult.message);
        }
    });
    return resolvedResults.map(function(result){return result.data.contents;});
  }
  return results.map(function(r){return r.hash;});
}

function verifyListResult(txs, txresolve, result) {
  // if sent / received mismatch
  if (txs.length != result.length)
    throw new Error (`List result: size mismatch. Expected ${txs.length} actual ${result.length} `);
}

function* getBlocResult(hash, resolve, node) {
  verbose('getBlocResult', {hash, resolve, node});
  const result = yield api.bloc.result(hash, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return result;
}

function* getBlocResults(hashes, resolve, node) {
  verbose('getBlocResults', {hashes, resolve, node});
  const result = yield api.bloc.results(hashes, resolve, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return result;
}

function* resolveResult(result) {
    return (yield resolveResults([result]))[0];
}

function* resolveResults(results) {
    var count = 0;
    var res = results;
    while (count < 60 && res.filter(r => {return r.status === constants.PENDING}).length !== 0) {
        res = yield getBlocResults(res.map(r => {return r.hash}), false);
	yield promiseTimeout(1000);
	count++;
    }

    if(count >= 60) {
        throw new HttpError400('Transaction did not resolve');
    }

    return res;
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
 * @param{[Object]} compileList list of objects of type {searchable: [String], contractName: String, source: String}
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

function* isSearchable(codeHash) {
  const results = yield query(`contract?codeHash=eq.${codeHash}`);
  return (results.length > 0);
}

function* isCompiled(contractName) {
  const message = 'rest.isCompiled() is deprecated in this version. see https://github.com/blockapps/blockapps-rest/blob/master/ReleaseNotes.md';
  throw new Error(message);
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
   if(accounts.length === 0) {
     // this account has not yet received any ether. Balance is 0
     return new BigNumber(0);
   }
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
    let results;
    try {
      results = yield query(queryString, node);
    }
    catch(e) {
      // 404 is an acceptable response, since the table may not yet exist
      if(!e.status || e.status != 404) {
        throw e;
      }
      results = [];
    }
    // abort if exceeded the count - unexpected records exist
    if (results.length > count) {
      throw new Error(`waitQuery: query results count ${results.length} exceed expected count ${count}`);
    }
    // count reached - done
    if (results.length == count) {
      return results;
    }
    // count not reached - sleep
    verbose('waitQuery', `query results count ${results.length}, expected count ${count}`);
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
  getFields: getFields,
  RestError: RestError,
  HttpError: HttpError,
  // bf
  callMethod: callMethod,
  callList: callList,
  compile: compile,
  compileSearch: compileSearch,
  createUser: createUser,
  fill: fill,
  getAccount: getAccount,
  getAbi: getAbi,
  getAbiEnums: getAbiEnums,
  getBalance: getBalance,
  getContractString: getContractString,
  getState: getState,
  getStateVar: getStateVar,
  getUsers: getUsers,
  isCompiled: isCompiled,
  isSearchable: isSearchable,
  uploadContract: uploadContract,
  uploadContractList: uploadContractList,
  uploadContractString: uploadContractString,
  query: query,
  send: send,
  sendList: sendList,
  getBlocResult: getBlocResult,
  getBlocResults: getBlocResults,
  resolveResults: resolveResults,
  transactionResult: transactionResult,
  waitQuery: waitQuery,
  waitTransactionResult: waitTransactionResult,
}
