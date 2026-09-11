# Plan

Tracking issue: [#36](https://github.com/davidsneighbour/nanny/issues/36)

Work happens on `feat/skill` with WIP-marked commits. Squash-merge to `main`
when done, with a commit message summarizing all features added on the
branch.

## Done

- Draft `SKILL.md` with operating principles, phased workflow
  (inspect → route → implement → finalise → report), and a routing table.
- Draft `references/add-dependency.md`.
- Draft `references/add-script.md`.
- Draft `references/finalise-package-json.md`.

## Next steps

- [ ] Write `references/remove-dependency.md` (referenced by the routing
      table in `SKILL.md` but not yet created).
- [ ] Write `references/update-package-metadata.md` (referenced by the
      routing table in `SKILL.md` but not yet created).
- [ ] Write `references/update-dependencies.md` covering the "update
      dependencies, then update the corresponding JSONC fragments" command.
- [ ] Write `references/onboard.md` covering initialisation: move an
      existing `package.json`'s config into the JSONC fragment files
      (`legacy/starter.jsonc`, `system/default.jsonc`, ...) and set up the
      create/update workflow going forward.
- [ ] Define how a `package.json` diff (post add/update-dependency) maps
      back onto the correct JSONC fragment file — i.e. the reverse of
      `generate-package`'s merge, per CLAUDE.md's fragment-file
      description.
- [ ] Decide how conflicts are handled when a key exists in more than one
      fragment file.
- [ ] Add worked examples / sample transcripts for each command to
      `references/` once behaviour is settled.
- [ ] Review against the real `nanny` CLI (`src/commands/`,
      `src/lib/package-paths.ts`) to make sure the skill's procedures match
      actual CLI behaviour rather than assumptions.
- [ ] Squash-merge to `main` with a commit message summarizing all
      features added on this branch.
