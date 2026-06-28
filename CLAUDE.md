# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

All work must be connected to a GitHub issue. Before starting any non-trivial change, check for an existing issue or open one. Document progress and decisions as comments on the issue. Reference the issue in commit messages and PRs.

## Commands

```bash
npm run build          # compile TypeScript → dist/
npm run typecheck      # type-check without emitting
npm run ci             # typecheck + build (what CI runs)
npm run test:package-init  # build then run the integration test
```

There is no watch mode. Run `npm run build` before testing changes locally via the CLI.

## Architecture

`nanny` is a Node.js ≥ 24 ES-module CLI written in TypeScript. The compiled output lands in `dist/` and the binary entry point is `dist/cli.js`.

### Request flow

`src/cli.ts` parses `process.argv`, extracts global flags (`--cwd`, `--verbose`), then dispatches to one of four command handlers in `src/commands/`. Each command handler re-parses its own remaining argv using helpers from `src/lib/args.ts`.

There is **no third-party CLI framework** — flag parsing is entirely manual via `getFlagValue` / `hasFlag` / `stripGlobalFlags` in `src/lib/args.ts`.

### lib/ modules

| File | Purpose |
|---|---|
| `lib/args.ts` | Manual argv parsing helpers; defines `GlobalOptions` type |
| `lib/config.ts` | `loadNannyConfig` via c12; `parseJsoncObject` via confbox |
| `lib/errors.ts` | `NannyError` (carries `exitCode`); `formatError` |
| `lib/package-paths.ts` | `resolvePackagesDir`, `createPackageGlob`, path utilities |

### Configuration precedence

`packagesDir` resolves in this order:
1. `--packages-dir` CLI flag
2. `NANNY_PACKAGES_DIR` env var
3. c12-loaded config file (e.g. `nanny.config.jsonc`, `.nannyrc`, `package.json#nanny`)
4. Default: `src/packages`

### Package fragment commands

`package-init`, `generate-package`, and `update-package` all operate on a directory of JSONC fragment files:

- `legacy/starter.jsonc` — holds `scripts`, `dependencies`, `devDependencies`
- `system/default.jsonc` — holds all other `package.json` metadata fields
- Additional `*/*.jsonc` files can be added; `generate-package` deep-merges them all

The `generate-package` merge preserves a fixed set of keys from the root `package.json` (name, version, author, repository, etc.) and removes any `notes` key from the merged output.

### Testing

The single test (`src/tests/package-init.test.ts`) is an integration test: it builds a temp fixture, shells out to the compiled CLI, and uses Node's `assert.deepEqual` to verify a roundtrip. There is no unit test framework.

### Exit codes

- `0` — success
- `1` — invalid arguments or runtime error
- `2` — missing required files
