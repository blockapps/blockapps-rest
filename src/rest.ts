import { BigNumber } from "bignumber.js";
import * as RestStatus from "http-status-codes";
import api from "./api";
import { TxResultStatus } from "./constants";
import util from "./util/util";
import { constructMetadata, setAuthHeaders } from "./util/api.util";
import { RestError, response } from "./util/rest.util";
import jwt from "jsonwebtoken";
import {
  Options,
  StratoUser,
  OAuthUser,
  BlockChainUser,
  Contract,
  ContractDefinition,
  TransactionResultHash,
  CallArgs,
  Chain,
  SendTx
} from "./types";

/**
 * This is the main blockapps-rest interface.
 * @module rest
 */

/**
 * @typedef {Object} User This identifies a user
 * @property {String} token This is the OAuth JWT corresponding to this user.
 * STRATO uses the JWT to identify the user and unlock the user's private key to sign transactions.
 * The token must be present in most cases.
 * @property {String} address This is the address corresponding to the user's private key.
 * This is an optional parameter.
 */

/**
 * @typedef {Object} OAuthConfig This object describes the oauth configuration of a STRATO node
 * @property {String} appTokenCookieName Specifies the HTTP only cookie name. Used to identify
 * authentication cookie if cookies are used instead of headers
 * @property {String} scope Identifies OAuth scope
 * @property {Number} appTokenCookieMaxAge Used to set auth cookie expiration
 * @property {String} clientId OAuth client id for client credential and auth code grant flows
 * @property {String} clientSecret OAuth client secret corresponding to the clientId
 * @property {String} openIdDiscoveryUrl Discovery url for OAuth
 * @property {String} redirectUri OAuth callback url for auth code grant flow
 * @property {String} logoutRedirectUri Redirect URI to redirect user after a successful logout
 */

/**
 * @typedef {Object} Node This identifies a STRATO node and contains OAuth discovery urls to
 * authenticate to this node.
 * @property {Number} id Node identifier
 * @property {String} url The base url of the node of the form `{PROTOCOL}://{HOST}:{PORT}`
 * @property {String} publicKey This is the public key of the node. Used to verify the identify of the node.
 * @property {Number} port This is the port number of the STRATO process on this node. Usually equals `30303`
 * @property {module:rest~OAuthConfig} oauth This describes the oauth configuration of a STRATO node
 *
 */

/**
 * @typedef {Object} Config This contains node configuration information
 * @property {String} VM This identifies the type of VM to use. It must equal one of `EVM` or `SolidVM`
 * @property {Boolean} apiDebug This flag enables debug output to be sent to the logger
 * @property {module:rest~Node[]} nodes This contains a collection of STRATO nodes which are being used.
 * It must have atleast one member
 * @property {Number} timeout Length of time to wait before giving up on a request in milliseconds
 */

/**
 * @typedef {Object} Options This object defines options, configurations and metadata for the STRATO node
 * @property {Config} config This contains node identifiers, configuration and metadata options for this call.
 * @property {Object} logger This is a logger interface. It uses the `console` by default but can be
 * set to custom logger like winston.
 * @property {Object} headers This allows adding custom HTTP headers for requests to STRATO
 * @property {Object} query This allows adding custom HTTP query params to requests.
 * Useful for searching contracts
 * @property {String[]} history This allows us to specify contract names for which to track history
 * when uploading smart contract source code
 * @property {String[]} noindex This allows us to specify contract names for which to skip relational
 * indexing when uploading smart contract source code
 * @property {Boolean} isAsync If set, the call returns a transaction hash instead of waiting for a transaction
 * confirmation. Default value is `false`.
 */

/**
 * @typedef {Object} Account This object defines a STRATO account
 * @property {String} kind Account type
 * @property {String} balance Eth balance in wei
 * @property {String} address Account address
 * @property {Number} latestBlockNum Last block number in which the state for this account was changed
 * @property {String} codeHash Code hash. Relevant if this is a contract account
 * @property {Number} nonce: Account nonce
 */


/**
 * @typedef {Object} CallArgs This object defines a function call to a STRATO smart contract
 * @property {module:rest~Contract} contract Defines the contract on which to call the method. Should contain `name`
 * and `address`.
 * @property {String} method Name of the method to call
 * @property {Object} args Arguments for the method call
 * @property {Number} [value] Number of tokens to send to the smart contract
 * @property {String} [chainid] Chain ID of the private chain if the contract is being called on a private chain
 * @property {module:rest~TxParams} [txParams] Defines gas limit and gas price for transaction execution
 */


/**
 * @typedef {Object} CodeHash This object defines the codeHash and the vm type in an uploaded contract object
 * @property {String} kind This is the type of VM used. Is either `SolidVM` or `EVM`
 * @property {String} digest This is the code hash
 */


/**
 * @typedef {Object} Contract This object defines a STRATO smart contract
 * @property {String} name Name of the smart contract
 * @property {String} source Source code for the smart contract
 * @property {Object} [args] Arguments for the smart contract constructor
 * @property {String} [codeHash] Contract code hash. Populated by the compileContract call.
 * @property {String} [address] Contract address. Populated by uploading a contract to STRATO.
 */

 /**
  * @typedef {Object} SendArgs This object defines the shape of a request for transfer tokens
  * @property {String} toAddress Address of the receiver
  * @property {Number} value Amount of tokens to transfer in wei
  * @property {module:rest~TxParams} [txParams] Defines gas limit and gas price for transaction execution
  * @property {String} [chainid] Chain ID of the private chain if the transfer is being executed on a private chain
  */

 /**
  * @typedef {Object} TxData This is the formatted output of a transaction execution
  * @property {String} Tag This identified the type of the transaction. Is one of `Call`, `Upload` or `Send`
  * @property {Array|module:rest~UploadedContract} contents This is the formatted output of executing the transaction
  */


 /**
 * @typedef {Object} TxParams This object defines transaction specific options for STRATO.
 * There should be no need to change the defaults for most use cases.
 * @property {Number} gasLimit This is the upper limit for the amount of gas this transaction should consume.
 * Defaults to 32100000000 wei
 * @property {Number} gasPrice This is the price of gas the user is willing to pay. Defaults to 1 wei
 */

