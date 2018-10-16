var should = require('chai').should();
var rest = require('../index');
var util = rest.common.util;

const MAX = Math.floor(Math.pow(2,64));

function bytes32ToInt(bytes) {
  if(bytes[0] >= 'a' && bytes[0] <= 'f') {
    return negativeBytes(bytes,0);
  } else {
    return positiveBytes(bytes,0);
  }
}

function negativeBytes(b,w) {
  if(b.length == 0) return (-w) - 1;
  const n = 15 - parseInt(b[0],16);
  return negativeBytes(b.substring(1),(16*w)+n);
}

function positiveBytes(b,w) {
  if(b.length == 0) return w;
  const n = parseInt(b[0],16);
  return positiveBytes(b.substring(1),(16*w)+n);
}

describe('util tests', function() {
  it('converts negative numbers to and from hex', function() {
    for(var k=0;k < 10000; k++) {
      const n = Math.floor((Math.random() * MAX) - MAX/2);
      const b = util.intToBytes32(n);
      const m = bytes32ToInt(b);
      m.should.equal(n);
    }
  });
});
