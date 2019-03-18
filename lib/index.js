import rest from './rest'
import { cwd, isAddress, isHash, uid, usc, sleep, until, timeout, iuid, getArgInt, filter_isContained, toCsv, response } from './util';
import { getEnums, getEnumsSync, getImports, getFieldsSync } from './eparser';

const utils = {
  cwd,
  isAddress,
  isHash,
  uid,
  usc,
  sleep,
  until,
  timeout,
  iuid,
  getArgInt,
  filter_isContained,
  toCsv,
  response
}

const enums = {
  getEnums,
  getEnumsSync,
  getImports,
  getFieldsSync
}

export {
  utils,
  enums
};

export default rest;
