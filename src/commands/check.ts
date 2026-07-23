import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import glob from "fast-glob";

import { NannyError } from "../lib/errors.js";
import { createPackageGlob, resolvePackagesDir, toPosixRelative } from "../lib/package-paths.js";
import { runMergeVscodeConfig } from "./merge-vscode-config.js";
import {
  collectScriptsAndWireit,
  collectUsedDeps,
  computeVersionDrift,
  findChangedScripts,
  findChangedWireit,
  findDuplicateKeys,
  findMissingFromPackages,
  loadJson,
  loadJsonc,
  type PackageJson,
} from "./update-package.js";

type Options = {
  verbose: boolean;
  help: boolean;
  packagesDir: string;
};

export async function runCheck(opts: { cwd: string; verbose: boolean; argv: string[] }): Promise<void> {
  const options = await parseArgs(opts.argv, opts.cwd, opts.verbose);

  if (options.help) {
    printHelp();
    throw new NannyError("help", 0);
  }

  let critical = false;

  header("Package fragments");
  critical = (await checkPackageFragments(opts.cwd, options.packagesDir)) || critical;

  header("VS Code settings");
  critical = (await checkVscodeSettings(opts.cwd)) || critical;

  header("Generated files");
  critical = checkUncommittedGeneratedFiles(opts.cwd) || critical;

  console.log("");
  if (critical) {
    throw new NannyError("nanny check found issues that need attention. See above for details.", 1);
  }
  console.log("✔ No issues found.");
}

async function checkPackageFragments(cwd: string, packagesDir: string): Promise<boolean> {
  const rootPkgAbs = path.resolve(cwd, "package.json");
  if (!fs.existsSync(rootPkgAbs)) {
    console.log("- Skipped: no package.json found.");
    return false;
  }

  const packageJsoncGlob = createPackageGlob(cwd, packagesDir, "**/*.jsonc");
  const packageDisplayPath = toPosixRelative(cwd, packagesDir);
  const jsoncFiles = await glob(packageJsoncGlob, { dot: false, cwd, absolute: false });

  if (jsoncFiles.length === 0) {
    console.log(`- Skipped: no package fragments found under ${packageDisplayPath}.`);
    return false;
  }

  const rootPkg = loadJson<PackageJson>(rootPkgAbs);
  const absoluteFiles = jsoncFiles.map((f) => path.resolve(cwd, f));

  let critical = false;

  const drifted: Array<{ file: string; name: string; from: string; to: string }> = [];
  for (const file of absoluteFiles) {
    const json = loadJsonc<PackageJson>(file);
    for (const d of computeVersionDrift(json, rootPkg)) {
      drifted.push({ file, ...d });
    }
  }

  if (drifted.length > 0) {
    critical = true;
    console.log("- Dependency versions out of sync with package.json (run `nanny update-package`):");
    for (const d of drifted) {
      console.log(`  - ${d.name}: ${d.from} -> ${d.to} in ${path.relative(cwd, d.file)}`);
    }
  } else {
    console.log("- Dependency versions in sync.");
  }

  const usedDeps = collectUsedDeps(absoluteFiles);
  const unused: string[] = [];
  for (const section of ["dependencies", "devDependencies"] as const) {
    const deps = rootPkg[section];
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (!usedDeps.has(name)) unused.push(name);
    }
  }
  if (unused.length > 0) {
    console.log(`- Unused root dependencies (not referenced in any fragment): ${unused.sort().join(", ")}`);
  }

  const { perFileScripts, perFileWireit } = collectScriptsAndWireit(absoluteFiles);

  const scriptsMissing = findMissingFromPackages(
    rootPkg.scripts,
    perFileScripts.map(({ file, scripts }) => ({ file, map: scripts })),
  );
  const wireitMissing = findMissingFromPackages(
    rootPkg.wireit,
    perFileWireit.map(({ file, wireit }) => ({ file, map: wireit })),
  );
  const scriptsChanged = findChangedScripts(rootPkg.scripts, perFileScripts);
  const wireitChanged = findChangedWireit(rootPkg.wireit, perFileWireit);
  const scriptDupes = findDuplicateKeys(perFileScripts.map(({ file, scripts }) => ({ file, map: scripts })));
  const wireitDupes = findDuplicateKeys(perFileWireit.map(({ file, wireit }) => ({ file, map: wireit })));

  const scriptIssues = scriptsMissing.length + scriptsChanged.length + scriptDupes.length;
  const wireitIssues = wireitMissing.length + wireitChanged.length + wireitDupes.length;

  if (scriptIssues > 0) {
    critical = true;
    console.log(`- Scripts out of sync (run \`nanny update-package\` for details): ${scriptIssues} issue(s).`);
  } else {
    console.log("- Scripts in sync.");
  }

  if (wireitIssues > 0) {
    critical = true;
    console.log(`- Wireit config out of sync (run \`nanny update-package\` for details): ${wireitIssues} issue(s).`);
  } else {
    console.log("- Wireit config in sync.");
  }

  return critical;
}

