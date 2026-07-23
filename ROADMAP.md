# Roadmap

_Generated cache of GitHub Issues state. GitHub Issues are the source of truth — see [CLAUDE.md](CLAUDE.md) for the tracking workflow._

Last synced: 2026-07-24

## Project state

- 17 open issues, 0 stale roadmap entries. Two issues closed this sync (#9, #26 — both already resolved in the repo).
- `main` is clean and green: `npm run ci` (typecheck + build) passes, `npm run test:package-init` passes, `npm audit` reports 0 vulnerabilities.
- Only `c12` is outdated (3.3.4 → 4.0.0-beta.5, a pre-release; not actionable yet).
- No lint script exists yet in `package.json` — nothing to report for lint status.
- Latest release: v0.4.1.

## Bugs

- **[#20](https://github.com/davidsneighbour/nanny/issues/20) — Integration test never runs in CI or release workflow.** Neither workflow calls `npm run test:package-init`. Cheap, high-value fix — add it as a CI step. No dependencies.
- **[#21](https://github.com/davidsneighbour/nanny/issues/21) — dependabot.yml references label `type:dependencies`, but the repo label is `dependencies`.** Confirmed: repo labels are `bug`, `documentation`, `dependencies`, etc. — no `type:` prefix exists. One-line fix in `.github/dependabot.yml`. Bundle with #25 (same file).
- **[#17](https://github.com/davidsneighbour/nanny/issues/17) — `release-it`, `@release-it/conventional-changelog`, `@dnbhq/tsconfig` are listed under `dependencies` instead of `devDependencies`.** Confirmed still present in `package.json`. Trivial move; do before or alongside #19.
- **[#18](https://github.com/davidsneighbour/nanny/issues/18) — `update-package` scans fragments one level deep (`*/*.jsonc`) while `generate-package` scans recursively (`**/*.jsonc`).** Confirmed in `src/commands/update-package.ts:43` vs `src/commands/generate-package.ts:22`. One-line glob alignment.
- **[#19](https://github.com/davidsneighbour/nanny/issues/19) — `release-it` config is missing; the conventional-changelog plugin is never wired up.** Confirmed: no `release-it` key in `package.json`. Blocks correct changelog generation on every release going forward. Do before #13 and #12.

## Fixes (enhancement-labeled but corrective)

- **[#25](https://github.com/davidsneighbour/nanny/issues/25) — Dead `gomod` ecosystem in `dependabot.yml`.** Confirmed still present. Bundle with #21.
- **[#22](https://github.com/davidsneighbour/nanny/issues/22) — Add `--version` flag.** Confirmed `nanny --version` still falls through to "Unknown command" — no version handling in `src/cli.ts`. Standard CLI expectation, small change.
- **[#23](https://github.com/davidsneighbour/nanny/issues/23) — `generate-package --keys` replaces the default preserve list instead of extending it.** Confirmed in `src/commands/generate-package.ts` `parseArgs` — `--keys` fully overwrites `keysToPreserve`. Needs an additive `--add-keys` flag per the issue's proposal.
- **[#24](https://github.com/davidsneighbour/nanny/issues/24) — `merge-vscode-config` silently loads `.env` from cwd and `~/` as an undocumented side effect.** Confirmed in `src/commands/merge-vscode-config.ts:32` (`loadDotEnvIfPresent`), called unconditionally, not mentioned in `--help` or README. Issue proposes three options (remove / document+narrow / opt-in flag) — needs a decision, see clarification questions below.

## Release & CI maintenance

- **[#12](https://github.com/davidsneighbour/nanny/issues/12) — Set up commit-lint and conventional changelog CI.** Depends on #19 landing first so the changelog plugin is actually wired up before verifying it end-to-end.
- **[#13](https://github.com/davidsneighbour/nanny/issues/13) — Set up npm trusted publishing (OIDC) instead of `NPM_TOKEN`.** Independent of #19/#12 but naturally grouped with other release-pipeline work.

## New features

- **[#15](https://github.com/davidsneighbour/nanny/issues/15) — Add `nanny check` command** (read-only repo health report: fragment/package.json drift, VS Code settings drift, uncommitted generated files, stale dependency versions).
- **[#14](https://github.com/davidsneighbour/nanny/issues/14) — Add `nanny editorconfig` command** (write/merge a default `.editorconfig`).
- **[#16](https://github.com/davidsneighbour/nanny/issues/16) — Add support for a program-level defaults directory** (distribute config templates for tools like ESLint/Prettier/TypeScript). Open design questions — see below.
- **[#11](https://github.com/davidsneighbour/nanny/issues/11) — Add support for merging local (gitignored) and repo-local (committed) configurations.** Open design question — see below.

## Validation & audit

- **[#8](https://github.com/davidsneighbour/nanny/issues/8) — Review and validate CLI interface** (flag naming, help text accuracy, error message clarity, exit code consistency). Best done after the quick bug fixes above land, since #22/#23/#24 will change the surface being audited.
- **[#10](https://github.com/davidsneighbour/nanny/issues/10) — Install and test `nanny` on external repos.** Best done once the fixes above land, as real-world validation before investing in the larger new-feature issues.

## Suggested order of work

1. #21 + #25 (same file, trivial) → #17 (trivial) → #18 (one-line fix) → #20 (CI wiring)
2. #19 (release-it config) → #12 (commit-lint + changelog CI) → #13 (trusted publishing)
3. #22 (--version) → #23 (--add-keys) → #24 (decide .env handling, then implement)
4. #8 (CLI audit, now that the surface has stabilized)
5. #10 (external repo validation)
6. #15 → #14 → #16 → #11 (new features, roughly in order of design certainty)

## Open clarification questions

- **#24**: which of the three proposed options for `.env` loading in `merge-vscode-config` (remove entirely / document + narrow to cwd only / make opt-in via `--load-env`) should be implemented? No decision recorded yet.
- **#16**: where should program-level defaults live (nanny config dir vs. `src/programs/` in-repo), how are they applied (copy/symlink/merge), and how do local overrides interact?
- **#11**: confirm the proposed layering approach (`nanny.config.jsonc` + gitignored `nanny.config.local.jsonc`, CLI/env still highest precedence) before implementation.

## Project health indicators

| Indicator | Status |
|---|---|
| `npm run typecheck` | ✅ passing |
| `npm run build` | ✅ passing |
| `npm run test:package-init` | ✅ passing |
| `npm audit` | ✅ 0 vulnerabilities |
| Outdated deps | `c12` 3.3.4 → 4.0.0-beta.5 (pre-release, not actionable) |
| Lint | not configured — no lint script in `package.json` |
