const fs = require('fs');
const yaml = require('js-yaml');

function getYaml(filename) {
  const content = fs.readFileSync(filename, 'utf8')
  return yaml.safeLoad(content)
}

function getJson(filename, options) {
  const content = fs.readFileSync(filename, options)
  return JSON.parse(content)
}

module.exports = {
  getYaml,
  getJson,
}
