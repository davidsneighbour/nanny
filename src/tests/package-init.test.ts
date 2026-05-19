import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const cliPath = path.resolve(repoRoot, "dist/cli.js");
const rootPackagePath = path.resolve(repoRoot, "package.json");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nanny-package-init-"));

try {
  const originalPackage = readJson(rootPackagePath);
  const fixturePackagePath = path.join(tempRoot, "package.json");

  fs.writeFileSync(fixturePackagePath, `${JSON.stringify(originalPackage, null, 2)}\n`, "utf8");

  execFileSync(process.execPath, [cliPath, "package-init", "--cwd", tempRoot], {
    encoding: "utf8",
    stdio: "pipe",
  });

  assert.equal(fs.existsSync(path.join(tempRoot, "src/packages/legacy/starter.jsonc")), true);
  assert.equal(fs.existsSync(path.join(tempRoot, "src/packages/system/default.jsonc")), true);

  const generatedPackageRaw = execFileSync(process.execPath, [cliPath, "generate-package", "--cwd", tempRoot, "--dry-run"], {
    encoding: "utf8",
    stdio: "pipe",
  });

  const generatedPackage = JSON.parse(generatedPackageRaw) as unknown;

  assert.deepEqual(generatedPackage, originalPackage);
  console.log("Package init roundtrip test passed.");
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

function readJson(filePath: string): unknown {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content) as unknown;
}
