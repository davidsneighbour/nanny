export type GlobalOptions = {
  cwd: string;
  verbose: boolean;
};

export function getFlagValue(argv: readonly string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = argv[idx + 1];
  if (!value || value.startsWith("-")) return undefined;
  return value;
}

export function hasFlag(argv: readonly string[], name: string): boolean {
  return argv.includes(name);
}

export function stripGlobalFlags(argv: readonly string[]): string[] {
  const out: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    // With `noUncheckedIndexedAccess`, indexing may yield `undefined`.
    if (typeof a !== "string") continue;

    if (a === "--cwd") {
      i += 1;
      continue;
    }
    if (a === "--verbose") continue;
    if (a === "--help" || a === "-h") continue;

    out.push(a);
  }

  return out;
}

