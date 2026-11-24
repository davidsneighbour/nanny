import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { exists, readJson, readText, repoRoot } from "../helpers.js";

const SKILL_DIR = path.join(repoRoot, "skills/nanny");

describe("README: Agent skill", () => {
  const skill = readText(SKILL_DIR, "SKILL.md");

  it("ships the skill at skills/nanny/SKILL.md with the name `nanny` (used by `--skill nanny`)", () => {
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1] ?? "";
    assert.match(frontmatter, /^name: nanny$/m);
    assert.match(frontmatter, /^description: /m);
  });

  it("routes changes to references/*.md procedures that all exist", () => {
    const references = new Set(skill.match(/references\/[\w-]+\.md/g) ?? []);
    assert.ok(references.size > 0);
    for (const reference of references) {
      assert.ok(exists(SKILL_DIR, reference), `missing ${reference}`);
    }
  });

  it("finishes with `nanny generate-package` and `nanny check`", () => {
    const finalise = readText(SKILL_DIR, "references/finalise-package-json.md");
    assert.match(finalise, /nanny generate-package/);
    assert.match(finalise, /nanny check/);
  });
});

describe("README: Tests", () => {
  it("`npm run test:package-init` exists", () => {
    const { scripts } = readJson(repoRoot, "package.json") as {
      scripts: Record<string, string>;
    };
    assert.ok(scripts["test:package-init"]);
  });
});
