// ----------------------------------
// setup command line args
// @see https://www.npmjs.com/package/commander
// ----------------------------------
const commander = require('commander');
const fs = require('fs');
const yaml = require('js-yaml');

// read a yaml or die
function getYamlFile(yamlFilename) {
    return yaml.safeLoad(fs.readFileSync(yamlFilename, 'utf8'));
}

commander
  .version('0.0.3')
  .option('-c, --config [path]', 'Config file [config.yaml]', 'config.yaml')
  .option('-y, --deploy [path]', 'Deployment file')
  .option('-a, --data [path]', 'Preset Data file')
  .option('-d, --api-debug', 'API debug trace')
  .parse(process.argv);

console.log('command line:', commander.rawArgs);
if (commander.config === undefined) {
  console.log('No config file defined (use --config)');
  process.exit();
}
console.log('config filename:', commander.config);
const configFile = getYamlFile(commander.config);
// cli overrides config
if (commander.apiDebug) configFile.apiDebug = true;
if (commander.timeout !== undefined) configFile.timeout = commander.timeout;
if (commander.data !== undefined) configFile.data = commander.data;
console.log('config', JSON.stringify(configFile, null, 2));
exports.configFile = configFile;

// deploy
if (commander.deploy) configFile.deploy = commander.deploy;

// api urls
configFile.getBlocUrl = function (node) {
  if (node === undefined) node = 0;
  return this.nodes[node].blocUrl;
}
configFile.getExplorerUrl = function (node) {
  if (node === undefined) node = 0;
  return this.nodes[node].explorerUrl;
}
configFile.getStratoUrl = function (node) {
  if (node === undefined) node = 0;
  return this.nodes[node].stratoUrl;
}
