# Add or update a dependency

Use this procedure only after the main nanny workflow has identified a required
dependency change.

## Inputs

The operation record must identify:

* dependency name;
* target package;
* dependency section;
* requested or selected version;
* reason for the dependency.

## Procedure

1. Inspect whether the dependency already exists.
2. Determine whether it belongs in:
   * `dependencies`;
   * `devDependencies`;
   * `peerDependencies`;
   * `optionalDependencies`.
3. If the dependency already exists, determine whether the requested version is compatible with the existing version range. If not, update the version range to include the requested version.
4. Preserve the repository's existing version-range policy.
5. Use the detected package manager to perform the change where practical.
6. Do not run final package formatting or validation here.
7. Return the following information to the main workflow:
   * resulting dependency section;
   * resulting version range;
   * affected files;
   * whether lockfile regeneration is required.

## Worked example

Adding `zod` as a `devDependency`, grouped with other tooling in
`src/packages/tools/validation.jsonc`:

```jsonc
// src/packages/tools/validation.jsonc
{
  "devDependencies": {
    "zod": "4.1.0"
  }
}
```

If `src/packages/tools/validation.jsonc` does not yet exist, create it
rather than adding `zod` to an unrelated fragment (see "Mapping a change
onto the right fragment" in `SKILL.md`). Do not add `zod` to `package.json`
directly — it only takes effect once finalisation runs
`nanny generate-package`.
