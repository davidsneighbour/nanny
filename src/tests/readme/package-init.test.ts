import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createProject,
  exists,
  fixturePackage,
  readJson,
  readText,
  runNanny,
  writeFile,
} from "../helpers.js";

const STARTER = "src/packages/legacy/starter.jsonc";
const DEFAULT = "src/packages/system/default.jsonc";

describe("README: package-init", () => {
  it("writes scripts, dependencies, and devDependencies to legacy/starter.jsonc", () => {
    const project = createProject({ "package.json": fixturePackage });
    const result = runNanny(["package-init"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);

    const { scripts, dependencies, devDependencies } = fixturePackage;
    assert.deepEqual(readJson(project, STARTER), {
      scripts,
      dependencies,
      devDependencies,
    });
  });

  it("writes all other package fields to system/default.jsonc", () => {
    const project = createProject({ "package.json": fixturePackage });
    const result = runNanny(["package-init"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);

    const {
      scripts: _s,
      dependencies: _d,
      devDependencies: _dd,
      ...rest
    } = fixturePackage;
    assert.deepEqual(readJson(project, DEFAULT), rest);
  });

  it("leaves package.json unchanged", () => {
    const project = createProject({ "package.json": fixturePackage });
    const before = readText(project, "package.json");
    const result = runNanny(["package-init"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readText(project, "package.json"), before);
  });

  it("`nanny generate-package --dry-run` afterwards reproduces the original package.json without writing it", () => {
    const project = createProject({ "package.json": fixturePackage });
    assert.equal(runNanny(["package-init"], { cwd: project }).status, 0);
    const before = readText(project, "package.json");

    const result = runNanny(["generate-package", "--dry-run"], {
      cwd: project,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), fixturePackage);
    assert.equal(readText(project, "package.json"), before);
  });

  it("--package <path> reads another package.json", () => {
    const project = createProject({
      "pkgs/other.json": { ...fixturePackage, name: "other" },
    });
    const result = runNanny(["package-init", "--package", "pkgs/other.json"], {
      cwd: project,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      (readJson(project, DEFAULT) as { name: string }).name,
      "other",
    );
  });

  it("--force overwrites existing fragment files", () => {
    const project = createProject({ "package.json": fixturePackage });
    writeFile(project, DEFAULT, { name: "stale" });

    const refused = runNanny(["package-init"], { cwd: project });
    assert.equal(refused.status, 1);
    assert.deepEqual(readJson(project, DEFAULT), { name: "stale" });

    const forced = runNanny(["package-init", "--force"], { cwd: project });
    assert.equal(forced.status, 0, forced.stderr);
    assert.equal(
      (readJson(project, DEFAULT) as { name: string }).name,
      "fixture",
    );
  });

  it("--verbose gives more logs", () => {
    const project = createProject({ "package.json": fixturePackage });
    const result = runNanny(["package-init", "--verbose"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Writing starter fragment/);
  });

  it("the README examples work", () => {
    const viaFlag = createProject({ "package.json": fixturePackage });
    assert.equal(
      runNanny(["package-init", "--packages-dir", "config/package-particles"], {
        cwd: viaFlag,
      }).status,
      0,
    );
    assert.ok(exists(viaFlag, "config/package-particles/legacy/starter.jsonc"));

    const viaEnv = createProject({ "package.json": fixturePackage });
    const env = { NANNY_PACKAGES_DIR: "config/package-particles" };
    assert.equal(runNanny(["package-init"], { cwd: viaEnv, env }).status, 0);
    assert.ok(exists(viaEnv, "config/package-particles/legacy/starter.jsonc"));
  });
});
