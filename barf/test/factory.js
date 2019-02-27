const { usc } = require('../util')

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
  constructor(uint _arg_uint) {
  }   
}
`
  return { name, source, args: usc(args) } // TODO flow contractArgs object
}

module.exports = {
  createContractArgs,
  createContractSyntaxErrorArgs,
  createContractConstructorArgs,
}
