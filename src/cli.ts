#!/usr/bin/env node
/* eslint-disable no-console */

import { exit } from "node:process";

import { formatError, NannyError } from "./lib/errors.js";
import { getFlagValue, hasFlag, stripGlobalFlags } from "./lib/args.js";
import { runGeneratePackage } from "./commands/generate-package.js";
import { runUpdatePackage } from "./commands/update-package.js";
import { runPackageInit } from "./commands/package-init.js";
import { runMergeVscodeConfig } from "./commands/merge-vscode-config.js";

function printHelp(): void {
  console.log(
    [
      "nanny - repo maintenance CLI",
      "",
      "Usage:",
      "  nanny <command> [options]",
      "",
      "Commands:",
      "  package-init          Create initial src/packages JSONC fragments from package.json",
      "  generate-package      Merge src/packages/**/*.jsonc into package.json",
      "  update-package        Sync dependency versions and audit scripts/wireit",
      "  merge-vscode-config   Merge VS Code settings.base.jsonc + settings.local.jsonc",
      "",
      "Global options:",
      "  --cwd <path>          Working directory (default: current working directory)",
      "  --verbose             More logs",
      "  --help                Show help",
      "",
      "Command help:",
      "  nanny package-init --help",
      "  nanny merge-vscode-config --help",
      "  nanny generate-package --help",
      "  nanny update-package --help",
      "",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? "--help";

  if (cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }

  const cwd = getFlagValue(argv, "--cwd") ?? process.cwd();
  const verbose = hasFlag(argv, "--verbose");
  const rest = stripGlobalFlags(argv).slice(1);

  try {
    switch (cmd) {
      case "package-init":
        await runPackageInit({ cwd, verbose, argv: rest });
        return;
      case "generate-package":
        await runGeneratePackage({ cwd, verbose, argv: rest });
        return;
      case "update-package":
        await runUpdatePackage({ cwd, verbose, argv: rest });
        return;
      case "merge-vscode-config":
        await runMergeVscodeConfig({ cwd, verbose, argv: rest });
        return;
      default:
        console.error(`Unknown command: ${cmd}`);
        printHelp();
        exit(2);
    }
  } catch (err: unknown) {
    const exitCode = err instanceof NannyError ? err.exitCode : 1;
    if (exitCode === 0) exit(0);
    console.error(formatError(err));
    exit(exitCode);
  }
}

void main();
