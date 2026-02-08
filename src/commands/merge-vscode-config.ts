import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { parse as parseJsonc, printParseErrorCode, type ParseError } from "jsonc-parser";
import { NannyError } from "../lib/errors.js";

type JsonObject = Record<string, unknown>;

type CliOptions = {
  base: string;
  local: string;
  out: string;
  verbose: boolean;
  dryRun: boolean;
  check: boolean;
  help: boolean;
};

export async function runMergeVscodeConfig(opts: { cwd: string; verbose: boolean; argv: string[] }): Promise<void> {
  const options = parseArgs(opts.argv, opts.verbose);

  if (options.help) {
    printHelp();
    throw new NannyError("help", 0);
  }

  const basePath = resolvePathFromCwd(options.base, opts.cwd);
  const localPath = resolvePathFromCwd(options.local, opts.cwd);
  const outPath = resolvePathFromCwd(options.out, opts.cwd);

  loadDotEnvIfPresent(options.verbose, opts.cwd);

  if (!fs.existsSync(basePath)) {
    throw new NannyError(`Base file not found: ${basePath}`, 2);
  }

  const baseJson = readJsoncObject(basePath, options.verbose);

  let localJson: JsonObject = {};
  const hasLocal = fs.existsSync(localPath);

  if (hasLocal) {
    localJson = readJsoncObject(localPath, options.verbose);
  } else if (options.verbose) {
    console.log(`[nanny merge-vscode-config] Local file not found (ok): ${localPath}`);
  }

  const merged = deepMerge(baseJson, localJson);
  const formatted = JSON.stringify(merged, null, 2) + "\n";

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    if (options.verbose) console.log(`[nanny merge-vscode-config] Creating directory: ${outDir}`);
    fs.mkdirSync(outDir, { recursive: true });
  }

  if (options.check) {
    if (!fs.existsSync(outPath)) {
      throw new NannyError(`CHECK FAILED: Output file does not exist: ${outPath}`, 1);
    }
    const current = fs.readFileSync(outPath, "utf8");
    if (current !== formatted) {
      throw new NannyError(`CHECK FAILED: ${outPath} is out of date. Run nanny merge-vscode-config.`, 1);
    }
    if (options.verbose) console.log("[nanny merge-vscode-config] CHECK OK: Output matches merged settings.");
    return;
  }

  if (options.dryRun) {
    process.stdout.write(formatted);
    return;
  }

  fs.writeFileSync(outPath, formatted, "utf8");

  if (options.verbose) {
    console.log(`[nanny merge-vscode-config] Wrote: ${outPath}`);
    console.log(`[nanny merge-vscode-config] base:  ${basePath}`);
    console.log(`[nanny merge-vscode-config] local: ${hasLocal ? localPath : "(none)"}`);
  }
}

function parseArgs(argv: string[], globalVerbose: boolean): CliOptions {
  const o: CliOptions = {
    base: ".vscode/settings.base.jsonc",
    local: ".vscode/settings.local.jsonc",
    out: ".vscode/settings.json",
    verbose: globalVerbose,
    dryRun: false,
    check: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help") o.help = true;
    else if (a === "--verbose") o.verbose = true;
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--check") o.check = true;
    else if (a === "--base") o.base = requireValue(argv, ++i, "--base");
    else if (a === "--local") o.local = requireValue(argv, ++i, "--local");
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

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  nanny merge-vscode-config [options]",
      "",
      "Options:",
      "  --base <path>     Base settings JSONC (default: .vscode/settings.base.jsonc)",
      "  --local <path>    Local override JSONC, optional (default: .vscode/settings.local.jsonc)",
      "  --out <path>      Output JSON (default: .vscode/settings.json)",
      "  --dry-run         Print merged JSON to stdout, do not write file",
      "  --check           Exit non-zero if output is missing or out of date",
      "  --verbose         More logs",
      "  --help            Show help",
      "",
      "Examples:",
      "  nanny merge-vscode-config --verbose",
      "  nanny merge-vscode-config --dry-run",
      "  nanny merge-vscode-config --check",
      "",
    ].join("\n"),
  );
}

function readJsoncObject(filePath: string, verbose: boolean): JsonObject {
  const raw = fs.readFileSync(filePath, "utf8");
  const errors: ParseError[] = [];
  const parsed = parseJsonc(raw, errors, { allowTrailingComma: true }) as unknown;

  if (errors.length > 0) {
    const details = errors
      .slice(0, 10)
      .map((e) => `${printParseErrorCode(e.error)} at offset ${e.offset}`)
      .join("; ");
    if (verbose) {
      console.error(`[nanny merge-vscode-config] Failed to parse JSONC: ${filePath}`);
      console.error(details);
    }
    throw new NannyError(`Invalid JSONC in ${filePath}: ${details}`, 1);
  }

  if (!isPlainObject(parsed)) {
    throw new NannyError(`JSONC root must be an object in ${filePath}`, 1);
  }

  return parsed;
}

function deepMerge(base: JsonObject, override: JsonObject): JsonObject {
  const out: JsonObject = { ...base };

  for (const [k, v] of Object.entries(override)) {
    const bv = out[k];
    if (isPlainObject(bv) && isPlainObject(v)) {
      out[k] = deepMerge(bv, v);
      continue;
    }
    out[k] = v;
  }

  return out;
}

function isPlainObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function resolvePathFromCwd(p: string, cwd: string): string {
  return path.isAbsolute(p) ? p : path.resolve(cwd, p);
}

/**
 * Minimal .env loader (KEY=VALUE).
 * Loads .env from cwd first, then from ${HOME}/.env.
 * Does not overwrite existing process.env keys.
 */
function loadDotEnvIfPresent(verbose: boolean, cwd: string): void {
  const candidates = [path.resolve(cwd, ".env"), path.resolve(os.homedir(), ".env")];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (!key) continue;
      if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;

      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      process.env[key] = val;
    }

    if (verbose) console.log(`[nanny merge-vscode-config] Loaded env from: ${file}`);
  }
}
