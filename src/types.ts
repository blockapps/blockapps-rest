
import { OAuthConfig } from "./util/oauth.util";

import BigNumber from "bignumber.js";

interface Options {
  config: Config,
  node?:number,
  headers?:any,
  params?:any,
  getFullResponse?:boolean,
  cacheNonce?:boolean,
  isAsync?: boolean,
  isDetailed?: boolean,
  stateQuery?: any,
  query?: any,
  logger?:Console,
  chainIds?:any,
  history?:any,
  doNotResolve?:boolean
}

interface Config {
  nodes:Node[],
  apiDebug:boolean,
  VM?:"SolidVM" | "EVM",
  timeout?:number,
  contractsPath?:string
}  

interface Node {
  url:string,
  oauth:OAuthConfig
}

interface Member {
}

interface Balance {
}

interface Chain {
  label:string,
  src?:string,
  args:any,
  members:Member[],
  balances:Balance[],
  contractName?:string,
  codePtr?: {
    name: string,
    account: string
  }
}

interface StratoUser {
  password:string,
  username:string,
}

interface BlockChainUser {
  token:string,
  address:string
}

interface OAuthUser {
  token:string
}

interface ContractDefinition {
  source:string,
  name:string,
  args:any,
  chainid?:any,
  txParams?:any
}

interface Contract {
  name: string,
  address?: string,
  src?:string,
  bin?:any,
  codeHash?:any,
  chainId?:any
}

interface SendTx {
  toAddress:string,
  value:number,
  chainId?:string
}

interface TransactionResultHash {
  hash:any
}

interface CallArgs {
  contract: Contract,
  method: string,
  args: any,
  value?:BigNumber,
  chainid?:any,
  txParams?:any
}

export {
  Options,
  Config,
  StratoUser,
  OAuthUser,
  BlockChainUser,
  Contract,
  ContractDefinition,
  TransactionResultHash,
  CallArgs,
  Member,
  Balance,
  Chain,
  SendTx
};
