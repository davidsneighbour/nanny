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

Package fragment commands read their fragment directory from this precedence order:

* `--packages-dir <path>`
* `NANNY_PACKAGES_DIR`
* `src/packages`

## Commands

### package-init

Creates the initial package fragment files expected by `update-package` and `generate-package`.

```bash
nanny package-init [--package <path>] [--packages-dir <path>] [--force] [--verbose]
```

This command reads the current `package.json` and writes:

* `<packages-dir>/legacy/starter.jsonc` with `scripts`, `dependencies`, and `devDependencies`
* `<packages-dir>/system/default.jsonc` with all other package fields

It leaves `package.json` unchanged. Use `nanny generate-package --dry-run` afterwards to verify the generated object without overwriting the existing file.

Examples:

```bash
nanny package-init
nanny package-init --packages-dir config/package-particles
NANNY_PACKAGES_DIR=config/package-particles nanny package-init
```

### generate-package

Merges all `<packages-dir>/**/*.jsonc` into `package.json`, while preserving a configurable set of keys from the original `package.json`.

```bash
nanny generate-package [--package <path>] [--packages-dir <path>] [--keys <csv>] [--dry-run] [--verbose]
```

Examples:

```bash
nanny generate-package --dry-run
nanny generate-package --packages-dir config/package-particles --dry-run
NANNY_PACKAGES_DIR=config/package-particles nanny generate-package --dry-run
```

### update-package

Synchronises dependency versions in `<packages-dir>/*/*.jsonc` against the root `package.json`, then audits:

* unused root dependencies
* scripts missing from package jsonc files
* scripts and wireit entries that differ from root
* duplicates across multiple jsonc files

```bash
nanny update-package [--packages-dir <path>] [--verbose]
```

Examples:

```bash
nanny update-package
nanny update-package --packages-dir config/package-particles
NANNY_PACKAGES_DIR=config/package-particles nanny update-package
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

The package init test creates a temporary fixture, runs `nanny package-init --packages-dir config/package-particles`, then runs `nanny generate-package --packages-dir config/package-particles --dry-run` and compares the generated object with the original fixture package object. It does not overwrite the repository `package.json`.

Exit codes:

* `0` success
* `1` invalid arguments or runtime error
* `2` missing required files
