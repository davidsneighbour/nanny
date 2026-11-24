# AGENTS.md

This file is the canonical, agent-independent source of instructions for AI coding agents (Codex, Claude Code, and others) working in this repository.

## Workflow

All work must be connected to a GitHub issue. Before starting any non-trivial change, check for an existing issue or open one. Document progress and decisions as comments on the issue. Reference the issue in commit messages and PRs.

## Commands

```bash
npm run check           # single source of passing validation: lint + validate + test
npm run build           # compile TypeScript → dist/
npm run typecheck       # type-check without emitting
npm run ci              # typecheck + build (what CI runs)
npm test                   # build then run all tests with node:test
npm run test:readme        # build then run only the README claim tests
npm run test:package-init  # build then run the package-init roundtrip test
```

There is no watch mode. Run `npm run build` before testing changes locally via the CLI.

## Architecture

`nanny` is a Node.js ≥ 24 ES-module CLI written in TypeScript. The compiled output lands in `dist/` and the binary entry point is `dist/cli.js`.

### Request flow

`src/cli.ts` parses `process.argv`, extracts global flags (`--cwd`, `--verbose`), then dispatches to one of four command handlers in `src/commands/`. Each command handler re-parses its own remaining argv using helpers from `src/lib/args.ts`.

There is **no third-party CLI framework** — flag parsing is entirely manual via `getFlagValue` / `hasFlag` / `stripGlobalFlags` in `src/lib/args.ts`.

### Lib/ modules

| File | Purpose |
| --- | --- |
| `lib/args.ts` | Manual argv parsing helpers; defines `GlobalOptions` type |
| `lib/config.ts` | `loadNannyConfig` via c12; `parseJsoncObject` via confbox |
| `lib/errors.ts` | `NannyError` (carries `exitCode`); `formatError` |
| `lib/package-paths.ts` | `resolvePackagesDir`, `createPackageGlob`, path utilities |

### Configuration precedence

`packagesDir` resolves in this order:

1. `--packages-dir` CLI flag
2. `NANNY_PACKAGES_DIR` env var
3. `NANNY_PACKAGES_DIR` in a `.env` file in the cwd (gitignored; read with `util.parseEnv`, `process.env` is not changed)
4. `nanny.config.local.jsonc` in the cwd (gitignored, per-machine override)
5. c12-loaded config file (e.g. `nanny.config.jsonc`, `.nannyrc`, `package.json#nanny`) — repo-local, committed
6. Default: `src/packages`

### Package fragment commands

`package-init`, `generate-package`, and `update-package` all operate on a directory of JSONC fragment files:

* `legacy/starter.jsonc` — holds `scripts`, `dependencies`, `devDependencies`
* `system/default.jsonc` — holds all other `package.json` metadata fields
* Additional `**/*.jsonc` files can be added; `generate-package` deep-merges them all and `update-package` audits them all

The `generate-package` merge preserves a fixed set of keys from the root `package.json` (name, version, author, repository, etc.) and removes any `notes` key from the merged output.

### Testing

All tests are integration tests that run with the built-in `node:test` runner. They create temporary fixtures, run the compiled CLI, and check the result with `node:assert`. There is no third-party test framework.

* `src/tests/package-init.test.ts` verifies the `package-init` → `generate-package --dry-run` roundtrip.
* `src/tests/readme/*.test.ts` has one test for each claim in `README.md`, with one file for each README section. Shared fixture helpers are in `src/tests/helpers.ts`. When you change a claim in `README.md`, update the related test in the same change. A test marked `todo` is a claim that is known to be false and is tracked in an issue.

### Exit codes

* `0` — success
* `1` — invalid arguments or runtime error
* `2` — missing required files
