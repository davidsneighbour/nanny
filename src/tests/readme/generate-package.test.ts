import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createProject,
  fixturePackage,
  readJson,
  readText,
  runNanny,
} from "../helpers.js";

type Pkg = Record<string, unknown>;

/** A root package.json with a key outside the default preserve list (`keywords`). */
const rootPackage = {
  ...fixturePackage,
  keywords: ["root"],
  homepage: "https://example.invalid",
};

const fragments = {
  "src/packages/a.jsonc": `{\n  // comment\n  "scripts": { "build": "tsc -b" }\n}\n`,
  "src/packages/b.jsonc": {
    scripts: { lint: "biome check" },
    dependencies: { "dep-a": "1.0.0" },
  },
};

function generate(args: string[], files: Record<string, unknown> = {}): Pkg {
  const project = createProject({
    "package.json": rootPackage,
    ...fragments,
    ...files,
  });
  const result = runNanny(["generate-package", "--dry-run", ...args], {
    cwd: project,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as Pkg;
}

describe("README: generate-package", () => {
  it("merges all fragment files into package.json", () => {
    const project = createProject({
      "package.json": rootPackage,
      ...fragments,
    });
    const result = runNanny(["generate-package"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);

    const written = readJson(project, "package.json") as Pkg;
    assert.deepEqual(written["scripts"], {
      build: "tsc -b",
      lint: "biome check",
    });
    assert.deepEqual(written["dependencies"], { "dep-a": "1.0.0" });
  });

  it("preserves the default set of keys from the original package.json and drops the others", () => {
    const output = generate([]);
    assert.equal(output["name"], rootPackage.name);
    assert.equal(output["version"], rootPackage.version);
    assert.equal(output["homepage"], rootPackage.homepage);
    assert.ok(!("keywords" in output));
    assert.ok(
      !("devDependencies" in output),
      "a key that no fragment sets must not survive",
    );
  });

  it("--keys replaces the default list", () => {
    const output = generate(["--keys", "name,keywords"]);
    assert.equal(output["name"], rootPackage.name);
    assert.deepEqual(output["keywords"], ["root"]);
    assert.ok(!("version" in output));
    assert.ok(!("homepage" in output));
  });

  it("--add-keys extends the default list", () => {
    const output = generate(["--add-keys", "keywords"]);
    assert.deepEqual(output["keywords"], ["root"]);
    assert.equal(output["version"], rootPackage.version);
    assert.equal(output["homepage"], rootPackage.homepage);
  });

  it("--add-keys extends --keys when both are given", () => {
    const output = generate(["--keys", "name", "--add-keys", "keywords"]);
    assert.equal(output["name"], rootPackage.name);
    assert.deepEqual(output["keywords"], ["root"]);
    assert.ok(!("version" in output));
  });

  it("the README example `--add-keys workspaces` keeps workspaces", () => {
    const project = createProject({
      "package.json": { ...rootPackage, workspaces: ["packages/*"] },
      ...fragments,
    });
    const result = runNanny(
      ["generate-package", "--add-keys", "workspaces", "--dry-run"],
      { cwd: project },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual((JSON.parse(result.stdout) as Pkg)["workspaces"], [
      "packages/*",
    ]);
  });

  it("--dry-run prints the result and does not write package.json", () => {
    const project = createProject({
      "package.json": rootPackage,
      ...fragments,
    });
    const before = readText(project, "package.json");
    const result = runNanny(["generate-package", "--dry-run"], {
      cwd: project,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok((JSON.parse(result.stdout) as Pkg)["scripts"]);
    assert.equal(readText(project, "package.json"), before);
  });

  it("--package <path> reads the keys to preserve from another file", () => {
    const output = generate(["--package", "other/package.json"], {
      "other/package.json": { name: "other", version: "9.9.9" },
    });
    assert.equal(output["name"], "other");
    assert.equal(output["version"], "9.9.9");
  });

  it("--verbose gives more logs", () => {
    const project = createProject({
      "package.json": rootPackage,
      ...fragments,
    });
    const result = runNanny(["generate-package", "--dry-run", "--verbose"], {
      cwd: project,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Merging values from/);
  });
});
