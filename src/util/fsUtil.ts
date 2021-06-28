import * as fs from 'fs'
import * as yaml from 'js-yaml';

/**
 * This is the fsUtil interface
 * @module fsUtil
 */

/**
 * Reads a file and return its content
 * @example
 * const simpleStorageSrc = fsUtil.get("SimpleStorage.sol");
 * // Returns
 * // contract SimpleStorage {
 * //     uint storedData;
 * //
 * //     function set(uint x) {
 * //         storedData = x;
 * //     }
 * //
 * //     function get() returns (uint) {
 * //         return storedData;
 * //     }
 * // }
 * @method get
 * @param {String} filename The name of the file to be retrieved
 * @return {String}
 */

function get(filename) {
  const content = fs.readFileSync(filename, 'utf8')
  return content
}

/**
 * Reads a yaml file and return its content
 * @example
 * const result = fsUtil.getYaml("config.yaml");
 * // Returns
 * // { apiDebug: false,
 * //  timeout: 600000,
 * //  nodes:
 * //   [ { id: 0,
 * //       url: 'http://localhost',
 * //       publicKey:
 * //        'publickey',
 * //       port: 30303,
 * //       oauth: [Object] } ] }
 * @method getYaml
 * @param {String} filename The name of the yaml file to be retrieved
 * @return {String}
 */

function getYaml(filename) {
  const content = fs.readFileSync(filename, 'utf8')
  return yaml.safeLoad(content)
}

/**
 * Reads a JSON file and return its content
 * @example
 * const result = fsUtil.getYaml("test.json");
 * // Returns
 * // { test: 'testing json' }
 * @method getJson
 * @param {String} filename The name of the json file to be retrieved
 * @param {*} options
 * @return {String}
 */

function getJson(filename, options) {
  const content = fs.readFileSync(filename, options)
  return JSON.parse(content.toString())
}

export default {
  get,
  getYaml,
  getJson,
}