/**
 * @typedef {Object} TxResult The result of submitting a transaction to STRATO.
 * @property {String} contractsDeleted Comma separated list of contract addresses that were deleted as a result of
 * executing this transaction
 * @property {String} gasUsed Amount of gas used by this transaction in hexadecimal
 * @property {String} stateDiff The hash of the new state-diff from this transaction
 * @property {String} time Amount of time the VM took to execute this transaction
 * @property {String} kind Type of VM used to execute this transaction. `SolidVM` or `EVM`
 * @property {String} chainid Chain ID (present if transaction was executed on a private chain)
 * @property {String} response Raw output of executing transaction
 * @property {String} blockHash Block hash of the block in which this transaction was finalized
 * @property {String} transactionHash Transaction hash
 * @property {String} etherUsed Amount of ether used to execute this transaction (`gasUsed` * `gasPrice`)
 * @property {String} contractsCreated Comma separated list of contract addresses created as a result of executing this
 * transaction
 */


 /**
 * @typedef {Object} TxResultWrapper The result of submitting a transaction to STRATO.
 * @property {String} status Status of the transaction. One of `Pending`, `Success` or `Failure`.
 * @property {String} hash Transaction hash
 * @property {module:rest~TxResult} txResult Result of the execution of the transaction
 * @property {module:rest~TxData} data Data returned by the execution of a STRATO transaction
 */

 /**
 * @typedef {Object} UploadedContract This object describes the result of uploading one contract in a list of smart
 * contracts being uploaded to STRATO
 * @property {String} name Name of the smart contract
 * @property {String} chainId Chain identifier if the smart contract is being uploaded to a private chain.
 * This property is `null` for main chain smart contracts
 * @property {String} [address] Contract address. Populated by uploading a contract to STRATO.
 * @property {module:rest~CodeHash} codeHash Describes the codehash and the VM used to generate the code hash
 * @property {String} bin The compiled Solidity byte code
 * @property {Object} xabi An object defining the contract metadata
 */

 /**
 * 
 * @typedef {Object} Member The object containing the member info for a chain
 * @property {String} address The address of a user
 * @property {String} enode The 'enode' address of the user - This is their node's IP address and public key 
 * concatenated an "@" sign  
 */

 /**
 * 
 * @typedef {Object} Balance The object containing the balance info for each member of a chain
 * @property {String} address The address of a member
 * @property {Number} balance The balance in wei of the member  
 */

/**
  * 
  * @typedef {Object} CodePtr The object containing information about a Code Pointer for a private chain's Governance contract
  * @property {String} name The name of the contract being referenced
  * @property {String} account The account address of the contract being referenced
*/

 /**
 * @typedef {Object} Chain The object containing arguments of a chain
 * @property {String} label The name of the chain 
 * @property {String} [src] Source contract - Not included if using a Code Pointer
 * @property {String} [contractName] The name of the contract - Not included if using a Code Pointer
 * @property {Object} args The args for the source contract constructor
 * @property {Array} members Array containing the members of the chain
 * @property {Array} balances Array containng the balances of each member of the chain
 * @property {module:rest~CodePtr} [codePtr] An object containing the contract name and account of the code poitner to be used for this chain
 */

 /**
 * @typedef {Object} ChainHash The hash of a chain
 * @property {String} hash The hash of a chain
 */

// =====================================================================
//   util
// =====================================================================

function isTxSuccess(txResult) {
  return txResult.status === TxResultStatus.SUCCESS;
}

function isTxFailure(txResult) {
  return txResult.status === TxResultStatus.FAILURE;
}

function assertTxResult(txResult) {
  if (isTxFailure(txResult)) {
    throw new RestError(
      RestStatus.BAD_REQUEST,
      txResult.txResult.message,
      txResult.txResult
    );
  }
  return txResult;
}

function assertTxResultList(txResultList) {
  txResultList.forEach((txResult, index) => {
    if (isTxFailure(txResult)) {
      throw new RestError(
        RestStatus.BAD_REQUEST,
        `tx:${index}, message:${txResult.txResult.message}`,
        { index, txResult: txResult.txResult }
      );
    }
  });
  return txResultList;
}

/**
 * @static
 * This function is used to retrieve the results of an async transaction execution
 * @example
 *
 * const simpleStorageSrc = fsUtil.get("SimpleStorage.sol");
 * const contractArgs = {
 *   name: "SimpleStorage",
 *   source: simpleStorageSrc,
 *   args: {} // Any constructor args would go here. We dont have any.
 * };
 * const txResult = await rest.createContract(stratoUser, contractArgs, {
 *   ...options,
 *   isAsync: true
 * });
 * const result = await rest.resolveResult(stratoUser, txResult, options);
 * // Returns
 * // { status: 'Success',
 * // hash:
 * //  '3d25c575751bf4e9a502eef255dd5224f2b9585e339edc51fca02c33a45b177d',
 * // txResult:
 * //  { deletedStorage: '',
 * //    contractsDeleted: '',
 * //    gasUsed: '13955',
 * //    stateDiff: '',
 * //    time: 0.000694605,
 * //    kind: 'EVM',
 * //    chainId: null,
 * //    response:
 * //     '608060405260043...a6504300c1825957a56e0c10029',
 * //    blockHash:
 * //     '82bb60c456661c8e05caa36b227be8e717bf2b7c7ae0de30fcd7b295d731be9b',
 * //    transactionHash:
 * //     '3d25c575751bf4e9a502eef255dd5224f2b9585e339edc51fca02c33a45b177d',
 * //    etherUsed: '13955',
 * //    newStorage: '',
 * //    message: 'Success!',
 * //    trace: '',
 * //    contractsCreated: 'bf68d882d8e95d94926379538ccab45932e26c03' },
 * // data:
 * //  { tag: 'Upload',
 * //    contents:
 * //     { bin: 'bin removed.',
 * //       chainId: null,
 * //       address: 'bf68d882d8e95d94926379538ccab45932e26c03',
 * //       'bin-runtime': 'bin-runtime removed.',
 * //       codeHash: [Object],
 * //       name: 'SimpleStorage',
 * //       src: 'source removed.',
 * //       xabi: 'xabi removed.' },
 * //    src: 'source removed.' } }
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~TxResultWrapper} pendingTxResult The tx result to resolve. Must contain the transaction hash.
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~TxResultWrapper}
 */
async function resolveResult(user, pendingTxResult, options:Options) {
  return (await resolveResults(user, [pendingTxResult], options))[0];
}

/**
 * @static
 * This function is used to retrieve the results of multiple async transaction executions
 * @example
 *
 * const simpleStorageSrc = fsUtil.get("SimpleStorage.sol");
 * const contractArgs = {
 *   name: "SimpleStorage",
 *   source: simpleStorageSrc,
 *   args: {} // Any constructor args would go here. We dont have any.
 * };
 * const txResults = await rest.createContractList(stratoUser, [contractArgs], {
 *   ...options,
 *   isAsync: true
 * });
 * const results = await rest.resolveResults(stratoUser, txResults, options);
 * // Returns
 * // [{ status: 'Success',
 * // hash:
 * //  '3d25c575751bf4e9a502eef255dd5224f2b9585e339edc51fca02c33a45b177d',
 * // txResult:
 * //  { deletedStorage: '',
 * //    contractsDeleted: '',
 * //    gasUsed: '13955',
 * //    stateDiff: '',
 * //    time: 0.000694605,
 * //    kind: 'EVM',
 * //    chainId: null,
 * //    response:
 * //     '608060405260043...a6504300c1825957a56e0c10029',
 * //    blockHash:
 * //     '82bb60c456661c8e05caa36b227be8e717bf2b7c7ae0de30fcd7b295d731be9b',
 * //    transactionHash:
 * //     '3d25c575751bf4e9a502eef255dd5224f2b9585e339edc51fca02c33a45b177d',
 * //    etherUsed: '13955',
 * //    newStorage: '',
 * //    message: 'Success!',
 * //    trace: '',
 * //    contractsCreated: 'bf68d882d8e95d94926379538ccab45932e26c03' },
 * // data:
 * //  { tag: 'Upload',
 * //    contents:
 * //     { bin: 'bin removed.',
 * //       chainId: null,
 * //       address: 'bf68d882d8e95d94926379538ccab45932e26c03',
 * //       'bin-runtime': 'bin-runtime removed.',
 * //       codeHash: [Object],
 * //       name: 'SimpleStorage',
 * //       src: 'source removed.',
 * //       xabi: 'xabi removed.' },
 * //    src: 'source removed.' } }]
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~TxResultWrapper[]} pendingTxResults The tx results to resolve. Must contain the transaction hash.
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~TxResultWrapper[]}
 */
