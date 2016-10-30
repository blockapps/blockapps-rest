const BigNumber = require('bignumber.js');
exports.ETHER = new BigNumber(Math.pow(10, 18));
exports.FINNEY = new BigNumber(Math.pow(10, 15));
exports.SZABO = new BigNumber(Math.pow(10, 12));
exports.GWEI = new BigNumber(Math.pow(10, 9));
exports.MWEI = new BigNumber(Math.pow(10, 6));
exports.KWEI = new BigNumber(Math.pow(10, 3));

function formatWei(wei) {
  var b = new BigNumber(wei);
  const sign = b.lt(0) ? -1 : 1;
  b = b.mul(sign);

  if (b.gte(this.ETHER)) {
    return b.mul(sign).dividedBy(this.ETHER).toNumber()+ ' Ether';
  }
  if (b.gte(this.FINNEY)) {
    return b.mul(sign).dividedBy(this.FINNEY).toNumber() + ' Finney';
  }
  if (b.gte(this.SZABO)) {
    return b.mul(sign).dividedBy(this.SZABO).toNumber() + ' Szabo';
  }
  if (b.gte(this.GWEI)) {
    return b.mul(sign).dividedBy(this.GWEI).toNumber() + ' GWei';
  }
  if (b.gte(this.MWEI)) {
    return b.mul(sign).dividedBy(this.MWEI).toNumber() + ' Wei';
  }
  if (b.gte(this.KWEI)) {
    return b.mul(sign).dividedBy(this.KWEI).toNumber() + ' Kwei';
  }
  return b.toNumber() + ' Wei';
}
exports.formatWei = formatWei;
