const rest5 = require('./lib/rest_5.js');
const rest6 = require('./lib/rest_6.js');
const common = require('./lib/common.js');

module.exports = {
  rest: rest5, // plain `rest` import to be deprecated
  rest5: rest5,
  rest6: rest6,
  //api: api,
  common: common,
}