async function resolveResults(user, pendingResults, _options:Options) {
  const options = Object.assign({ isAsync: true }, _options);

  // wait until there are no more PENDING results
  const predicate = results =>
    results.filter(r => r.status === TxResultStatus.PENDING).length === 0;
  const action = async () =>
    getBlocResults(
      user,
      pendingResults.map(r => r.hash),
      options
    );
  const resolvedResults = await util.until(predicate, action, options);
  return resolvedResults;
}

// =====================================================================
//   account details
// =====================================================================
/**
 * @static
 * This function returns the state of STRATO accounts on the STRATO node
 * identified by `options.config.nodes` and matching the query property `options.query`.
 * @example
 *
 * var accounts = await rest.getAccounts(user, {...options, query: {address: user.address}})
 * // returns a list of one account corresponding to the users' address
 * // [ { contractRoot:'56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
 * //     next: '/eth/v1.2/account?address=25eaa2879018122d7ba25fe4d9701ac367c44bf5&index=5',
 * //     kind: 'AddressStateRef',
 * //     balance: '2000000000000000000000',
 * //     address: '25eaa2879018122d7ba25fe4d9701ac367c44bf5',
 * //     latestBlockNum: 1,
 * //     codeHash:'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
 * //     code: '',
 * //     nonce: 0 } ]
 *
 * @param {module:rest~User} user This identifies the user performing the query and contains the
 * authentication token for the API call
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~Account[]} A list of account details
 */
async function getAccounts(user:OAuthUser, options:Options) {
  try {
    return await api.getAccounts(user, { ...options, isAsync: true });
  } catch (err) {
    throw new RestError(
      RestStatus.BAD_REQUEST,
      err.response.statusText || err.response || err,
      err.response.data || err.response || err
    );
  }
}

async function getHealth(user:OAuthUser, options:Options) {
  try {
    return await api.getHealth(user, { ...options, isAsync: true });
  } catch (err) {
    throw new RestError(
      RestStatus.BAD_REQUEST,
      err.response.statusText || err.response || err,
      err.response.data || err.response || err
    );
  }
}

async function getStatus(user:OAuthUser, options:Options) {
  try {
    return await api.getStatus(user, { ...options, isAsync: true });
  } catch (err) {
    throw new RestError(
      RestStatus.BAD_REQUEST,
      err.response.statusText || err.response || err,
      err.response.data || err.response || err
    );
  }
}

async function getVersion(user:OAuthUser, options:Options) {
  try {
    return await api.getVersion(user, { ...options, isAsync: true });
  } catch (err) {
    throw new RestError(
      RestStatus.BAD_REQUEST,
      err.response.statusText || err.response || err,
      err.response.data || err.response || err
    );
  }
}
// =====================================================================
//   user
// =====================================================================

/**
 * @static
 * This function createsand faucets a STRATO public/private key pair for the OAuth identity identified
 * by the token in the user object. If a key pair already exists, it returns the ethereum address corresponding
 * to this users key pair.
 * @example
 *
 * var user = await rest.createUser({token: `${token}`}, options)
 * // returns a STRATO user
 * // { token: "eyJhbGc...ondq6g", address: "25eaa2879018122d7ba25fe4d9701ac367c44bf5"}
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~User}
 */
async function createUser(ouser:OAuthUser, options:Options):Promise<BlockChainUser> {
  const address = await createOrGetKey(ouser, options);
  return Object.assign({}, ouser, { address });
}

async function fill(user, options:Options) {
  const txResult = await api.fill(user, options);
  return assertTxResult(txResult);
}

// =====================================================================
//   compile contracts
// =====================================================================

/**
 * @static
 * This function is helper method that can be used to check if your smart contract compiles successfully using
 * STRATO.
 * @example
 *
 * const contract = { name: "SimpleStorage", source: "...contract source" }
 * const result = await rest.compileContracts(
 *  stratoUser,
 *  [contract],
 *  options
 * );
 * // returns
 * // [ { contractName: 'SimpleStorage',
 * //     codeHash: '4552b102deb8f69bba4ca79847913c6878892787c0ff4592245452c00e324779' } ]
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract[]} contracts This contains a list of contracts to compile
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~Contract[]} Returns a list of contracts with the `name` and `codeHash` values populated
 */
async function compileContracts(user, contracts, options:Options) {
  try {
    return await api.compileContracts(user, contracts, options);
  } catch (err) {
    throw new RestError(
      RestStatus.BAD_REQUEST,
      err.response.statusText || err.response || err,
      err.response.data || err.response || err
    );
  }
}

// =====================================================================
//   contract
// =====================================================================

/**
 * @static
 * This function uploads a smart contract to STRATO
 * @example
 *
 * const simpleStorageSrc = fsUtil.get("SimpleStorage.sol");
 * const contractArgs = {
 *   name: "SimpleStorage",
 *   source: simpleStorageSrc,
 *   args: {} // Any constructor args would go here. We dont have any.
 * };
 * const result = await rest.createContract(stratoUser, contractArgs, options);
 * // returns
 * // { name: 'SimpleStorage',
 * //   address: '5043751be046762926fc563fefb33e62919bf8b7' }
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract} contract This object describes the contract to upload
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~Contract|module:rest~TxResultWrapper} If `options.async` is set, it returns a transaction result
 * object with the transaction. Final result can be obtained by using the `resolveResult` call. If `options.async` is not
 * set (default), this call returns a contract with the `name` and `address` values populated
 */
async function createContract(user:BlockChainUser, contract:ContractDefinition, options:Options):Promise<Contract | TransactionResultHash> {
  const [pendingTxResult] = await api.createContract(user, contract, options);
  return createContractResolve(user, pendingTxResult, options);
}

async function createContractResolve(user:OAuthUser, pendingTxResult, options:Options):Promise<Contract | TransactionResultHash> {
  // throw if FAILURE
  assertTxResult(pendingTxResult);
  // async - do not resolve
  if (options.isAsync) return pendingTxResult;
  // resolve - wait until not pending
  const resolvedTxResult = await resolveResult(user, pendingTxResult, options);
  // throw if FAILURE
  assertTxResult(pendingTxResult);
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResult.data.contents;
  // return basic contract object
  return {
    name: resolvedTxResult.data.contents.name,
    address: resolvedTxResult.data.contents.address
  };
}

// =====================================================================
//   contract list
// =====================================================================

