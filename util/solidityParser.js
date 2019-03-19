import parser from 'solidity-parser-antlr'
import fsUtil from './fsUtil'

async function parse(input) {
  return parser.parse(input)
}

async function parseEnum(input) {
  const parsed = await parse(input)
  const { members } = parsed.children[0].subNodes[0]
  const myEnum = members.filter(member => member.type === 'EnumValue').reduce((acc, member, index) => {
    acc[member.name] = index
    acc[index] = member.name
    return acc
  }, {})

  return myEnum
}

async function parseEnumUsingFile(filename) {
  const source = fsUtil.get(filename)
  return await parseEnum(source);
}

export default {
  parse,
  parseEnum,
  parseEnumUsingFile
}
