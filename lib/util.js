const fs = require('fs');
const yaml = require('js-yaml');

function promiseWhile(Promise) {
  return function(condition, action, payload) {
    var resolver = Promise.defer();

    var loop = function() {
      if (!condition()) {
        return resolver.resolve(payload);
      }
      return Promise.cast(action())
        .then(loop)
        .catch(function(err) {
          //console.log('promiseWhile: error', err);
          resolver.reject(err);
        });
    };

    process.nextTick(loop);

    return resolver.promise;
  };
}

// read a yaml or die
function getYamlFile(yamlFilename) {
  return yaml.safeLoad(fs.readFileSync(yamlFilename, 'utf8'));
}

// recursive promise retry-while-error
function retry(promise, done) {
  return promise()
    .then(function(data) {
      //console.log('retry done', data);
      done();
    })
    .catch(function(err) {
      //console.log('retry ERROR', err);
      return retry(promise, done);
    });
}

function toByteArray(string) {
  var bytes = [];
  for (var i = 0; i < string.length; ++i) {
    bytes.push(string.charCodeAt(i));
  }
  return bytes;
}

function toHexString(byteArray) {
  return byteArray.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

function toAddress(string) {
  return toHexString(toByteArray(string));
}

function filter(array, criterias) {
  return array.filter(function(item) {
    var result = true;
    criterias.map(function(criteria) {
      if(typeof item[criteria[0]] === 'object') {
        // FIXME - WARNING - will not work if not same order !!
        result &= (JSON.stringify(item[criteria[0]]) === JSON.stringify(criteria[1]));
      } else {
        result &= (item[criteria[0]] == criteria[1]);
      }
    });
    return result;
  })
}

function filter_isContained(setA, setB, comparator, isDebug) {
  if (isDebug) {
    console.log('setA', setA);
    console.log('setB', setB);
  }
  return setA.filter(function(memberA) {
    return !setB.filter(function(memberB) {
        // compare
        return comparator(memberA, memberB);
      }).length > 0; // some items were found in setA that are not included in setB
  });
}

function hexEncode8(text) {  
  var hex, i;  
  var result = "";  
  for (i = 0; i < text.length; i++) {    
    hex = text.charCodeAt(i).toString(16);    
    result += ("0" + hex).slice(-2);  
  }  
  return result
}

function hexDecode8(hexString) {  
  var j;  
  var hexes = hexString.match(/.{1,2}/g) || [];  
  var back = "";  
  for (j = 0; j < hexes.length; j++) {    
    back += String.fromCharCode(parseInt(hexes[j], 16));  
  }  
  return back;
}

function fromBytes32(x) { 
  if (x === undefined) return undefined;
  return hexDecode8(x).replace(/\0/g, '');
}

function toBytes32(x) { 
  if (x === undefined) return undefined;
  return ("0".repeat(64) + hexEncode8(x)).slice(-64); 
}

function trimNulls(string) {
  if (string === undefined) return undefined;
  return string.replace(/\0/g, '');
}

/*
 * standard http response wrapper
 */
const response = {
  status(code, res, payload) {
    if (code == 200) {
      res.status(200).json({
        success: true,
        data: payload || {},
      });
    } else {
      res.status(code).json({
        success: false,
        error: payload.toString(),
      });
    }
  },

  status200: function(res, data) {
    res.status(200).json({
      success: true,
      data: data || {},
    });
  },

  status400: function(res, error) {
    res.status(400).json({
      success: false,
      error: error.toString(),
    });
  },

  status500: function(res, error) {
    res.status(500).json({
      success: false,
      error: error.toString(),
    });
  },
}

function trimNulls(source) {
  var trimmed = '';
  for (var i = 0 ; i < source.length ; i++) {
    var char = source[i];
    if (char != '\u0000') trimmed += char;
  }
  return trimmed;
}

function fixBytes(brokenString) {
  return toBytes32(trimNulls(brokenString));
}

function delayPromise(delay) {
  return function(scope) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve(scope);
      }, delay);
    });
  }
}

