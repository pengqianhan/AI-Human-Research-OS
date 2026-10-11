import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MAX_BYTES = 1_000_000;

/**
 * A plain append-only log in userData, for diagnosing a user's machine
 * (PATH resolution, Python choice, generator failures). Truncated past 1 MB.
 * Never logs prompts, keys, or file contents.
 */
export function createLog(file: string) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    if ((statSync(file, { throwIfNoEntry: false })?.size ?? 0) > MAX_BYTES) writeFileSync(file, "");
  } catch {
    // logging must never stop the app
  }
  return (message: string) => {
    const line = `${new Date().toISOString()} ${message}\n`;
    try {
      appendFileSync(file, line);
    } catch {
      // ignore
    }
    if (process.env.OS_CLIENT_LOG_STDERR) process.stderr.write(line);
  };
}