/**
 * @static
 * This function uploads a list of smart contracts to STRATO
 * @example
 *
 * const simpleStorageSrc = fsUtil.get("SimpleStorage.sol");
 * const contractArgs = {
 *   name: "SimpleStorage",
 *   source: simpleStorageSrc,
 *   args: {} // Any constructor args would go here. We dont have any.
 * };
 * const result = await rest.createContractList(stratoUser, [contractArgs], options);
 * // returns
 * // [{ bin:
 * //     '608060405234801561001057600080...6504300c1825957a56e0c10029',
 * //    chainId: null,
 * //    address: 'b728ad420aadd7082380e2024b935dd2898f6117',
 * //    'bin-runtime':
 * //     '6080604052600436106049576000357...6504300c1825957a56e0c10029',
 * //    codeHash:
 * //     { kind: 'EVM',
 * //       digest:
 * //        '4552b102deb8f69bba4ca79847913c6878892787c0ff4592245452c00e324779' },
 * //    name: 'SimpleStorage',
 * //    src:
 * //     'contract SimpleStorage {...}',
 * //    xabi:
 * //     { modifiers: {},
 * //       funcs: [Object],
 * //       kind: 'ContractKind',
 * //       types: [Object],
 * //       using: {},
 * //       constr: null,
 * //       events: {},
 * //       vars: [Object] } } ]
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract[]} contracts This is a list of contracts to upload
 * @param {module:rest~Options} options This identifies the options and configurations for this call.
 * @returns {module:rest~Contract[]|module:rest~TxResultWrapper[]} If `options.async` is set, it returns a list of
 * transaction result objects. Final results can be obtained by using the `resolveResults` call. If `options.async` is
 * not set (default), this call returns a list of contracts with the `name` and `address` values populated
 */
async function createContractList(user:BlockChainUser, contracts:ContractDefinition[], options:Options) {
  const pendingTxResult = await api.createContractList(user, contracts, options);
  return createContractListResolve(user, pendingTxResult, options);
}

async function createContractListResolve(user, pendingTxResultList, options:Options) {
  // throw if FAILURE
  assertTxResultList(pendingTxResultList); // @samrit what if 1 result failed ?
  // async - do not resolve
  if (options.isAsync) return pendingTxResultList;
  // resolve - wait until not pending
  const resolvedTxResultList = await resolveResults(
    user,
    pendingTxResultList,
    options
  );
  // throw if FAILURE
  assertTxResultList(resolvedTxResultList);
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResultList;
  // return a list basic contract object
  return resolvedTxResultList.map(
    resolvedTxResult => resolvedTxResult.data.contents
  );
}

// =====================================================================
//   key
// =====================================================================

/**
 * @static
 * Returns the users' STRATO address
 * @example
 *
 * // Initialize ba-rest oaut-utility
 * const oauth = oauthUtil.init(globalConfig.nodes[0].oauth);
 *
 * // Get token using client-credential flow
 * const tokenResponse = await oauth.getAccessTokenByClientSecret();
 *
 * // Extract token from token response
 * const oauthUser = { token: tokenResponse.token.access_token };
 *
 * const key = await rest.getKey(oauthUser, options);
 * // Returns cdc7e277d9aecbce6aba5b9b16de815cadad3d2a
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Options} options This identifies the options and configurations for this call.
 * @returns {String}
 */
async function getKey(user, options:Options) {
  const response = await api.getKey(user, options);
  return response.address;
}


/**
 * @static
 * Creates a public/private key pair on a STRATO node for the OAuth identity described the user argument. This throws an
 * error if the key already exists
 * @example
 *
 * // Initialize ba-rest oaut-utility
 * const oauth = oauthUtil.init(globalConfig.nodes[0].oauth);
 *
 * // Get token using client-credential flow
 * const tokenResponse = await oauth.getAccessTokenByClientSecret();
 *
 * // Extract token from token response
 * const oauthUser = { token: tokenResponse.token.access_token };
 *
 * const key = await rest.createKey(oauthUser, options);
 * // Returns cdc7e277d9aecbce6aba5b9b16de815cadad3d2a
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Options} options This identifies the options and configurations for this call.
 * @returns {String} The address corresponding to the key pair for this user
 */
async function createKey(user, options:Options) {
  const response = await api.createKey(user, options);
  return response.address;
}


/**
 * @static
 * Creates a public/private key pair on a STRATO node for the OAuth identity described the user argument.
 * @example
 *
 * // Initialize ba-rest oaut-utility
 * const oauth = oauthUtil.init(globalConfig.nodes[0].oauth);
 *
 * // Get token using client-credential flow
 * const tokenResponse = await oauth.getAccessTokenByClientSecret();
 *
 * // Extract token from token response
 * const oauthUser = { token: tokenResponse.token.access_token };
 *
 * const key = await rest.createOrGetKey(oauthUser, options);
 * // Returns cdc7e277d9aecbce6aba5b9b16de815cadad3d2a
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Options} options This identifies the options and configurations for this call.
 * @returns {String} The address corresponding to the key pair for this user
 */
async function createOrGetKey(user, options:Options) {
  try {
    const getKeyResponse = await api.getKey(user, options);

    const balance = await api.getBalance(user, getKeyResponse, options);
    if (balance.isEqualTo(0)) {
      await fill({ ...user, ...getKeyResponse }, { isAsync: false, ...options });
    }

    if (getKeyResponse.address) return getKeyResponse.address;
  }
  catch(e) {
  
    if (e.response && e.response.status==400) { //user doesn't already exist, create user
      const createKeyResponse = await api.createKey(user, options);
      await fill({ ...user, ...createKeyResponse }, { isAsync: false, ...options });
      return createKeyResponse.address;
    }

    throw e;
  }

}

// =====================================================================
//   state
// =====================================================================

async function getBlocResults(user:OAuthUser, hashes:string[], options:Options) {
  return api.blocResults(user, hashes, options);
}

/**
 * @static
 * This call gets the list of smart contract names on a particular chain
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param chainId The chainId of the chain to query.
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Object} Returns an object with all contract names on the chain as keys.
 */
async function getContracts(user:OAuthUser, chainId, options:Options) {
  return api.getContracts(user, chainId, options);
}

/**
 * @static
 * This call gets the state of a STRATO smart contract
 * @example
 *
 * // Consider the following contract
 * // contract SimpleStorage {
 * //   uint storedData;
 * //
 * //   function set(uint x) {
 * //       storedData = x;
 * //   }
 * //
 * //   function get() returns (uint) {
 * //       return storedData;
 * //   }
 * // }
 *
 * const contractArgs = {
 *   name: "SimpleStorage",
 *   source: arraySrc,
 *   args: {} // Any constructor args would go here. We dont have any.
 * };
 * const contract = await rest.createContract(stratoUser, contractArgs, options);
 * const state = await rest.getState(stratoUser, contract, options);
 * // returns
 * // { get: 'function () returns (uint)',
 * //   set: 'function (uint) returns ()',
 * //   storedData: '0' }
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract} contract This object describes the contract to fetch state for. Minimally
 * contains the address and the name of the contract
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Object} Returns an object with all accessible functions and state variables in this smart contract
 */
async function getState(user:OAuthUser, contract:Contract, options:Options) {
  return api.getState(user, contract, options);
}

/**
 * @static
 * This call is used to query the state of an array in a STRATO smart contract
 * @example
 *
 * // Consider the following contract
 * // contract DocArray {
 * //   uint256[] arr;
 * //
 * //   constructor() public {
 * //       arr = new uint256[](10);
 * //       for (uint256 i = 0; i < 10; i++) {
 * //           arr[i] = i + 1;
 * //       }
 * //   }
 * // }
 *
 * const contractArgs = {
 *   name: "DocArray",
 *   source: arraySrc,
 *   args: {} // Any constructor args would go here. We dont have any.
 * };
 *
 * const contract = await rest.createContract(stratoUser, contractArgs, options);
 *
 * const array_state = await rest.getArray(stratoUser, contract, "arr", options);
 * // returns [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10' ]
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract} contract This object describes the contract to fetch state for. Minimally
 * contains the address and the name of the contract
 * @param {String} name This is the name of the array variable in the smart contract
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Array} Returns an array of values corresponding to the onchain state of the array variable named in the call
 */
