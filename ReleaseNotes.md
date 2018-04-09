## RELEASE NOTES

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
