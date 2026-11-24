# Remove a dependency

Use this procedure only after the main nanny workflow has identified a
dependency that must be removed.

## Inputs

The operation record must identify:

* dependency name;
* dependency section (`dependencies`, `devDependencies`,
  `peerDependencies`, `optionalDependencies`);
* reason for removal.

## Procedure

1. Search `src/packages/**/*.jsonc` for the dependency name. A dependency
   may appear in more than one fragment (see `update-package`'s duplicate
   detection); remove it from every fragment that lists it, not just the
   first one found.
2. Confirm nothing else in the fragments still needs the dependency (for
   example, a script that invokes its CLI). Removing an unused dependency
   without removing the script that calls it will surface as a build/test
   failure later, not as a `nanny check` warning.
3. Remove the dependency entry from each fragment.
4. Do not edit `package.json` directly — the removal only takes effect once
   `references/finalise-package-json.md` regenerates it.
5. Do not run finalisation here; return control to the main workflow so
   finalisation runs once for the whole operation.

## Return

Return to the main workflow:

* dependency name and section removed;
* fragment file(s) edited;
* whether the dependency is still referenced anywhere else in the
  repository (scripts, source, config) that the caller should be warned
  about;
* whether lockfile regeneration is required.

## Worked example

Removing `lodash` from `devDependencies`, previously listed in
`src/packages/tools/utilities.jsonc`:

```jsonc
// src/packages/tools/utilities.jsonc — before
{
  "devDependencies": {
    "lodash": "4.17.21",
    "rimraf": "6.0.1"
  }
}
```

```jsonc
// src/packages/tools/utilities.jsonc — after
{
  "devDependencies": {
    "rimraf": "6.0.1"
  }
}
```

Then run `nanny generate-package` and `nanny check` (see
`references/finalise-package-json.md`) to confirm `lodash` is gone from
`package.json` and nothing else still references it.
