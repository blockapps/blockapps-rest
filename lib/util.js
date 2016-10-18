const fs = require('fs');
const yaml = require('js-yaml');

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
  return hexDecode8(x.split('0').join('')); 
}

function toBytes32(x) { 
  if (x === undefined) return undefined;
  return ("0".repeat(64) + hexEncode8(x)).slice(-64); 
}

function trimNulls(string) {
  if (string === undefined) return undefined;
  return string.replace(/\0/g, '');
}


module.exports = {
  trimNulls: trimNulls,
  hexEncode8: hexEncode8,
  hexDecode8: hexDecode8,
  fromBytes32: fromBytes32,
  toBytes32: toBytes32,
  retry: retry,
  toByteArray: toByteArray,
  toHexString: toHexString,
  toAddress: toAddress,

  // generate a unique id
  uid: function(prefix) {
    var time = process.hrtime().toString();
    time = time.replace(',', '');
    time = time.substring(0, time.length - 5);
    const pid_time = process.pid + '_' + time;
    return (prefix == null) ? pid_time : prefix + '_' + pid_time;
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
