# @davidsneighbour/nanny

Repo management and maintenance CLI for @davidsneighbour's projects.

- [Installation](#installation)
- [Global usage](#global-usage)
- [Configuration](#configuration)
- [Commands](#commands)
  - [package-init](#package-init)
  - [generate-package](#generate-package)
  - [update-package](#update-package)
  - [merge-vscode-config](#merge-vscode-config)
  - [check](#check)
  - [editorconfig](#editorconfig)
- [Tests](#tests)

## Installation

```bash
npm install -D @davidsneighbour/nanny
```

## Global usage

```bash
nanny <command> [--cwd <path>] [--verbose]
nanny --version
```

Commands run relative to `--cwd` (defaults to the current working directory).

Run `nanny --version` (or `-v`) to print the installed version.

Package fragment commands read their fragment directory from this precedence order:

* `--packages-dir <path>`
* `NANNY_PACKAGES_DIR`
* `nanny.config.local.jsonc` in the working directory (gitignored, per-machine override)
* Nanny configuration loaded through `c12` (repo-local, committed)
* `src/packages`

## Configuration

Nanny uses `c12` to find and load project configuration. JSONC parsing is handled through `confbox`, so configuration files ending in `.jsonc` are supported.

The current configuration object supports:

* `packagesDir`: Directory that contains package fragments for `package-init`, `generate-package`, and `update-package`. Defaults to `src/packages`.

Supported configuration locations include:

* `nanny.config.ts`
* `nanny.config.js`
* `nanny.config.mjs`
* `nanny.config.cjs`
* `nanny.config.json`
* `nanny.config.jsonc`
* `nanny.config.yaml`
* `nanny.config.yml`
* `.nannyrc`
* `.nannyrc.json`
* `.nannyrc.jsonc`
* `.nannyrc.yaml`
* `.nannyrc.yml`
* `.config/nanny.jsonc`
* the `nanny` property in `package.json`

Example `nanny.config.jsonc`:

```jsonc
{
  // Directory that contains package fragments.
  "packagesDir": "config/package-particles"
}
```

Example `nanny.config.ts`:

```ts
export default {
  packagesDir: "config/package-particles",
};
```

Example `package.json` configuration:

```json
{
  "nanny": {
    "packagesDir": "config/package-particles"
  }
}
```

### Local overrides

A gitignored `nanny.config.local.jsonc` in the working directory overrides the repo-local config above, for per-machine settings that shouldn't be committed. It's applied after the `c12`-loaded config and before CLI flags / env vars.

```jsonc
// nanny.config.local.jsonc (gitignored)
{
  "packagesDir": "/tmp/my-local-package-particles"
}
```

CLI and environment overrides still take precedence over configuration files:

```bash
nanny generate-package --packages-dir config/package-particles --dry-run
NANNY_PACKAGES_DIR=config/package-particles nanny update-package
```

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
nanny generate-package [--package <path>] [--packages-dir <path>] [--keys <csv>] [--add-keys <csv>] [--dry-run] [--verbose]
```

`--keys` replaces the default list of keys preserved from `package.json`. `--add-keys` extends whatever list is in effect (the default, or `--keys` if also passed) instead of replacing it.

Examples:

```bash
nanny generate-package --dry-run
nanny generate-package --packages-dir config/package-particles --dry-run
NANNY_PACKAGES_DIR=config/package-particles nanny generate-package --dry-run
nanny generate-package --add-keys workspaces --dry-run
```

### update-package

Synchronises dependency versions in `<packages-dir>/**/*.jsonc` against the root `package.json`, then audits:

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

### check

Read-only report of repo maintenance tasks. Makes no changes; exits non-zero only if actionable issues are found.

```bash
nanny check [--packages-dir <path>] [--verbose]
```

Checks:

* Package fragment dependency versions, scripts, and wireit config are in sync with `package.json` (skipped if no fragments are found)
* `.vscode/settings.json` is in sync with `.vscode/settings.base.jsonc` (skipped if no base file is found)
* No uncommitted changes in generated files (`package.json`, `.vscode/settings.json`) — skipped outside a git repository

Examples:

```bash
nanny check
nanny check --packages-dir config/package-particles
```

### editorconfig

Writes `.editorconfig` with davidsneighbour's sensible defaults if none exists. If a file already exists, its nanny-managed sections (`[*]`, `[*.md]`, `[*.{yml,yaml}]`, `[*.{json,jsonc}]`) are refreshed to the current defaults; any other section is preserved as-is.

```bash
nanny editorconfig [--out <path>] [--dry-run] [--verbose]
```

Examples:

```bash
nanny editorconfig
nanny editorconfig --dry-run
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
