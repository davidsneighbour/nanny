# Finalise package.json changes

Run this procedure once after all package changes are complete.

Fragment edits are not visible in `package.json` until regenerated. Never
finish a `package.json` change by editing `package.json` directly — edit the
fragment, then regenerate.

1. Run `nanny update-package --verbose` and resolve anything it reports
   (missing/changed/duplicate scripts or `wireit`, unused dependencies).
2. Run `nanny generate-package` to write the regenerated `package.json`.
3. Run `nanny check` and confirm it reports no issues.
4. Regenerate the lockfile when dependency state changed, e.g.:

   ```bash
   npm install --package-lock-only --ignore-scripts --no-audit --no-fund
   ```

5. Run the repository's own validation (its single check entrypoint if one
   is documented — e.g. `npm run check` — otherwise the relevant lint/build/
   test scripts).
6. Inspect the final diff for:
   * accidental dependency movement;
   * unexpected version changes;
   * lost scripts;
   * key-order churn caused by fragment merge order (expected — see
     `SKILL.md`'s "Key order is not stable" note — but confirm no values
     actually changed);
   * unrelated lockfile changes.
7. Return the commands and results to the main workflow.
