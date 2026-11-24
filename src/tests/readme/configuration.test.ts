import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProject, exists, fixturePackage, runNanny } from "../helpers.js";

const DIR = "config/package-particles";
const FRAGMENT = `${DIR}/system/default.jsonc`;

const esm = `export default {\n  packagesDir: "${DIR}",\n};\n`;
const cjs = `module.exports = {\n  packagesDir: "${DIR}",\n};\n`;
const json = `{\n  "packagesDir": "${DIR}"\n}\n`;
const jsonc = `{\n  // Directory that contains package fragments.\n  "packagesDir": "${DIR}"\n}\n`;
const yaml = `packagesDir: ${DIR}\n`;

/** Every location from the README list, with content in the format its extension implies. */
const LOCATIONS: Array<[file: string, content: string]> = [
  ["nanny.config.ts", esm],
  ["nanny.config.js", esm],
  ["nanny.config.mjs", esm],
  ["nanny.config.cjs", cjs],
  ["nanny.config.json", json],
  ["nanny.config.jsonc", jsonc],
  ["nanny.config.yaml", yaml],
  ["nanny.config.yml", yaml],
  // c12 reads `.nannyrc` with rc9, which uses flat `key=value` lines.
  [".nannyrc", `packagesDir=${DIR}\n`],
  [".nannyrc.json", json],
  [".nannyrc.jsonc", jsonc],
  [".nannyrc.yaml", yaml],
  [".nannyrc.yml", yaml],
  [".config/nanny.jsonc", jsonc],
];

function assertLoadsFrom(files: Record<string, unknown>): void {
  const project = createProject({ "package.json": fixturePackage, ...files });
  const result = runNanny(["package-init"], { cwd: project });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    exists(project, FRAGMENT),
    "packagesDir from the config file was not used",
  );
}

describe("README: Configuration", () => {
  describe("supported configuration locations", () => {
    for (const [file, content] of LOCATIONS) {
      // c12 3.x does not resolve `.nannyrc.<ext>`: it reads only `.nannyrc` (rc9 format).
      const todo = file.startsWith(".nannyrc.")
        ? "README claim is false: c12 does not load this file (#69)"
        : undefined;
      it(file, { todo }, () => {
        assertLoadsFrom({ [file]: content });
      });
    }

    it("the nanny property in package.json", () => {
      assertLoadsFrom({
        "package.json": { ...fixturePackage, nanny: { packagesDir: DIR } },
      });
    });
  });

  it("packagesDir defaults to src/packages", () => {
    const project = createProject({ "package.json": fixturePackage });
    const result = runNanny(["package-init"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(exists(project, "src/packages/system/default.jsonc"));
  });

  describe("local overrides", () => {
    it("nanny.config.local.jsonc overrides the repo-local config", () => {
      const project = createProject({
        "package.json": {
          ...fixturePackage,
          nanny: { packagesDir: "from-package-json" },
        },
        "nanny.config.jsonc": jsonc,
        "nanny.config.local.jsonc": `// nanny.config.local.jsonc (gitignored)\n{\n  "packagesDir": "from-local"\n}\n`,
      });
      const result = runNanny(["package-init"], { cwd: project });
      assert.equal(result.status, 0, result.stderr);
      assert.ok(exists(project, "from-local/system/default.jsonc"));
    });

    it("an absolute packagesDir in nanny.config.local.jsonc is used as it is", () => {
      const target = createProject();
      const project = createProject({
        "package.json": fixturePackage,
        "nanny.config.local.jsonc": { packagesDir: target },
      });
      const result = runNanny(["package-init"], { cwd: project });
      assert.equal(result.status, 0, result.stderr);
      assert.ok(exists(target, "system/default.jsonc"));
    });

    for (const [name, extra] of [
      ["CLI flags", { args: ["--packages-dir", "from-higher"] }],
      ["environment variables", { env: { NANNY_PACKAGES_DIR: "from-higher" } }],
      [".env", { dotenv: "NANNY_PACKAGES_DIR=from-higher\n" }],
    ] as const) {
      it(`${name} take precedence over nanny.config.local.jsonc`, () => {
        const project = createProject({
          "package.json": fixturePackage,
          "nanny.config.local.jsonc": { packagesDir: "from-local" },
          ...("dotenv" in extra ? { ".env": extra.dotenv } : {}),
        });
        const result = runNanny(
          ["package-init", ...("args" in extra ? extra.args : [])],
          {
            cwd: project,
            ...("env" in extra ? { env: extra.env } : {}),
          },
        );
        assert.equal(result.status, 0, result.stderr);
        assert.ok(exists(project, "from-higher/system/default.jsonc"));
        assert.ok(!exists(project, "from-local/system/default.jsonc"));
      });
    }
  });
});
