# BlockApps-rest
The BlockApps Node.js library for BlockApps's 3 API's

## Why BlockApps-Rest?
Have you ever worked directly with uploading Solidity contracts and interacting with their abi? If so, did you ever wonder why things had to be so complicated? If blockchain is really the future and Ethereum one of its primary ecosystems, there's got to be a simpler way of doing things. This is where the BlockApps tool suite steps in, and in particular BlockApps-Rest. BlockApps-Rest is an extremely lightweight, high-level javascript wrapper around the `strato-api`, `bloc-server`, and `cirrus` services which enables rapid development of front end applications. (Note: we presume you already have instances running these required services.)

## Contents
  1. [Configuration](#Configuration)
  2. [Deployments](#Deployments)
  3. [HelloWorld](#HelloWorld)


For documentation

```
> npm install -g documentation
> documentation build lib/** -f html -o docs
```


## Getting Started

### Configuration


To get started with BlockApps-rest, we must include our configuration file. Below is an example `config.yaml`:
``` yaml
apiDebug: true
password: '1234'
timeout: 600000
contractsPath: ./contracts
dataFilename: ./config/demo-data.yaml
deployFilename: ./config/<YOUR NODE NAME>.deploy.yaml

# WARNING - extra strict syntax
# DO NOT change the nodes order
# node 0 is the default url for all single node api calls
nodes:
  - id: 0
    explorerUrl: <YOUR EXPLORER INSTANCE>
    stratoUrl: <YOUR STRATO INSTANCE>
    blocUrl: <YOUR BLOCK INSTANCE>
    searchUrl: <YOUR CIRRUS INSTANCE>
```

`apiDebug`: flag to log detailed debugging information b

`password`: the password used to create contracts that are used in deployment

`timeout`: timeout to fail tests

`contractsPath`: the path from root directory to folder storing solidity files (.sol)

`dataFilename`: initialization data to be used in deploying

`deployFilename`: deploy file, contains information such as contract addresses required to interact with contracts created in the deployment

Note: We submit all of our queries to a particular _node_, hence it is supplied as an explicit argument to each request. The module `rest.js` uses the `api` object-- created at bootstrapping time using the supplied `config` file-- to communicate with this node. By default all requests are directed at the first node listed in the `config` file, so you can safely ignore this if that is sufficient for your use case.

## Using BlockApps-Rest

#### Generator functions
BlockApps-Rest uses *generator functions* and the *yield* expression to invoke the api synchronous calls. This syntax removes the need for chaining promises.

### Deployments

Deploying our project sets up smart contracts that are needed to have the project run. It uses information stored in the `dataFilename` field. For an example of project requiring a deployment, see the [demo-app](https://github.com/blockapps/BlockApps-rest-demo/) and its [deployment file](https://github.com/blockapps/blockapps-rest-demo/blob/master/config/tester11.deploy.yaml)

Let's discuss the case of the demo app's deployment very briefly. In order to post and interact with smart contracts, you need an address at the very least. Since we're using the BlockApps tool kit, we will also be going through the bloc service, meaning we will need an account there as well. If you look at the config file, this is exactly what you see connected to the `Admin` account. The demo app uses a [deploy.js](https://github.com/blockapps/blockapps-rest-demo/blob/master/lib/demoapp.js) module to expose a subset of the full BlockApps-Rest api through an `AI` object and suggests that all of these requests be run through the `Admin`. (Note: this is not strictly necessary after bootstrapping time-- if your app is exposed to multiple users with their own individual accounts you could of course keep their auth data in a session object to be used in the individual api calls.) This `AI` object is initialized be feeding it a path to the directory containing the smart contracts and the config, at which point those contracts are uploaded under the `Admin`'s account and you're ready to interact with them.

## HelloWorld

Let's make a basic communal todo application, where potentially many users can update a todo list independently. At a bare minimum, you would like to do the following things in any smart contract based application, including ours:

  * create users
  * allow them to create and upload new contracts.
  * query and search for those contracts.


Let's assume that we have some kind of solidity contracts `UserManager.sol` which contains a function `addNewUser` and  `TaskManager.sol`, which allows a user to put notes (`addTask`) in the hosted todo list and retrieve the contents of that list (`fetchTasks`).

### Background

There is some amount of bootstrapping that needs to take place to upload our contracts and expose the api created by them. See the [demo-app](https://github.com/blockapps/BlockApps-rest-demo/blob/master/lib/demoapp.js) for one example of what that might look like in full, but the end result is a module which connects BlockApps-rest to the particular logic in your smart contracts. So if your application deploys a smart contract with a `fireMissiles` function, this module should contain a function `fireMissiles` which might look like

```javascript
/*
   user: the user object returned by createUser()
   contract: the contract object returned by uplocaContract()
*/
function* fireMissiles(user, contract, target) {
  const args = {
    target: util.toBytes32(target)
  };
  const result = yield rest.call(
    user, // user object
    contract, // contract object
    'fireMissiles', // method name
    args);
  return result;
}
```

### Using generator functions

First let's make a function which will upload our contracts. BlockApps-rest has functions

```javascript
function* uploadContract(user, contractName, contractFilename, args, txParams, node)
```

This is where we take advantage of the generator function. We can write out upload function as:

```javascript
function* addContract(userName, password, contractName, contractFilename) {
  const user = yield rest.createUser(userName, password);
  const constructorArgs = {}; // optional
  const contract = yield rest.uploadContract(user, contractName, contractFilename, constructorArgs) {
}
```


## Conclusion
BlockApps-Rest exposes a lot more of the BlockApps APIs than were used here, and a good place to start would be looking at the [demo-app](https://github.com/blockapps/blockapps-ba), and having a look at some of the BlockApps developer API documentation that BlockApps-Rest is wrapping.

If you have written an interesting application that uses BlockApps-Rest, please let us know!
