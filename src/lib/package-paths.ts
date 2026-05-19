import path from "node:path";

import { DEFAULT_PACKAGES_DIR, loadNannyConfig, PACKAGES_DIR_ENV_VAR } from "./config.js";

export { DEFAULT_PACKAGES_DIR, PACKAGES_DIR_ENV_VAR };

export async function resolvePackagesDir(cwd: string, override: string | undefined): Promise<string> {
  const loadedConfig = await loadNannyConfig({ cwd, packagesDirOverride: override });
  return path.resolve(cwd, loadedConfig.config.packagesDir);
}

export function toPosixRelative(cwd: string, absolutePath: string): string {
  const relativePath = path.relative(cwd, absolutePath);
  if (relativePath.length === 0) {
    return ".";
  }
  return relativePath.split(path.sep).join("/");
}

export function createPackageGlob(cwd: string, packagesDir: string, pattern: string): string {
  return path.posix.join(toPosixRelative(cwd, packagesDir), pattern);
}

export function resolvePackageFragmentPath(packagesDir: string, relativePath: string): string {
  return path.resolve(packagesDir, relativePath);
}