async function getArray(user, contract, name, options:Options) {
  const MAX_SEGMENT_SIZE = 100;
  options.stateQuery = { name, length: true };
  const state = await getState(user, contract, options);
  const length = state[name];
  const result = [];
  for (let segment = 0; segment < length / MAX_SEGMENT_SIZE; segment++) {
    options.stateQuery = {
      name,
      offset: segment * MAX_SEGMENT_SIZE,
      count: MAX_SEGMENT_SIZE
    };
    const state = await getState(user, contract, options);
    result.push(...state[name]);
  }
  return result;
}

// =====================================================================
//   call
// =====================================================================

/**
 * @static
 * This call is used to execute a function in a smart contract
 * @example
 *
 * // Consider the following contract
 * // contract SimpleStorage {
 * //   uint storedData;
 * //
 * //   function set(uint x) {
 * //       storedData = x;
 * //   }
 * //
 * //   function get() returns (uint) {
 * //       return storedData;
 * //   }
 * // }
 *
 * const contractArgs = {
 *   name: "SimpleStorage",
 *   source: arraySrc,
 *   args: {} // Any constructor args would go here. We dont have any.
 * };
 * const contract = await rest.createContract(stratoUser, contractArgs, options);
 *
 * const callArgs = {
 *   contract,
 *   method: "get",
 *   args: {}
 * };
 *
 * const callResult = await rest.call(stratoUser, callArgs, options);
 *
 * console.log(callResult);
 * // returns ['0' ...]
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~CallArgs} callArgs This defines the method and the method arguments
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Array|module:rest~TxResultWrapper} If `options.isAsync` is set, this returns
 * a transaction result object that contains the transaction hash. You can use `resolveResult` or `resolveResults`
 * call to get the final results. If the `options.isAsync` is not set (default), it returns the result of the call as an
 * array.
 */
async function call(user:BlockChainUser, callArgs:CallArgs, options:Options) {
  const [pendingTxResult] = await api.call(user, callArgs, options);
  return callResolve(user, pendingTxResult, options);
}

async function callResolve(user, pendingTxResult, options:Options) {
  // throw if FAILURE
  assertTxResult(pendingTxResult);
  // async - do not resolve
  if (options.isAsync) return pendingTxResult;
  // resolve - wait until not pending
  const resolvedTxResult = await resolveResult(user, pendingTxResult, options);
  // throw if FAILURE
  assertTxResult(pendingTxResult);
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResult;
  // return basic contract object
  return resolvedTxResult.data.contents;
}

// =====================================================================
//   call list
// =====================================================================
/**
 * @static
 * This call is used to request the execution of a list of function calls simultaneously.
 * Useful when requesting batch executions against various different contracts.
 * @example
 *
 * // Consider the following contract
 * // contract SimpleStorage {
 * //   uint storedData;
 * //
 * //   function set(uint x) {
 * //       storedData = x;
 * //   }
 * //
 * //   function get() returns (uint) {
 * //       return storedData;
 * //   }
 * // }
 *
 * const contractArgs = {
 *   name: "SimpleStorage",
 *   source: arraySrc,
 *   args: {} // Any constructor args would go here. We dont have any.
 * };
 * const contract = await rest.createContract(stratoUser, contractArgs, options);
 *
 * const callArgs = {
 *   contract,
 *   method: "get",
 *   args: {}
 * };
 *
 * const callResult = await rest.callList(stratoUser, [callArgs], options);
 *
 * console.log(callResult);
 * // returns [ ['0' ...] ]
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~CallArgs[]} callListArgs A list of function calls
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Array[]|module:rest~TxResultWrapper[]} If `options.isAsync` is set, this returns
 * a list of transaction result objects that each contain the transaction hash. You can use `resolveResult`
 * or `resolveResults` call to get the final results. If the `options.isAsync` is not set (default), it returns the
 * results of transaction execution as a 2 dimensional array.
 */

async function callList(user:BlockChainUser, callListArgs:CallArgs[], options:Options) {
  const pendingTxResultList = await api.callList(user, callListArgs, options);
  return callListResolve(user, pendingTxResultList, options);
}

async function callListResolve(user:BlockChainUser, pendingTxResultList, options:Options) {
  // throw if FAILURE
  assertTxResultList(pendingTxResultList); // @samrit what if 1 result failed ?
  // async - do not resolve
  if (options.isAsync) return pendingTxResultList;
  // resolve - wait until not pending
  const resolvedTxResultList = await resolveResults(
    user,
    pendingTxResultList,
    options
  );
  // throw if FAILURE
  assertTxResultList(resolvedTxResultList);
  // options.isDetailed - return all the data
  if (options.isDetailed) return resolvedTxResultList;
  // return a list basic contract object
  return resolvedTxResultList.map(
    resolvedTxResult => resolvedTxResult.data.contents
  );
}

// =====================================================================
//   send
// =====================================================================

/**
 * @static
 * This function sends a token transfer transaction to STRATO
 * @example
 *
 * const sendArgs = {
 *   toAddress: "cdc7e277d9aecbce6aba5b9b16de815cadad3d2b",
 *   value: 100000000
 * };
 *
 * const result = await rest.send(stratoUser, sendArgs, options);
 * // Returns
 * // { hash:
 * //  '168f76ccf50582953d2fc9cbdc3bb60bd777562662dd9a2330ef29edab282a5c',
 * // gasLimit: 32100000000,
 * // codeOrData: '',
 * // chainId: null,
 * // gasPrice: 1,
 * // to: 'cdc7e277d9aecbce6aba5b9b16de815cadad3d2b',
 * // value: '100000000',
 * // from: 'cdc7e277d9aecbce6aba5b9b16de815cadad3d2a',
 * // r:
 * //  'a657713d295f159566fd1a8618cc12931e965b0f9a509a7125d2572fba73a3c1',
 * // metadata: null,
 * // s:
 * //  'c46bf8706053e9809064bd8d0f89c6ac0c963bc4b274a31cf8922ff9db858fd',
 * // v: '1b',
 * // nonce: 19,
 * // src: 'source removed.',
 * // bin: 'bin removed.',
 * // 'bin-runtime': 'bin-runtime removed.',
 * // xabi: 'xabi removed.' }
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~SendArgs} sendTx This describes the recipient, amount of tokens and the chain id (optional) for
 * the token transfer
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~TxResultWrapper} If `options.async` is set, only the hashes are populated, otherwise all the
 * field are populated
 */
async function send(user, sendTx:SendTx, options:Options) {
  const [pendingTxResult] = await api.send(user, sendTx, options);

  if (options.isAsync) {
    return pendingTxResult;
  }

  const resolvedResult = await resolveResult(user, pendingTxResult, options);
  return resolvedResult.data.contents;
}

