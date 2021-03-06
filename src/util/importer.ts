import * as fs from 'fs'
import * as nodepath from 'path'
const cwd = nodepath.resolve(process.cwd());

let nameStore = [];

/**
 * This is the importer interface
 * @module importer
 */

function getImportsTree(fullname) {
  let importFullnames = [];
  isImported(fullname);
  let array = fs.readFileSync(fullname).toString().split('\n');
  let parentPath = splitPath(fullname);
  for (let i = 0; i < array.length; i++) {
    let line = array[i];
    if (line.startsWith('import')) {
      let importName = getImportName(line);
      let importFullname = parentPath + nodepath.sep + importName;
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
  return importName;
}

/**
 * readFileLinesToObject() reads a root file and parse all imports recursively into a JSON object
 *
 * @method readFileLinesToObject
 * @param {Object} initial import map
 * @param {String} input name of file to be read
 * @return {Object}
 */

function readFileLinesToObject(initialFileMap, fullname) {
  const array = fs.readFileSync(fullname).toString().split('\n');
  isImported(fullname);
  const { fileMap, buffer } = array.reduce((obj, line) => {
    const { fileMap, buffer } = obj;
    if (line.startsWith('import')) {
      const newBuffer = buffer + '//' + line + '\n';
      const newFileMap = importFileToObject(fileMap, fullname, line);
      return { fileMap: newFileMap, buffer: newBuffer }
    } else {
      const fixedLine = line.replace('\r', ' '); // Windows fix
      const newBuffer = buffer + fixedLine + '\n';
      return { fileMap, buffer: newBuffer }
    }
  }, {fileMap: initialFileMap, buffer: ''});
  return { ...fileMap, [getShortName(fullname)]: buffer }
}

/**
 * readFileLinesToArray() reads a root file and parse all imports recursively into a JSON array
 *
 * @method readFileLinesToArray
 * @param {Array} initial import array
 * @param {String} input name of file to be read
 * @return {Array}
 */

function readFileLinesToArray(initialFileArray, fullname) {
  const array = fs.readFileSync(fullname).toString().split('\n');
  isImported(fullname);
  const { fileArray, buffer } = array.reduce((obj, line) => {
    const { fileArray, buffer } = obj;
    if (line.startsWith('import')) {
      const newBuffer = buffer + '//' + line + '\n';
      const newFileArray = importFileToArray(fileArray, fullname, line);
      return { fileArray: newFileArray, buffer: newBuffer }
    } else {
      const fixedLine = line.replace('\r', ' '); // Windows fix
      const newBuffer = buffer + fixedLine + '\n';
      return { fileArray, buffer: newBuffer }
    }
  }, {fileArray: initialFileArray, buffer: ''});
  return [...fileArray, [getShortName(fullname), buffer]]
}

/**
 * readFileLinesToString() reads a root file and parse all imports recursively into one string
 *
 * @method readFileLinesToString
 * @param {String} input name of file to be read
 * @return {String}
 */

function readFileLinesToString(fullname) {
  let buffer = '';
  isImported(fullname);
  //buffer += '// --- start: ' + fullname + '\n';
  let array = fs.readFileSync(fullname).toString().split('\n');
  for (let i = 0; i < array.length; i++) {
    let line = array[i];
    if (line.startsWith('import')) {
      buffer += importFileToString(fullname, line) + '\n';
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

/**
 * importFileToObject() reconstruct the import file path, and read it, unless it was already imported
 *
 * @method importFile
 * @param {Object} fileMap the initial import map
 * @param {String} fullname name of file
 * @param {String} line the import line command
 * @return {Object}
 */

function importFileToObject(fileMap, fullname, line) {
  let importName = line.replace(/import[\s]+/i, '').replace(/\"/gi, '').replace(';', '');
  importName = importName.replace('\r', '');  // Windows fix
  if (isImported(importName)) {
    return fileMap;
  }
  // if import name starts with '/' - read relative to project root -LS
  if (importName.indexOf('/') == 0) {
    return readFileLinesToObject(fileMap, nodepath.join(cwd, importName));
  }
  let parentPath = splitPath(fullname);
  return readFileLinesToObject(fileMap, nodepath.join(parentPath, importName));
}

/**
 * importFileToArray() reconstruct the import file path, and read it, unless it was already imported
 *
 * @method importFile
 * @param {Array} fileArray the initial import map
 * @param {String} fullname name of file
 * @param {String} line the import line command
 * @return {Array}
 */

function importFileToArray(fileArray, fullname, line) {
  let importName = line.replace(/import[\s]+/i, '').replace(/\"/gi, '').replace(';', '');
  importName = importName.replace('\r', '');  // Windows fix
  if (isImported(importName)) {
    return fileArray;
  }
  // if import name starts with '/' - read relative to project root -LS
  if (importName.indexOf('/') == 0) {
    return readFileLinesToArray(fileArray, nodepath.join(cwd, importName));
  }
  let parentPath = splitPath(fullname);
  return readFileLinesToArray(fileArray, nodepath.join(parentPath, importName));
}

/**
 * importFileToString() reconstruct the import file path, and read it, unless it was already imported
 *
 * @method importFile
 * @param {Object} fileMap the initial import map
 * @param {String} fullname name of file
 * @param {String} line the import line command
 * @return {String}
 */

function importFileToString(fullname, line) {
  let buffer = '//' + line + '\n';
  let importName = line.replace(/import[\s]+/i, '').replace(/\"/gi, '').replace(';', '');
  importName = importName.replace('\r', '');  // Windows fix
  if (isImported(importName)) {
    buffer += '// exists\n';
    return buffer;
  }
  // if import name starts with '/' - read relative to project root -LS
  if (importName.indexOf('/') == 0) {
    return buffer + readFileLinesToString(nodepath.join(cwd, importName));
  }
  let parentPath = splitPath(fullname);
  return buffer + readFileLinesToString(nodepath.join(parentPath, importName));
}

// isImported() checks if a file is already imported
//
// @param {String} fullname
// @returns {Boolean} isImported
//

/**
 * isImported() checks if a file is already imported
 *
 * @method isImported
 * @param {String} fullname name of file
 * @return {Boolean}
 */

function getShortName(fullname) {
  let array = fullname.split(nodepath.sep);
  array = array.length <= 1 ? fullname.split('/') : array; // Windows fix
  return array.pop();
}

function isImported(fullname) {
  const name = getShortName(fullname);
  if (nameStore.indexOf(name) > -1) {
    return true;
  }
  nameStore.push(name);
  return false;
}

/**
 * splitPath() get the path part of a full name
 *
 * @method splitPath
 * @param {String} fullname name of file
 * @return {Array}
 */

function splitPath(fullname) {
  let array = fullname.split(nodepath.sep);
  array = array.length <= 1 ? fullname.split('/') : array; // Windows fix
  let path = array.slice(0, array.length - 1).join(nodepath.sep);
  return path;
}

function combine(filename, toObject):Promise<any> {
  nameStore = [];
  return new Promise(function(resolve, reject) {
    let string = ''
    if (toObject) {
      string = readFileLinesToObject({}, filename);
    } else {
      string = readFileLinesToArray([], filename);
    }
    resolve(string);
  });
}

export default {
  combine,
}
