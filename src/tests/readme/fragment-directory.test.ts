import assert from "node:assert/strict";
import path from "node:path";
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

const FRAGMENT = "system/default.jsonc";

type Sources = {
  flag?: string;
  env?: string;
  dotenv?: string;
  local?: string;
  shared?: string;
};

/** Creates a project that sets packagesDir at each given level, and runs `package-init`. */
function initWith(sources: Sources) {
  const project = createProject({ "package.json": fixturePackage });
  if (sources.dotenv !== undefined)
    writeFile(project, ".env", `NANNY_PACKAGES_DIR=${sources.dotenv}\n`);
  if (sources.local !== undefined)
    writeFile(project, "nanny.config.local.jsonc", {
      packagesDir: sources.local,
    });
  if (sources.shared !== undefined)
    writeFile(project, "nanny.config.jsonc", { packagesDir: sources.shared });

  const args = ["package-init"];
  if (sources.flag !== undefined) args.push("--packages-dir", sources.flag);
  const env =
    sources.env === undefined ? {} : { NANNY_PACKAGES_DIR: sources.env };

  return { project, result: runNanny(args, { cwd: project, env }) };
}

function assertInitIn(sources: Sources, expectedDir: string): void {
  const { project, result } = initWith(sources);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    exists(project, path.join(expectedDir, FRAGMENT)),
    `expected fragments in ${expectedDir}`,
  );
}

const ALL: Required<Sources> = {
  flag: "from-flag",
  env: "from-env",
  dotenv: "from-dotenv",
  local: "from-local",
  shared: "from-shared",
};