/**
 * @static
 * This function send multiple token transfer transactions to STRATO
 * @example
 *
 * const sendArgs = {
 *   toAddress: "cdc7e277d9aecbce6aba5b9b16de815cadad3d2b",
 *   value: 100000000
 * };
 *
 * const result = await rest.send(stratoUser, [sendArgs], options);
 * // Returns
 * // [{ hash:
 * //  '168f76ccf50582953d2fc9cbdc3bb60bd777562662dd9a2330ef29edab282a5c',
 * // gasLimit: 32100000000,
 * // codeOrData: '',
 * // chainId: null,
 * // gasPrice: 1,
 * // to: 'cdc7e277d9aecbce6aba5b9b16de815cadad3d2b',
 * // value: '100000000',
 * // from: 'cdc7e277d9aecbce6aba5b9b16de815cadad3d2a',
 * // r:
 * //  'a657713d295f159566fd1a8618cc12931e965b0f9a509a7125d2572fba73a3c1',
 * // metadata: null,
 * // s:
 * //  'c46bf8706053e9809064bd8d0f89c6ac0c963bc4b274a31cf8922ff9db858fd',
 * // v: '1b',
 * // nonce: 19,
 * // src: 'source removed.',
 * // bin: 'bin removed.',
 * // 'bin-runtime': 'bin-runtime removed.',
 * // xabi: 'xabi removed.' }]
 *
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~SendArgs[]} sendTx This describes the recipient, amount of tokens and the chain id (optional) for
 * the token transfer
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~TxResultWrapper[]} If `options.async` is set, only the hashes are populated, otherwise all the
 * field are populated
 */
async function sendMany(user, sendTxs:SendTx[], options:Options) {
  const pendingTxResults = await api.sendTransactions(
    user,
    {
      txs: sendTxs.map(tx => api.getSendArgs(tx, options))
    },
    options
  );

  if (options.isAsync) {
    return pendingTxResults.map(r => r.hash);
  }

  const resolvedResults = await resolveResults(user, pendingTxResults, options);
  return resolvedResults.map(r => r.data.contents);
}

// =====================================================================
//   search
// =====================================================================

/**
 * @static
 * This function searches for a specific contract
 * @example
 *
 * const globalConfig = fsUtil.getYaml("config.yaml");
 * const options = { config: globalConfig, logger: console };
 * const queryOptions = {
 *   ...options,
 *   query: {}
 * };
 * const searchResults = await rest.search(
 *  stratoUser,
 *  { name: "SimpleStorage" },
 *  queryOptions
 * );
 * // Returns
 * // [ { address: '2793d0f3afc31720ef18f6736073154e9131b21e',
 * //     chainId: '',
 * //     block_hash:
 * //      '5f306c319d9493fa77d14516e6fa12accc9e6a1b31b3e32ea016270e529b5cda',
 * //     block_timestamp: '2020-08-04 15:59:20 UTC',
 * //     block_number: '5',
 * //     transaction_hash:
 * //      '3e6ed2346d35c38c2c87c9cdb5603d914998886e7110675db840ff870fe55784',
 * //     transaction_sender: '28aced430a5121bbc8613e8415583c47cb9a4516',
 * //     transaction_function_name: '',
 * //     storedData: 10 } ]
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract} contracts This the contract to search for
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Object} If `options.async` is set, only the hashes are populated, otherwise all the
 * field are populated
 */

async function search(user:OAuthUser, contract:Contract, options:Options) {
  try {
    const results = await api.search(user, contract, options);
    return results;
  } catch (err) {
    if (err.response && err.response.status === RestStatus.NOT_FOUND) {
      return [];
    }
    throw err;
  }
}

/**
 * @static
 * This function searches for a specific contract until a particular condition is met
 * @example
 *
 * const globalConfig = fsUtil.getYaml("config.yaml");
 * const options = { config: globalConfig, logger: console };
 * const queryOptions = {
 *   ...options,
 *   query: {}
 * };
 * // predicate is created: to wait until response is available otherwise throws the error
 * function predicate(data) {};
 * const result = await rest.searchUntil(stratoUser, {name: "SimpleStorage"}, predicate, queryOptions);
 * // Returns
 * // [ { address: '60fb089dc62858df014819d618aa3f43391ddb9c',
 * //     chainId: '',
 * //     block_hash:
 * //      'fb7edc20a2678ca60024f81d926d1637eb418012beae2fedb7e7c4250406ea82',
 * //     block_timestamp: '2020-08-04 20:48:18 UTC',
 * //     block_number: '3',
 * //     transaction_hash:
 * //      '32321367696882da2feb9483fa31346f68abf77cc1a01ace6ef5a2b774bc8d38',
 * //     transaction_sender: '594f19ad4a55d6434711a51f628f22abf4afc55a',
 * //     transaction_function_name: '',
 * //     storedData: 10 } ]
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract} contract This the contract to search for
 * @param {Object} predicate This identifies the predicate that determines when to stop the search
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Object} If `options.async` is set, only the hashes are populated, otherwise all the
 * field are populated
 */

async function searchUntil(user:OAuthUser, contract:Contract, predicate, options:Options) {
  const action = async o => {
    return search(user, contract, o);
  };

  const results = await util.until(predicate, action, options);
  return results;
}

/**
 * @static
 * This function searches for a specific contract with a content range
 * @example
 *
 * const globalConfig = fsUtil.getYaml("config.yaml");
 * const options = { config: globalConfig, logger: console };
 * const queryOptions = {
 *   ...options,
 *   query: {}
 * };
 * const result = await rest.searchWithContentRange(stratoUser, { name: "SimpleStorage" }, queryOptions);
 * // Returns
 * // { data:
 * //    [ { address: '1db4cdb5051bceb5fd0cfa8f186472bd47b5a29e',
 * //        chainId: '',
 * //        block_hash:
 * //         '202f910a94fe10b5f0e2fa1ab40cfad94dada3d5cd38a46255bfbb168d7f2229',
 * //        block_timestamp: '2020-08-06 14:41:05 UTC',
 * //        block_number: '2',
 * //        transaction_hash:
 * //         '5cdeb87bdcce330b0c4c69bc78b1320773374c0db6423abc4806f43f545a14ca',
 * //        transaction_sender: 'd7b9e349d779247462aedfce35cdaf9b1eb495dc',
 * //        transaction_function_name: '',
 * //        storedData: 0 } ],
 * //   contentRange: { start: 0, end: 0, count: 1 } }
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract} contract This the contract to search for
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Object} If `options.async` is set, only the hashes are populated, otherwise all the
 * field are populated
 */

async function searchWithContentRange(user:OAuthUser, contract:Contract, options:Options) {
  try {
    const results = await api.searchWithContentRange(user, contract, options);
    return results;
  } catch (err) {
    if (err.response && err.response.status === RestStatus.NOT_FOUND) {
      return {};
    }
    throw err;
  }
}

