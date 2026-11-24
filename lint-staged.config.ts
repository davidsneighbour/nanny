import { createLintStagedConfig } from "@dnbhq/lintstaged-config";
import type { Configuration } from "lint-staged";

const config: Configuration = createLintStagedConfig({
  secrets: {
    configPath:
      "./node_modules/@dnbhq/secretlint-config/config/secretlintrc.json",
  },
  markdown: {
    configPath: "./.markdownlint-cli2.mjs",
  },
});

export default config;
