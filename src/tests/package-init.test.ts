import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const cliPath = path.resolve(repoRoot, "dist/cli.js");
const rootPackagePath = path.resolve(repoRoot, "package.json");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nanny-package-init-"));
const packagesDir = "config/package-particles";

try {
  const originalPackage = readJson(rootPackagePath);
  const fixturePackagePath = path.join(tempRoot, "package.json");

  fs.writeFileSync(
    fixturePackagePath,
    `${JSON.stringify(originalPackage, null, 2)}\n`,
    "utf8",
  );

  execFileSync(
    process.execPath,
    [cliPath, "package-init", "--cwd", tempRoot, "--packages-dir", packagesDir],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  assert.equal(
    fs.existsSync(path.join(tempRoot, packagesDir, "legacy/starter.jsonc")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(tempRoot, packagesDir, "system/default.jsonc")),
    true,
  );

  const generatedPackageRaw = execFileSync(
    process.execPath,
    [
      cliPath,
      "generate-package",
      "--cwd",
      tempRoot,
      "--packages-dir",
      packagesDir,
      "--dry-run",
    ],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  const generatedPackage = JSON.parse(generatedPackageRaw) as unknown;

  assert.deepEqual(generatedPackage, originalPackage);
  console.log("Package init custom packages dir roundtrip test passed.");

  testDotenvPackagesDir(originalPackage);
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

/**
 * Checks that `NANNY_PACKAGES_DIR` in `.env` is used, and that a real
 * environment variable takes precedence over it.
 */
function testDotenvPackagesDir(originalPackage: unknown): void {
  const dotenvRoot = path.join(tempRoot, "dotenv");
  const dotenvDir = "config/from-dotenv";
  const envDir = "config/from-env";
  const { NANNY_PACKAGES_DIR: _ignored, ...baseEnv } = process.env;

  fs.mkdirSync(dotenvRoot, { recursive: true });
  fs.writeFileSync(
    path.join(dotenvRoot, "package.json"),
    `${JSON.stringify(originalPackage, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(dotenvRoot, ".env"),
    `NANNY_PACKAGES_DIR=${dotenvDir}\n`,
    "utf8",
  );

  const runPackageInit = (env: NodeJS.ProcessEnv): void => {
    execFileSync(
      process.execPath,
      [cliPath, "package-init", "--cwd", dotenvRoot, "--force"],
      { encoding: "utf8", env, stdio: "pipe" },
    );
  };

  runPackageInit(baseEnv);
  assert.equal(
    fs.existsSync(path.join(dotenvRoot, dotenvDir, "system/default.jsonc")),
    true,
    ".env NANNY_PACKAGES_DIR was not used",
  );

  runPackageInit({ ...baseEnv, NANNY_PACKAGES_DIR: envDir });
  assert.equal(
    fs.existsSync(path.join(dotenvRoot, envDir, "system/default.jsonc")),
    true,
    "environment NANNY_PACKAGES_DIR did not take precedence over .env",
  );

  console.log("Package init .env packages dir test passed.");
}

function readJson(filePath: string): unknown {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content) as unknown;
}
