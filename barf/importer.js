import fs from 'fs'
import nodepath from 'path'
const cwd = nodepath.resolve(process.cwd());

let nameStore = [];

function getImportsTree(fullname) {
  // console.log('getImportsTree', fullname);
  let importFullnames = [];
  isImported(fullname);
  let array = fs.readFileSync(fullname).toString().split('\n');
  let parentPath = splitPath(fullname);
  for (let i = 0; i < array.length; i++) {
    let line = array[i];
    if (line.startsWith('import')) {
      // console.log('getImportsTree', 'line', line);
      let importName = getImportName(line);
      let importFullname = parentPath + nodepath.sep + importName;
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
  let importName = line.split('"').slice(-2, -1)[0];
  // console.log('importName', importName);
  return importName;
}

//
//readFileLines() reads a root file and parse all imports recursively
//
//@param {String} fullname
//

function readFileLines(fullname) {
  let buffer = '';
  isImported(fullname);
  //buffer += '// --- start: ' + fullname + '\n';
  let array = fs.readFileSync(fullname).toString().split('\n');
  for (let i = 0; i < array.length; i++) {
    let line = array[i];
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
  let buffer = '//' + line + '\n';
  let importName = line.replace(/import[\s]+/i, '').replace(/\"/gi, '').replace(';', '');
  importName = importName.replace('\r', '');  // Windows fix
  if (isImported(importName)) {
    buffer += '// exists\n';
    return buffer;
  }
  // if import name starts with '/' - read relative to project root -LS
  if (importName.indexOf('/') == 0) {
    return buffer + readFileLines(nodepath.join(cwd, importName));
  }
  let parentPath = splitPath(fullname);
  return buffer + readFileLines(nodepath.join(parentPath, importName));
}

// isImported() checks if a file is already imported
//
// @param {String} fullname
// @returns {Boolean} isImported
//
function isImported(fullname) {
  let array = fullname.split(nodepath.sep);
  array = array.length <= 1 ? fullname.split('/') : array; // Windows fix
  let name = array.pop();
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
  let array = fullname.split(nodepath.sep);
  array = array.length <= 1 ? fullname.split('/') : array; // Windows fix
  let path = array.slice(0, array.length - 1).join(nodepath.sep);
  return path;
}

function combine(filename) {
  nameStore = [];
  return new Promise(function(resolve, reject) {
    const string = readFileLines(filename);
    resolve(string);
  });
}

export default {
  combine,
}
