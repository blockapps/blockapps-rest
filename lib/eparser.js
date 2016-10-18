var SolidityParser = require("solidity-parser");

// parse the file
function parse(filename) {
  const program = SolidityParser.parseFile(filename);
  const enums = parseEnums(program.body);
  return enums;
}

// parse the enums out of the file
function parseEnums(body) {
  var enums = {};
  body.filter(function(item) {
    return item && (item.type === 'ContractStatement' || item.type === 'LibraryStatement') && item.body;
  }).map(function(statement) {
    statement.body.filter(function(statement) {
      return statement.type === 'EnumDeclaration';
    }).map(function(enumDeclaration) {
      enums[enumDeclaration.name] = enumDeclaration.members;
    });
  });
  return enums;
}

/**
  wrap in Promise
*/
function getEnums(filename) {
  return new Promise(function(resolve, reject) {
    const enums = parse(filename);
    resolve(enums);
  });
}

function getEnumsSync(filename) {
  return parse(filename);
}

function getImports(filename) {
  return new Promise(function(resolve, reject) {
    const graph = SolidityParser.parseFile(filename, 'imports');
    resolve(graph);
  });
}

module.exports = {
  getEnums: getEnums,
  getEnumsSync: getEnumsSync,
  getImports: getImports,
};

/** Usage
var eparser = require("./eparser");

eparser.getEnums(filename).then(function(enums){
  console.log('enums in ' + filename);
  console.log(enums);
}).catch(function(err){
  console.log(err);
});

*/
