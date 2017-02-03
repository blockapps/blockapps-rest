# blockapps-rest
The BlockApps Node.js library for BlockApps's 3 API's

BlockApps-Rest brings `strato-api`, `bloc-server`, and `cirrus` together, into one
library.

## Getting Started

### Configuration

To get started with blockapps-rest, we must include our configuration file. Below is an example `config.yaml`:
``` yaml
apiDebug: true
password: '1234'
timeout: 600000
contractsPath: ./contracts
dataFilename: ./config/demo-data.yaml
deployFilename: ./config/tester11.deploy.yaml

# WARNING - extra strict syntax
# DO NOT change the nodes order
# node 0 is the default url for all single node api calls
nodes:
  - id: 0
    explorerUrl: 'http://tester11.eastus.cloudapp.azure.com:9000'
    stratoUrl: 'http://tester11.eastus.cloudapp.azure.com/strato-api'
    blocUrl: 'http://tester11.eastus.cloudapp.azure.com/bloc'
    searchUrl: 'http://tester11.eastus.cloudapp.azure.com/cirrus'
```

`apiDebug`: flag to log detailed debugging information

`password`: the password used to create contracts that are used in deployment

`timeout`: timeout to fail tests

`contractsPath`: the path from root directory to folder storing solidity files (.sol)

`dataFilename`: initialization data to be used in deploying

`deployFilename`: deploy file, contains information such as contract addresses required to interact with contracts created in the deployment

### Deployments

Deploying our project sets up smart contracts that are needed to have the project run. It uses information stored in the `dataFilename` field. For an example of project requiring a deployment, see https://github.com/blockapps/blockapps-rest-demo/

### Using BlockApps-Rest

#### Promise-Chaining
BlockApps-Rest uses a specific style of promise chaining which we refer to as `scoped promise-chains`. These promises always resolve a scope variable that carries data down the promise-chain. This provides a simple and clear way to reuse and pass data down the chain. We found this led to clear and concise code. Below is an example of creating a user with BlockApps-Rest.

- setting up your config
- deployments what, and why