/**
 * @static
 * This function searches for a specific contract in a specific range
 * @example
 *
 * const globalConfig = fsUtil.getYaml("config.yaml");
 * const options = { config: globalConfig, logger: console };
 * const queryOptions = {
 *   ...options,
 *   query: {}
 * };
 * // predicate is created: to wait until response is available otherwise throws the error
 * function predicate(response) {
 *  return response.data.length >= 4;
 * }
 * const result = await rest.searchWithContentRangeUntil(stratoUser, contracts[0], predicate, queryOptions);
 * // Returns
 * // { data:
 * //    [ { address: '07c9cb29ac43fe2257143074fb344203accb53eb',
 * //        chainId: '',
 * //        block_hash:
 * //         '0e39030b10d80e5abaaf90a4b2d2322644fbb7b3b5cc0c8ea52a95d91adcd4ff',
 * //        block_timestamp: '2020-08-05 16:49:28 UTC',
 * //        block_number: '2',
 * //        transaction_hash:
 * //         '8c05b2ad6e8759122856c00f0646793073e0982d64ebd30ab3fb55a33da5cecf',
 * //        transaction_sender: 'ebc383a8d64c07b3f472da8612bb463cf338c0b4',
 * //        transaction_function_name: '',
 * //        intValue: 2000,
 * //        stringValue: '_2000_' },
 * //      { address: '64560dd4c8789663303e97937f732976d98dab95',
 * //        chainId: '',
 * //        block_hash:
 * //         '6840a306239c9f0e31359f9950a12e2a3595690273d38ce52bae970e26cd80e6',
 * //        block_timestamp: '2020-08-05 16:49:29 UTC',
 * //        block_number: '3',
 * //        transaction_hash:
 * //         '07e8b895559737c76e5323d3b2f1e6c893a91d68eb6fa08c6fb461133c37e4ad',
 * //        transaction_sender: 'ebc383a8d64c07b3f472da8612bb463cf338c0b4',
 * //        transaction_function_name: '',
 * //        intValue: 2001,
 * //        stringValue: '_2001_' },
 * //      { address: '9f7f1f4a6479463145bab645b64acecc230f9332',
 * //        chainId: '',
 * //        block_hash:
 * //         '50c25b7e693904b545bc7b9003c0eb57a6149d0bd42f12aac72962e01ae8588a',
 * //        block_timestamp: '2020-08-05 16:49:30 UTC',
 * //        block_number: '4',
 * //        transaction_hash:
 * //         '3a5e19730a8f32d71a707c78349c418375010d3ff98c74aa0f9156477ba98822',
 * //        transaction_sender: 'ebc383a8d64c07b3f472da8612bb463cf338c0b4',
 * //        transaction_function_name: '',
 * //        intValue: 2002,
 * //        stringValue: '_2002_' },
 * //      { address: 'c1307553863b1a932f2a5d994926b64ecedc890e',
 * //        chainId: '',
 * //        block_hash:
 * //         '1e674f96f42c08897d51ede082c95756493c26deb552588f854c44aa6f5adc4a',
 * //        block_timestamp: '2020-08-05 16:49:31 UTC',
 * //        block_number: '5',
 * //        transaction_hash:
 * //         'f93499e6e003d993ea5b2bf38d581da7e988a61c6a4077ebf60a242782e95b9c',
 * //        transaction_sender: 'ebc383a8d64c07b3f472da8612bb463cf338c0b4',
 * //        transaction_function_name: '',
 * //        intValue: 2003,
 * //        stringValue: '_2003_' } ],
 * //   contentRange: { start: 0, end: 3, count: 4 } }
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract} contract This the contract to search for
 * @param {Object} predicate This identifies the predicate that determines when to stop the search
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~TxResultWrapper[]} If `options.async` is set, only the hashes are populated, otherwise all the
 * field are populated
 */

async function searchWithContentRangeUntil(user:OAuthUser, contract:Contract, predicate, options:Options) {
  const action = async o => {
    return searchWithContentRange(user, contract, o);
  };

  const results = await util.until(predicate, action, options);
  return results;
}

// =====================================================================
//   Chains
// =====================================================================

/**
 * @static
 * This function returns info about a private chain given its chainID
 * @example
 *
 * const globalConfig = fsUtil.getYaml("config.yaml");
 * const options = { config: globalConfig, logger: console };
 * const queryOptions = {
 *   ...options,
 *   query: {}
 * };
 * const chainId = await rest.createChain(stratoUser, chain, contract, options);
 * const result = await rest.getChain(stratoUser, chainId, options);
 * // Returns
 * // { id:
 * //    'f99d95cf739bb7cc66fe16e352cd346def7d3c4b3f145f859072a2aae7119344',
 * //   info:
 * //    { balances: [ [Object], [Object] ],
 * //      members: [ [Object] ],
 * //      label: 'airline-2' } }
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~ChainHash} chainID This must be the chainID of an existing private chain
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~ChainInfo} Info about requested chain
 */

async function getChain(user:OAuthUser, chainId:string, options:Options) {
  const results = await api.getChains([chainId], setAuthHeaders(user, options));
  return results && results.length > 0 ? results[0] : {};
}

/**
 * @static
 * This function returns info about multiple private chains given an array of chain IDs
 * @example
 *
 * const globalConfig = fsUtil.getYaml("config.yaml");
 * const options = { config: globalConfig, logger: console };
 * const queryOptions = {
 *   ...options,
 *   query: {}
 * };
 * const result = await rest.getChains(stratoUser, [], options);
 * // Returns
 * // [ { id:
 * //      'f99d95cf739bb7cc66fe16e352cd346def7d3c4b3f145f859072a2aae7119344',
 * //     info: { balances: [Array], members: [Array], label: 'airline-2' } },
 * //   { id:
 * //      'a72d6955662b1d2da4d338f8c87833592ebc490938308a42d3d528180ae55530',
 * //     info: { balances: [Array], members: [Array], label: 'airline-3' } },
 * //   { id:
 * //      '9f3a050a34faaab7d6d4c5c17bd70b0d1c2c9a6d40c1681323167fb43407bf18',
 * //     info: { balances: [Array], members: [Array], label: 'airline-5' } } ]
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~ChainHash[]} chainIDs This must be the array of chainIDs of existing private chains
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~ChainInfo[]} Info about requested chain(s)
 */

async function getChains(user:OAuthUser, chainIds:string[], options:Options) {
  const results = await api.getChains(chainIds, setAuthHeaders(user, options));
  return results;
}

/**
 * @static
 * This function creates a private chain based on arguments given
 * @example
 * const createChainArgs = (uid, members) => {
 *  const contractName = `TestContract_${uid}`;
 *  const memberList = members.map(address => {
 *    return { address: address, enode };
 *  });
 *  const balanceList = members.map(address => {
 *    return { address: address, balance };
 *  });
 *
 *  const chain = {
 *    label: `airline-${uid}`,
 *    src: `contract ${contractName} { }`,
 *    members: memberList,
 *    balances: balanceList,
 *    contractName
 *  };
 *
 *  return { chain, contractName };
 *
 *  };
 *  const uid = 5;
 *  const { chain, contractName: name } = createChainArgs(uid, [
 *    stratoUser.address
 *  ]);
 * const chainId = await rest.createChain(stratoUser, chain, contract, options);
 * // Returns
 * // "a72d6955662b1d2da4d338f8c87833592ebc490938308a42d3d528180ae55530"
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Chain} chain This must be the object containing the arguments for the chain
 * @param {module:rest~Contract} contract This must be the name of the contract
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {module:rest~ChainHash} Hash of the newly created chain
 */

async function createChain(user:OAuthUser, chain:Chain, contract:Contract, options:Options) {
  const result = await api.createChain(
    {
      ...chain,
      contract: contract.name,
      metadata: constructMetadata(options, contract.name)
    },
    setAuthHeaders(user, options)
  );
  return result;
}

async function createChains(user, chains, options:Options) {
  const result = await api.createChains(chains, setAuthHeaders(user, options));
  return result;
}

// =====================================================================
//   External Storage
//   Deprecated in STRATO 7.5 (#deprecate-7.5)
// =====================================================================

async function uploadExtStorage(user, args, options:Options) {
  const result = await api.uploadExtStorage(
    args,
    setAuthHeaders(user, options)
  );
  return result;
}

