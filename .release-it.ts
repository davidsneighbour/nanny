import { createReleaseConfig } from "@dnbhq/release-config";
import type { Config } from "release-it";

// "content" commits create a minor release, like "feat". The shared config
// applies these scopes to the changelog sections and to the release level.
const scopes = {
  minorTypes: ["feat", "content"],
  patchTypes: [
    "fix",
    "build",
    "chore",
    "ci",
    "docs",
    "perf",
    "refactor",
    "revert",
    "style",
    "test",
  ],
};

const config: Config = createReleaseConfig({
  scopes,
  overrides: {
    git: {
      requireUpstream: true,
    },
    npm: {
      skipChecks: true,
    },
  },
});

export default config;
