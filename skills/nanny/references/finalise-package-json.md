# Finalise package.json changes

Run this procedure once after all package changes are complete.

1. Run the repository's existing Fixpack command.
2. If no command exists but Fixpack is installed, use the established local
   invocation.
3. Do not install Fixpack merely to sort one file unless repository policy
   requires it.
4. Regenerate the lockfile when dependency state changed.
5. Run the relevant checks defined by the repository.
6. Inspect the final diff for:
   - accidental dependency movement;
   - unexpected version changes;
   - lost scripts;
   - formatting churn;
   - unrelated lockfile changes.
7. Return the commands and results to the main workflow.
