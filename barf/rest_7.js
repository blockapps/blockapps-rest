const api = require('./api_7')

async function getUsers(args, options) {
  const usersArray = await api.getUsers(args, options)
  return usersArray
}

async function getUser(args, options) {
  const [address] = await api.getUser(args, options)
  return address
}

async function createUser(args, options) {
  const address = await api.createUser(args, options)
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
  getUsers,
  getUser,
  createUser,
}
