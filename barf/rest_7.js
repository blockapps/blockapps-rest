const api = require('./api_7')

// /users
async function getUsers(args, options) {
  const users = await api.getUsers(args, options)
  return users
}

// /users/:username
async function getUser(args, options) {
  const [address] = await api.getUser(args, options)
  return address
}

// /users/:username
async function createUser(args, options) {
  const address = await api.createUser(args, options)
  const user = Object.assign(args, { address })
  // async creation
  if (options.isAsync) {
    return { address, user }
  }
  // otherwise - block for faucet fill call
  const txResult = await fill(user, options);
  return { address, user }
}

async function fill(user, options) {
  const body = {}
  const txResult = await api.fill(user, body, options)
  return txResult;
}

async function createContract(user, contract, args, options) {
  const txParams = options.txParams || {} // TODO generalize txParams
  const resolve = !options.doNotResolve
  const body = {
    password: user.password,
    contract: contract.name,
    src: contract.source,
    args,
    txParams,
    metadata: constructMetadata(options, contract.name)
  }
  const result = await api.createContract(user, contract, body, options)
  return result
}

/////////////////////////////////////////////// util

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

/////////////////////////////////////////////// tests

async function testAsync(args) {
  return args
}

async function testPromise(args) {
  return new Promise((resolve, reject) => {
    if (args.success) {
      resolve(args)
    } else {
      reject(args)
    }
  })
}

module.exports = {
  testAsync,
  testPromise,
  getUsers,
  getUser,
  createUser,
  createContract,
}
