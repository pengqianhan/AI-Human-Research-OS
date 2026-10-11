import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RunResult, Runner } from "./types.ts";

/**
 * A Runner that spawns real processes with `env`. Output is decoded as UTF-8
 * and `input` goes to stdin (how a prompt or a key value travels).
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
      const child = spawn(bin, args, {
        cwd: options.cwd,
        env: { ...env, PYTHONIOENCODING: "utf-8" },
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timer =
        options.timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              timedOut = true;
              child.kill();
            }, options.timeoutMs);
      child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf8")));
      child.on("error", (error) => {
        clearTimeout(timer);
        fail(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) stderr += `\n[timed out after ${Math.round(options.timeoutMs! / 1000)} s]`;
        done({ code: timedOut ? -1 : (code ?? -1), stdout, stderr });
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
