# @davidsneighbour/nanny

Repo management and maintenance CLI for @davidsneighbour's projects.

* [Installation](#installation)
* [Global usage](#global-usage)
  * [Fragment directory](#fragment-directory)
* [Configuration](#configuration)
* [Commands](#commands)
  * [package-init](#package-init)
  * [generate-package](#generate-package)
  * [update-package](#update-package)
  * [merge-vscode-config](#merge-vscode-config)
  * [check](#check)
  * [editorconfig](#editorconfig)
* [Agent skill](#agent-skill)
* [Tests](#tests)

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

### Fragment directory

The fragment ("particle") JSONC files go in `src/packages` by default. Nanny resolves this path against the working directory, which is the current directory or the `--cwd` value.

`package-init` writes `legacy/starter.jsonc` and `system/default.jsonc` into that folder. `generate-package`, `update-package`, and `check` read every `**/*.jsonc` file in it.

Nanny picks the first value it finds, in this order:

1. **CLI flag `--packages-dir <path>`.** The `package-init`, `generate-package`, `update-package`, and `check` commands all take it.
2. **Environment variable `NANNY_PACKAGES_DIR`.**
3. **`NANNY_PACKAGES_DIR` in a `.env` file in the working directory.** Do not commit this file to git.
4. **`nanny.config.local.jsonc` in the working directory.** Use this file for settings on one machine only. Do not commit it to git.
5. **The shared config file, which you commit.** Nanny loads it with c12, so it can be any of the files in [Configuration](#configuration), for example `nanny.config.jsonc` or a `"nanny"` key in `package.json`.
6. **The default, `src/packages`.**

```bash
nanny package-init --packages-dir config/package-particles
NANNY_PACKAGES_DIR=config/package-particles nanny generate-package
echo "NANNY_PACKAGES_DIR=config/package-particles" >> .env
```

Notes:

* **Relative paths:** Nanny resolves a relative path against the working directory, not against the config file. So `--cwd` changes where the folder ends up.
* **Empty or missing values:** Nanny ignores an empty or whitespace-only value from the flag, the environment variable, `.env`, or the local file, and goes to the next level. An empty `packagesDir` in the shared config file is different: it stops with an error (exit code 1).

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

A gitignored `nanny.config.local.jsonc` in the working directory overrides the repo-local config above, for per-machine settings that shouldn't be committed. It's applied after the `c12`-loaded config and before `.env`, environment variables, and CLI flags.

```jsonc
// nanny.config.local.jsonc (gitignored)
{
  "packagesDir": "/tmp/my-local-package-particles"
}
```

CLI flags, environment variables, and `.env` still take precedence over configuration files (see [Fragment directory](#fragment-directory)):

```bash
nanny generate-package --packages-dir config/package-particles --dry-run
NANNY_PACKAGES_DIR=config/package-particles nanny update-package
```

## Commands

### Package-init

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

### Generate-package

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

### Update-package

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

### Merge-vscode-config

Merges `.vscode/settings.base.jsonc` and `.vscode/settings.local.jsonc` (optional) into `.vscode/settings.json`.

```bash
nanny merge-vscode-config [--base <path>] [--local <path>] [--out <path>] [--check] [--dry-run] [--verbose]
```

### Check

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

### Editorconfig

Writes `.editorconfig` with davidsneighbour's sensible defaults if none exists. If a file already exists, its nanny-managed sections (`[*]`, `[*.md]`, `[*.{yml,yaml}]`, `[*.{json,jsonc}]`) are refreshed to the current defaults; any other section is preserved as-is.

```bash
nanny editorconfig [--out <path>] [--dry-run] [--verbose]
```

Examples:

```bash
nanny editorconfig
nanny editorconfig --dry-run
```

## Agent skill

This repository ships an [Agent Skill](https://agentskills.io) at
[`skills/nanny`](skills/nanny/SKILL.md) that teaches a coding agent how to
maintain a project's `package.json` through nanny's fragment workflow
(routing dependency, script, and metadata changes to the right
`references/*.md` procedure, then finalising with `nanny generate-package`
and `nanny check`).

Install it with the [`skills` CLI](https://github.com/vercel-labs/skills):

```bash
# Claude Code (installs to .claude/skills/)
npx skills add davidsneighbour/nanny --skill nanny -a claude-code

# OpenAI Codex (installs to .agents/skills/)
npx skills add davidsneighbour/nanny --skill nanny -a codex

# Both, in one project (or drop -a entirely to be prompted per detected agent)
npx skills add davidsneighbour/nanny --skill nanny -a claude-code -a codex
```

Add `-g` to install globally (`~/.claude/skills/` or `~/.codex/skills/`)
instead of into the current project.

Without the CLI, install it manually by copying the `skills/nanny`
directory into the target location:

```bash
# Claude Code
mkdir -p .claude/skills && cp -r skills/nanny .claude/skills/nanny

# OpenAI Codex
mkdir -p .agents/skills && cp -r skills/nanny .agents/skills/nanny
```

## Tests

```bash
npm test                   # all tests
npm run test:readme        # only the tests for the claims in this README
npm run test:package-init  # only the package-init roundtrip test
```

The tests use the built-in Node.js test runner (`node:test`). The tests in `src/tests/readme/` check the claims in this README, with one file for each section. Each test runs the compiled CLI against a temporary project. If you change a claim in this README, change the related test too.

The package init test creates a temporary fixture, runs `nanny package-init --packages-dir config/package-particles`, then runs `nanny generate-package --packages-dir config/package-particles --dry-run` and compares the generated object with the original fixture package object. It does not overwrite the repository `package.json`.

Exit codes:

* `0` success
* `1` invalid arguments or runtime error
* `2` missing required files
