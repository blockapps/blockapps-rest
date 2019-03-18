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

async function sleep(milli) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, milli)
  })
}

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

function iuid() {
  return this.uid(undefined, 12);
}

function getArgInt(argName, defaultValue) {
  const index = process.argv.indexOf(argName);
  if (index <= 0) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Argument not found ${argName}`);
  }
  const stringValue = process.argv[index + 1];
  const intValue = parseInt(stringValue);
  if (isNaN(intValue)) throw new Error(`Invalid int value for ${argName} : ${stringValue}`);
  return intValue;
}

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

function toCsv(array) {
  return array.reduce(function (prevVal, elem) {
    return prevVal + (prevVal.length > 0 ? ',' : '') + elem;
  }, '');
}

/*
 * standard http response wrapper
 */
const response = {
  status(code, res, payload) {
    if (code < 300) {
      res.status(code).json({
        success: true,
        data: payload || {},
      });
    } else {
      res.status(code).json({
        success: false,
        //        error: JSON.stringify(payload),
        error: payload,
      });
    }
  },

  status200: function (res, data) {
    res.status(200).json({
      success: true,
      data: data || {},
    });
  },

  status201: function (res, data) {
    res.status(201).json({
      success: true,
      data: data || {},
    });
  },

  status400: function (res, error) {
    res.status(400).json({
      success: false,
      error: JSON.stringify(error),
    });
  },

  status500: function (res, error) {
    res.status(500).json({
      success: false,
      error: JSON.stringify(error),
    });
  },
}

export {
  cwd,
  isAddress,
  isHash,
  uid,
  usc,
  sleep,
  until,
  timeout,
  iuid,
  getArgInt,
  filter_isContained,
  toCsv,
  response
}
