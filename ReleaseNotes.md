## RELEASE NOTES

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
