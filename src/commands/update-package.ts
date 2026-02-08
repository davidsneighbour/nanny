import fs from "node:fs";
import path from "node:path";
import glob from "fast-glob";
import { parse } from "jsonc-parser";
import { NannyError } from "../lib/errors.js";

type JsonObject = Record<string, unknown>;

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  wireit?: Record<string, unknown>;
  [key: string]: unknown;
};

const CONFIG = {
  packageJsoncGlob: "./src/packages/*/*.jsonc",
  rootPkgPath: "./package.json",
} as const;

type Options = {
  verbose: boolean;
  help: boolean;
};

export async function runUpdatePackage(opts: { cwd: string; verbose: boolean; argv: string[] }): Promise<void> {
  const options = parseArgs(opts.argv, opts.verbose);

  if (options.help) {
    printHelp();
    throw new NannyError("help", 0);
  }

  const rootPkgAbs = path.resolve(opts.cwd, CONFIG.rootPkgPath);
  if (!fs.existsSync(rootPkgAbs)) {
    throw new NannyError(`Root package.json not found at ${rootPkgAbs}`, 2);
  }

  const rootPkg = loadJson<PackageJson>(rootPkgAbs);

  const jsoncFiles = await glob(CONFIG.packageJsoncGlob, { dot: false, cwd: opts.cwd, absolute: false });

  // 1) Update dependency versions
  for (const fileRel of jsoncFiles) {
    const file = path.resolve(opts.cwd, fileRel);
    try {
      const json = loadJsonc<PackageJson>(file);
      if (replaceVersions(json, rootPkg)) {
        fs.writeFileSync(file, `${jsonOut(json)}\n`, "utf8");
        console.log(`✔ Updated: ${fileRel}`);
      } else {
        console.log(`✘ No changes: ${fileRel}`);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(`✖ Failed to process ${fileRel}: ${err.message}`);
    }
  }

  // 2) Unused root deps
  const usedDeps = collectUsedDeps(jsoncFiles.map((f) => path.resolve(opts.cwd, f)));
  const unusedDependencies: Array<{ name: string; version: string }> = [];

  for (const section of ["dependencies", "devDependencies"] as const) {
    const deps = rootPkg[section];
    if (!deps) continue;
    for (const [name, version] of Object.entries(deps)) {
      if (!usedDeps.has(name)) unusedDependencies.push({ name, version });
    }
  }

  if (unusedDependencies.length > 0) {
    header("🔍 Unused dependencies (in root, not in src/packages/*.jsonc):");
    for (const { name, version } of unusedDependencies.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  "${name}": "${version}",`);
    }
  } else {
    header("✅ All dependencies are referenced in src/packages/*.jsonc.");
  }

  // 3) Scripts & Wireit audits
  const { perFileScripts, perFileWireit } = collectScriptsAndWireit(jsoncFiles.map((f) => path.resolve(opts.cwd, f)));

  const scriptsMissing = findMissingFromPackages(
    rootPkg.scripts,
    perFileScripts.map(({ file, scripts }) => ({ file, map: scripts })),
  );

  const wireitMissing = findMissingFromPackages(
    (rootPkg.wireit as Record<string, unknown> | undefined) ?? undefined,
    perFileWireit.map(({ file, wireit }) => ({ file, map: wireit })),
  );

  const scriptsChanged = findChangedScripts(rootPkg.scripts, perFileScripts);
  const wireitChanged = findChangedWireit(rootPkg.wireit as Record<string, unknown> | undefined, perFileWireit);

  const scriptDupes = findDuplicateKeys(perFileScripts.map(({ file, scripts }) => ({ file, map: scripts })));
  const wireitDupes = findDuplicateKeys(perFileWireit.map(({ file, wireit }) => ({ file, map: wireit })));

  header("🧪 Scripts audit (root vs src/packages/*.jsonc)");
  if (scriptsMissing.length) {
    console.log("• Missing (in root, not listed in any src/packages/*.jsonc):");
    scriptsMissing.forEach((n) => console.log(`  - ${n}`));
  } else {
    console.log("• No missing script entries.");
  }

  if (scriptsChanged.length) {
    console.log("• Changed (defined in both, but command differs):");
    for (const c of scriptsChanged) {
      console.log(`  - ${c.name} in ${path.relative(opts.cwd, c.file)}\n      root: ${c.root}\n      file: ${c.found}`);
    }
  } else {
    console.log("• No changed script entries.");
  }

  if (scriptDupes.length) {
    console.log("• Duplicates (same script key in multiple files):");
    for (const d of scriptDupes) {
      console.log(`  - ${d.name}`);
      d.files.forEach((f) => console.log(`      ${path.relative(opts.cwd, f)}`));
    }
  } else {
    console.log("• No duplicate script entries.");
  }

  header("🧩 Wireit audit (root vs src/packages/*.jsonc)");
  if (wireitMissing.length) {
    console.log("• Missing (in root, not listed in any src-packages/*.jsonc):");
    wireitMissing.forEach((n) => console.log(`  - ${n}`));
  } else {
    console.log("• No missing wireit entries.");
  }

  if (wireitChanged.length) {
    console.log("• Changed (defined in both, but config differs):");
    for (const c of wireitChanged) {
      console.log(`  - ${c.name} in ${path.relative(opts.cwd, c.file)}`);
    }
  } else {
    console.log("• No changed wireit entries.");
  }

  if (wireitDupes.length) {
    console.log("• Duplicates (same wireit key in multiple files):");
    for (const d of wireitDupes) {
      console.log(`  - ${d.name}`);
      d.files.forEach((f) => console.log(`      ${path.relative(opts.cwd, f)}`));
    }
  } else {
    console.log("• No duplicate wireit entries.");
  }
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  nanny update-package [options]",
      "",
      "Options:",
      "  --verbose    More logs",
      "  --help       Show help for this command",
      "",
      "What it does:",
      "  1) Updates dependency versions in ./src/packages/*/*.jsonc from the root package.json",
      "  2) Reports unused root dependencies",
      "  3) Audits scripts/wireit for missing, changed, and duplicated entries",
      "",
    ].join("\n"),
  );
}

function parseArgs(argv: string[], globalVerbose: boolean): Options {
  const o: Options = { verbose: globalVerbose, help: false };
  for (const a of argv) {
    if (a === "--help") o.help = true;
    else if (a === "--verbose") o.verbose = true;
    else throw new NannyError(`Unknown argument: ${a}`, 1);
  }
  return o;
}

function loadJsonc<T = unknown>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf8");
  return parse(content) as T;
}

function loadJson<T = unknown>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content) as T;
}

function replaceVersions(target: PackageJson, source: PackageJson): boolean {
  let updated = false;
  for (const section of ["dependencies", "devDependencies"] as const) {
    const t = target[section];
    const s = source[section];
    if (!t || !s) continue;
    for (const dep of Object.keys(t)) {
      const newVersion = s[dep];
      if (newVersion && t[dep] !== newVersion) {
        t[dep] = newVersion;
        updated = true;
      }
    }
  }
  return updated;
}

function collectUsedDeps(files: string[]): Set<string> {
  const used = new Set<string>();
  for (const file of files) {
    const json = loadJsonc<PackageJson>(file);
    for (const section of ["dependencies", "devDependencies"] as const) {
      const deps = json[section];
      if (deps && typeof deps === "object") {
        for (const name of Object.keys(deps)) used.add(name);
      }
    }
  }
  return used;
}

function collectScriptsAndWireit(files: string[]) {
  const perFileScripts: Array<{ file: string; scripts: Record<string, string> }> = [];
  const perFileWireit: Array<{ file: string; wireit: Record<string, unknown> }> = [];

  for (const file of files) {
    try {
      const json = loadJsonc<PackageJson>(file);
      if (json.scripts && typeof json.scripts === "object") {
        perFileScripts.push({ file, scripts: json.scripts as Record<string, string> });
      }
      if (json.wireit && typeof json.wireit === "object") {
        perFileWireit.push({ file, wireit: json.wireit as Record<string, unknown> });
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(`✖ Failed to read ${file}: ${err.message}`);
    }
  }

  return { perFileScripts, perFileWireit };
}

function findMissingFromPackages<T>(
  rootMap: Record<string, T> | undefined,
  perFile: Array<{ file: string; map: Record<string, T> }>,
): string[] {
  if (!rootMap) return [];
  const present = new Set<string>();
  for (const { map } of perFile) {
    for (const k of Object.keys(map)) present.add(k);
  }
  return Object.keys(rootMap).filter((k) => !present.has(k)).sort();
}

function findChangedScripts(
  rootScripts: Record<string, string> | undefined,
  perFileScripts: Array<{ file: string; scripts: Record<string, string> }>,
): Array<{ file: string; name: string; root: string; found: string }> {
  const out: Array<{ file: string; name: string; root: string; found: string }> = [];
  const rs = rootScripts ?? {};
  for (const { file, scripts } of perFileScripts) {
    for (const [name, cmd] of Object.entries(scripts)) {
      if (name in rs && String(rs[name]) !== String(cmd)) {
        out.push({ file, name, root: String(rs[name]), found: String(cmd) });
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function stableStringify(value: unknown): string {
  const keys: string[] = [];
  (function collect(v: unknown) {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") {
      for (const k of Object.keys(v as JsonObject)) {
        keys.push(k);
        collect((v as JsonObject)[k]);
      }
    }
  })(value);
  const uniq = Array.from(new Set(keys)).sort();
  return JSON.stringify(value, uniq, 2);
}

function findChangedWireit(
  rootWireit: Record<string, unknown> | undefined,
  perFileWireit: Array<{ file: string; wireit: Record<string, unknown> }>,
): Array<{ file: string; name: string }> {
  const out: Array<{ file: string; name: string }> = [];
  const rw = rootWireit ?? {};
  for (const { file, wireit } of perFileWireit) {
    for (const [name, cfg] of Object.entries(wireit)) {
      if (name in rw) {
        if (stableStringify(rw[name]) !== stableStringify(cfg)) {
          out.push({ file, name });
        }
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function findDuplicateKeys<T>(
  entries: Array<{ file: string; map: Record<string, T> }>,
): Array<{ name: string; files: string[] }> {
  const seen: Record<string, string[]> = {};
  for (const { file, map } of entries) {
    for (const key of Object.keys(map)) {
      if (!seen[key]) seen[key] = [];
      seen[key].push(file);
    }
  }
  return Object.entries(seen)
    .filter(([, files]) => files.length > 1)
    .map(([name, files]) => ({ name, files }));
}

function header(text: string): void {
  console.log(`\n${text}`);
}

function jsonOut(v: unknown): string {
  return JSON.stringify(v, null, 2);
}