describe("README: Fragment directory", () => {
  it("defaults to src/packages", () => {
    assertInitIn({}, "src/packages");
  });

  it("package-init writes legacy/starter.jsonc and system/default.jsonc into the folder", () => {
    const { project, result } = initWith({});
    assert.equal(result.status, 0, result.stderr);
    assert.ok(exists(project, "src/packages/legacy/starter.jsonc"));
    assert.ok(exists(project, "src/packages/system/default.jsonc"));
  });

  describe("reads every **/*.jsonc file, also in nested folders", () => {
    const nested = "src/packages/deep/er/extra.jsonc";

    it("generate-package", () => {
      const project = createProject({
        "package.json": fixturePackage,
        [nested]: { keywords: ["nested"] },
      });
      const result = runNanny(["generate-package", "--dry-run"], {
        cwd: project,
      });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(
        (JSON.parse(result.stdout) as { keywords: unknown }).keywords,
        ["nested"],
      );
    });

    it("update-package", () => {
      const project = createProject({
        "package.json": fixturePackage,
        [nested]: { dependencies: { "dep-a": "0.0.1" } },
      });
      const result = runNanny(["update-package"], { cwd: project });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(readJson(project, nested), {
        dependencies: { "dep-a": "1.0.0" },
      });
    });

    it("check", () => {
      const project = createProject({
        "package.json": fixturePackage,
        [nested]: { dependencies: { "dep-a": "0.0.1" } },
      });
      const result = runNanny(["check"], { cwd: project });
      assert.equal(result.status, 1);
      assert.match(
        result.stdout,
        /dep-a: 0\.0\.1 -> 1\.0\.0 in src\/packages\/deep\/er\/extra\.jsonc/,
      );
    });
  });

  describe("precedence: Nanny picks the first value it finds", () => {
    it("1. the --packages-dir flag wins over every other source", () => {
      assertInitIn(ALL, "from-flag");
    });

    it("2. NANNY_PACKAGES_DIR in the environment wins over .env and config files", () => {
      const { flag: _flag, ...sources } = ALL;
      assertInitIn(sources, "from-env");
    });

    it("3. NANNY_PACKAGES_DIR in .env wins over config files", () => {
      const { flag: _flag, env: _env, ...sources } = ALL;
      assertInitIn(sources, "from-dotenv");
    });

    it("4. nanny.config.local.jsonc wins over the shared config file", () => {
      assertInitIn({ local: ALL.local, shared: ALL.shared }, "from-local");
    });

    it("5. the shared config file wins over the default", () => {
      assertInitIn({ shared: ALL.shared }, "from-shared");
    });

    it("6. the default is src/packages", () => {
      assertInitIn({}, "src/packages");
    });
  });

  describe("--packages-dir is accepted by", () => {
    const fragments = { "frag/system/default.jsonc": { name: "fixture" } };

    it("package-init", () => {
      assertInitIn({ flag: "frag" }, "frag");
    });

    it("generate-package", () => {
      const project = createProject({
        "package.json": fixturePackage,
        "frag/extra.jsonc": { keywords: ["flag"] },
      });
      const result = runNanny(
        ["generate-package", "--packages-dir", "frag", "--dry-run"],
        { cwd: project },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(
        (JSON.parse(result.stdout) as { keywords: unknown }).keywords,
        ["flag"],
      );
    });

    it("update-package", () => {
      const project = createProject({
        "package.json": fixturePackage,
        ...fragments,
      });
      const result = runNanny(["update-package", "--packages-dir", "frag"], {
        cwd: project,
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /No changes: frag\/system\/default\.jsonc/);
    });

    it("check", () => {
      const project = createProject({
        "package.json": fixturePackage,
        ...fragments,
      });
      const result = runNanny(["check", "--packages-dir", "frag"], {
        cwd: project,
      });
      assert.doesNotMatch(result.stdout, /no package fragments found/);
      assert.match(result.stdout, /Dependency versions in sync/);
    });
  });

  describe("relative paths", () => {
    it("resolve against the working directory, not against the config file", () => {
      const project = createProject({
        "package.json": fixturePackage,
        ".config/nanny.jsonc": { packagesDir: "frag" },
      });
      const result = runNanny(["package-init"], { cwd: project });
      assert.equal(result.status, 0, result.stderr);
      assert.ok(exists(project, `frag/${FRAGMENT}`));
      assert.ok(!exists(project, `.config/frag/${FRAGMENT}`));
    });

    it("follow --cwd", () => {
      const project = createProject({ "package.json": fixturePackage });
      const elsewhere = createProject();
      const result = runNanny(
        ["package-init", "--cwd", project, "--packages-dir", "frag"],
        { cwd: elsewhere },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.ok(exists(project, `frag/${FRAGMENT}`));
      assert.ok(!exists(elsewhere, `frag/${FRAGMENT}`));
    });
  });

  describe("empty or whitespace-only values go to the next level", () => {
    it("whitespace-only --packages-dir flag", () => {
      assertInitIn({ flag: "   ", env: "from-env" }, "from-env");
    });

    for (const command of [
      "package-init",
      "generate-package",
      "update-package",
      "check",
    ]) {
      it(`empty --packages-dir flag stops ${command} with exit code 1`, () => {
        const project = createProject({ "package.json": fixturePackage });
        const result = runNanny([command, "--packages-dir", ""], {
          cwd: project,
          env: { NANNY_PACKAGES_DIR: "from-env" },
        });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Missing value for --packages-dir/);
        assert.ok(!exists(project, `from-env/${FRAGMENT}`));
      });
    }

    for (const blank of ["", "   "]) {
      const label = blank === "" ? "empty" : "whitespace-only";

      it(`${label} NANNY_PACKAGES_DIR environment variable`, () => {
        assertInitIn({ env: blank, dotenv: "from-dotenv" }, "from-dotenv");
      });

      it(`${label} NANNY_PACKAGES_DIR in .env`, () => {
        assertInitIn(
          { dotenv: blank === "" ? "" : `"${blank}"`, local: "from-local" },
          "from-local",
        );
      });

      it(`${label} packagesDir in nanny.config.local.jsonc`, () => {
        assertInitIn({ local: blank, shared: "from-shared" }, "from-shared");
      });

      it(`${label} packagesDir in the shared config file stops with exit code 1`, () => {
        const { project, result } = initWith({ shared: blank });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /packagesDir/);
        assert.ok(!exists(project, `src/packages/${FRAGMENT}`));
      });
    }

    it("a missing packagesDir key in nanny.config.local.jsonc goes to the next level", () => {
      const project = createProject({
        "package.json": fixturePackage,
        "nanny.config.local.jsonc": "{\n  // nothing set here\n}\n",
        "nanny.config.jsonc": { packagesDir: "from-shared" },
      });
      const result = runNanny(["package-init"], { cwd: project });
      assert.equal(result.status, 0, result.stderr);
      assert.ok(exists(project, `from-shared/${FRAGMENT}`));
    });
  });

  it("the README examples put the fragments in config/package-particles", () => {
    const viaFlag = initWith({ flag: "config/package-particles" });
    assert.ok(exists(viaFlag.project, `config/package-particles/${FRAGMENT}`));

    const viaEnv = createProject({
      "package.json": fixturePackage,
      "src/packages/a.jsonc": {},
    });
    writeFile(viaEnv, "config/package-particles/b.jsonc", {
      keywords: ["env"],
    });
    const generated = runNanny(["generate-package"], {
      cwd: viaEnv,
      env: { NANNY_PACKAGES_DIR: "config/package-particles" },
    });
    assert.equal(generated.status, 0, generated.stderr);
    assert.match(readText(viaEnv, "package.json"), /"env"/);
  });
});
