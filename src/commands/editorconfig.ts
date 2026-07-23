import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { NannyError } from "../lib/errors.js";

type EditorConfigSection = {
  header: string;
  lines: string[];
};

type ParsedEditorConfig = {
  preamble: string[];
  sections: EditorConfigSection[];
};

const DEFAULT_PREAMBLE = ["root = true"];

/** davidsneighbour's sensible defaults. Sections here are refreshed on every run; anything else is preserved. */
const DEFAULT_SECTIONS: EditorConfigSection[] = [
  {
    header: "*",
    lines: [
      "indent_style = space",
      "indent_size = 2",
      "tab_width = 2",
      "end_of_line = lf",
      "charset = utf-8",
      "trim_trailing_whitespace = true",
      "insert_final_newline = true",
      "max_line_length = 120",
    ],
  },
  {
    header: "*.md",
    lines: ["indent_style = space", "indent_size = 2", "trim_trailing_whitespace = false"],
  },
  {
    header: "*.{yml,yaml}",
    lines: ["indent_style = space"],
  },
  {
    header: "*.{json,jsonc}",
    lines: ["indent_style = space", "indent_size = 2"],
  },
];

type Options = {
  out: string;
  verbose: boolean;
  dryRun: boolean;
  help: boolean;
};

export async function runEditorconfig(opts: { cwd: string; verbose: boolean; argv: string[] }): Promise<void> {
  const options = parseArgs(opts.argv, opts.verbose);

  if (options.help) {
    printHelp();
    throw new NannyError("help", 0);
  }

  const outPath = path.resolve(opts.cwd, options.out);
  const exists = fs.existsSync(outPath);

  const existing = exists ? parseEditorConfig(fs.readFileSync(outPath, "utf8")) : { preamble: [], sections: [] };
  const merged = mergeEditorConfig(existing);
  const formatted = renderEditorConfig(merged);

  if (options.dryRun) {
    process.stdout.write(formatted);
    return;
  }

  if (!exists) {
    fs.writeFileSync(outPath, formatted, "utf8");
    console.log(`✔ Wrote: ${outPath}`);
    return;
  }

  const current = fs.readFileSync(outPath, "utf8");
  if (current === formatted) {
    if (options.verbose) console.log(`[nanny editorconfig] Already up to date: ${outPath}`);
    return;
  }

  fs.writeFileSync(outPath, formatted, "utf8");
  console.log(`✔ Updated: ${outPath}`);
}

/** Replaces nanny-managed sections with current defaults; preserves every other section as-is. */
function mergeEditorConfig(existing: ParsedEditorConfig): ParsedEditorConfig {
  const preamble = existing.preamble.length > 0 ? existing.preamble : DEFAULT_PREAMBLE;
  const managedHeaders = new Set(DEFAULT_SECTIONS.map((s) => s.header));
  const preserved = existing.sections.filter((s) => !managedHeaders.has(s.header));

  return { preamble, sections: [...DEFAULT_SECTIONS, ...preserved] };
}

function parseEditorConfig(content: string): ParsedEditorConfig {
  const preamble: string[] = [];
  const sections: EditorConfigSection[] = [];
  let current: EditorConfigSection | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const headerMatch = /^\[(.+)\]$/.exec(line);
    if (headerMatch?.[1] !== undefined) {
      current = { header: headerMatch[1], lines: [] };
      sections.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }

  return { preamble, sections };
}

function renderEditorConfig({ preamble, sections }: ParsedEditorConfig): string {
  const parts: string[] = [];
  if (preamble.length > 0) parts.push(preamble.join("\n"));
  for (const section of sections) {
    parts.push([`[${section.header}]`, ...section.lines].join("\n"));
  }
  return `${parts.join("\n\n")}\n`;
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  nanny editorconfig [options]",
      "",
      "Options:",
      "  --out <path>      Output path (default: .editorconfig)",
      "  --dry-run         Print the result to stdout, do not write file",
      "  --verbose         More logs",
      "  --help            Show help for this command",
      "",
      "What it does:",
      "  Writes .editorconfig with davidsneighbour's sensible defaults if none exists.",
      "  If a file already exists, its nanny-managed sections ([*], [*.md],",
      "  [*.{yml,yaml}], [*.{json,jsonc}]) are refreshed to the current defaults;",
      "  any other sections are preserved as-is.",
      "",
      "Examples:",
      "  nanny editorconfig",
      "  nanny editorconfig --dry-run",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[], globalVerbose: boolean): Options {
  const o: Options = {
    out: ".editorconfig",
    verbose: globalVerbose,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help") o.help = true;
    else if (a === "--verbose") o.verbose = true;
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--out") o.out = requireValue(argv, ++i, "--out");
    else throw new NannyError(`Unknown argument: ${a}`, 1);
  }

  return o;
}

function requireValue(argv: string[], idx: number, flag: string): string {
  const v = argv[idx];
  if (!v || v.startsWith("--")) throw new NannyError(`Missing value for ${flag}`, 1);
  return v;
}
