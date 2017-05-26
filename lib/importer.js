const fs = require('fs');
const nodepath = require('path');

var nameStore = [];



// {
//   main: {
//     filename1.sol : <code string>,
//     filename2.sol : undefined,
//     ...
//   },
//   import: { ... },
//   options: {
//     optimize, add-std, link, // flags for "solc" executable
//     optimize-runs, libraries // options with arguments for "solc" executable
//   }
// }
//
//
// {
//   "main": {
//     "B.sol": "import \"C.sol\"; contract B is C{}"
//   },
//   "import": {
//     "C.sol": "contract C{}"
//   },
//   "options": {}
// }



function getDescriptorSync(fullname, options) {
  var desc = {
    main: getFileMain(fullname),
    import: getFileImports(fullname),
    options: options || {},
  }

  return desc;
}

function getFileMain(fullname) {
  const name = getFileName(fullname);
  const content = getFileContent(fullname);
  return addProperty({}, name, content);
}

function getImportsTree(fullname) {
  // console.log('getImportsTree', fullname);
  var importFullnames = [];
  isImported(fullname);
  var array = fs.readFileSync(fullname).toString().split('\n');
  var parentPath = splitPath(fullname);
  for (var i = 0; i < array.length; i++) {
    var line = array[i];
    if (line.startsWith('import')) {
      // console.log('getImportsTree', 'line', line);
      var importName = getImportName(line);
      var importFullname = parentPath + nodepath.sep + importName;
      // console.log('getImportsTree', 'importFullname', importFullname);
      if (isImported(importFullname)) continue;
      importFullnames.push(importFullname);
      importFullnames = importFullnames.concat(getImportsTree(importFullname));
    }
  }
  return importFullnames;
}

// supported formats:
// import * as symbolName from "filename";
// import {symbol1 as alias, symbol2} from "filename";
// import "filename";
function getImportName(line) {
  var importName = line.split('"').slice(-2, -1)[0];
  // console.log('importName', importName);
  return importName;
}

function getFileImports(fullname) {
  // console.log('getFileImports', fullname);
  var object = {};
  const importNames = getImportsTree(fullname);
  for (key in importNames) {
    var importFullname = importNames[key];
    // console.log('getFileImports', 'importFullname', importFullname);
    addProperty(object, getFileName(importFullname), getFileContent(importFullname));
  }
  return object;
}

function getFileName(fullname) {
  return fullname.split(nodepath.sep).pop();
}

function getFileContent(fullname) {
  // console.log('getFileContent', fullname);
  return fs.readFileSync(fullname).toString();
}

function addProperty(object, name, content) {
  Object.defineProperty(object, name, {
    value: content,
    writable: true,
    enumerable: true,
    configurable: true
  });
  return object;
}


//
//readFileLines() reads a root file and parse all imports recursively
//
//@param {String} fullname
//

function readFileLines(fullname) {
  var buffer = '';
  isImported(fullname);
  //buffer += '// --- start: ' + fullname + '\n';
  var array = fs.readFileSync(fullname).toString().split('\n');
  for (var i = 0; i < array.length; i++) {
    var line = array[i];
    if (line.startsWith('import')) {
      buffer += importFile(fullname, line) + '\n';
    } else {
      line = line.replace('\r', ' '); // Windows fix
      buffer += line + '\n';
    }
  }
  //buffer += '// --- end: ' + fullname + '\n';
  return buffer;
}

//
//  importFile() reconstruct the import file path, and read it, unless it was already imported
//
//  @param {String} fullname
//  @param {String} line - the import line command
// /
function importFile(fullname, line) {
  var buffer = '//' + line + '\n';
  var importName = line.split(' ')[1].replace(/\"/gi, '').replace(';', '');
  importName = importName.replace('\r', '');  // Windows fix
  if (isImported(importName)) {
    buffer += '// exists\n';
    return buffer;
  }
  var parentPath = splitPath(fullname);
  return buffer + readFileLines(nodepath.join(parentPath, importName));
}

//function write(line){
//  buffer += line + '\n';
//  //console.log(line);
//}
// isImported() checks if a file is already imported
//
// @param {String} fullname
// @returns {Boolean} isImported
//
function isImported(fullname) {
  var array = fullname.split(nodepath.sep);
  array = array.length <= 1 ? fullname.split('/') : array; // Windows fix
  var name = array.pop();
  if (nameStore.indexOf(name) > -1) {
    return true;
  }
  nameStore.push(name);
  return false;
}

///
// splitPath() get the path part of a full name
//
// @param {String} fullname
// @returns {Boolean} isImported
//
function splitPath(fullname) {
  var array = fullname.split(nodepath.sep);
  array = array.length <= 1 ? fullname.split('/') : array; // Windows fix
  var path = array.slice(0, array.length - 1).join(nodepath.sep);
  return path;
}

var launcher = process.argv[1];
if (launcher.indexOf('importer') > -1) {
  var rootFile = process.argv[2];
  if (rootFile === undefined) {
    // TODO usage
    console.log("No Root file found!")
  } else {
    // var string = readFileLines(rootFile);
    // console.log(string);
    var desc = getDescriptorSync(rootFile);
    console.log(desc);
  }
}


function getDescriptor(filename) {
  nameStore = [];
  return new Promise(function(resolve, reject) {
    const descriptorObject = getDescriptorSync(filename);
    resolve(descriptorObject);
  });
}

function getBlob(filename) {
  nameStore = [];
  return new Promise(function(resolve, reject) {
    const string = readFileLines(filename);
    resolve(string);
  });
}

module.exports = {
  getDescriptor: getDescriptor,
  getBlob: getBlob,
};