function trimLeadingZeros(obj) {
  // if array - iterate
  if (Array.isArray(obj)) {
    return obj.map(function(member) {
      return trimLeadingZeros(member);
    });
  }
  // string - trim
  var target = obj;
  while (target.slice(0,1) == '0') {
    // if only one 0 left - return it
    if (target.length == 1) {
      return target;
    }
    // trim one 0
    target = target.slice(1);
  }
  return target;
}


module.exports = {
  response: response,
  trimNulls: trimNulls,
  hexEncode8: hexEncode8,
  hexDecode8: hexDecode8,
  fromBytes32: fromBytes32,
  toBytes32: toBytes32,
  retry: retry,
  toByteArray: toByteArray,
  toHexString: toHexString,
  toAddress: toAddress,
  fixBytes: fixBytes,
  trimNulls: trimNulls,
  trimLeadingZeros: trimLeadingZeros,
  delayPromise: delayPromise,
  promiseWhile: promiseWhile,
  filter: {
    isContained: filter_isContained,
  },

  // generate a unique id
  uid: function(prefix) {
    var time = process.hrtime().toString();
    time = time.replace(',', '');
    time = time.substring(0, time.length - 5);
    const pid_time = process.pid + '_' + time;
    return (prefix === undefined) ? pid_time : prefix + '_' + pid_time;
  },

  forceError: function(done) {
    return function(result) {
      const message = "Should have failed. Instead got result: " + JSON.stringify(result);
      done(new Error(message));
    };
  },

  isValidRejection: function(done) {
    return function(err) {
      // crashed - still an error
      if (err.code === 'ECONNRESET') {
        done(err);
      } else {
        // proper rejection  - great
        console.log("Rejected with message: ", err);
        done();
      }
    };
  },



  /**
   * @see https://github.com/ethereum/go-ethereum/blob/aa9fff3e68b1def0a9a22009c233150bf9ba481f/jsre/ethereum_js.go
   *
   * Checks if the given string is an address
   *
   * @method isAddress
   * @param {String} address the given HEX adress
   * @return {Boolean}
   */
  isAddress: function(address) {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
      // check if it has the basic requirements of an address
      return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
      // If it's all small caps or all all caps, return true
      return true;
    } else {
      // Otherwise check each case
      return isChecksumAddress(address);
    }
  },

  /**
   * Checks if the given string is a checksummed address
   *
   * @method isChecksumAddress
   * @param {String} address the given HEX adress
   * @return {Boolean}
   */
  isChecksumAddress: function(address) {
    // Check each case
    address = address.replace('0x', '');
    var addressHash = sha3(address.toLowerCase());
    for (var i = 0; i < 40; i++) {
      // the nth letter should be uppercase if the nth digit of casemap is 1
      if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
        return false;
      }
    }
    return true;
  },

  getArgInt: function(argName, defaultValue) {
    const index = process.argv.indexOf(argName);
    if (index <= 0 ) {
      if (defaultValue !== undefined ) return defaultValue;
      throw new Error(`Argument not found ${argName}`);
    }
    const stringValue = process.argv[index+1];
    const intValue = parseInt(stringValue);
    if (isNaN(intValue)) throw new Error(`Invalid int value for ${argName} : ${stringValue}`);
    return intValue;
  },

  getArgString: function(argName, defaultValue) {
    const index = process.argv.indexOf(argName);
    if (index <= 0 ) {
      if (defaultValue !== undefined ) return defaultValue;
      throw new Error(`Argument not found ${argName}`);
    }
    return process.argv[index+1];
  },

  getBatchReturnValues: function(baReturnValues, transformer) {
    return baReturnValues.map(function(baReturnObject) {
      if (transformer === undefined) {
        return baReturnObject.returnValue;
      }
      return transformer(baReturnObject.returnValue);
    });
  },

  toCsv: function(array) {
    return array.reduce(function(prevVal, elem) {
      return prevVal + (prevVal.length > 0 ? ',' : '') + elem;
    }, '');
  },

  isTx: function(tx) {
    return tx.nonce !== undefined;
  },

  listProps: function(obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        console.log(key, obj[key]);
      }
    }
  }
};
