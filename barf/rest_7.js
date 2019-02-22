let config

const api = require('./api_7')

async function users(args, options = {}) {
  options.config = config
  const address = await api.users(args, options)
  return address
}

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
  users,
}
