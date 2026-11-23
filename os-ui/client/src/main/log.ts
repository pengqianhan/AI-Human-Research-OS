import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MAX_BYTES = 1_000_000;

/**
 * A plain append-only log in userData, for diagnosing a user's machine
 * (PATH resolution, Python choice, generator failures). Truncated past 1 MB.
 * Never logs prompts or keys. It does hold paths and names: the URL of a
 * refused download, and what Git printed when a Code view request failed
 * (which can quote a file name, a ref, or a config line). No endpoint serves
 * it; Help → Show Log File only reveals it.
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
