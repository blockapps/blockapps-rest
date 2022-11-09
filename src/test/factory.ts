import rest from "../rest";
import util from "../util/util";
import fsUtil from "../util/fsUtil";
import assert from "../util/assert";
import BigNumber from "bignumber.js";
import { Chain, Options, SendTx } from "../types"

import * as ip from "ip";

const config = getTestConfig();
const { publicKey, port } = config.nodes[0];

const localIp = ip.address();
const enode = `enode://${publicKey}@${localIp}:${port}`;
const balance = 100000000000000000000; // TODO express in ether

function getTestConfig() {
  const config = fsUtil.getYaml(`${util.cwd}/lib/test/fixtures/config.yaml`);
  assert.isDefined(config, "config should be defined");
  assert.isDefined(config.nodes, "config.nodes should be defined");
  assert.isArray(config.nodes, "config.nodes should be an array");
  assert.isAbove(
    config.nodes.length,
    0,
    "config.nodes should have at least one node"
  );
  return config;
}

function getTestFixtures() {
  return `${util.cwd}/lib/test/fixtures/`;
}

/*
  users
 */
async function createAdmin(_args, options:Options) {
  return rest.createUser(_args, options);
}

function createCompileContractsArgs(count) {
  const uid = util.uid();
  const contracts = Array.from(Array(count).keys()).map(index => {
    const contractUid = parseInt(uid) * 1000 + index;
    const contractName = `TestContract_${contractUid}`;
    const source = `contract ${contractName} { }`;

    return { contractName, source };
  })

  return contracts;
}

function createContractArgs(uid, args = {}) {
  const name = `TestContract_${uid}`;
  const source = `contract ${name} { }`;
  return { name, source, args: util.usc(args) }; // TODO flow contractArgs object
}

function createContractListArgs(count, args = {}) {
  const uid = util.uid();
  const contracts = Array.from(Array(count).keys()).map(index => {
    const contractUid = parseInt(uid) * 1000 + index;
    return createContractArgs(contractUid, args);
  });
  return contracts;
}

function createContractSyntaxErrorArgs(uid, args = {}) {
  const name = `TestContract_${uid}`;
  const source = `contract ${name} { zzz zzz }`;
  return { name, source, args: util.usc(args) }; // TODO flow contractArgs object
}

function createContractConstructorArgs(uid, args = {}) {
  const name = `TestContract_${uid}`;
  const source = `
contract ${name} {
  uint var_uint;
  constructor(uint _arg_uint) {
    var_uint = _arg_uint;
  }   
}
`;
  return { name, source, args: util.usc(args) }; // TODO flow contractArgs object
}

async function createContractFromFile(filename, uid, constructorArgs = {}) {
  const name = `TestContract_${uid}`;
  const source = fsUtil.get(filename).replace("TestContract", name);
  return { name, source, args: util.usc(constructorArgs) }; // TODO flow contractArgs object
}

function createSendTxArgs(toAddress, value = 10):SendTx {
  return { value, toAddress };
}

function createSendTxArgsArr(toAddress, value = 10, count = 2) {
  let sendTxs = [];

  for (let i = 0; i < count; i++) {
    sendTxs.push({ value: value + i, toAddress });
  }

  return sendTxs;
}

function createCallArgs(contract, method, args = {}, value:BigNumber = new BigNumber(0)) {
  return {
    contract,
    method,
    args: util.usc(args),
    value
  };
}

function createCallListArgs(contract, method, args, value, count = 2) {
  const callArgsList = [];

  for (let i = 0; i < count; i++) {
    callArgsList.push(createCallArgs(contract, method, args, value));
  }

  return callArgsList;
}

const createChainArgs = (uid, members) => {
  const contractName = `TestContract_${uid}`;
  const memberList = members.map(address => {
    return { orgName: 'BlockApps', access: true };
  });
  const balanceList = members.map(address => {
    return { address: address, balance };
  });

  const chain:Chain = {
    label: `airline-${uid}`,
    src: `contract ${contractName} { }`,
    args: {},
    members: memberList,
    balances: balanceList,
    contractName
  };

  return { chain, contractName };
};

export default {
  createAdmin,
  createContractArgs,
  createContractListArgs,
  createContractSyntaxErrorArgs,
  createContractConstructorArgs,
  createContractFromFile,
  createSendTxArgs,
  createSendTxArgsArr,
  createCallArgs,
  createCallListArgs,
  createChainArgs,
  createCompileContractsArgs,
  getTestConfig,
  getTestFixtures
};
