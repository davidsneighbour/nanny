import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJSONC } from "confbox";

// Deep-merges one rule override onto @dnbhq/markdownlint-config's shared
// config, since markdownlint-cli2's own "extends" cannot target a
// .markdownlint-cli2.jsonc file's nested rule options directly.
const here = dirname(fileURLToPath(import.meta.url));
const sharedPath = join(
  here,
  "node_modules/@dnbhq/markdownlint-config/.markdownlint-cli2.jsonc",
);
const shared = parseJSONC(readFileSync(sharedPath, "utf8"));

export default {
  ...shared,
  // CHANGELOG.md is release-it generated content; its compare-link URLs use
  // literal "..." (GitHub compare syntax), which search-replace's ellipsis
  // rule would otherwise mangle into a real "…" character and break the link.
  ignores: [...(shared.ignores ?? []), "scratch", "CHANGELOG.md"],
  config: {
    ...shared.config,
    // title-case-style's tokeniser treats "." as a sentence terminator, so
    // "package.json" gets split into "package" | "." | "json" and the
    // extension is re-capitalised as if it started a new sentence, e.g.
    // "package.json" -> "package.Json". The ignore list matches individual
    // tokens (not whole filenames), so list the lowercase extensions this
    // repo's headings use until upstream fixes the tokeniser.
    "title-case-style": {
      ...shared.config["title-case-style"],
      ignore: [...shared.config["title-case-style"].ignore, "json", "md"],
    },
  },
};
