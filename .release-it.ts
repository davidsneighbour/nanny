import {
  createChangelogScopes,
  createReleaseConfig,
  getRepositoryUrl,
} from "@dnbhq/release-config";
import type { Config } from "release-it";

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

const repositoryUrl = getRepositoryUrl();

const config: Config = createReleaseConfig({
  scopes,
  overrides: {
    git: {
      requireUpstream: true,
    },
    npm: {
      skipChecks: true,
    },
    plugins: {
      "@release-it/conventional-changelog": {
        infile: "CHANGELOG.md",
        preset: {
          name: "conventionalcommits",
          commitUrlFormat: `${repositoryUrl}/commit/{{hash}}`,
          compareUrlFormat: `${repositoryUrl}/compare/{{previousTag}}...{{currentTag}}`,
          issueUrlFormat: `${repositoryUrl}/issues/{{id}}`,
          userUrlFormat: "https://github.com/{{user}}",
          types: createChangelogScopes(scopes),
          // The shared package only shapes changelog sections from scopes; it
          // does not expose a bump-level hook, so this project keeps its own
          // whatBump to make "content" commits trigger a minor release too.
          whatBump(commits: Array<{ type?: string; notes?: unknown[] }>) {
            let level: 2 | 1 | 0 | null = null;

            for (const commit of commits) {
              const notes = Array.isArray(commit.notes) ? commit.notes : [];
              const type = typeof commit.type === "string" ? commit.type : "";

              if (notes.length > 0) {
                return {
                  level: 0,
                  reason: "There are BREAKING CHANGES.",
                };
              }

              if (scopes.minorTypes.includes(type)) {
                level = 1;
                continue;
              }

              if (level === null && scopes.patchTypes.includes(type)) {
                level = 2;
              }
            }

            if (level === null) {
              return false;
            }

            return {
              level,
              reason:
                level === 1
                  ? "There are feat/content commits."
                  : "There are patch-level changes.",
            };
          },
        },
      },
    },
  },
});

export default config;
