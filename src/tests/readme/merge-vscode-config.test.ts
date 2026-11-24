import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createProject,
  exists,
  readJson,
  readText,
  runNanny,
  writeFile,
} from "../helpers.js";

const base = `{\n  // base settings\n  "editor.tabSize": 2,\n  "files.exclude": { "dist": true, "node_modules": true }\n}\n`;
const local = { "editor.tabSize": 4, "files.exclude": { dist: false } };
const merged = {
  "editor.tabSize": 4,
  "files.exclude": { dist: false, node_modules: true },
};

describe("README: merge-vscode-config", () => {
  it("merges settings.base.jsonc and settings.local.jsonc into settings.json", () => {
    const project = createProject({
      ".vscode/settings.base.jsonc": base,
      ".vscode/settings.local.jsonc": local,
    });
    const result = runNanny(["merge-vscode-config"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJson(project, ".vscode/settings.json"), merged);
  });

  it("settings.local.jsonc is optional", () => {
    const project = createProject({ ".vscode/settings.base.jsonc": base });
    const result = runNanny(["merge-vscode-config"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJson(project, ".vscode/settings.json"), {
      "editor.tabSize": 2,
      "files.exclude": { dist: true, node_modules: true },
    });
  });

  it("--base, --local, and --out select other files", () => {
    const project = createProject({
      "cfg/b.jsonc": base,
      "cfg/l.jsonc": local,
    });
    const result = runNanny(
      [
        "merge-vscode-config",
        "--base",
        "cfg/b.jsonc",
        "--local",
        "cfg/l.jsonc",
        "--out",
        "out/s.json",
      ],
      {
        cwd: project,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJson(project, "out/s.json"), merged);
    assert.ok(!exists(project, ".vscode/settings.json"));
  });

  it("--check passes when settings.json is in sync", () => {
    const project = createProject({
      ".vscode/settings.base.jsonc": base,
      ".vscode/settings.local.jsonc": local,
    });
    assert.equal(runNanny(["merge-vscode-config"], { cwd: project }).status, 0);
    const result = runNanny(["merge-vscode-config", "--check"], {
      cwd: project,
    });
    assert.equal(result.status, 0, result.stderr);
  });

  it("--check fails and writes nothing when settings.json is out of date or missing", () => {
    const project = createProject({ ".vscode/settings.base.jsonc": base });

    const missing = runNanny(["merge-vscode-config", "--check"], {
      cwd: project,
    });
    assert.notEqual(missing.status, 0);
    assert.ok(!exists(project, ".vscode/settings.json"));

    writeFile(project, ".vscode/settings.json", { stale: true });
    const stale = runNanny(["merge-vscode-config", "--check"], {
      cwd: project,
    });
    assert.notEqual(stale.status, 0);
    assert.deepEqual(readJson(project, ".vscode/settings.json"), {
      stale: true,
    });
  });

  it("--dry-run prints the result and does not write settings.json", () => {
    const project = createProject({
      ".vscode/settings.base.jsonc": base,
      ".vscode/settings.local.jsonc": local,
    });
    const result = runNanny(["merge-vscode-config", "--dry-run"], {
      cwd: project,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), merged);
    assert.ok(!exists(project, ".vscode/settings.json"));
  });

  it("--verbose gives more logs", () => {
    const project = createProject({ ".vscode/settings.base.jsonc": base });
    const result = runNanny(["merge-vscode-config", "--verbose"], {
      cwd: project,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Wrote:/);
    assert.ok(readText(project, ".vscode/settings.json").length > 0);
  });
});
