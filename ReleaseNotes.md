## RELEASE NOTES

### Version 7.6.4

- Add source mappings for minified dist code
- Add babel-preset-minify, remove gulp-uglify

### Version 7.6.3

- Fix for util.uid() to always return string value for compatibility with STRATO 5.2+

### Version 7.6.2

- Expose searchWithContentRange and searchWithContentRangeUntil

### Version 7.6.1

- Fix distributive

### Version 7.6.0

-   Token-getter updates: no separate config needed - fully mimics the app by following it's config
-   Fix for @babel/polyfill dependency

### Version 7.5.8

-   Pass chainid parameter through getCallArgs and getCreateArgs

### Version 7.5.7

-   Hotfix for regeneratorRuntime error in oauth.util.js

### Version 7.5.6

-   Add batch contract state and chain creation functions, as well as expose get{Send,Create,Call}Args functions for generating transaction payloads
-   Add external storage endpoints

### Version 7.5.5
    
-   Better debug logs formatting

### Version 7.5.4

-   Generate source maps in build

### Version 7.5.3

-   Bug fix for chain ID helper for Cirrus queries in api.util.js

### Version 7.5.2

-   Bug fix for history metadata helper in api.util.js

### Version 7.5.1

-   Add support for adding custom state in the authorization url

### Version 7.5.0

-   Add support for resource-owner-password-credential grant flow
-   Support overriding config client id and client secret for getAccessTokenByClientSecret

### Version 7.4.4

-   Make calls to solidity-parser library synchronous

### Version 7.4.3

-   Implement flatted stringify to remove circular JSON warnings
-   Turn on console logger based on config apiDebug flag
-   Fixed npm vulnerabilities

### Version 7.4.2

-   Update token getter to support https
-   Make --env flag optional

### Version 7.4.1

-   Update token getter to display logout button and output env file
-   Add pingOauth endpoint
-   Disable google translate for token-getter

### Version 7.4

-   Refactor ba-rest to only use oauth

### Version 7.3.1

-   Output the OAuth sign-in URL to command line when using oauth-client (token-getter)

### Version 7.3.0

-   Refactor ba-rest to use ES6
-   Replace generators with async/await
-   Add tests
-   Refactor token-getter
-   Add build and deploy scripts for npm

### Version 6.4.1

-   Clean OAuth cookies if access token expired and can't be refreshed

### Version 6.4.0

-   Search URL should not necessarily contain `/cirrus` now - for STRATO platform internal calls compatibility
-   Removed old deprecated API and REST wrappers (v4 and earlier)
-   Removed the old deprecated Explorer API wrappers

### Version 6.3.0

-   rest6.getKey now has an option to return other user's account address

### Version 6.2.13

-   Fix a resolution error introduced in 6.2.12

### Version 6.2.12

-   VM Selection is provided as well in config.yaml, with precedence given to `options`
    parameter in the function call in `rest_6`. In `rest_5`, this is the sole way to select
    vm. The two options are `EVM` and `SolidVM`.

### Version 6.2.11

-   Support added to sending code to solidvm

### Version 6.2.10

-   resolveResults() optimization introduced in 6.2.8 is reverted (causing hidden issues)

### Version 6.2.9

-   Fixed broken logger

### Version 6.2.8

-   Optimized resolveResults() function in rest5 and rest6

### Version 6.2.7

-   isTokenValid args list fix

### Version: 6.2.6

-   Conform logger.debug() messages to winston format
-   Log API errors

### Version 6.2.5

-   private chains hotfix
-   nodeUrl in config as a preferable way to pass STRATO hostname for oauth

### Version 6.2.4

-   stratoUrl of oauth config is deprecated and no longer used

### Version 6.2.3

#### Minor upgrades

-   The oauth module now looks for a `tokenField` setting in the oauth config to decide which field to use as the access token, in the response received from the oauth server. If this setting is not present, it uses `access_token` by default. The other possible value is `id_token`.

### Version 6.2.2

#### Minor upgrades

-   Added Bloc /details endpoint
-   Added options to createChain

### Version 6.2.1

#### Minor upgrades

-   `util.intToBytes32` now processes integers passed as strings correctly and throws an error if can not convert an argument to an integer.

### Version: 6.2.0

-   Client credential OAuth flow implemented

### Version: 6.1.1

-   Hotfix: Requiring `rest` module is deprecated now and imports rest 5 as well as `rest5`. For rest 6 one needs to explicitly require `rest6`

### Version: 6.1.0

-   Audit trail (contract history) functionality added (rest_6 only)
-   The wrapper functions arguments are now grouped under one `options` object for all the optional args (rest_6 only)
-   resolve argument is superseded with options.doNotResolve and is now false by default (rest_6 only)

### Version: 6.0.0

-   STRATO API v2.3 support with OAuth-enabled user management replacing the bloc users;
    -   `createKey(accessToken)` - to create user on the STRATO blockchain
    -   `getKey(accessToken)` - to get user's address
    -   `sendTransactions(..)` - the all-in-one function to make transactions of all types
    -   accessToken argument added to all previously existing transaction helper functions
    -   `oauth` section expected in the config to use new wrappers
