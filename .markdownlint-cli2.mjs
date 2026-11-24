import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJSONC } from "confbox";

// Extends @dnbhq/markdownlint-config's shared config with this project's
// ignores, since markdownlint-cli2's own "extends" cannot target a
// .markdownlint-cli2.jsonc file's top-level options directly.
const here = dirname(fileURLToPath(import.meta.url));
const sharedDir = join(here, "node_modules/@dnbhq/markdownlint-config");
const shared = parseJSONC(
  readFileSync(join(sharedDir, ".markdownlint-cli2.jsonc"), "utf8"),
);

export default {
  ...shared,
  // The shared config loads its own rules with paths relative to its file,
  // for example "./rules/dnb-title-case-style.mjs". Resolve them against the
  // package folder, because this file lives in the project root.
  customRules: (shared.customRules ?? []).map((rule) =>
    rule.startsWith("./") ? join(sharedDir, rule) : rule,
  ),
  // CHANGELOG.md is release-it generated content; its compare-link URLs use
  // literal "..." (GitHub compare syntax), which search-replace's ellipsis
  // rule would otherwise mangle into a real "…" character and break the link.
  ignores: [...(shared.ignores ?? []), "scratch", "CHANGELOG.md"],
};
