import rest from '../rest_7'
import { cwd, usc } from '../util'
import fsUtil from '../fsUtil'

import ip from 'ip'

const config = fsUtil.getYaml(`${cwd}/barf/test/config.yaml`)
const {publicKey, port} = config.nodes[0]

const localIp = ip.address();
const enode = `enode://${publicKey}@${localIp}:${port}`
const balance = 100000000000000000000;

/*
  users
 */
async function createAdmin(_args, options) {
  // OAuth
  if (_args.token !== undefined) {
    return rest.createUser(_args, options)
  }
  // Bloc
  const username = `admin_${_args.uid}`
  const args = { username, password: _args.password || '1234' }
  const user = await rest.createUser(args, options)
  return user
}

function createContractArgs(uid, args = {}) {
  const name = `TestContract_${uid}`
  const source = `contract ${name} { }`
  return { name, source, args: usc(args) } // TODO flow contractArgs object
}

function createContractSyntaxErrorArgs(uid, args = {}) {
  const name = `TestContract_${uid}`
  const source = `contract ${name} { zzz zzz }`
  return { name, source, args: usc(args) } // TODO flow contractArgs object
}

function createContractConstructorArgs(uid, args = {}) {
  const name = `TestContract_${uid}`
  const source = `
contract ${name} {
  uint var_uint;
  constructor(uint _arg_uint) {
    var_uint = _arg_uint;
  }   
}
`
  return { name, source, args: usc(args) } // TODO flow contractArgs object
}

async function createContractFromFile(filename, uid, constructorArgs) {
  const name = `TestContract_${uid}`
  const source = fsUtil.get(filename).replace('TestContract', name)
  return { name, source, args: usc(constructorArgs) } // TODO flow contractArgs object
}

function createSendTxArgs(toAddress, value = 10) {
  return { value, toAddress }
}

function createSendTxArgsArr(toAddress, value = 10, count = 2) {
  let sendTxs = [];

  for (let i = 0; i < count; i++) {
    sendTxs.push({ value: value + i, toAddress })
  }

  return sendTxs;
}

function createCallArgs(contract, args, method = 'multiply', value = 0) {
  return {
    contract,
    method,
    args: usc(args),
    value,
  }
}

function createCallListArgs(contract, args, method = 'multiply', value, count = 2) {
  const callArgsList = []

  for (let i = 0; i < count; i++) {
    callArgsList.push(createCallArgs(contract, args, method, value))
  }

  return callArgsList;
}

 const createChainArgs = (uid, members) => {
  const contractName = `TestContract_${uid}`
  const memberList = members.map((address) => { return ({ address: address, enode }) });
  const balanceList = members.map((address) => { return ({ address: address, balance }) });

   const chain = {
    label: `airline-${uid}`,
    src: `contract ${contractName} { }`,
    args: {},
    members: memberList,
    balances: balanceList,
    contractName
  }

   return (
    { chain, contractName}
  )
}

export default {
  createAdmin,
  createContractArgs,
  createContractSyntaxErrorArgs,
  createContractConstructorArgs,
  createContractFromFile,
  createSendTxArgs,
  createSendTxArgsArr,
  createCallArgs,
  createCallListArgs,
  createChainArgs
}
