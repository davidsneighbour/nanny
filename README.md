# @davidsneighbour/nanny

Repo management and maintenance CLI for davidsneighbour projects.

## Installation

```bash
npm install -D @davidsneighbour/nanny
```

## Global usage

```bash
nanny <command> [--cwd <path>] [--verbose]
```

Commands run relative to `--cwd` (defaults to the current working directory).

## Commands

### package-init

Creates the initial package fragment files expected by `update-package` and `generate-package`.

```bash
nanny package-init [--package <path>] [--force] [--verbose]
```

This command reads the current `package.json` and writes:

* `src/packages/legacy/starter.jsonc` with `scripts`, `dependencies`, and `devDependencies`
* `src/packages/system/default.jsonc` with all other package fields

It leaves `package.json` unchanged. Use `nanny generate-package --dry-run` afterwards to verify the generated object without overwriting the existing file.

### generate-package

Merges all `src/packages/**/*.jsonc` into `package.json`, while preserving a configurable set of keys from the original `package.json`.

```bash
nanny generate-package [--package <path>] [--keys <csv>] [--dry-run] [--verbose]
```

### update-package

Synchronises dependency versions in `src/packages/*/*.jsonc` against the root `package.json`, then audits:

* unused root dependencies
* scripts missing from package jsonc files
* scripts and wireit entries that differ from root
* duplicates across multiple jsonc files

```bash
nanny update-package [--verbose]
```

### merge-vscode-config

Merges `.vscode/settings.base.jsonc` and `.vscode/settings.local.jsonc` (optional) into `.vscode/settings.json`.

```bash
nanny merge-vscode-config [--base <path>] [--local <path>] [--out <path>] [--check] [--dry-run] [--verbose]
```

## Tests

```bash
npm run test:package-init
```

The package init test creates a temporary fixture, runs `nanny package-init`, then runs `nanny generate-package --dry-run` and compares the generated object with the original fixture package object. It does not overwrite the repository `package.json`.

Exit codes:

* `0` success
* `1` invalid arguments or runtime error
* `2` missing required files
