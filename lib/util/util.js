import path from 'path'

// odds
const cwd = path.resolve(process.cwd())

/**
 * @see https://github.com/ethereum/go-ethereum/blob/aa9fff3e68b1def0a9a22009c233150bf9ba481f/jsre/ethereum_js.go
 *
 * Checks if the given string is an address
 *
 * @method isAddress
 * @param {String} address the given HEX adress
 * @return {Boolean}
 */
function isAddress(address) {
  // check if it has the basic requirements of an address
  if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
    return false
  }
  // If it's all small caps or all all caps, return true
  if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
    return true
  }
  // Otherwise check each case
  return isChecksumAddress(address)
}

function isHash(hash) {
  return /([A-Fa-f0-9]{64})$/.test(hash)
}

/**
 * Checks if the given string is a checksummed address
 *
 * @method isChecksumAddress
 * @param {String} address the given HEX adress
 * @return {Boolean}
 */
function isChecksumAddress(_address) {
  // Check each case
  const address = _address.replace('0x', '')
  const addressHash = sha3(address.toLowerCase())
  for (let i = 0; i < 40; i++) {
    // the nth letter should be uppercase if the nth digit of casemap is 1
    if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
      return false
    }
  }
  return true
}

/**
 * Generates a unique integer id
 */
function iuid() {
  return this.uid(undefined, 12);
}

function sha3(address) {
  throw new Error('sha3 not found')
}

function uid(prefix, digits = 6) {
  if (digits < 1) digits = 1
  if (digits > 16) digits = 16
  const random = Math.floor(Math.random() * (10 ** digits))
  if (prefix === undefined) return random
  return `${prefix}_${random}`
}

function usc(args) {
  return Object.keys(args).reduce((acc, key) => {
    acc[`_${key}`] = args[key]
    return acc
  }, {})
}

/**
 * Parse a command line argument as an integer
 * @param {*} argName Name of the command line argument
 * @param {*} defaultValue Default value to use if argument is not present
 */
function getArgInt(argName, defaultValue) {
  const index = process.argv.indexOf(argName);
  if (index <= 0 ) {
    if (defaultValue !== undefined ) return defaultValue;
    throw new Error(`Argument not found ${argName}`);
  }
  const stringValue = process.argv[index+1];
  const intValue = parseInt(stringValue);
  if (isNaN(intValue)) throw new Error(`Invalid int value for ${argName} : ${stringValue}`);
  return intValue;
}

async function sleep(milli) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, milli)
  })
}

/**
 * Perform action (a promise) until predicate evaluates to true
 * @param {*} predicate The function that evaluates to a boolean.
 * @param {*} action A promise to invoke. Could be a network request.
 * @param {*} options Ba-rest options
 * @param {*} timeout The length of time to wait before giving up on the predicate
 */

async function until(predicate, action, options, timeout = 60000) {
  const phi = 10
  let dt = 500
  let totalSleep = 0
  while (totalSleep < timeout) {
    const result = await action(options)
    if (predicate(result)) {
      return result
    }
    await sleep(dt)
    totalSleep += dt
    dt += phi
  }
  throw new Error(`until: timeout ${timeout} ms exceeded`)
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check for intersection
 * @param {*} setA A list
 * @param {*} setB Another list
 * @param {*} comparator Comparator to compare elements of setA and setB
 * @param {*} isDebug Debug mode
 */
// TODO: pass options instead of isDebug
 function filter_isContained(setA, setB, comparator, isDebug) {
  if (isDebug) {
    console.log('setA', setA);
    console.log('setB', setB);
  }
  return setA.filter(function (memberA) {
    return !setB.filter(function (memberB) {
      // compare
      return comparator(memberA, memberB);
    }).length > 0; // some items were found in setA that are not included in setB
  });
}

/**
 * Convert an array to a comma separated string
 * @param {*} array List to convert to csv value
 */
function toCsv(array) {
  return array.reduce(function (prevVal, elem) {
    return prevVal + (prevVal.length > 0 ? ',' : '') + elem;
  }, '');
}



export default {
  cwd,
  filter_isContained,
  getArgInt,
  isAddress,
  isHash,
  iuid,
  uid,
  usc,
  sleep,
  until,
  timeout,
  toCsv
}
