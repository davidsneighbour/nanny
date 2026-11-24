import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProject, fixturePackage, runNanny } from "../helpers.js";

const COMMANDS = [
  "package-init",
  "generate-package",
  "update-package",
  "merge-vscode-config",
  "check",
  "editorconfig",
];

describe("README: Exit codes", () => {
  describe("0: success", () => {
    it("a successful command exits 0", () => {
      const project = createProject({ "package.json": fixturePackage });
      assert.equal(runNanny(["package-init"], { cwd: project }).status, 0);
    });
  });

  describe("1: invalid arguments", () => {
    it("an unknown command exits 1", () => {
      assert.equal(runNanny(["no-such-command"]).status, 1);
    });

    for (const command of COMMANDS) {
      it(`an unknown argument to ${command} exits 1`, () => {
        const project = createProject({ "package.json": fixturePackage });
        const result = runNanny([command, "--no-such-flag"], { cwd: project });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Unknown argument: --no-such-flag/);
      });
    }

    it("a flag without its value exits 1", () => {
      const project = createProject({ "package.json": fixturePackage });
      const result = runNanny(["generate-package", "--keys"], { cwd: project });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Missing value for --keys/);
    });
  });

  describe("1: runtime error", () => {
    it("a fragment that is not valid JSONC exits 1", () => {
      const project = createProject({
        "package.json": fixturePackage,
        "src/packages/bad.jsonc": "{ not json",
      });
      const result = runNanny(["generate-package", "--dry-run"], {
        cwd: project,
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /bad\.jsonc/);
    });
  });

  describe("2: missing required files", () => {
    for (const command of [
      "package-init",
      "generate-package",
      "update-package",
    ]) {
      it(`${command} without package.json exits 2`, () => {
        const result = runNanny([command]);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /package\.json not found/);
      });
    }

    it("merge-vscode-config without .vscode/settings.base.jsonc exits 2", () => {
      const result = runNanny(["merge-vscode-config"]);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /Base file not found/);
    });
  });
});
