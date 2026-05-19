import path from "node:path";

import { loadConfig } from "c12";
import { parseJSONC } from "confbox";

import { NannyError } from "./errors.js";

export const NANNY_CONFIG_NAME = "nanny";
export const DEFAULT_PACKAGES_DIR = "src/packages";
export const PACKAGES_DIR_ENV_VAR = "NANNY_PACKAGES_DIR";

type JsonObject = Record<string, unknown>;

export type NannyConfig = {
  packagesDir: string;
};

export type LoadedNannyConfig = {
  config: NannyConfig;
  configFile: string | null;
  cwd: string;
};

export type LoadNannyConfigOptions = {
  cwd: string;
  packagesDirOverride?: string | undefined;
};

const DEFAULT_NANNY_CONFIG: NannyConfig = {
  packagesDir: DEFAULT_PACKAGES_DIR,
};

/**
 * Loads Nanny configuration from c12-supported config locations.
 *
 * Configuration may be provided through `nanny.config.*`, `.nannyrc.*`,
 * `.config/nanny.*`, or the `nanny` property in `package.json`.
 * CLI and environment overrides have higher precedence than config files.
 *
 * @param options - Loader options, including the working directory and optional package directory override.
 * @returns The loaded and validated Nanny configuration.
 * @throws NannyError when configuration loading or validation fails.
 */
export async function loadNannyConfig(options: LoadNannyConfigOptions): Promise<LoadedNannyConfig> {
  const cwd = path.resolve(options.cwd);
  const packagesDirOverride = getPackagesDirOverride(options.packagesDirOverride);
  const overrides = packagesDirOverride ? { packagesDir: packagesDirOverride } : undefined;

  try {
    const result = await loadConfig<unknown>({
      cwd,
      name: NANNY_CONFIG_NAME,
      packageJson: NANNY_CONFIG_NAME,
      defaults: DEFAULT_NANNY_CONFIG,
      ...(overrides ? { overrides } : {}),
    });

    return {
      config: parseNannyConfig(result.config),
      configFile: typeof result.configFile === "string" ? result.configFile : null,
      cwd,
    };
  } catch (error: unknown) {
    if (error instanceof NannyError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new NannyError(`Failed to load nanny configuration: ${message}`, 1);
  }
}

/**
 * Parses a JSONC document into a plain object using confbox.
 *
 * @param filePath - Source path used in error messages.
 * @param content - JSONC file contents.
 * @returns Parsed JSON object.
 * @throws NannyError when the content is invalid or the root value is not an object.
 */
export function parseJsoncObject(filePath: string, content: string): JsonObject {
  try {
    const parsed = parseJSONC(content) as unknown;

    if (!isPlainObject(parsed)) {
      throw new NannyError(`JSONC root must be an object: ${filePath}`, 1);
    }

    return parsed;
  } catch (error: unknown) {
    if (error instanceof NannyError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new NannyError(`Failed to parse JSONC file ${filePath}: ${message}`, 1);
  }
}

function getPackagesDirOverride(cliOverride: string | undefined): string | undefined {
  const cliValue = cliOverride?.trim();

  if (cliValue && cliValue.length > 0) {
    return cliValue;
  }

  const envValue = process.env[PACKAGES_DIR_ENV_VAR]?.trim();

  if (envValue && envValue.length > 0) {
    return envValue;
  }

  return undefined;
}

function parseNannyConfig(value: unknown): NannyConfig {
  if (!isPlainObject(value)) {
    throw new NannyError("Invalid nanny config: expected an object.", 1);
  }

  const packagesDir = value["packagesDir"];

  if (typeof packagesDir !== "string" || packagesDir.trim().length === 0) {
    throw new NannyError('Invalid nanny config value for "packagesDir": expected a non-empty string.', 1);
  }

  return {
    packagesDir: packagesDir.trim(),
  };
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
