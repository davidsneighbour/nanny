import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  cliPath,
  createProject,
  exists,
  fixturePackage,
  readJson,
  repoRoot,
  runNanny,
} from "../helpers.js";

type RootPackage = {
  name: string;
  version: string;
  bin: Record<string, string>;
  files: string[];
};

const rootPackage = readJson(repoRoot, "package.json") as RootPackage;

describe("README: Installation", () => {
  it("publishes as @davidsneighbour/nanny", () => {
    assert.equal(rootPackage.name, "@davidsneighbour/nanny");
  });

  it("installs a `nanny` binary that is an executable Node script in the published files", () => {
    assert.equal(rootPackage.bin["nanny"], "dist/cli.js");
    assert.ok(rootPackage.files.includes("dist"));
    assert.ok(
      fs.readFileSync(cliPath, "utf8").startsWith("#!/usr/bin/env node"),
    );
  });
});

describe("README: Global usage", () => {
  it("`nanny --version` prints the installed version", () => {
    const result = runNanny(["--version"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), rootPackage.version);
  });

  it("`nanny -v` prints the installed version", () => {
    const result = runNanny(["-v"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), rootPackage.version);
  });

  it("commands run relative to --cwd", () => {
    const target = createProject({ "package.json": fixturePackage });
    const elsewhere = createProject();

    const result = runNanny(["package-init", "--cwd", target], {
      cwd: elsewhere,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.ok(exists(target, "src/packages/system/default.jsonc"));
    assert.deepEqual(fs.readdirSync(elsewhere), []);
  });

  it("commands run in the current working directory when --cwd is not given", () => {
    const project = createProject({ "package.json": fixturePackage });

    const result = runNanny(["package-init"], { cwd: project });

    assert.equal(result.status, 0, result.stderr);
    assert.ok(exists(project, "src/packages/system/default.jsonc"));
  });

  it("--verbose after the command gives more logs", () => {
    const project = createProject({ "package.json": fixturePackage });

    const quiet = runNanny(["generate-package", "--dry-run"], { cwd: project });
    const verbose = runNanny(
      ["generate-package", "--dry-run", "--cwd", project, "--verbose"],
      { cwd: createProject() },
    );

    assert.equal(quiet.status, 0, quiet.stderr);
    assert.equal(verbose.status, 0, verbose.stderr);
    assert.equal(quiet.stderr, "");
    assert.match(verbose.stderr, /Reading package\.json/);
  });
});
