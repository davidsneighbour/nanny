import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  commitAll,
  createProject,
  fixturePackage,
  type RunResult,
  runNanny,
  section,
  snapshot,
  writeFile,
} from "../helpers.js";

const BASE = ".vscode/settings.base.jsonc";
const FRAGMENT = "src/packages/legacy/starter.jsonc";

/** A project where every check passes: fragments from package-init, settings in sync, all committed. */
function cleanProject(
  options: { git?: boolean; vscode?: boolean; packagesDir?: string } = {},
): string {
  const project = createProject({
    "package.json": {
      ...fixturePackage,
      wireit: { build: { command: "tsc" } },
    },
  });
  const dirArgs = options.packagesDir
    ? ["--packages-dir", options.packagesDir]
    : [];
  assert.equal(
    runNanny(["package-init", ...dirArgs], { cwd: project }).status,
    0,
  );
  if (options.vscode !== false) {
    writeFile(project, BASE, { "editor.tabSize": 2 });
    assert.equal(runNanny(["merge-vscode-config"], { cwd: project }).status, 0);
  }
  if (options.git !== false) commitAll(project);
  return project;
}

function check(project: string, args: string[] = []): RunResult {
  return runNanny(["check", ...args], { cwd: project });
}

describe("README: check", () => {
  it("exits 0 when no issues are found", () => {
    const result = check(cleanProject());
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /No issues found/);
  });

  it("makes no changes, also when it finds issues", () => {
    const project = cleanProject();
    writeFile(project, FRAGMENT, {
      dependencies: { "dep-a": "0.0.1" },
      scripts: { build: "other" },
    });
    writeFile(project, BASE, { "editor.tabSize": 8 });
    const before = snapshot(project);

    const result = check(project);

    assert.notEqual(result.status, 0);
    assert.deepEqual(snapshot(project), before);
  });

  describe("package fragments", () => {
    it("reports dependency versions out of sync with package.json", () => {
      const project = cleanProject();
      writeFile(project, FRAGMENT, {
        ...fixturePackage,
        dependencies: { "dep-a": "0.0.1" },
      });
      const result = check(project);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout, /dep-a: 0\.0\.1 -> 1\.0\.0/);
    });

    it("reports scripts out of sync with package.json", () => {
      const project = cleanProject();
      const { scripts: _s, ...rest } = fixturePackage;
      writeFile(project, FRAGMENT, {
        ...rest,
        scripts: { build: "tsc -b", test: "node --test" },
      });
      const result = check(project);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout, /Scripts out of sync/);
    });

    it("reports wireit config out of sync with package.json", () => {
      const project = cleanProject();
      writeFile(project, "src/packages/system/wireit.jsonc", {
        wireit: { build: { command: "tsc -b" } },
      });
      commitAll(project);
      const result = check(project);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout, /Wireit config out of sync/);
    });

    it("is skipped when no fragments are found", () => {
      const project = createProject({ "package.json": fixturePackage });
      const result = check(project);
      assert.equal(result.status, 0, result.stdout);
      assert.match(
        section(result.stdout, "Package fragments", "VS Code settings"),
        /Skipped: no package fragments found/,
      );
    });
  });

  describe("VS Code settings", () => {
    it("reports .vscode/settings.json out of sync with settings.base.jsonc", () => {
      const project = cleanProject();
      writeFile(project, BASE, { "editor.tabSize": 8 });
      const result = check(project);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout, /\.vscode\/settings\.json is out of date/);
    });

    it("is skipped when no base file is found", () => {
      const result = check(cleanProject({ vscode: false }));
      assert.equal(result.status, 0, result.stdout);
      assert.match(
        section(result.stdout, "VS Code settings", "Generated files"),
        /Skipped: no \.vscode\/settings\.base\.jsonc found/,
      );
    });
  });

  describe("generated files", () => {
    it("reports uncommitted changes in package.json", () => {
      const project = cleanProject();
      writeFile(project, "package.json", {
        ...fixturePackage,
        wireit: { build: { command: "tsc" } },
        private: true,
      });
      const result = check(project);
      assert.notEqual(result.status, 0);
      assert.match(
        result.stdout,
        /Uncommitted changes in generated files: package\.json/,
      );
    });

    it("reports uncommitted changes in .vscode/settings.json", () => {
      const project = cleanProject({ vscode: false });
      writeFile(project, ".vscode/settings.json", { "editor.tabSize": 2 });
      const result = check(project);
      assert.notEqual(result.status, 0);
      assert.match(
        result.stdout,
        /Uncommitted changes in generated files: \.vscode\/settings\.json/,
      );
    });

    it("is skipped outside a git repository", () => {
      const result = check(cleanProject({ git: false }));
      assert.equal(result.status, 0, result.stdout);
      assert.match(
        section(result.stdout, "Generated files"),
        /Skipped: not inside a git repository/,
      );
    });
  });

  it("accepts --packages-dir (README example)", () => {
    const project = cleanProject({ packagesDir: "config/package-particles" });
    const withFlag = check(project, [
      "--packages-dir",
      "config/package-particles",
    ]);
    assert.equal(withFlag.status, 0, withFlag.stdout);
    assert.match(withFlag.stdout, /Dependency versions in sync/);

    const without = check(project);
    assert.match(
      without.stdout,
      /Skipped: no package fragments found under src\/packages/,
    );
  });

  it("accepts --verbose", () => {
    const result = check(cleanProject(), ["--verbose"]);
    assert.equal(result.status, 0, result.stdout);
  });
});
