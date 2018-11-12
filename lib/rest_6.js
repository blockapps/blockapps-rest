const common = require('./common');
const api = common.api;
const util = common.util;
const eparser = common.eparser;
const importer = require('./importer');
const BigNumber = common.BigNumber;
const Promise = common.Promise;
const constants = common.constants;

let getLogger

function setLogger(_getLogger) {
  getLogger = _getLogger
  api.setLogger(_getLogger)
}

// ========== util =========

function verbose(prompt, args) {

  if( getLogger !== undefined) {
    getLogger().debug(prompt+':', args)
    return
  }

  if (common.config.apiDebug) {
    args = args || '';
    const string = (typeof args === 'string') ? args : JSON.stringify(args, null, 2);
    console.log('### '+prompt+':', string);
  }
}

/**
 * This function constructes metadata that can be used to control the history and index flags
 * @method{constructMetadata}
 * @param{Object} options flags for history and indexing
 * @param{String} contractName
 * @returns{()} metadata
*/
function constructMetadata(options, contractName) {
  const metadata = {};
  if (options === {}) return metadata;

  // history flag (default: off)
  if (options.enableHistory) {
    metadata['history'] = contractName;
  }
  if (options.hasOwnProperty('history')) {
    const newContracts = options['history'].filter(contract => contract !== contractName).join();
    metadata['history'] = `${options['history']},${newContracts}`;
  }

  // index flag (default: on)
  if (options.hasOwnProperty('enableIndex') && !options.enableIndex) {
    metadata['noindex'] = contractName;
  }
  if (options.hasOwnProperty('noindex')) {
    const newContracts = options['noindex'].filter(contract => contract !== contractName).join();
    metadata['noindex'] = `${options['noindex']},${newContracts}`;
  }

  //TODO: construct the "nohistory" and "index" fields for metadata if needed
  // The current implementation only constructs "history" and "noindex"

  return metadata;
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
function* getState(contract, options={}) {
  verbose('getState', {contract, options});
  const state = yield api.bloc.state(contract.name, contract.address, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return state;
}

function* getStateVar(contract, varName, varCount, varOffset, varLength, options={}) {
  verbose('getStateVar', {contract, varName, varCount, varOffset, varLength, options});
  const state = yield api.bloc.stateVar(contract.name, contract.address, varName, varCount, varOffset, varLength, options.chainId, options.node)
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
    const data = JSON.stringify(e.data).replace(/\\n/g, '\n').replace(/\\"/g, '"')
    super(`${e.status} ${e.statusText}: ${data}: ${e.config.url}`);
    this.name = 'HttpError';
    this.status = e.status;
    this.statusText = e.statusText;
    this.data = data;
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
  const txResult = yield fill(user, {doNotResolve: false, node: node});
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
function* fill(user, options={}) {
  verbose('fill', {user, options});
  const blocResult = yield api.bloc.fill({ // FIXME - update to latest bloch
  }, user.name, user.address, !options.doNotResolve, options.node)
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
 * @method{call}
 * @param{String} user the contract owner's username
 * @param{String} contract the target contract
 * @param{String} methodName the target method
 * @param{Object} args the arguments to be supplied to the targer method
 * @param{Object} options the optional arguments {value: Number, doNotResolve: Boolean, chainId: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 * @returns{()} doNotResolve=true: [transaction hash] (String), doNotResolve=false: [method call return vals] (String|Int)
 */

function* call(user, contract, methodName, args, options={}) {
  args = args || {};
  const value = options.value || 0;
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value;
  verbose('call', {user, contract, methodName, args, options});

  var result = yield api.bloc.call({
      password: user.password,
      method: methodName,
      args: args,
      value: valueFixed,
      metadata: constructMetadata(options, contract.name)
    }, user.name, user.address, contract.name, contract.address, !options.doNotResolve, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {

    result = yield resolveResult(result, options);

    if(result.status === constants.FAILURE) {
      throw new HttpError400(result.txResult.message);
    }
    return result.data.contents;
  }
  return result.hash;
}

function* callMethod(user, contract, methodName, args, options) {
  return yield call(user, contract, methodName, args, options);
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
function* callList(user, txs, options={}) {
  verbose('callList', {user, txs, options});

  txs.forEach(function(tx){
    tx['metadata'] = constructMetadata(options, tx.contractName);
  });

  //callList: function(body, from, address) {
  const results = yield api.bloc.callList({
      password: user.password,
      txs: txs,
      resolve: !options.doNotResolve,
    }, user.name, user.address, !options.doNotResolve, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  // verity results
  verifyListResult(txs, results);

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {
    const resolvedResults = yield resolveResults(results, options);

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
 * @method{uploadContractString}
 * @param{Object} user the user
 * @param{String} contractName name of the contract
 * @param{String} contractSrc src of the contract
 * @param{Object} args initialization args
 * @param{Object} options the optional arguments {doNotResolve: Boolean, txParams: Object, chainId: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 * @returns{()} doNotResolve=true: [transaction hash] (String), doNotResolve=false: [uploaded contract details]
*/
function* uploadContractString(user, contractName, contractSrc, args, options={}) {
  args = args || {};
  const txParams = options.txParams || {};
  verbose('uploadContractString', {user, contractName, args, options});

  var result = yield api.bloc.contract({
      password: user.password,
      src: contractSrc,
      args: args,
      contract: contractName,
      txParams: txParams,
      metadata: constructMetadata(options, contractName)
    }, user.name, user.address, !options.doNotResolve, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {

    result = yield resolveResult(result, options);

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

function* uploadContract(user, contractName, contractFilename, args, options) {
  verbose('uploadContract', {user, contractName, contractFilename, args, options});
  // get the source
  const contractSrc = yield getContractString(contractName, contractFilename);
  // upload
  return yield uploadContractString(user, contractName, contractSrc, args, options);
}

/**
 * This function uploads a list of contracts.
 * Assumes that contracts have already been compiled and uploaded to bloc. Uses contractName to fetch
 * latest contract xabi from bloc to upload to STRATO.
 * @method{uploadContractList}
 * @param {Object} user - The ba-rest user object
 * @param {Object[]} txs - List of contracts formatted as tx objects. { contractName, args }
 * @param{Object} options the optional arguments {doNotResolve: Boolean, chainId: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 */
function*  uploadContractList(user, txs, options={}){
  verbose('uploadContractList', {user, txs, options})

  txs.forEach(function(tx){
    tx['metadata'] = constructMetadata(options, tx.contractName);
  });

  const results = yield api.bloc.uploadList({
      password: user.password,
      contracts: txs,
      resolve: !options.doNotResolve
    }, user.name, user.address, !options.doNotResolve, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  if(!options.doNotResolve) {
    const resolvedResults = yield resolveResults(results, options);

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
      // 404 is a valid response
      if(e.status && e.status == 404) {
        return [];
      }
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
 * @param{Object} options the optional arguments {doNotResolve: Boolean, chainId: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 * @returns{()} doNotResolve=true: transaction hash (String), doNotResolve=false: {status:String, hash:String, txResult:object, data: object}
*/
function* send(fromUser, toUser, value, options={}) {
  verbose('send', {fromUser, toUser, value, options});

  var result = yield api.bloc.send({
      password: fromUser.password,
      toAddress: toUser.address,
      value: value,
      txParams: {nonce: options.nonce},
    }, fromUser.name, fromUser.address, !options.doNotResolve, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {

    result = yield resolveResult(result, options);

    if(result.status === constants.FAILURE) {
      throw new HttpError400(result.txResult.message);
    }
    return result.data.contents;
  }
  return result.hash;
}

function* sendList(fromUser, txs, options={}) {
  verbose('sendList', {fromUser, txs, options});

  const results = yield api.bloc.sendList({
      password: fromUser.password,
      txs: txs,
      resolve: !options.doNotResolve,
    }, fromUser.name, fromUser.address, !options.doNotResolve, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // verify results
  verifyListResult(txs, results);

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {
    const resolvedResults = yield resolveResults(results, options);

    resolvedResults.map(function(result){
        if(result.status === constants.FAILURE) {
            throw new HttpError400(result.txResult.message);
        }
    });
    return resolvedResults.map(function(result){return result.data.contents;});
  }
  return results.map(function(r){return r.hash;});
}

function verifyListResult(txs, result) {
  // if sent / received mismatch
  if (txs.length != result.length)
    throw new Error (`List result: size mismatch. Expected ${txs.length} actual ${result.length} `);
}

function* getBlocResult(hash, options={}) {
  verbose('getBlocResult', {hash, options});
  const result = yield api.bloc.result(hash, !options.doNotResolve, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return result;
}

function* getBlocResults(hashes, options={}) {
  verbose('getBlocResults', {hashes, options});
  const result = yield api.bloc.results(hashes, !options.doNotResolve, options.chainId, options.node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return result;
}

function* resolveResult(result, options) {
    return (yield resolveResults([result], options))[0];
}

function* resolveResults(results, options={}) {
	  options.doNotResolve = true;
    var count = 0;
    var res = results;
    while (count < 60 && res.filter(r => {return r.status === constants.PENDING}).length !== 0) {
        res = yield getBlocResults(res.map(r => {return r.hash}), options);
        yield promiseTimeout(1000);
        count++;
    }

    if(count >= 60) {
        throw new HttpError400('Transaction did not resolve');
    }

    return res;
}

function* transactionResult(hash, options={}) {
  verbose('transactionResult', {hash, options});
  const result = yield api.strato.transactionResult(hash, options.chainId, options.node)
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
  // Everything is searchable as of now. Doing this to maintain backward compatibility.
  return true;
  // const results = yield query(`contract?codeHash=eq.${codeHash}`);
  // return (results.length > 0);
}

function* isCompiled(contractName) {
  const message = 'rest.isCompiled() is deprecated in this version. see https://github.com/blockapps/blockapps-rest/blob/master/ReleaseNotes.md';
  throw new Error(message);
}

/**
 * This function gets the last account associated to the address
 * @method{getAccount}
 * @param{String} address
 * @param{Object} options the optional arguments {chainIds: [Number], node: Number}
 * @returns{()} scope.accounts[address] = account where account has type http://developers.blockapps.net/strato-api/1.2/docs#get-account
 */
 function* getAccount(address, options={}) {
   verbose('getAccount', {address, options});
   const accounts = yield api.strato.account(address, options.chainIds, options.node)
     .catch(function(e) {
       throw (e instanceof Error) ? e : new HttpError(e);
     });
   if (accounts.length <= 0) throw new Error('No account found at ' + address);
   return accounts;
 }

 function* getBalance(address, accountIndex, options={}) {
   accountIndex = accountIndex || 0;
   verbose('getBalance', {address, accountIndex, options});
   const accounts = yield api.strato.account(address, options.chainId, options.node);
   if(accounts.length === 0) {
     // this account has not yet received any ether. Balance is 0
     return new BigNumber(0);
   }
   return new BigNumber(accounts[accountIndex].balance);
 }

function promiseTimeout(timeout) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve();
    }, timeout);
  });
}

/**
 * This function creates a test users with uid and password
 * @method{createTestUsers}
 * @param {String} uid the desired uid
 * @param {String} password the user's password
 * @returns Users
 */
function* createTestUsers(uid, password = '1234') {
  const admin = yield createUser(`Admin_${uid}`, password)
  const master = yield createUser(`Master_${uid}`, password)
  const attacker = yield createUser(`Attacker_${uid}`, password)
  return { admin, master, attacker }
}

function* until(predicate, action, timeoutMilli, node) {
  if (timeoutMilli === undefined) timeoutMilli = 60*1000;
  const phi = 1.618;
  let dt = 100;
  let totalSleep = 0;
  while (totalSleep < timeoutMilli) {
    const result = yield action(node);

    if (predicate(result)) {
      return result;
    } else {
      yield promiseTimeout(dt);
      totalSleep += dt;
      dt *= phi;
    }
  }
  // retries exceeded - timeout
  throw new Error(`until: timeout ${timeoutMilli}ms exceeded`);
}

function* queryUntil(queryString, predicate, timeoutMilli, node) {
  if (queryString === undefined) throw new Error('queryUntil: queryString undefined');
  const action = function*(n) {
    let res;
    try {
      res = yield query(queryString, n);
    }
    catch(e) {
      // 404 is an acceptable response, since the table may not yet exist
      if(!e.status || e.status != 404) {
        throw e;
      }
      res = [];
    }
    return res;
  }
  const res = yield until(predicate, action, timeoutMilli, node);
  return res;
}

function* waitQuery(queryString, count, timeoutMilli, node) {
  if (count <= 0 ) throw new Error('waitQuery: illegal count');
  const predicate = function(results) {
    // abort if exceeded the count - unexpected records exist
    if (results.length > count) {
      throw new Error(`waitQuery: query results count ${results.length} exceed expected count ${count}`);
    }
    // count reached - done
    if (results.length == count) {
      return true;
    }
    // count not reached - sleep
    verbose('waitQuery', `query results count ${results.length}, expected count ${count}`);
    return false;
  }

  const res = yield queryUntil(queryString, predicate, timeoutMilli, node);
  return res;
}

function* waitTransactionResult(hash, timeoutMilli, options={}) {
  if (hash === undefined) throw new Error('waitTransactionResult: hash undefined');
  if (timeoutMilli === undefined) timeoutMilli = 60*1000;

  const sleep = 1*1000; // 1 sec
  const retries = timeoutMilli / sleep;
  for (var i = 0; i < retries ; i++) {
    // transactionResult
    var results = yield transactionResult(hash, options);
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

/**
 * This function gets the chain details for one chain Id
 * @method{getChainInfo}
 * @param{String} chainId
 * @param{Number} node target node
 * @returns{()} ChainInfo
 */
function* getChainInfo(chainId, node) {
  const chainIds = yield getChainInfos([chainId], node);
  return chainIds[0].info;
}

/**
 * This function gets the chain details for multiple chain Ids
 * @method{getChainInfos}
 * @param{Array} chainIds
 * @param{Number} node target node
 * @returns{()} ChainInfo
 */
function* getChainInfos(chainIds, node) {
  verbose('getChainInfos', {chainIds, node});
  const chainInfos = yield api.bloc.chain(chainIds, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  return chainInfos;
}

/**
 * This function creates a private chain and returns the chain Id
 * @method{createChain}
 * @param{String} chain label
 * @param{Array} member enode addresses
 * @param{Array} member initial balance
 * @param{String} contract string
 * @param{Object} contract instance variables
 * @param{String} governance contract name
 * @param{Number} node target node
 * @returns{()} ChainId
 */
function* createChain(label, members, balances, src, args, contract, node) {
  verbose('createChain', {label, members, balances, src, args, contract, node});
  const body = {
    label: label,
    members: members,
    balances: balances,
    src: src,
    args: args,
    contract: contract
  }
  const chainId = yield api.bloc.createChain(body, node)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });
  return chainId;
}

 /**
 * This function returns a Nonce value
 * @method{getNonce}
 * @param {String} admin
 * @param {Int} index
 * @returns Nonce
 */
function* getNonce(admin, _index) {
  const index = _index || 0;
  const accounts = yield getAccount(admin.address);
  return { nonce: accounts[index].nonce, latestBlockNum: accounts[index].latestBlockNum };
}

function* keystore(user, args, node) {
  verbose('keystore', {user, args, node})
  const results = yield api.bloc.keystore({
    password: user.password,
    keyStore: args,
  }, user.name, node).catch(function (e) {
    throw (e instanceof Error) ? e : new HttpError(e);
  });
  return results
}

/**
 * This function creates a secret key with given access toekn on a given node
 * @method{createKey}
 * @param {String} token the node's access token
 * @returns Address
 */
function* createKey(token) {
  verbose('createKey', {token});
  const createKeyResponse = yield api.strato23.createKey({}, {
    'Authorization': 'Bearer ' + token
  }).catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // validate address
  const address = createKeyResponse['address'];
  if (!util.isAddress(address))
    throw new Error('create key should produce a valid address ' + JSON.stringify(address));

  return createKeyResponse;
}

/**
 * This function gets the address of the node's secret key
 * @method{getKey}
 * @param{String} token
 * @returns Address
 */
function* getKey(token) {
  verbose('getKey', {token});
  const getKeyResponse = yield api.strato23.key({
    'Authorization': 'Bearer ' + token
  }).catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // validate address
  const address = getKeyResponse['address'];
  if (!util.isAddress(address))
    throw new Error('get key should produce a valid address ' + JSON.stringify(address));

  return getKeyResponse;
}

/**
 * This function sends a transaction
 * @method{sendTransaction}
 * @param{String} token access toke of the node
 * @param{Array} txs list of transactions with specified payload and transaction type
 * @param{Object} options the optional arguments {doNotResolve: Boolean, txParams: Object, chainId: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 * @returns{()} doNotResolve=true: transaction hash (String), doNotResolve=false: {status:String, hash:String, txResult:object, data: object}
*/
function* sendTransactions(token, txs, options={}) {
  const txParams = options.txParams || {};
  verbose('sendTransactions', {token, txs, options});

  var results = yield api.strato23.sendTransactions({
      txs: txs,
      txParams: txParams,
    }, {
      'Authorization': 'Bearer ' + token
    }, !options.doNotResolve, options.chainId)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {
    const resolvedResults = yield resolveResults(results, options);

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
 * This function calls a method from a users contract with given args for OAuth flow.
 * @method{callOAuth}
 * @param{String} token the contract owner's token
 * @param{String} contract the target contract
 * @param{String} methodName the target method
 * @param{Object} args the arguments to be supplied to the targer method
 * @param{Object} options the optional arguments {value: Number, doNotResolve: Boolean, chainId: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 * @returns{()} doNotResolve=true: [transaction hash] (String), doNotResolve=false: [method call return vals] (String|Int)
 */
function* callOAuth(token, contract, methodName, args, options={}) {
  args = args || {};
  const value = options.value || 0;
  const valueFixed = (value instanceof BigNumber) ? value.toFixed(0) : value;
  verbose('callOAuth', {token, contract, methodName, args, options});

  const txs = [{
    payload: {
      contractName: contract['name'],
      contractAddress: contract['address'],
      value: valueFixed,
      method: methodName,
      args: args,
      metadata: constructMetadata(options, contract['name'])
    },
    type: 'FUNCTION'
  }];

  const result = yield api.strato23.sendTransactions({
    txs: txs,
  }, {
    'Authorization': 'Bearer ' + token
  }, !options.doNotResolve, options.chainId)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {

    const resolvedResults = yield resolveResult(result, options);

    if(resolvedResults[0].status === constants.FAILURE) {
      throw new HttpError400(result[0].txResult.message);
    }
    return result[0].data.contents;
  }
  return result[0].hash;
}

function* callMethodOAuth(token, contract, methodName, args, options={}) {
  return yield callOAuth(token, contract, methodName, args, options);
}

// send a transaction
/**
 * This function sends wei from one user to another for OAuth flow.
 * @method{sendOAuth}
 * @param{String} token sender
 * @param{String} toUser recepient
 * @param{Number} value amount to send in wei
 * @param{Object} options the optional arguments {doNotResolve: Boolean, chainId: Number, nonce: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 * @returns{()} doNotResolve=true: transaction hash (String), doNotResolve=false: {status:String, hash:String, txResult:object, data: object}
 */
function* sendOAuth(token, toUser, value, options={}) {
  verbose('sendOAuth', {token, toUser, value, options});

  const txs = [{
    payload: {
      toAddress: toUser.address,
      value: value
    },
    type: 'TRANSFER'
  }];
  const txParams = {nonce: options.nonce};

  var result = yield api.strato23.sendTransactions({
    txs: txs,
    txParams: txParams
  }, {
    'Authorization': 'Bearer ' + token
  }, !ptions.doNotResolve, options.chainId)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {

    result = yield resolveResult(result, options);

    if(result.status === constants.FAILURE) {
      throw new HttpError400(result.txResult.message);
    }
    return result.data.contents;
  }
  return result.hash;
}

function* sendListOAuth(token, txs, options={}) {
  verbose('sendListOAuth', {token, txs, options});

  const newTxs = [];
  txs.forEach(function(tx) {
    newTxs.push({
      payload: tx,
      type: 'TRANSFER'
    });
  });

  const results = yield api.strato23.sendTransactions({
    txs: newTxs
  }, {
    'Authorization': 'Bearer ' + token
  }, !options.doNotResolve, options.chainId)
    .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  // verify results
  verifyListResult(txs, results);

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {
    const resolvedResults = yield resolveResults(results, options);

    resolvedResults.map(function(result){
      if(result.status === constants.FAILURE) {
        throw new HttpError400(result.txResult.message);
      }
    });
    return resolvedResults.map(function(result){return result.data.contents;});
  }
  return results.map(function(r){return r.hash;});
}

function* callListOAuth(accessToken, txs, options={}) {
  verbose('callListOAuth', {accessToken, txs, options});

  const txsWithType = [];
  txs.forEach(function(tx) {
    tx.metadata = constructMetadata(options, tx.contractName);
    txsWithType.push({
      payload: tx,
      type: 'FUNCTION'
    });
  });

  const results = yield api.strato23.sendTransactions({
    txs:txsWithType
  }, {
    'Authorization': 'Bearer ' + accessToken
  }, !options.doNotResolve, options.chainId)
  .catch(function(e) {
    throw (e instanceof Error) ? e : new HttpError(e);
  });
  // verity results
  verifyListResult(txs, results);

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {
    const resolvedResults = yield resolveResults(results, options);

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
 * @method{uploadContractOAuth}
 * @param{String} accessToken the owner's access token
 * @param{String} password the owner's password
 * @param{String} contractName name of the contract
 * @param{Object} args initialization args
 * @param{Object} options the optional arguments {doNotResolve: Boolean, txParams: Object, chainId: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 * @returns{()} doNotResolve=true: [transaction hash] (String), doNotResolve=false: [uploaded contract details]
*/
function* uploadContractStringOAuth(accessToken, contractName, contractSrc, args, options={}) {
  args = args || {};
  const txParams = options.txParams || {};
  verbose('uploadContractStringOAuth', {accessToken, contractName, args, options});

  const result = yield api.strato23.sendTransactions({
    txs: [{
      payload: {
        src: contractSrc,
        contract: contractName,
        args: args,
        metadata: constructMetadata(options, contractName)
      },
      type: 'CONTRACT'
    }],
    txParams: txParams
  }, {
    'Authorization': 'Bearer ' + accessToken
  }, !options.doNotResolve, options.chainId)
  .catch(function(e) {
    throw (e instanceof Error) ? e : new HttpError(e);
  });

  // When options.doNotResolve=false, expect bloc to only return once transaction has either succeeded or failed.
  // When options.doNotResolve=true, bloc will return the transaction hash immediately, and it is the caller's responsibility to check it.
  if(!options.doNotResolve) {

    const resolvedResults = yield resolveResult(result, options);

    if(resolvedResults[0].status === constants.FAILURE) {
      throw new HttpError400(resolvedResults[0].txResult.message);
    }

    const address = resolvedResults[0].data.contents.address;

    // validate address
    if (!util.isAddress(address))
      new Error('upload contract should produce a valid address ' + JSON.stringify(address));
    const contract = {name: contractName, src: contractSrc, address: address, codeHash:resolvedResults[0].data.contents.codeHash};
    contract.src = 'removed'; // not really needed
    return contract;
  }

  return result[0].hash;
}

function* uploadContractOAuth(accessToken, contractName, contractFilename, args, options) {
  verbose('uploadContractOAuth', {accessToken, contractName, contractFilename, args, options});
  // get the source
  const contractSrc = yield getContractString(contractName, contractFilename);
  // upload
  return yield uploadContractStringOAuth(accessToken, contractName, contractSrc, args, options);
}

/**
 * This function uploads a list of contracts.
 * Assumes that contracts have already been compiled and uploaded to bloc. Uses contractName to fetch
 * latest contract xabi from bloc to upload to STRATO.
 * @method{uploadContractListOAuth}
 * @param {String} accessToken - access token of OAuth
 * @param {Object[]} txs - List of contracts formatted as tx objects. { contractName, args }
 * @param{Object} options the optional arguments {value: Number, doNotResolve: Boolean, chainId: Number, node: Number, enableHistory: Boolean, enableIndex: Boolean}
 */
function*  uploadContractListOAuth(accessToken, txs, options={}){
  verbose('uploadContractListOAuth', {accessToken, txs, options})

  const txsWithType = [];
  txs.forEach(function(tx) {
    tx.metadata = constructMetadata(options, tx.contractName);
    txsWithType.push({
      payload: tx,
      type: 'CONTRACT'
    });
  });

  const results = yield api.strato23.sendTransactions({
    txs: txsWithType
  }, {
    'Authorization': 'Bearer ' + accessToken
  }, !options.doNotResolve, options.chainId)
  .catch(function(e) {
      throw (e instanceof Error) ? e : new HttpError(e);
    });

  if(!options.doNotResolve) {
    const resolvedResults = yield resolveResults(results, options);

    resolvedResults.map(function(result){
        if(result.status === constants.FAILURE) {
            throw new HttpError400(result.txResult.message);
        }
    });
    return resolvedResults.map(function(result){return result.data.contents;});
  }
  return results.map(function(r){return r.hash;});
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
  callMethod: common.config.oauth ? callMethodOAuth : callMethod,
  callList: common.config.oauth ? callListOAuth : callList,
  compile: compile,
  compileSearch: compileSearch,
  createChain: createChain,
  createKey: common.config.oauth ? createKey : null,
  createUser: createUser,
  createTestUsers: createTestUsers,
  fill: fill,
  getAccount: getAccount,
  getAbi: getAbi,
  getAbiEnums: getAbiEnums,
  getBalance: getBalance,
  getChainInfo: getChainInfo,
  getChainInfos: getChainInfos,
  getContractString: getContractString,
  getKey: common.config.oauth ? getKey : null,
  getState: getState,
  getStateVar: getStateVar,
  getUsers: getUsers,
  isCompiled: isCompiled,
  isSearchable: isSearchable,
  uploadContract: common.config.oauth ? uploadContractOAuth : uploadContract,
  uploadContractList: common.config.oauth ? uploadContractListOAuth : uploadContractList,
  uploadContractString: common.config.oauth ? uploadContractStringOAuth : uploadContractString,
  query: query,
  send: common.config.oauth ? sendOAuth : send,
  sendList: common.config.oauth ? sendListOAuth : sendList,
  sendTransactions: common.config.oauth ? sendTransactions : null,
  getBlocResult: getBlocResult,
  getBlocResults: getBlocResults,
  resolveResults: resolveResults,
  transactionResult: transactionResult,
  until: until,
  queryUntil: queryUntil,
  waitQuery: waitQuery,
  waitTransactionResult: waitTransactionResult,
  getNonce,
  keystore,
  setLogger,
}
