import { assert } from "chai";
import importer from "../importer";
import rest from "../../rest";
import util from "../util";
import factory from "../../test/factory";

const config = factory.getTestConfig();
const fixtures = `${util.cwd}/lib/util/test/fixtures/`;

describe("imports", () => {
  let admin;
  const options = { config };

  before(async () => {
    const userArgs = { token: process.env.USER_TOKEN };
    admin = await factory.createAdmin(userArgs, options);
  });

  it("combines", async () => {
    const filename = `${fixtures}/importer/Main.sol`;
    const source = await importer.combine(filename);
    assert.isAbove(source.indexOf("contract Main"), 0);
    assert.isAbove(source.indexOf("contract A"), 0);
    assert.isAbove(source.indexOf("contract B"), 0);
    assert.isAbove(source.indexOf("contract C"), 0);
    assert.isAbove(source.indexOf("contract D"), 0);
  });

  it("combines and uploads", async () => {
    const filename = `${fixtures}/importer/Main.sol`;
    const source = await importer.combine(filename);
    const name = `Main`;
    const args = util.usc({ size: 10 });
    const contractArgs = { name, source, args };
    const contract = await rest.createContract(admin, contractArgs, options);
    const state = await rest.getState(admin, contract, options);
    assert.isDefined(state.AA, "A");
    assert.isDefined(state.BB, "B");
    assert.isDefined(state.CC, "C");
    assert.isDefined(state.DD, "D");
  });
});
