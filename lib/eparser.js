var SolidityParser = require("solidity-parser");

// parse the file
function parse(filename, enhanced) {
  const program = SolidityParser.parseFile(filename);
  return enhanced ? parseEnumsEnahnced(program.body) : parseEnums(program.body);
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

// parse the enums out of the file
function parseEnumsEnahnced(body) {
  var enums = {};
  body.filter(function(item) {
    return item && (item.type === 'ContractStatement' || item.type === 'LibraryStatement') && item.body;
  }).map(function(statement) {
    statement.body.filter(function(statement) {
      return statement.type === 'EnumDeclaration';
    }).map(function(enumDeclaration) {
      //  create xref { 1:'key', key:1 }
      var o = {};
      for (var i = 0; i < enumDeclaration.members.length; i++) {
        var m = enumDeclaration.members[i];
        o[i] = m;
        o[m] = i;
      }
      enums[enumDeclaration.name] = o;
    });
  });
  return enums;
}

//  wrap in Promise
function getEnums(filename, enhanced) {
  return new Promise(function(resolve, reject) {
    const enums = parse(filename, enhanced);
    resolve(enums);
  });
}

function getEnumsSync(filename, enhanced) {
  return parse(filename, enhanced);
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

// Usage
//var eparser = require("./eparser");
//
//eparser.getEnums(filename).then(function(enums){
//  console.log('enums in ' + filename);
//  console.log(enums);
//}).catch(function(err){
//  console.log(err);
//});
