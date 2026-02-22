import fs from "node:fs";
import path from "node:path";
import glob from "fast-glob";
import { parse } from "jsonc-parser";
import { NannyError } from "../lib/errors.js";

type JsonObject = Record<string, unknown>;

type Options = {
  pkgPath: string;
  verbose: boolean;
  dryRun: boolean;
  keysToPreserve: string[];
};

export async function runGeneratePackage(opts: { cwd: string; verbose: boolean; argv: string[] }): Promise<void> {
  const { cwd } = opts;
  const parsed = parseArgs(opts.argv, cwd, opts.verbose);

  const configPaths = glob.sync("src/packages/**/*.jsonc", {
    absolute: true,
    cwd,
  });

  if (parsed.verbose) {
    console.error(`> Using keys: ${parsed.keysToPreserve.join(", ")}`);
    console.error(`> Reading package.json from ${parsed.pkgPath}`);
  }

  const pkg = readJsonc(parsed.pkgPath);
  const filteredPkg = filterPackageJson(pkg, parsed.keysToPreserve);

  for (const cfgPath of configPaths) {
    if (parsed.verbose) console.error(`> Merging values from ${cfgPath}`);
    const cfg = readJsonc(cfgPath);
    mergeDeep(filteredPkg, cfg);
  }

  if ("notes" in filteredPkg) {
    delete (filteredPkg as Record<string, unknown>)["notes"];
    if (parsed.verbose) console.error('> Removed "notes" from package.json structure.');
  }

  const outputPath = path.resolve(cwd, "package.json");
  const output = JSON.stringify(filteredPkg, null, 2) + "\n";

  if (parsed.dryRun) {
    process.stdout.write(output);
    return;
  }

  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`✔ Merged values written to ${outputPath}`);
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  nanny generate-package [options]",
      "",
      "Options:",
      "  --package <path>   Path to package.json (default: <cwd>/package.json)",
      "  --keys <list>      Comma-separated list of keys to preserve from package.json",
      "  --dry-run          Print merged JSON to stdout, do not write file",
      "  --verbose          More logs",
      "  --help             Show help for this command",
      "",
      "Examples:",
      "  nanny generate-package",
      "  nanny generate-package --dry-run",
      "  nanny generate-package --keys name,description,version",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[], cwd: string, globalVerbose: boolean): Options {
  const defaultKeysToPreserve: string[] = [
    "name",
    "description",
    "version",
    "author",
    "bugs",
    "engines",
    "homepage",
    "license",
    "private",
    "repository",
    "publishConfig",
    "type",
  ];

  const o: Options = {
    dryRun: false,
    pkgPath: path.resolve(cwd, "package.json"),
    verbose: globalVerbose,
    keysToPreserve: defaultKeysToPreserve,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    switch (a) {
      case "--help":
        printHelp();
        throw new NannyError("help", 0);
      case "--package": {
        const v = argv[i + 1];
        if (!v) throw new NannyError("Missing value for --package", 1);
        o.pkgPath = path.resolve(cwd, v);
        i++;
        break;
      }
      case "--verbose":
        o.verbose = true;
        break;
      case "--dry-run":
        o.dryRun = true;
        break;
      case "--keys": {
        const v = argv[i + 1];
        if (!v) throw new NannyError("Missing value for --keys", 1);
        o.keysToPreserve = v.split(",").map((k) => k.trim()).filter(Boolean);
        i++;
        break;
      }
      default:
        throw new NannyError(`Unknown argument: ${a}`, 1);
    }
  }

  return o;
}

function readJsonc(filePath: string): JsonObject {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = parse(raw) as unknown;
    if (!isPlainObject(parsed)) throw new NannyError(`JSON root must be an object: ${filePath}`, 1);
    return parsed;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new NannyError(`Failed to read/parse ${filePath}: ${msg}`, 1);
  }
}

/**
 * Deep-merge source into target. Objects merge recursively; arrays and primitives overwrite.
 */
function mergeDeep(target: JsonObject, source: JsonObject): JsonObject {
  for (const key of Object.keys(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;

    const sv = source[key];
    const tv = target[key];

    if (isPlainObject(sv) && isPlainObject(tv)) {
      mergeDeep(tv, sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

function filterPackageJson(pkg: JsonObject, keys: string[]): JsonObject {
  const filtered: JsonObject = {};
  for (const key of keys) {
    if (key in pkg) filtered[key] = pkg[key];
  }
  return filtered;
}

function isPlainObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
