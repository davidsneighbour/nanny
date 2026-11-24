import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createProject, exists, readText, runNanny } from "../helpers.js";

const MANAGED = ["[*]", "[*.md]", "[*.{yml,yaml}]", "[*.{json,jsonc}]"];

/** Returns the lines below `[header]` up to the next section. */
function sectionLines(content: string, header: string): string[] {
  const lines = content.split("\n");
  const start = lines.indexOf(header);
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("[")) break;
    if (line.trim().length > 0) out.push(line);
  }
  return out;
}

describe("README: editorconfig", () => {
  it("writes .editorconfig with the defaults if none exists", () => {
    const project = createProject();
    const result = runNanny(["editorconfig"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);

    const content = readText(project, ".editorconfig");
    assert.match(content, /^root = true$/m);
    for (const header of MANAGED) {
      assert.ok(
        sectionLines(content, header).length > 0,
        `missing section ${header}`,
      );
    }
  });

  it("refreshes the nanny-managed sections of an existing file to the defaults", () => {
    const defaultsProject = createProject();
    runNanny(["editorconfig"], { cwd: defaultsProject });
    const defaults = readText(defaultsProject, ".editorconfig");

    const project = createProject({
      ".editorconfig": [
        "root = true",
        "",
        "[*]",
        "indent_size = 8",
        "",
        "[*.md]",
        "indent_style = tab",
        "",
        "[*.{yml,yaml}]",
        "indent_size = 6",
        "",
        "[*.{json,jsonc}]",
        "indent_size = 4",
        "",
      ].join("\n"),
    });
    const result = runNanny(["editorconfig"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);

    const content = readText(project, ".editorconfig");
    for (const header of MANAGED) {
      assert.deepEqual(
        sectionLines(content, header),
        sectionLines(defaults, header),
        `section ${header} was not refreshed`,
      );
    }
  });

  it("preserves every other section as it is", () => {
    const project = createProject({
      ".editorconfig": [
        "root = true",
        "",
        "[Makefile]",
        "indent_style = tab",
        "",
        "[*.py]",
        "indent_size = 4",
        "",
      ].join("\n"),
    });
    const result = runNanny(["editorconfig"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);

    const content = readText(project, ".editorconfig");
    assert.deepEqual(sectionLines(content, "[Makefile]"), [
      "indent_style = tab",
    ]);
    assert.deepEqual(sectionLines(content, "[*.py]"), ["indent_size = 4"]);
    assert.ok(sectionLines(content, "[*]").length > 0);
  });

  it("--out writes to another path", () => {
    const project = createProject();
    const result = runNanny(["editorconfig", "--out", "custom.editorconfig"], {
      cwd: project,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(exists(project, "custom.editorconfig"));
    assert.ok(!exists(project, ".editorconfig"));
  });

  it("--dry-run prints the result and does not write the file", () => {
    const project = createProject();
    const result = runNanny(["editorconfig", "--dry-run"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^root = true$/m);
    assert.ok(!exists(project, ".editorconfig"));
  });

  it("--verbose gives more logs", () => {
    const project = createProject();
    assert.equal(runNanny(["editorconfig"], { cwd: project }).status, 0);
    const result = runNanny(["editorconfig", "--verbose"], { cwd: project });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Already up to date/);
  });
});
