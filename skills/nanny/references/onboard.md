# Onboard an existing package.json onto fragments

Use this procedure when a repository has a hand-maintained `package.json`
and no `src/packages/**/*.jsonc` fragments yet (or the equivalent
`--packages-dir` location), and the goal is to bring it under `nanny`'s
fragment-based workflow.

## What `nanny package-init` does

`nanny package-init` is the bootstrap command for this:

1. Reads the current `package.json`.
2. Splits it into exactly two fragments:
   * `legacy/starter.jsonc` — `scripts`, `dependencies`,
     `devDependencies` (whichever of these are present).
   * `system/default.jsonc` — every other field.
3. Writes both fragment files under `--packages-dir` (default
   `src/packages`), creating directories as needed.
4. Leaves `package.json` untouched.
5. Refuses to overwrite either fragment file if it already exists, unless
   `--force` is passed.

It does not run `generate-package` for you, and it does not validate the
split — see "Known limitation" below.

## Procedure

1. Confirm no fragments exist yet at the target `--packages-dir` (or that
   overwriting them with `--force` is intended and approved).
2. Run `nanny package-init` (add `--packages-dir <path>` if the repository
   does not use the default `src/packages`).
3. Run `nanny generate-package --dry-run` and diff its output against the
   original `package.json`. This is the correctness check for the split —
   the dry-run output should match the original file except for:
   * key order (expected — see `SKILL.md`'s "Key order is not stable");
   * any `notes` key (deliberately stripped);
   * any field outside the default preserve list that was not already
     captured verbatim into `system/default.jsonc` (see Known limitation).
4. If the diff shows a real content loss, it means a field was not in the
   default preserve list and needs to be manually re-checked in
   `system/default.jsonc` — `package-init` copies fields verbatim, so a
   mismatch here usually means the original `package.json` had a field
   `generate-package`'s default preserve list doesn't special-case, which
   is fine as long as it made it into `system/default.jsonc` (it does, since
   `package-init` puts everything not in `EXTRACTED_KEYS` there).
5. Once the dry-run output matches, run `nanny generate-package` for real.
6. Run `nanny check` to confirm no drift.
7. From this point on, all further changes go through the fragments (see
   the routing table in `SKILL.md`), never through direct edits to
   `package.json`.

## Known limitation: no topic-based splitting

`package-init` performs a purely mechanical two-way split
(`legacy/starter.jsonc` + `system/default.jsonc`); it does not group
dependencies or scripts by purpose (build, lint, test, design, tooling,
etc.) the way `references/reconcile-package-fragments.md` recommends for an
already-onboarded repository. Treat `package-init`'s output as a starting
point, not the final layout: after onboarding, consider re-running the
grouping guidance in `references/reconcile-package-fragments.md` to split
`legacy/starter.jsonc` into topic-focused fragments if the repository is
large enough to benefit from it. Do this as a separate follow-up step, not
as part of the initial onboarding commit, so the onboarding diff stays
easy to review.

## Return

* fragment files created (and whether `--force` was needed);
* result of the `generate-package --dry-run` comparison;
* confirmation that `nanny check` reports no issues after the real
  `generate-package` run;
* whether a follow-up regrouping pass is recommended.
