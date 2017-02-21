# BlockApps-rest
The BlockApps Node.js library for BlockApps's 3 API's

BlockApps-Rest brings `strato-api`, `bloc-server`, and `cirrus` together, into one
library.

## Contents
  1. [Configuration](#Configuration)
  2. [Deployments](#Deployments)
  3. [HelloWorld](#HelloWorld)


## Getting Started

### Configuration


To get started with BlockApps-rest, we must include our configuration file. Below is an example `config.yaml`:
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

`apiDebug`: flag to log detailed debugging information b

`password`: the password used to create contracts that are used in deployment

`timeout`: timeout to fail tests

`contractsPath`: the path from root directory to folder storing solidity files (.sol)

`dataFilename`: initialization data to be used in deploying

`deployFilename`: deploy file, contains information such as contract addresses required to interact with contracts created in the deployment

Note: We submit all of our queries to a particular _node_, hence it is supplied as an explicit argument to each request. The module `rest.js` uses the `api` object-- created at bootstrapping time using the supplied `config` file-- to communicate with this node. By default all requests are directed at the first node listed in the `config` file, so you can safely ignore this if that is sufficient for your use case.

### Deployments
 
Deploying our project sets up smart contracts that are needed to have the project run. It uses information stored in the `dataFilename` field. For an example of project requiring a deployment, see the [demo-app](https://github.com/blockapps/BlockApps-rest-demo/) and its [deployment file](https://github.com/blockapps/blockapps-rest-demo/blob/master/config/tester11.deploy.yaml)

Very briefly the deployment phase is as follows

### Using BlockApps-Rest

#### Promise-Chaining
BlockApps-Rest uses a specific style of promise chaining which we refer to as _scoped promise-chains_. These promises always resolve a scope variable that carries data down the promise-chain. This provides a simple and clear way to reuse and pass data down the chain. We found this led to clear and concise code. Below is an example of creating a user with BlockApps-Rest.

- setting up your config
- deployments what, and why

## HelloWorld

Let's make a basic communal todo application, where potentially many users can update a todo list independently. At a bare minimum, you would like to do the following things in any smart contract based application, including ours:

  * create users
  * allow them to create and upload new contracts.
  * query and search for those contracts.

 
Let's assume that we have some kind of solidity contracts `UserManager.sol` which contains a function `addNewUser` and  `TaskManager.sol`, which allows a user to put notes (`addTask`) in the hosted todo list and retrieve the contents of that list (`fetchTasks`).

### Background

There is some amount of bootstrapping that needs to take place to upload our contracts and expose the api created by them. See the [demo-app](https://github.com/blockapps/BlockApps-rest-demo/blob/master/lib/demoapp.js) for one example of what that might look like in full, but the end result is a module which connects BlockApps-rest to the particular logic in your smart contracts. So if your application deploys a smart contract with a `fireMissiles` function, this module should contain a function `fireMissiles` which might look like

```javascript
function fireMissiles(source , target) {
  return function(scope) {
    const args = {
      target: util.toBytes32(target)
    };
    rest.callMethod(source, 'MissileContract', 'fireMissiles', args))
      .then(function(scope) {
        scope.targets[target].isDestroyed = true;
        scope.targets[target].destroyedBy = source;
        return scope;
      });
  }

```

In fact you can see that in the demo-app this is the only module which imports BlockApps-rest, and is exported as api to your nodes throughout the rest of the application.

As mentioned above, the api calls use _scoped promise-chaining_. This means that there is going to be some initialization of a `scope` object _in a promise context_, and all further updates to that `scope` object should happen in a promise chain. Usually BlockApps-rest will update this object for you through its api calls automatically, but any logic that runs outside of that will have to be included in the chain in some way. As for initalization, this can be done using the [`setScope`](https://github.com/blockapps/BlockApps-rest/blob/1e50211677b6224cab74af83f1b392f8990ddfc8/lib/rest.js#L39) function.


### Making the app

First let's make a function which will upload our contracts. BlockApps-rest has functions

```javascript
function getContractString(name, filename) { ...

function uploadContract(userName, password, contractName, args, txParams, node) { ...
```

This is where the `scope promise-chaining` starts to come into play, allowing for a more declarative syntax. We can write out upload function as:

```javascript
function addContract(userName, password, contractName, contractString) {
  return function(scope) {
    scope.contracts[contractName] = contractString;
    // nop returns a Promise which just immediately resolves with the scope.
    return nop(scope)
      .then(rest.createUser(adminName, adminPassword))
      .then(rest.getContractString(contractName, contractFilename))
      .then(rest.uploadContract(adminName, adminPassword, contractName))
      .then(function(scope) {
        // the scope was modified in uploadContract so that the next assignment
        // is well defined.
        const address = scope.contracts[contractName].address;
        if (!util.isAddress(address)) throw new Error('setAdminInterface: upload failed: address:', address);
        return scope;
      });
  }
}
```

Next let's make a function which can add new users according to our `addUser` function in the `UserManager.sol` contract:

```javascript
function addNewUser(???, username, password) {
  return function(scope) {
    const args = {
      username: util.toBytes32(username),
      pwHash: util.toBytes32(password)
    };
    return rest.callMethod(???, 'UserManager', 'addUser', args)(scope)
      .then(function(scope) {
        const result = scope.contracts['UserManager'].calls['addUser'];
        const E = getEnums().ErrorCodesEnum;
        if (result == E.SUCCESS) {
          if (scope.users[username] === undefined) scope.users[username] = {};
        } else if (result == E.USERNAME_EXISTS) {
          throw new Error("User exists: " + username);
        } else {
          throw new MethodError('UserManager', 'addUser', result);
        }
        return scope;
      });
  }
}
```

We need to fill in the blank `???` with any user who currently has an account. This presents another boostrapping problem-- one solution would be to include an application-wide [admin user](https://github.com/blockapps/BlockApps-rest-demo/blob/master/config/tester11.deploy.yaml), then parially apply any BlockApps-rest function using this super user. This is the case in the BlockApps-rest demo. Alternatively you could set a session object which keeps track of the current user who is presumed to already have an account, give it as user input, or whatever your use case suggests.

Now let's make a function to add notes to the todo list. Again, your `TaskManager.sol` contract is assumed to have a function `addTask` which takes arguments `task :: string, urgencyLevel :: uint, deadlineDate :: uint`, so we can do

```javascript
function addTask(username, task, urgencyLevel, deadlineDate) {
  return function(scope) {
    const args = {
      task: task,
      urgencyLevel: urgencyLevel,
      deadlineDate: deadlineDate
    };
    return rest.callMethod(username, 'TaskManager', 'addTask', args)(scope)
      .then(function(scope) {
        const E = getEnums().ErrorCodesEnum;
        var result = scope.contracts['TaskManager'].calls['addTask'];
        if (result != E.SUCCESS) throw new Error('addTask: returned ' + E[result]);
        return scope;
      })
  }
}
```

To query our existing `TaskManager` contract to get all the items out, we can use the `getState` function:


```javascript
function getTasks() {
  return function(scope) {
    return rest.getState('TaskManager')(scope)
      .then(function(scope) {
        const taskAddresses = scope.states['TaskManager'].tasks;
        scope.todoList.tasks = [];

        return Promise.each(taskAddresses, function(taskAddress) {
          rest.getState('TaskManager', address)(scope)
            .then(function(scope) {
              var task = scope.states['TaskManager'];
              task.address = taskAddress;
              scope.todoList.push(taskForDisplay(task));
            });
        }).then(function() {
          return scope;
        });
      }) ;
  }
}

```
