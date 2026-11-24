# Update dependency versions

Use this procedure when the request is to bump dependency versions (a
routine dependency update, a security fix, or picking up a new major/minor)
rather than to add or remove a dependency.

`nanny` does not resolve or fetch versions itself — it only keeps fragments
and `package.json` in sync once versions have changed in `package.json` (or
the lockfile). The version-bump itself uses the repository's package
manager.

## Procedure

1. Determine scope: one dependency, a set, or "everything outdated."
2. Bump the version(s) using the detected package manager against root
   `package.json` — e.g. `npm install <pkg>@<version>` for a targeted bump,
   or the repository's own outdated/update tooling for a broad sweep. This
   changes `package.json` and the lockfile; it does **not** touch the
   fragments.
3. Run `nanny update-package --verbose`. Because a fragment's dependency
   version no longer matches the newly-bumped root version, this step:
   * rewrites the version string in every fragment that lists the
     dependency, and reports which files it changed;
   * reports any other drift (missing/changed scripts, duplicates) so it
     is not missed while attention is on dependencies.
4. Inspect the fragment diff: confirm only version strings changed, and
   that a dependency now correctly listed in more than one fragment (if any)
   was updated consistently everywhere `update-package` reports it.
5. Run `nanny generate-package`, then `nanny check`, to confirm
   `package.json` and the fragments agree (see
   `references/finalise-package-json.md`).
6. If the package manager already rewrote `package.json` directly (step 2),
   `generate-package` in step 5 will regenerate it from the fragments —
   confirm the regenerated file still matches the intended bumped versions,
   since `generate-package` overwrites whatever the package manager wrote.

## Return

* dependencies bumped, with old and new versions;
* fragment files updated by `nanny update-package`;
* confirmation that `nanny check` reports no drift afterward;
* whether the lockfile was regenerated.

## Worked example

Bumping `typescript` from `5.6.2` to `5.7.0`:

```bash
npm install typescript@5.7.0
nanny update-package --verbose
```

```text
Updated: src/packages/tools/typescript.jsonc

Scripts audit (root vs src/packages/*.jsonc)
- No missing script entries.
- No changed script entries.
- No duplicate script entries.
```

```bash
nanny generate-package
nanny check
```

`src/packages/tools/typescript.jsonc` now shows `"typescript": "5.7.0"`, and
`nanny check` reports no drift.
