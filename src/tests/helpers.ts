import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root, resolved from the compiled `dist/tests/helpers.js`. */
export const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
export const cliPath = path.join(repoRoot, "dist/cli.js");

export type RunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

export type RunOptions = {
  /** Directory the process starts in. Defaults to a fresh, empty directory. */
  cwd?: string;
  /** Extra environment variables. `NANNY_PACKAGES_DIR` is removed unless set here. */
  env?: Record<string, string>;
};

/** Environment without `NANNY_PACKAGES_DIR`, so the caller's shell cannot leak into a test. */
export function cleanEnv(
  extra: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const { NANNY_PACKAGES_DIR: _ignored, ...rest } = process.env;
  return { ...rest, ...extra };
}

/** Runs the compiled CLI and returns its exit status and output. It never throws on a non-zero exit. */
export function runNanny(args: string[], options: RunOptions = {}): RunResult {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd ?? createProject(),
    encoding: "utf8",
    env: cleanEnv(options.env),
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nanny-readme-"));
process.on("exit", () => {
  fs.rmSync(tempRoot, { force: true, recursive: true });
});

/**
 * Creates a temporary project directory. Object values are written as
 * formatted JSON, string values are written as they are.
 */
export function createProject(files: Record<string, unknown> = {}): string {
  const dir = fs.mkdtempSync(path.join(tempRoot, "project-"));
  for (const [relativePath, content] of Object.entries(files)) {
    writeFile(dir, relativePath, content);
  }
  return dir;
}

export function writeFile(
  dir: string,
  relativePath: string,
  content: unknown,
): void {
  const filePath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const text =
    typeof content === "string"
      ? content
      : `${JSON.stringify(content, null, 2)}\n`;
  fs.writeFileSync(filePath, text, "utf8");
}

export function readText(dir: string, relativePath: string): string {
  return fs.readFileSync(path.join(dir, relativePath), "utf8");
}

export function readJson(dir: string, relativePath: string): unknown {
  return JSON.parse(readText(dir, relativePath)) as unknown;
}

export function exists(dir: string, relativePath: string): boolean {
  return fs.existsSync(path.join(dir, relativePath));
}

/** Returns a map of every file below `dir` (except `.git`) to a hash of its content. */
export function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(entry.parentPath, entry.name);
    const relativePath = path.relative(dir, filePath);
    if (relativePath.split(path.sep)[0] === ".git") continue;
    out.set(
      relativePath,
      createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"),
    );
  }
  return out;
}

/** Runs git in `dir` with an isolated identity and no commit signing. */
export function git(dir: string, args: string[]): void {
  const result = spawnSync(
    "git",
    [
      "-c",
      "user.name=nanny-test",
      "-c",
      "user.email=nanny-test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd: dir, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}

/** Initialises a git repository in `dir` and commits every file. */
export function commitAll(dir: string): void {
  git(dir, ["init", "--quiet"]);
  git(dir, ["add", "--all"]);
  git(dir, ["commit", "--quiet", "--no-verify", "--message", "fixture"]);
}

/** Returns the text from the line that contains `start` up to the line that contains `end` (or the end of the text). */
export function section(text: string, start: string, end?: string): string {
  const from = text.indexOf(start);
  if (from === -1) return "";
  const to = end === undefined ? -1 : text.indexOf(end, from + start.length);
  return to === -1 ? text.slice(from) : text.slice(from, to);
}

/** A small package.json used by most fixtures. */
export const fixturePackage = {
  name: "fixture",
  description: "Fixture package",
  version: "1.2.3",
  license: "MIT",
  type: "module",
  scripts: {
    build: "tsc",
    test: "node --test",
  },
  dependencies: {
    "dep-a": "1.0.0",
  },
  devDependencies: {
    "dev-b": "2.0.0",
  },
} as const;
