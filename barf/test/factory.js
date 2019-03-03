import rest from '../rest_7'
import util from '../util'
import fsUtil from '../fsUtil'

/*
  users
 */
async function createAdmin(uid, options, password = '1234') {
  const username = `admin_${uid}`
  const userArgs = { username, password }
  const user = await rest.createUser(userArgs, options)
  return user
}

function createContractArgs(uid, args = {}) {
  const name = `TestContract_${uid}`
  const source = `contract ${name} { }`
  return { name, source, args: util.usc(args) } // TODO flow contractArgs object
}

function createContractSyntaxErrorArgs(uid, args = {}) {
  const name = `TestContract_${uid}`
  const source = `contract ${name} { zzz zzz }`
  return { name, source, args: util.usc(args) } // TODO flow contractArgs object
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
  return { name, source, args: util.usc(args) } // TODO flow contractArgs object
}

async function createContractFromFile(filename, uid, constructorArgs) {
  const name = `TestContract_${uid}`
  const source = fsUtil.get(filename).replace('TestContract', name)
  return { name, source, args: util.usc(constructorArgs) } // TODO flow contractArgs object
}

export default {
  createAdmin,
  createContractArgs,
  createContractSyntaxErrorArgs,
  createContractConstructorArgs,
  createContractFromFile,
}
