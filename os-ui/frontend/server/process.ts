import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RunResult, Runner } from "./types.ts";

/**
 * A Runner that spawns real processes with `env`, or with what `options.env`
 * makes of it. Output is collected as bytes and decoded as UTF-8 once, so a
 * character split across two chunks survives, and `input` goes to stdin (how
 * a prompt or a key value travels).
 *
 * windowsHide gives each child its own hidden console. Without it the child
 * inherits the server's console, and once the terminal that started a
 * long-running server is gone, uv and python die at startup with 0xC0000142
 * (STATUS_DLL_INIT_FAILED) and no stderr.
 */
export function processRunner(env: NodeJS.ProcessEnv = process.env): Runner {
  return (command, options) =>
    new Promise<RunResult>((done, fail) => {
      const [bin, ...args] = command;
      if (bin === undefined) {
        fail(new Error("empty command"));
        return;
      }
      const base = { ...env, PYTHONIOENCODING: "utf-8" };
      const child = spawn(bin, args, {
        cwd: options.cwd,
        env: options.env ? options.env(base) : base,
        windowsHide: true,
      });
      const out = { chunks: [] as Buffer[], bytes: 0 };
      const err = { chunks: [] as Buffer[], bytes: 0 };
      let timedOut = false;
      let truncated = false;
      const timer =
        options.timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              timedOut = true;
              child.kill();
            }, options.timeoutMs);
      const collect = (into: typeof out) => (d: Buffer) => {
        if (truncated) return;
        const cap = options.maxOutputBytes;
        if (cap !== undefined && into.bytes + d.length > cap) {
          into.chunks.push(d.subarray(0, cap - into.bytes));
          into.bytes = cap;
          truncated = true;
          child.stdout.destroy();
          child.stderr.destroy();
          child.kill();
          return;
        }
        into.chunks.push(d);
        into.bytes += d.length;
      };
      child.stdout.on("data", collect(out));
      child.stderr.on("data", collect(err));
      child.on("error", (error) => {
        clearTimeout(timer);
        fail(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        const stdout = Buffer.concat(out.chunks).toString("utf8");
        let stderr = Buffer.concat(err.chunks).toString("utf8");
        if (timedOut) stderr += `\n[timed out after ${Math.round(options.timeoutMs! / 1000)} s]`;
        done({ code: timedOut ? -1 : (code ?? -1), stdout, stderr, truncated });
      });
      child.stdin.on("error", () => {}); // a child that exits without reading stdin is not an error
      child.stdin.end(options.input ?? "", "utf8");
    });
}

/** The repository-pinned interpreter through uv, with no project sync (as verify.sh runs it). */
export function uvPython(repoRoot: string, uv = "uv"): [string, ...string[]] {
  const version = readFileSync(resolve(repoRoot, ".python-version"), "utf8").trim();
  return [uv, "run", "--no-project", "--python", version, "--", "python"];
}

/** A failed child's own words, else its exit code: the text an endpoint reports. */
export function failureText(result: RunResult, limit = 500): string {
  const output = (result.stderr || result.stdout).trim();
  const exit = ` (exit ${result.code})`;
  return (output ? `${output}${exit}` : `process failed${exit}`).slice(-limit);
}

export function errorText(error: unknown, limit = 800): string {
  const err = error as { message?: string };
  return (err?.message ?? String(error)).slice(-limit);
}