-   OAuth flow helper functions;
-   OAuth token getter helper utility to fetch OAuth access tokens for easier application deployment;

### Version: 5.6.1

#### Minor upgrades

-   `rest.createChain` now accepts an optional contract name argument before `node`.

### Version: 5.6.0

#### Minor upgrades

-   All endpoints are up-to-date with `private-chain` functionality.
-   The affected endpoints are:
    -   `strato.account`: now accepts an array of chainIds.
    -   `strato.transaction`: now accepts a chainId.
    -   `strato.transactionLast`: now accepts a chainId.
    -   `strato.transactionResult`: now accepts a chainId.
    -   `strato.storage`: now accepts a list of chainIds.
    -   `bloc.contract`: now accepts a chainId.
    -   `bloc.uploadList`: now accepts a chainId.
    -   `bloc.call`: now accepts a chainId.
    -   `bloc.method`: now accepts a chainId.
    -   `bloc.callList`: now accepts a chainId.
    -   `bloc.send`: now accepts a chainId.
    -   `bloc.sendList`: now accepts a chainId.
    -   `bloc.result`: now accepts a chainId.
    -   `bloc.results`: now accepts a chainId.
    -   `bloc.state`: now accepts a chainId.
    -   `bloc.stateVar`: now accepts a chainId.
-   New endpoints:
    -   `strato.chain`: takes a list of chainIds, returns a list of ChainInfo.
    -   `strato.createChain`: takes a body, and returns a chainId, if successful.
    -   `bloc.chain`: takes a list of chainIds, returns a list of ChainInfo.
    -   `bloc.createChain`: takes a body, and returns a chainId, if successful.
-   New `rest` methods:
    -   `getChainInfo`: takes a chainId, returns the ChainInfo associated with that chain.
    -   `getChainInfos`: takes a list of chainIds, returns a list of ChainInfo.
    -   `createChain`: takes a label, a list of members, a list of balances, contract source, and contract arguments, and returns a chainId, if successful.

### Version: 5.5.0

#### Minor upgrades

-   `setLogger` added. Used to pass a standard logger into blockapps-rest, to replace the debug console output

### Version: 5.4.0

#### Minor upgrades

-   `rest.keystore(user, keyStore)` added to wrap `/users/{user}/keystore`

### Version: 5.3.6

#### Issues Fixed

-   rest error response returned as stringified json

### Version: 5.3.5

#### Minor upgrades

-   intToBytes32(int) added. Convert int to Bytes32
-   getNonce(user, index) added. Return the account's nonce value

### Version: 5.3.4

#### Minor upgrades

-   Added function `createTestUser()` that creates test users.

### Version: 5.3.1

#### Issues Fixed

-   `assert.shouldThrowRest` checks `statusText` too.

### Version: 5.3.0

#### Minor upgrades

-   `rest.getFields()` parses arrays. Values returned as strings.

### Version: 5.2.9

#### Minor upgrades

-   config printed to stdout only when apiDebug == true

#### Issues Fixed

-   `solc` messages properly display new lines

### Version: 5.2.8

#### Issues Fixed

-   `rest.getFields()` ignore null value on `StateVariableDeclaration`

### Version: 5.2.7

#### Issues Fixed

-   `rest.getFields()` now parses both `ExpressionStatement` and `StateVariableDeclaration`

### Version: 5.2.6

#### Issues Fixed

-   `util.response` handles rest code 201 properly

### Version: 5.2.5

#### Minor upgrades

-   `importer` Solidity imports that start with '/' are treated as relative paths to the project root (process.cwd)

### Version: 5.2.4

#### Minor upgrades

-   `eparser.getFields()` reads variable members and their initializers from a contract into a javascript object

### Version: 5.2.3

#### Minor upgrades

-   `common.cwd` contains a platform independent version of `process.cwd()`
-   `asseert.shouldThrowRest` added

### Version: 5.2.0

#### Backward Incompatibilities

-   requires Node.js® ^8.0.0

#### Minor upgrades

-   `util.uid()` and `util.iuid()` now use Math.random()

### Version: 5.1.4

#### Minor upgrades

-   Gas limit increased to avoid contract-in-a-contract out of gas

### Version: 5.1.2

#### New features

-   `/stateVar` adds pagination to a `/state` variable
    -   varName: the name of the array
    -   varCount: request the array element count
    -   varOffset: offset into the array
    -   varLength: number of elements to retrieve

#### Backward Incompatibilities

-   `/state` will throw a 400 when trying to get a large array without pagination

### Version: 5.0.1 - Feb, 2018

#### New features

-   The unique identifier for searchable contracts is now the contract's code hash, and not the contract's name. This is a breaking change.

#### Backward Incompatibilities

-   `isCompile(contractName)` is deprecated, use `isSearchable(ContractCodeHash)`
