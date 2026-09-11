# Change package metadata

Use this procedure for any `package.json` field that is not `dependencies`,
`devDependencies`, `scripts`, or `wireit` — for example `description`,
`author`, `license`, `engines`, `files`, `bin`, `publishConfig`, or a
tool-config block embedded in `package.json` (`cspell`, `simple-git-hooks`,
etc.).

## Two different mechanisms apply, depending on the key

`nanny generate-package` builds the new `package.json` in two steps:

1. It filters the **current** `package.json` down to a fixed
   "keys to preserve" list — by default: `name`, `description`, `version`,
   `author`, `bugs`, `engines`, `homepage`, `license`, `private`,
   `repository`, `publishConfig`, `type` (overridable per invocation with
   `--keys`/`--add-keys`, but the skill should not assume a non-default list
   unless the repository's own tooling — a script, CI config — passes one).
2. It deep-merges every fragment on top of that filtered object.

The consequence: a metadata key **not** in the preserve list and **not**
present in any fragment is silently dropped on the next
`generate-package` run — it does not error, it just disappears. Before
changing metadata, determine which bucket the key is in:

* **In the default preserve list** (`name`, `description`, `version`,
  `author`, `bugs`, `engines`, `homepage`, `license`, `private`,
  `repository`, `publishConfig`, `type`): editing it directly in root
  `package.json` survives regeneration, because `generate-package` copies it
  through automatically. It is still good practice to also keep it out of
  the fragments (a fragment value would silently overwrite it, since
  fragments merge on top).
* **Not in the preserve list** (`files`, `bin`, `main`, `exports`,
  `keywords`, `os`, `cpu`, or any embedded tool-config block such as
  `cspell` or `simple-git-hooks`): it must live in a fragment — conventionally
  `system/default.jsonc` — or it will be lost the next time
  `generate-package` runs. Never rely on it surviving because it "was
  already there."

## Procedure

1. Identify the metadata key and its target value.
2. Check whether the key is in the default preserve list above.
3. If preserved: edit it in the fragment that already defines package
   metadata (`system/default.jsonc` by convention) if it is already
   fragment-sourced; otherwise a direct edit to root `package.json` is safe,
   but prefer moving it into a fragment for consistency with the rest of the
   metadata.
4. If not preserved: edit it in `system/default.jsonc` (or a more specific
   fragment if the repository groups metadata by topic). Do not rely on a
   direct `package.json` edit — it will not survive the next
   `generate-package` run.
5. Do not run finalisation here; return control to the main workflow.

## Return

* metadata key and new value;
* fragment file edited, or confirmation the key is preserve-list-safe;
* whether the key was previously undocumented in any fragment (a sign it
  was at risk of being dropped on the next regeneration).

## Worked example

Adding a `keywords` field (not in the preserve list) to `system/default.jsonc`:

```jsonc
// src/packages/system/default.jsonc
{
  "keywords": ["cli", "package-json", "monorepo-tooling"]
}
```

Changing `license` (in the preserve list) directly in `package.json` is
safe, but for a repository that has already onboarded its metadata into
fragments, add it to `system/default.jsonc` instead so the fragments remain
the single source of truth:

```jsonc
// src/packages/system/default.jsonc
{
  "license": "MIT"
}
```
