const fs = require('fs');
const yaml = require('js-yaml');

// read a yaml or die
function yamlSafeLoadSync(yamlFilename) {
  return yaml.safeLoad(fs.readFileSync(yamlFilename, 'utf8'));
}

function yamlSafeDumpSync(object) {
  return yaml.safeDump(object);
}

function yamlSafeLoad(yamlFilename) {
  return new Promise(function(resolve, reject) {
    resolve(yamlSafeLoadSync(yamlFilename));
  });
}

function writeFileSync(file, data, options) {
  fs.writeFileSync(file, data, options);
}

function yamlWrite(object, filename) {
  const yaml = yamlSafeDumpSync(object);
  writeFileSync(filename, yaml, 'utf8');
}

function getYaml(filename, verbose) {
  if (verbose) console.log('filename:', filename);
  const yaml = yamlSafeLoadSync(filename);
  if (verbose) console.log(JSON.stringify(yaml, null, 2));
  return yaml;
}

function getJson(filename, options, verbose) {
  if (verbose) console.log({filename, options});
  const content = fs.readFileSync(filename, options);
  const json = JSON.parse(content);
  if (verbose) console.log(JSON.stringify(json, null, 2));
  return json;
}

module.exports = {
  yamlSafeLoad: yamlSafeLoad,
  yamlSafeLoadSync: yamlSafeLoadSync,
  yamlSafeDumpSync: yamlSafeDumpSync,
  yamlWrite: yamlWrite,
  getYaml, getYaml,
  getJson, getJson,
};
