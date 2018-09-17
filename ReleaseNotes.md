## RELEASE NOTES

### Version: 5.4.0

#### Minor upgrades
* All endpoints are up-to-date with `private-chain` functionality.
* The affected endpoints are:
  - `strato.account`: now accepts an array of chainIds.
  - `strato.transaction`: now accepts a chainId.
  - `strato.transactionLast`: now accepts a chainId.
  - `strato.transactionResult`: now accepts a chainId.
  - `strato.storage`: now accepts a list of chainIds.
  - `bloc.contract`: now accepts a chainId.
  - `bloc.uploadList`: now accepts a chainId.
  - `bloc.call`: now accepts a chainId.
  - `bloc.method`: now accepts a chainId.
  - `bloc.callList`: now accepts a chainId.
  - `bloc.send`: now accepts a chainId.
  - `bloc.sendList`: now accepts a chainId.
  - `bloc.result`: now accepts a chainId.
  - `bloc.results`: now accepts a chainId.
  - `bloc.state`: now accepts a chainId.
  - `bloc.stateVar`: now accepts a chainId.
* New endpoints:
  - `strato.chain`: takes a list of chainIds, returns a list of ChainInfo.
  - `strato.createChain`: takes a body, and returns a chainId, if successful.
  - `bloc.chain`: takes a list of chainIds, returns a list of ChainInfo.
  - `bloc.createChain`: takes a body, and returns a chainId, if successful.
* New `rest` methods:
  - `getChainInfo`: takes a chainId, returns the ChainInfo associated with that chain.
  - `getChainInfos`: takes a list of chainIds, returns a list of ChainInfo.
  - `createChain`: takes a label, a list of members, a list of balances, contract source, and contract arguments, and returns a chainId, if successful.

### Version: 5.3.5

#### Minor upgrades
* intToBytes32(int) added. Convert int to Bytes32
* getNonce(user, index) added. Return the account's nonce value

### Version: 5.3.4

#### Minor upgrades
* Added function `createTestUser()` that creates test users.

### Version: 5.3.1

#### Issues Fixed
* `assert.shouldThrowRest` checks `statusText` too.

### Version: 5.3.0

#### Minor upgrades
* `rest.getFields()` parses arrays. Values returned as strings.

### Version: 5.2.9

#### Minor upgrades
* config printed to stdout only when apiDebug == true

#### Issues Fixed
* `solc` messages properly display new lines

### Version: 5.2.8

#### Issues Fixed
* `rest.getFields()` ignore null value on `StateVariableDeclaration`

### Version: 5.2.7

#### Issues Fixed
* `rest.getFields()` now parses both `ExpressionStatement` and `StateVariableDeclaration`

### Version: 5.2.6

#### Issues Fixed
* `util.response` handles rest code 201 properly

### Version: 5.2.5

#### Minor upgrades
* `importer` Solidity imports that start with '/' are treated as relative paths to the project root (process.cwd)

### Version: 5.2.4

#### Minor upgrades
* `eparser.getFields()` reads variable members and their initializers from a contract into a javascript object

### Version: 5.2.3

#### Minor upgrades
* `common.cwd` contains a platform independent version of `process.cwd()`
* `asseert.shouldThrowRest` added

### Version: 5.2.0

#### Backward Incompatibilities
* requires Node.js® ^8.0.0

#### Minor upgrades
* `util.uid()` and `util.iuid()` now use Math.random()

### Version: 5.1.4

#### Minor upgrades
* Gas limit increased to avoid contract-in-a-contract out of gas

### Version: 5.1.2

#### New features
* `/stateVar` adds pagination to a `/state` variable
  * varName: the name of the array
  * varCount: request the array element count
  * varOffset: offset into the array
  * varLength: number of elements to retrieve

#### Backward Incompatibilities
* `/state` will throw a 400 when trying to get a large array without pagination


### Version: 5.0.1 - Feb, 2018

#### New features
* The unique identifier for searchable contracts is now the contract's code hash, and not the contract's name.  This is a breaking change.

#### Backward Incompatibilities
* `isCompile(contractName)` is deprecated, use `isSearchable(ContractCodeHash)`