async function attestExtStorage(user, args, options:Options) {
  const result = await api.attestExtStorage(
    args,
    setAuthHeaders(user, options)
  );
  return result;
}

async function verifyExtStorage(user, contract, options:Options) {
  const result = await api.verifyExtStorage(user, contract, options);
  return result;
}

async function downloadExtStorage(user, contract, options:Options) {
  const result = await api.downloadExtStorage(user, contract, options);
  return result;
}

async function listExtStorage(user, args, options:Options) {
  const result = await api.listExtStorage(user, args, options);
  return result;
}

// =====================================================================
//   OAuth
// =====================================================================

/**
 * @static
 * This function checks if the user is authenticated
 * @example
 *
 * const globalConfig = fsUtil.getYaml("config.yaml");
 * const options = { config: globalConfig, logger: console };
 * const queryOptions = {
 *   ...options,
 *   query: {}
 * };
 * const result = await rest.pingOauth(stratoUser, options);
 *
 * // Returns
 * // 'success'
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {String}
 */

async function pingOauth(user, options:Options) {
  const response = await api.pingOauth(user, options);
  return response;
}

// =====================================================================
//  Debugging
// =====================================================================

async function debugStatus(user:OAuthUser, options:Options) {
  const response = await api.debugStatus(user, options);
  return response;
}

async function debugPause(user:OAuthUser, options:Options) {
  const response = await api.debugPause(user, options);
  return response;
}

async function debugResume(user:OAuthUser, options:Options) {
  const response = await api.debugResume(user, options);
  return response;
}

async function debugGetBreakpoints(user:OAuthUser, options:Options) {
  const response = await api.debugGetBreakpoints(user, options);
  return response;
}

async function debugPutBreakpoints(user:OAuthUser, args, options:Options) {
  const response = await api.debugPutBreakpoints(user, args, options);
  return response;
}

async function debugDeleteBreakpoints(user:OAuthUser, args, options:Options) {
  const response = await api.debugDeleteBreakpoints(user, args, options);
  return response;
}

async function debugClearBreakpoints(user:OAuthUser, options:Options) {
  const response = await api.debugClearBreakpoints(user, options);
  return response;
}

async function debugClearBreakpointsPath(user:OAuthUser, path:string, options:Options) {
  const response = await api.debugClearBreakpointsPath(user, path, options);
  return response;
}

async function debugStepIn(user:OAuthUser, options:Options) {
  const response = await api.debugStepIn(user, options);
  return response;
}

async function debugStepOver(user:OAuthUser, options:Options) {
  const response = await api.debugStepOver(user, options);
  return response;
}

async function debugStepOut(user:OAuthUser, options:Options) {
  const response = await api.debugStepOut(user, options);
  return response;
}

async function debugGetStackTrace(user:OAuthUser, options:Options) {
  const response = await api.debugGetStackTrace(user, options);
  return response;
}

async function debugGetVariables(user:OAuthUser, options:Options) {
  const response = await api.debugGetVariables(user, options);
  return response;
}

async function debugGetWatches(user:OAuthUser, options:Options) {
  const response = await api.debugGetWatches(user, options);
  return response;
}

async function debugPutWatches(user:OAuthUser, args, options:Options) {
  const response = await api.debugPutWatches(user, args, options);
  return response;
}

async function debugDeleteWatches(user:OAuthUser, args, options:Options) {
  const response = await api.debugDeleteWatches(user, args, options);
  return response;
}

async function debugClearWatches(user:OAuthUser, options:Options) {
  const response = await api.debugClearWatches(user, options);
  return response;
}

async function debugPostEval(user:OAuthUser, args, options:Options) {
  const response = await api.debugPostEval(user, args, options);
  return response;
}

async function debugPostParse(user:OAuthUser, args, options:Options) {
  const response = await api.debugPostParse(user, args, options);
  return response;
}

async function debugPostAnalyze(user:OAuthUser, args, options:Options) {
  const response = await api.debugPostAnalyze(user, args, options);
  return response;
}

async function debugPostFuzz(user:OAuthUser, args, options:Options) {
  const response = await api.debugPostFuzz(user, args, options);
  return response;
}

// =====================================================================
//   Common patterns used in applications
// =====================================================================

/**
 * @static
 * This function gives back information (including the address) given a contract
 * @example
 *
 * const globalConfig = fsUtil.getYaml("config.yaml");
 * const options = { config: globalConfig, logger: console };
 * const queryOptions = {
 *   ...options,
 *   query: {}
 * };
 * const result = await rest.waitForAddress(stratoUser, contract, queryOptions);
 *
 * // Returns
 * // { address: '2b755e392056c9b58f4f71da7ea8f47f553dd50b',
 * //   chainId: '',
 * //   block_hash:
 * //    '4cd55ea1189677fc32be1b4bbd9f93d75c81610c7bafb4f09964197a6b3096fa',
 * //   block_timestamp: '2020-08-12 16:14:16 UTC',
 * //   block_number: '2',
 * //   transaction_hash:
 * //    'f67484a3c5b9a1c57a66d843ee8e9dc72280336f6dccd8ec798873a64fb61f2d',
 * //   transaction_sender: 'b311acca558955c4b6296306f0e4a7ee0eb8f13d',
 * //   transaction_function_name: '',
 * //   storedData: 0 }
 * @param {module:rest~User} user This must contain the token for the user
 * @param {module:rest~Contract} contract This must be the name of the contract
 * @param {module:rest~Options} options This identifies the options and configurations for this call
 * @returns {Object} Returns an object with information including the address, given a contract
 */

async function waitForAddress(user, contract, _options:Options) {
  const options = Object.assign(
    {
      query: {
        address: `eq.${contract.address}`
      }
    },
    _options
  );

  function predicate(response) {
    return (
      response !== undefined &&
      response.length != undefined &&
      response.length > 0
    );
  }

  const results = await searchUntil(user, contract, predicate, options);
  return results[0];
}

export default {
  fill,
  getAccounts,
  getHealth,
  getStatus,
  getVersion,
  createUser,
  compileContracts,
  createContract,
  createContractList,
  getBlocResults,
  getContracts,
  getState,
  getArray,
  call,
  callList,
  //
  resolveResult,
  resolveResults,
  //
  getKey,
  createKey,
  createOrGetKey,
  //
  send,
  sendMany,
  //
  search,
  searchUntil,
  searchWithContentRange,
  searchWithContentRangeUntil,
  //
  createChain,
  createChains,
  getChain,
  getChains,
  //
  uploadExtStorage,
  attestExtStorage,
  verifyExtStorage,
  downloadExtStorage,
  listExtStorage,
  //
  pingOauth,
  //
  debugStatus,
  debugPause,
  debugResume,
  debugGetBreakpoints,
  debugPutBreakpoints,
  debugDeleteBreakpoints,
  debugClearBreakpoints,
  debugClearBreakpointsPath,
  debugStepIn,
  debugStepOver,
  debugStepOut,
  debugGetStackTrace,
  debugGetVariables,
  debugGetWatches,
  debugPutWatches,
  debugDeleteWatches,
  debugClearWatches,
  debugPostEval,
  debugPostParse,
  debugPostAnalyze,
  debugPostFuzz,
  //
  RestError,
  response,
  //
  waitForAddress
};
