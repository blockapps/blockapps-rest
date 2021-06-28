import { assert } from "chai";
import importer from "../importer";
import rest from "../../rest";
import util from "../util";
import factory from "../../test/factory";
import { Options, Contract, Config } from "../../types";

const config:Config = <Config>factory.getTestConfig();
const fixtures = `${util.cwd}/lib/util/test/fixtures/`;

describe("imports", function() {
  this.timeout(config.timeout);
  let admin;
  const options:Options = { config, cacheNonce: true };

  before(async () => {
    const userArgs = { token: process.env.USER_TOKEN };
    admin = await factory.createAdmin(userArgs, options);
  });

  it("combines to array", async () => {
    const filename = `${fixtures}/importer/Main.sol`;
    const source = await importer.combine(filename, false);
    assert.equal(source.length, 5, "should have an array with all 5 files");
    let src = ''
    for (let i = 0; i < source.length; i++) {
      src += source[i][1];
    }
    assert.isAbove(src.indexOf("contract Main"), 0);
    assert.isAbove(src.indexOf("contract A"), 0);
    assert.isAbove(src.indexOf("contract B"), 0);
    assert.isAbove(src.indexOf("contract C"), 0);
    assert.isAbove(src.indexOf("contract D"), 0);
  });

  it("combines to object", async () => {
    const filename = `${fixtures}/importer/Main.sol`;
    const source = await importer.combine(filename, true);
    assert.isAbove(source['Main.sol'].indexOf("contract Main"), 0);
    assert.isAbove(source['A.sol'].indexOf("contract A"), 0);
    assert.isAbove(source['B.sol'].indexOf("contract B"), 0);
    assert.isAbove(source['C.sol'].indexOf("contract C"), 0);
    assert.isAbove(source['D.sol'].indexOf("contract D"), 0);
  });

  it("combines to array and uploads", async () => {
    const filename = `${fixtures}/importer/Main.sol`;
    const source = await importer.combine(filename, false);
    const name = `Main`;
    const args = util.usc({ size: 10 });
    const contractArgs = { name, source, args };
    const contract = <Contract> await rest.createContract(admin, contractArgs, options);
    const state = await rest.getState(admin, contract, options);
    assert.isDefined(state.AA, "A");
    assert.isDefined(state.BB, "B");
    assert.isDefined(state.CC, "C");
    assert.isDefined(state.DD, "D");
  });

  it("combines to object and uploads", async () => {
    const filename = `${fixtures}/importer/Main.sol`;
    const source = await importer.combine(filename, true);
    const name = `Main`;
    const args = util.usc({ size: 10 });
    const contractArgs = { name, source, args };
    const contract = <Contract> await rest.createContract(admin, contractArgs, options);
    const state = await rest.getState(admin, contract, options);
    assert.isDefined(state.AA, "A");
    assert.isDefined(state.BB, "B");
    assert.isDefined(state.CC, "C");
    assert.isDefined(state.DD, "D");
  });
});
