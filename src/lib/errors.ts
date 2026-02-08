export class NannyError extends Error {
  public readonly exitCode: number;

  public constructor(message: string, exitCode: number = 1) {
    super(message);
    this.name = "NannyError";
    this.exitCode = exitCode;
  }
}

export function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
