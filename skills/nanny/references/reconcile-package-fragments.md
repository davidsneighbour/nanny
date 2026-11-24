# Reconcile package.json against the fragments

Use this procedure when `package.json` and `src/packages/**/*.jsonc` have
drifted apart — for example after someone hand-edited `package.json`, or
after `npm install` changed dependency versions — and the fragments must be
restored as the complete source of truth.

Goal: every meaningful line in `package.json` has an equivalent entry in a
fitting JSONC fragment, so that `nanny generate-package` regenerates a
complete, working `package.json` without dropping entries, changing commands
unintentionally, or leaving package metadata out.

## Procedure

1. Inspect the current `package.json`.
2. Inspect the existing `src/packages/**/*.jsonc` fragments.
3. Run `nanny update-package --verbose` to identify:
   * dependencies present in `package.json` but missing from fragments;
   * scripts present in `package.json` but missing from fragments;
   * scripts whose commands differ between `package.json` and fragments;
   * missing, changed, or duplicate `wireit` entries.
4. For every reported difference, update the fitting JSONC fragment.
5. If no suitable fragment exists for a topic, create a new focused fragment
   under `src/packages/<category>/<topic>.jsonc`.
6. Group entries by purpose, not merely by package name:
   * framework/build packages belong with the relevant site/build fragment;
   * linting packages belong with linting fragments;
   * test packages belong with test fragments;
   * design tooling belongs with design fragments;
   * AI/MCP/tooling packages belong with tools fragments;
   * runtime UI packages may need a dedicated site fragment.
7. Preserve `dependencies`, `devDependencies`, `scripts`, `wireit`,
   `overrides`, `allowScripts`, and other package-level sections by placing
   their values in fragments where `nanny generate-package` can merge them
   back.
8. Run `nanny update-package --verbose` again and resolve every remaining
   reported issue.
9. Run `nanny generate-package`.
10. Run `nanny check`.
11. If `package-lock.json` root metadata is now inconsistent with the
    regenerated `package.json`, refresh it with:

    ```bash
    npm install --package-lock-only --ignore-scripts --no-audit --no-fund
    ```

12. Run `nanny generate-package` again to confirm the generator is
    idempotent.
13. Run `nanny check` again and confirm it reports no issues.
14. Run the repository validation required for package/config changes
    (`npm run ci`, or the checks listed in `AGENTS.md`).

## Constraints

* Do not edit generated `package.json` by hand except as part of running
  `nanny generate-package`.
* Do not remove existing package entries unless the task explicitly requires
  removal.
* Do not leave any root dependency, script, override, allow-script, or
  wireit entry represented only in `package.json`.
* Keep the change scoped to package-fragment source-of-truth repair.
* Preserve existing local changes and do not revert unrelated work.

## Report

Report:

* exactly which fragments were updated or created;
* which `nanny` commands were run;
* whether the regenerated `package.json` is clean (`nanny check` passes).
