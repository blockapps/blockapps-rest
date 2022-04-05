import * as parser from '@solidity-parser/parser'

/**
 * This is the solidityParser interface
 * @module solidityParser
 */

/**
 * Parses a string Solidity Contract
 * @example
 * const input = `
 *  contract test {
 *  uint256 a;
 *  function f() {}
 * }`
 * const parsed = solidityParser.parse(input)
 * // Returns
 * // { type: 'SourceUnit',
 * //  children:
 * //   [ { type: 'ContractDefinition',
 * //      name: 'test',
 * //      baseContracts: [],
 * //      subNodes: [Array],
 * //      kind: 'contract' } ] }
 * @method parse
 * @param {String} input the Contract string
 * @return {Object}
 */

function parse(input) {
  const opts = {};
  return parser.parse(input, opts)
}

/**
 * Parses enums found in a string Solidity contract
 * @example
 * const input = `
 * contract ErrorCodes {
 *      enum ErrorCodes {
 *          NULL,
 *          SUCCESS,
 *          ERROR,
 *          NOT_FOUND,
 *          EXISTS,
 *          RECURSIVE,
 *          INSUFFICIENT_BALANCE,
 *          UNAUTHORIZED
 *      }
 *  }`
 *  const parsed = parseEnum(input);
 * // Returns
 * // { '0': 'NULL',
 * //  '1': 'SUCCESS',
 * //  '2': 'ERROR',
 * //  '3': 'NOT_FOUND',
 * //  '4': 'EXISTS',
 * //  '5': 'RECURSIVE',
 * //  '6': 'INSUFFICIENT_BALANCE',
 * //  '7': 'UNAUTHORIZED',
 * //  NULL: 0,
 * //  SUCCESS: 1,
 * //  ERROR: 2,
 * //  NOT_FOUND: 3,
 * //  EXISTS: 4,
 * //  RECURSIVE: 5,
 * //  INSUFFICIENT_BALANCE: 6,
 * //  UNAUTHORIZED: 7 }
 * @method parseEnum
 * @param {String} input the Contract string with Enums
 * @return {Object}
 */

function parseEnum(input) {
  const parsed = parse(input)
  const { members } = (parsed as any).children[0].subNodes[0]
  const myEnum = members.filter(member => member.type === 'EnumValue').reduce((acc, member, index) => {
    acc[member.name] = index
    acc[index] = member.name
    return acc
  }, {})

  return myEnum
}

/**
 * Parses fields found in a string Solidity contract
 * @example
 * const input = `
 *    contract test {
 *        uint256 a;
 *        uint256 b = 1234;
 *        string c = 'ABCD';
 *        function f() {}
 *    }`
 *  const parsed = parseFields(input);
 * // Returns
 * // { '1234': 'b', b: '1234', c: 'ABCD', ABCD: 'c' }
 * @method parseFields
 * @param {String} input the Contract string with Fields
 * @return {Object}
 */

function parseFields(input, prefix?) {
  const graph = parse(input)
  const contract = (graph as any).children.filter(child => child.type === 'ContractDefinition')[0]
  const stateVariableDeclarations = contract.subNodes.filter(child => child.type === 'StateVariableDeclaration')

  const result = stateVariableDeclarations.reduce((acc, stateVariable) => {
    const variable = stateVariable.variables[0]
    // must have an assignment expression
    if (!variable.expression) return acc
    // check prefix if needed
    if (prefix !== undefined && variable.name.indexOf(prefix) !== 0) return acc

    // extract the name->value pair
    function getNameValue(variable) {
      switch (variable.expression.type) {
        case 'StringLiteral':
          return { name: variable.name, value: variable.expression.value }
        case 'NumberLiteral':
          return { name: variable.name, value: variable.expression.number }
        default:
          throw new Error(`Unknown Expressions ${variable.expression.type}`)
      }
    }

    const { name, value } = getNameValue(variable)
    // save name -> value
    acc[name] = value
    // prevent duplicates
    if (acc[value] !== undefined) throw new Error(`Duplicate expressions value. var:${name} value:${value}`)
    // save value -> name
    acc[value] = name
    return acc
  }, {})

  return result
}

export default {
  parse,
  parseEnum,
  parseFields,
}
