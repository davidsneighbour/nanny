---
name: nanny
description: >
  Maintains and extends the package.json. Use when adding, removing, or changing nanny functionality, dependencies, package scripts, package metadata, configuration, or release-related behaviour. Routes package.json changes through the appropriate internal procedures and finishes by formatting and validating the package.
---

# Manage the package.json

Maintain the package.json through a single coordinated workflow.

## Operating principles

- Treat the user's requested outcome as the primary operation.
- Inspect the current repository before deciding which actions are required.
- Do not modify `package.json` ad hoc.
- Route every `package.json` change through the matching procedure under
  `references/`.
- Multiple procedures may apply to one request.
- Run finalisation once, after all requested changes have been applied.
- Preserve unrelated existing configuration.
- Use the repository's detected package manager.
- Do not introduce a second package manager.

## Phase 1: inspect

Determine:

- repository root;
- nanny package location;
- relevant `package.json` files;
- package manager and lockfile;
- workspace structure;
- existing scripts and dependencies;
- repository formatting and validation commands;
- whether `fixpack` is already configured.

Construct an operation record containing:

- requested outcome;
- required actions;
- affected files;
- validation requirements;
- unresolved decisions.

## Phase 2: route

Use the following routing table.

| Required change | Procedure |
|---|---|
| Add or update a dependency | `references/add-dependency.md` |
| Remove a dependency | `references/remove-dependency.md` |
| Add or update a package script | `references/add-script.md` |
| Change package metadata | `references/update-package-metadata.md` |
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
2. Run the repository's configured `fixpack` command when available.
3. Run the appropriate package-manager install command if dependency or
   lockfile state changed.
4. Run repository formatting, linting, type checking, and tests appropriate
   to the affected package.
5. Inspect the resulting diff.

## Phase 5: report

Report:

- actions selected;
- files changed;
- dependencies or scripts added, changed, or removed;
- commands run;
- validation results;
- warnings or decisions still requiring attention.
