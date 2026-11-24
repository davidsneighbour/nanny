import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createProject,
  fixturePackage,
  readJson,
  runNanny,
  section,
} from "../helpers.js";

const rootPackage = {
  ...fixturePackage,
  scripts: { build: "tsc", lint: "biome check", test: "node --test" },
  dependencies: { "dep-a": "1.0.0", unused: "3.0.0" },
  wireit: { build: { command: "tsc" } },
};

const fragments = {
  "src/packages/one.jsonc": {
    scripts: { build: "tsc -b", test: "node --test" },
    dependencies: { "dep-a": "0.1.0" },
    devDependencies: { "dev-b": "2.0.0" },
    wireit: { build: { command: "tsc -b" } },
  },
  "src/packages/two.jsonc": {
    scripts: { test: "node --test" },
  },
};

function update(args: string[] = []) {
  const project = createProject({ "package.json": rootPackage, ...fragments });
  const result = runNanny(["update-package", ...args], { cwd: project });
  assert.equal(result.status, 0, result.stderr);
  return { project, stdout: result.stdout };
}

describe("README: update-package", () => {
  it("synchronises dependency versions in the fragments with the root package.json", () => {
    const { project, stdout } = update();
    const one = readJson(project, "src/packages/one.jsonc") as {
      dependencies: Record<string, string>;
    };
    assert.equal(one.dependencies["dep-a"], "1.0.0");
    assert.match(stdout, /Updated: src\/packages\/one\.jsonc/);
  });

  it("audits unused root dependencies", () => {
    const { stdout } = update();
    const unused = section(stdout, "Unused dependencies", "Scripts audit");
    assert.match(unused, /"unused": "3\.0\.0"/);
    assert.doesNotMatch(unused, /dep-a/);
  });

  it("audits scripts missing from the fragments", () => {
    const { stdout } = update();
    const missing = section(
      section(stdout, "Scripts audit", "Wireit audit"),
      "- Missing",
      "- Changed",
    );
    assert.match(missing, /- lint/);
    assert.doesNotMatch(missing, /- build/);
  });

  it("audits scripts that differ from root", () => {
    const { stdout } = update();
    const changed = section(
      section(stdout, "Scripts audit", "Wireit audit"),
      "- Changed",
      "- Duplicates",
    );
    assert.match(changed, /build in src\/packages\/one\.jsonc/);
    assert.match(changed, /root: tsc\n/);
    assert.match(changed, /file: tsc -b/);
  });

  it("audits wireit entries that differ from root", () => {
    const { stdout } = update();
    const wireit = section(stdout, "Wireit audit");
    assert.match(
      section(wireit, "- Changed"),
      /build in src\/packages\/one\.jsonc/,
    );
  });

  it("audits duplicates across multiple fragment files", () => {
    const { stdout } = update();
    const dupes = section(
      section(stdout, "Scripts audit", "Wireit audit"),
      "- Duplicates",
    );
    assert.match(
      dupes,
      /- test\n\s+src\/packages\/one\.jsonc\n\s+src\/packages\/two\.jsonc/,
    );
  });

  it("accepts --packages-dir (README example)", () => {
    const project = createProject({
      "package.json": rootPackage,
      "config/package-particles/one.jsonc": {
        dependencies: { "dep-a": "0.1.0" },
      },
    });
    const result = runNanny(
      ["update-package", "--packages-dir", "config/package-particles"],
      { cwd: project },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJson(project, "config/package-particles/one.jsonc"), {
      dependencies: { "dep-a": "1.0.0" },
    });
  });

  it("accepts --verbose", () => {
    update(["--verbose"]);
  });
});
