---
name: nanny
description: >
  Maintains and extends the package.json. Use when adding, removing, or changing anything in package.json. Routes package.json changes through the appropriate internal procedures and finishes by formatting and validating the package.
---

# Manage package.json

Maintain `package.json` through a single coordinated workflow.

## How the system works

`package.json` is a generated file. The real source of truth is a directory
of JSONC fragments, by default `src/packages/**/*.jsonc` (overridable via
`--packages-dir`, `NANNY_PACKAGES_DIR`, `.env`, `nanny.config.local.jsonc`, or a
committed `nanny.config.jsonc`). Three commands drive the workflow:

* `nanny generate-package` — reads every fragment, deep-merges them over a
  filtered copy of the current `package.json` (only a fixed set of root keys
  such as `name`, `version`, `author`, `repository`, … survive the filter),
  strips any `notes` key, and writes the result back to `package.json`.
  Fragments are merged in the order `fast-glob` returns them, and later
  fragments overwrite earlier ones key-for-key on conflict.
* `nanny update-package --verbose` — a semi-mutating audit: it rewrites
  dependency *version strings* inside fragments to match the root
  `package.json` (so a fragment never pins a stale version), then reports,
  without editing anything else:
  * unused root dependencies (present in `package.json`, absent from every
    fragment);
  * scripts/`wireit` entries missing from the fragments;
  * scripts/`wireit` entries whose command/config differs between root and
    fragment;
  * duplicate script/`wireit` keys defined in more than one fragment.
* `nanny check` — read-only. Reruns the same drift/missing/duplicate checks,
  plus a `.vscode/settings.json` sync check and a check for uncommitted
  changes in generated files. Exits non-zero only when something actionable
  is found.

Two conventional fragments anchor the layout:

* `legacy/starter.jsonc` — `scripts`, `dependencies`, `devDependencies`.
* `system/default.jsonc` — all other `package.json` metadata fields.

Additional `**/*.jsonc` files can be added freely; `generate-package`
deep-merges all of them and `update-package`/`check` audit all of them.

### Key order is not stable

`package.json` key order (inside `dependencies`, `scripts`, `wireit`, etc.)
reflects merge order across fragments, not any alphabetical or manually
curated order. Because merge order follows filesystem glob order, adding,
renaming, or moving a fragment file can shift where a key ends up in the
regenerated `package.json`. Do not treat key reordering in a diff as a
meaningful change, and do not try to hand-tune order in the generated file —
it will be overwritten on the next `generate-package` run. If a stable order
genuinely matters, that has to be enforced by the fragment's own key order,
not by editing `package.json`.

### Metadata fields can be silently dropped

`generate-package` only carries a metadata field through from the existing
`package.json` if it is in its "keys to preserve" list (`name`,
`description`, `version`, `author`, `bugs`, `engines`, `homepage`,
`license`, `private`, `repository`, `publishConfig`, `type` by default).
Anything else — `files`, `bin`, `keywords`, embedded tool config such as
`cspell` or `simple-git-hooks`, etc. — only survives regeneration if a
fragment defines it. See `references/update-package-metadata.md` before
touching any field outside that list.

### Mapping a change onto the right fragment

When a dependency, script, or `wireit` entry already exists in the
fragments, edit it where it already lives — do not add a second copy
elsewhere. When it does not exist yet:

1. Prefer an existing fragment whose topic matches (build/framework,
   linting, testing, design tooling, AI/MCP/tooling, or a site-specific
   fragment — see `references/reconcile-package-fragments.md` for the full
   grouping list).
2. If no fragment fits, create a new focused fragment under
   `src/packages/<category>/<topic>.jsonc` rather than dropping the entry
   into an unrelated one.
3. Never add an entry to `package.json` directly and leave it unrepresented
   in the fragments — `generate-package` would erase it on the next run.

This is the reverse of `generate-package`'s merge: `generate-package` goes
fragments → `package.json`; placing a new entry means deciding which
fragment it would need to live in for that forward merge to produce it.

### Duplicate keys across fragments are always a defect, never a technique

`generate-package` merges fragments in `fast-glob` order and the later
fragment wins on a key conflict — but this is an implementation detail, not
a supported way to "override" one fragment from another. `nanny
update-package` and `nanny check` both flag the same script/`wireit` key
defined in more than one fragment as a duplicate. Treat every reported
duplicate as something to fix by consolidating the key into exactly one
fragment (the one matching its topic per the grouping list above) and
deleting it from the others — never by relying on which fragment happens to
sort last.

## Operating principles

* Treat the user's requested outcome as the primary operation.
* Inspect the current repository before deciding which actions are required.
* Do not modify `package.json` ad hoc.
* Route every `package.json` change through the matching procedure under
  `references/`.
* Multiple procedures may apply to one request.
* Run finalisation once, after all requested changes have been applied.
* Preserve unrelated existing configuration.
* Use the repository's detected package manager.
* Do not introduce a second package manager.

## Phase 1: inspect

Determine:

* repository root;
* nanny package location;
* relevant `package.json` files;
* package manager and lockfile;
* workspace structure;
* existing scripts and dependencies;
* repository formatting and validation commands.

Construct an operation record containing:

* requested outcome;
* required actions;
* affected files;
* validation requirements;
* unresolved decisions.

## Phase 2: route

Use the following routing table.

| Required change | Procedure |
| --- | --- |
| Add or update a dependency | `references/add-dependency.md` |
| Remove a dependency | `references/remove-dependency.md` |
| Bump dependency version(s) without adding/removing | `references/update-dependencies.md` |
| Add or update a package script | `references/add-script.md` |
| Change package metadata | `references/update-package-metadata.md` |
| No fragments exist yet; bring an existing `package.json` under the fragment workflow | `references/onboard.md` |
| `package.json` and fragments have drifted apart, or the fragments need to be re-derived from `package.json` | `references/reconcile-package-fragments.md` |
| Any `package.json` change | `references/finalise-package-json.md` |

Read only the procedures required for the current operation.

A request may select more than one procedure.

## Phase 3: implement

Apply the selected procedures as one coordinated change.

When a dependency and script belong together, complete both before running
formatting or validation.

Do not run finalisation after each individual action.

## Phase 4: finalise

If any `package.json` file changed:

1. Read `references/finalise-package-json.md`.
2. Run the appropriate package-manager install command if dependency or
   lockfile state changed.
3. Run repository formatting, linting, type checking, and tests appropriate
   to the affected package.
4. Inspect the resulting diff.

## Phase 5: report

Report:

* actions selected;
* files changed;
* dependencies or scripts added, changed, or removed;
* commands run;
* validation results;
* warnings or decisions still requiring attention.
