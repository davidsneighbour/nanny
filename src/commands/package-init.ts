import fs from "node:fs";
import path from "node:path";

import { NannyError } from "../lib/errors.js";

type JsonObject = Record<string, unknown>;

type Options = {
  force: boolean;
  packagePath: string;
  verbose: boolean;
};

const STARTER_RELATIVE_PATH = "src/packages/legacy/starter.jsonc";
const DEFAULT_RELATIVE_PATH = "src/packages/system/default.jsonc";
const EXTRACTED_KEYS = ["scripts", "dependencies", "devDependencies"] as const;

export async function runPackageInit(opts: { cwd: string; verbose: boolean; argv: string[] }): Promise<void> {
  const parsed = parseArgs(opts.argv, opts.cwd, opts.verbose);
  const sourcePackage = readJsonObject(parsed.packagePath);

  const starterPackage = pickExtractedFields(sourcePackage);
  const defaultPackage = omitExtractedFields(sourcePackage);

  const starterPath = path.resolve(opts.cwd, STARTER_RELATIVE_PATH);
  const defaultPath = path.resolve(opts.cwd, DEFAULT_RELATIVE_PATH);

  ensureWritable(starterPath, parsed.force);
  ensureWritable(defaultPath, parsed.force);

  if (parsed.verbose) {
    console.error(`> Reading package.json from ${parsed.packagePath}`);
    console.error(`> Writing starter fragment to ${starterPath}`);
    console.error(`> Writing default fragment to ${defaultPath}`);
  }

  writeJsoncFile(starterPath, starterPackage);
  writeJsoncFile(defaultPath, defaultPackage);

  console.log(
    [
      "✔ Package initialisation complete.",
      "Created package fragments:",
      `  - ${STARTER_RELATIVE_PATH}`,
      `  - ${DEFAULT_RELATIVE_PATH}`,
      "Run `nanny generate-package --dry-run` to verify the generated package.json without overwriting it.",
    ].join("\n"),
  );
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  nanny package-init [options]",
      "",
      "Options:",
      "  --package <path>   Path to package.json (default: <cwd>/package.json)",
      "  --force            Overwrite existing src/packages/legacy/starter.jsonc and src/packages/system/default.jsonc",
      "  --verbose          More logs",
      "  --help             Show help for this command",
      "",
      "What it does:",
      `  1) Writes scripts, dependencies, and devDependencies to ${STARTER_RELATIVE_PATH}`,
      `  2) Writes all other package.json fields to ${DEFAULT_RELATIVE_PATH}`,
      "  3) Leaves package.json unchanged so generate-package can be tested with --dry-run",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[], cwd: string, globalVerbose: boolean): Options {
  const options: Options = {
    force: false,
    packagePath: path.resolve(cwd, "package.json"),
    verbose: globalVerbose,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    switch (arg) {
      case "--help":
        printHelp();
        throw new NannyError("help", 0);
      case "--package": {
        const value = argv[i + 1];
        if (typeof value !== "string" || value.length === 0) {
          throw new NannyError("Missing value for --package", 1);
        }
        options.packagePath = path.resolve(cwd, value);
        i += 1;
        break;
      }
      case "--force":
        options.force = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      default:
        throw new NannyError(`Unknown argument: ${String(arg)}`, 1);
    }
  }

  return options;
}

function readJsonObject(filePath: string): JsonObject {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(content);
    if (!isPlainObject(parsed)) {
      throw new NannyError(`JSON root must be an object: ${filePath}`, 1);
    }
    return parsed;
  } catch (error: unknown) {
    if (error instanceof NannyError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new NannyError(`Failed to read/parse ${filePath}: ${message}`, 1);
  }
}

function pickExtractedFields(source: JsonObject): JsonObject {
  const picked: JsonObject = {};

  for (const key of EXTRACTED_KEYS) {
    if (key in source) {
      picked[key] = source[key];
    }
  }

  return picked;
}

function omitExtractedFields(source: JsonObject): JsonObject {
  const omitted: JsonObject = {};
  const extractedKeys = new Set<string>(EXTRACTED_KEYS);

  for (const [key, value] of Object.entries(source)) {
    if (!extractedKeys.has(key)) {
      omitted[key] = value;
    }
  }

  return omitted;
}

function ensureWritable(filePath: string, force: boolean): void {
  if (!force && fs.existsSync(filePath)) {
    throw new NannyError(`Refusing to overwrite existing file: ${filePath}. Use --force to overwrite it.`, 1);
  }
}

function writeJsoncFile(filePath: string, value: JsonObject): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
