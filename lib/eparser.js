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

function getFieldsSync(filename, prefix) {
  const result = {};
  const graph = SolidityParser.parseFile(filename);
  const contract0body = graph.body[0].body;

  contract0body.filter(member => {
    // filter variables
    return member.type == 'ExpressionStatement' && member.expression.type == 'AssignmentExpression';
  }).filter(member => {
    // filter prefix if provided
    if (prefix === undefined) return true;
    return member.expression.left.name.indexOf(prefix) == 0;
  }).map(member => {
    // build the result object
    result[member.expression.left.name] = member.expression.right.value;
    result[member.expression.right.value] = member.expression.left.name;
  })

  contract0body.filter(member => {
    // filter variablesle
    return (member.type == 'StateVariableDeclaration')
  }).filter(member => {
    // filter prefix if provided
    if (prefix === undefined) return true;
    return member.name.indexOf(prefix) == 0;
  }).map(member => {
    // build the result object
    result[member.name] = member.value.value;
    result[member.value.value] = member.name;
  })

  return(result);
}

module.exports = {
  getEnums: getEnums,
  getEnumsSync: getEnumsSync,
  getImports: getImports,
  getFieldsSync: getFieldsSync,
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
