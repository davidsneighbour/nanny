import path from "node:path";

export const DEFAULT_PACKAGES_DIR = "src/packages";
export const PACKAGES_DIR_ENV_VAR = "NANNY_PACKAGES_DIR";

export function resolvePackagesDir(cwd: string, override: string | undefined): string {
  const envValue = process.env[PACKAGES_DIR_ENV_VAR]?.trim();
  const packageDir = override ?? (envValue && envValue.length > 0 ? envValue : DEFAULT_PACKAGES_DIR);

  return path.resolve(cwd, packageDir);
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
