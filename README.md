## Mirror Repository Warning
This repository is a mirror of the development repository maintained by BlockApps. This repository contains a 
code of the versions released to [npm](https://www.npmjs.com/package/blockapps-rest). 
We do not accept or merge any pull requests in this repository.

## Introduction

The Blockapps-Rest library is Node.js server-side SDK for BlockApps STRATO. It provides all the necessary abstractions and utility functions that can be used to interact with the STRATO platforms and perform the following operations:

1. Creating and managing keys
2. Creating managing transactions
3. Creating and managing provate chains
4. Querying for contract state
5. Integration with OAuth

Blockapps-rest expects that the user will use an OAuth server to authenticate. Blockapps-rest cannot be used without a third party OAuth instance.

The full JSDoc can be found on the [Blockapps Developer Documentation.](https://docs.blockapps.net/ba-rest/)

## Getting Started

You can install the blockapps-rest node library using `yarn` or `npm`. Example:

```
yarn add blockapps-rest
```

OR

```
npm install blockapps-rest
```

## Basic Usage

```
// import blockapps-rest
import { rest, fsUtil, util, assert } from 'blockapps-rest';

// read config. See section on configuration
const config = fsUtil.getYaml(`config.yaml`);

// create an options object (optional)
const options = { config, logger: console };

// Create and faucet a user (keys) corresponding to an oauth identity (passed into the environment)
const user = await rest.createUser({token: process.env.USER_TOKEN}, options);

// Create a contract
const contractArgs = {
  name: 'TestContract',
  source: 'contract TestContract { uint a; constructor(uint _a) { a = _a; } function add(uint b returns(uint) { return a+b; }',
  args: { _a: 10 }
};
const contract = await rest.createContract(user, contractArgs, options);
assert.equal(contract.name, contractArgs.name, "name");
assert.isOk(util.isAddress(contract.address), "address");

// Get contract state
const state = await rest.getState(user, contract, options);
assert.equal(state.a, contractArgs.args._a);

// Call a method on a contract
const callArgs = {
  contract,
  method: 'add',
  args: {
    b: 10
  }
};
const [result] = await rest.call(user, callArgs, options);
assert.equal(result, contractArgs.args._a + callArgs.args.b);
```

## Configuration

The `blockapps-rest` library needs a configuration file to initialize it. This configuration file tells the blockapps-rest library which nodes it should interact with and what kind of authentication settings it should use. By default, blockapps-rest will look for `config.yaml` in the application root folder. The template for this configuration file is:

```
apiDebug: true
timeout: 600000

# WARNING - extra strict syntax
# DO NOT change the nodes order
# node 0 is the default url for all single node api calls
nodes:
  - id: 0
    url: "http://localhost"
    publicKey: "6d8a80d14311c39f35f516fa664deaaaa13e85b2f7493f37f6144d86991ec012937307647bd3b9a82abe2974e1407241d54947bbb39763a4cac9f77166ad92a0"
    port: 30303
    oauth:
      appTokenCookieName: "ba_rest_test_session"
      scope: "email openid"
      appTokenCookieMaxAge: 7776000000 # 90 days: 90 * 24 * 60 * 60 * 1000
      clientId: "PLACEHOLDER"
      clientSecret: "PLACEHOLDER"
      openIdDiscoveryUrl: "PLACEHOLDER"
      redirectUri: "http://localhost/callback"
      logoutRedirectUri: "http://localhost"
```

The above configuration defines the following settings:

1. `apiDebug`: This flag controls if blockapps-rest will output the backend calls its making to the various STRATO APIs to the console. This is useful during development, but should be set to false for productions environments.
2. `timeout`: This is the query wait timeout used by blockapps-rest internally. Some operations in blockapps-rest wait on a transactions to be final. The time it takes for finality on a STRATO network depends on it configuration, so this value may need to be tweaked based on your environment. But for most situations, the default value of 60000 milli-seconds should be good enough.
3. `nodes`: The nodes collection defines a set of nodes that this process can connect to and the OAuth details for the connection. These details are:
    - `id`: This id is used by the blockapps-rest calls to identify which node to connect to. This id should be a unique integer.
    - `url`: This is the base url at which the STRATO apis are available for the given node.
    - `publickey`: This is the public key of the STRATO node.
    - `port`: This is the port at which the STRATO node is listening for connecting from other STRATO nodes in this network.
    - `oauth`: This section describes the oauth configuration for this node. These details are:
        - `appTokenCookieName`: This set the name of the cookie that the app will set in case of a frontend.
        - `scope`: This is the oauth scope to use when request tokens
        - `appTokenCookieMaxAge`: This is the age of the cookie
        - `clientId`: This is the OAuth client id to use
        - `clientSecret`: The OAuth client secret to use
        - `openIdDiscoveryUrl`: The OAuth openid discovery url
        - `redirectUri`: This the redirect url after a successful login on the OAuth server.
        - `logoutRedirectUri`: This is the redirect url after a user is logged out by the OAuth server