async function checkVscodeSettings(cwd: string): Promise<boolean> {
  const basePath = path.resolve(cwd, ".vscode/settings.base.jsonc");
  if (!fs.existsSync(basePath)) {
    console.log("- Skipped: no .vscode/settings.base.jsonc found.");
    return false;
  }

  try {
    await runMergeVscodeConfig({ cwd, verbose: false, argv: ["--check"] });
    console.log("- .vscode/settings.json is in sync.");
    return false;
  } catch (e: unknown) {
    if (e instanceof NannyError) {
      console.log(`- .vscode/settings.json is out of date (run \`nanny merge-vscode-config\`): ${e.message}`);
      return true;
    }
    throw e;
  }
}

function checkUncommittedGeneratedFiles(cwd: string): boolean {
  let inGitRepo = true;
  try {
    execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, stdio: ["ignore", "ignore", "ignore"] });
  } catch {
    inGitRepo = false;
  }

  if (!inGitRepo) {
    console.log("- Skipped: not inside a git repository.");
    return false;
  }

  const candidates = ["package.json", ".vscode/settings.json"];
  const dirty: string[] = [];

  for (const rel of candidates) {
    const abs = path.resolve(cwd, rel);
    if (!fs.existsSync(abs)) continue;

    let status: string;
    try {
      status = execFileSync("git", ["status", "--porcelain", "--", rel], { cwd, encoding: "utf8" });
    } catch {
      continue;
    }

    if (status.trim().length > 0) dirty.push(rel);
  }

  if (dirty.length > 0) {
    console.log(`- Uncommitted changes in generated files: ${dirty.join(", ")}`);
    return true;
  }

  console.log("- No uncommitted changes in generated files.");
  return false;
}

function printHelp(): void {
  console.log(
    [
      "Usage:",
      "  nanny check [options]",
      "",
      "Options:",
      "  --packages-dir <path>  Package fragments directory (default: config, NANNY_PACKAGES_DIR, or src/packages)",
      "  --verbose              More logs",
      "  --help                 Show help for this command",
      "",
      "What it does (read-only, makes no changes):",
      "  1) Checks package fragment versions/scripts/wireit are in sync with package.json",
      "  2) Checks .vscode/settings.json is in sync with .vscode/settings.base.jsonc, if present",
      "  3) Checks for uncommitted changes in generated files (package.json, .vscode/settings.json)",
      "",
      "Exits non-zero only if actionable issues are found.",
      "",
    ].join("\n"),
  );
}

async function parseArgs(argv: string[], cwd: string, globalVerbose: boolean): Promise<Options> {
  let packagesDirOverride: string | undefined;
  const o: Options = { verbose: globalVerbose, help: false, packagesDir: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--help":
        o.help = true;
        break;
      case "--verbose":
        o.verbose = true;
        break;
      case "--packages-dir": {
        const value = argv[index + 1];
        if (typeof value !== "string" || value.length === 0) {
          throw new NannyError("Missing value for --packages-dir", 1);
        }
        packagesDirOverride = value;
        index += 1;
        break;
      }
      default:
        throw new NannyError(`Unknown argument: ${String(arg)}`, 1);
    }
  }

  o.packagesDir = await resolvePackagesDir(cwd, packagesDirOverride);
  return o;
}

function header(text: string): void {
  console.log(`\n${text}`);
}
