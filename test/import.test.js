require('co-mocha');
const ba = require('../index');
const rest = ba.rest;
const common = ba.common;
const assert = common.assert;

const DEF = rest.getFields(`./test/fixtures/second/DEF.sol`);


describe('Fetch contract fields', function(){

  it('should get all the fields', function * () {

    const expected = { '0': 'A',
      '1': 'B',
      '2': 'C',
      '3': 'D',
      '4': 'E',
      '5': 'F',
      '6': 'G',
      '7': 'H',
      '8': 'I',
      '11': 'L',
      '12': 'M',
      '13': 'N',
      '15': 'P',
      '16': 'Q',
      '17': 'R',
      '20': 'U',
      '21': 'V',
      '22': 'W',
      '23': 'X',
      '24': 'Y',
      '25': 'Z',
      D: 3,
      E: 4,
      F: 5,
      U: 20,
      V: 21,
      W: 22,
      L: 11,
      M: 12,
      N: 13,
      P: 15,
      Q: 16,
      R: 17,
      A: 0,
      B: 1,
      C: 2,
      X: 23,
      Y: 24,
      Z: 25,
      G: 6,
      H: 7,
      I: 8 };
    assert.equal(JSON.stringify(DEF), JSON.stringify(expected));
  })

});
