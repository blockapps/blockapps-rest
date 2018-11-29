var should = require('chai').should();
var rest = require('../index');
var util = rest.common.util;

const MAX = Math.floor(Math.pow(2,64));

function bytes32ToInt(bytes) {
  if(bytes.length == 0) return 0;
  if(parseInt(bytes[0],16) >= 8) {
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
  describe('intToBytes32', function() {
    // bytes32(9) as a hex string
    const expectedResultFor9 = '0000000000000000000000000000000000000000000000000000000000000009';
    // bytes32(17) as a hex string
    const expectedResultFor17 = '0000000000000000000000000000000000000000000000000000000000000011';


    it('converts negative numbers to and from hex', function() {
      for(var k=0;k < 10000; k++) {
        const n = Math.floor((Math.random() * MAX) - MAX/2);
        const b = util.intToBytes32(n);
        const m = bytes32ToInt(b);
        m.should.equal(n);
      }
    });

    it('Converting number', function() {
      const resultFor9 = util.intToBytes32(9);
      resultFor9.should.equal(expectedResultFor9, 'converting 9');
      const resultFor17 = util.intToBytes32(17);
      resultFor17.should.equal(expectedResultFor17, 'converting 17');
    });

    it('Converting number -- fails if non-integer', function() {
      (() => util.intToBytes32(17.1)).should.throw(Error);
    });

    it('Converting string', function() {
      const resultFor9 = util.intToBytes32('9');
      resultFor9.should.equal(expectedResultFor9, 'converting 9');
      const resultFo17 = util.intToBytes32('17');
      resultFo17.should.equal(expectedResultFor17, 'converting 17');
    });

    it('Converting string -- fails if not a number', function() {
      (() => util.intToBytes32('not a number')).should.throw(Error);
    });

    it('Converting string -- fails if non-integer', function() {
      (() => util.intToBytes32('17.1')).should.throw(Error);
    });
  });
});
