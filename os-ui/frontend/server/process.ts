import { spawn } from "node:child_process";
import { accessSync, constants, readFileSync, realpathSync, statSync } from "node:fs";
import { posix, resolve, win32 } from "node:path";
import type { RunResult, Runner } from "./types.ts";

export type Exists = (file: string) => boolean;

/** A regular file this process may execute (on Windows, any regular file). */
export const isExecutableFile: Exists = (file) => {
  try {
    if (!statSync(file).isFile()) return false;
    if (process.platform !== "win32") accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Where `name` runs from, looked up only in the absolute entries of `env`'s
 * PATH, or null. spawn() would also try the working folder: on Windows
 * libuv checks it before PATH, and on POSIX an empty or relative PATH entry
 * means it, so a program planted in a workspace could run in place of the
 * one meant. An absolute name is taken as it is; a name with a folder in it
 * is refused. On Windows only <name>.com and <name>.exe count, which spawn
 * runs without a shell; a .bat or .cmd never does. With `outside`, an entry
 * or a program whose real path lies inside that folder is skipped too (a
 * workspace's node_modules/.bin, which `npm run` puts first on PATH, or a
 * link elsewhere that points into it), and an absolute name there is
 * refused. The client's which() (client/src/main/python.ts) is the older copy
 * of these rules, which still accepts relative entries.
 */
export function findProgram(
  name: string,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
  exists: Exists = isExecutableFile,
  outside?: string,
): string | null {
  const windows = platform === "win32";
  const path = windows ? win32 : posix;
  const real = (p: string): string | null => {
    try {
      return realpathSync.native(p);
    } catch {
      return null;
    }
  };
  const root = outside === undefined ? null : (real(outside) ?? outside);
  const fold = (p: string) => (windows ? p.toLowerCase() : p);
  /** Whether `p` (resolved) lies in `outside`; a path that cannot be resolved counts as inside, so it is not used. */
  const within = (p: string): boolean => {
    if (root === null) return false;
    const r = real(p);
    return r === null || fold(r) === fold(root) || fold(r).startsWith(fold(root.endsWith(path.sep) ? root : root + path.sep));
  };
  if (path.isAbsolute(name)) return within(name) ? null : name;
  if (/[\\/]/.test(name)) return null;
  const key = Object.keys(env).find((k) => (windows ? k.toUpperCase() === "PATH" : k === "PATH"));
  const absolute = windows ? (dir: string) => /^(?:[A-Za-z]:[\\/]|\\\\[^\\])/.test(dir) : (dir: string) => dir.startsWith("/");
  const dirs = String((key && env[key]) ?? "")
    .split(windows ? ";" : ":")
    .map((dir) => (windows ? dir.replace(/^"(.*)"$/, "$1") : dir))
    .filter(absolute);
  const names = !windows ? [name] : /\.[^.]*$/.test(name) ? (/\.(?:com|exe)$/i.test(name) ? [name] : []) : [`${name}.com`, `${name}.exe`];
  for (const dir of dirs) {
    // A program in an entry inside `outside` lies inside itself, so checking the program covers the entry.
    for (const candidate of names) {
      const file = path.join(dir, candidate);
      if (exists(file) && !within(file)) return file;
    }
  }
  return null;
}

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
      const childEnv = options.env ? options.env(base) : base;
      let program = bin;
      if (options.lookup === "path") {
        const found = findProgram(bin, childEnv, process.platform, isExecutableFile, options.lookupOutside);
        if (found === null) {
          fail(Object.assign(new Error(`spawn ${bin} ENOENT (looked in the absolute PATH entries only)`), { code: "ENOENT" }));
          return;
        }
        program = found;
      }
      const child = spawn(program, args, { cwd: options.cwd, env: childEnv, windowsHide: true });
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
      child.stdout.on("data", (d: Buffer) => {
        if (truncated) return;
        const cap = options.maxOutputBytes;
        if (cap !== undefined && out.bytes + d.length > cap) {
          out.chunks.push(d.subarray(0, cap - out.bytes));
          out.bytes = cap;
          truncated = true;
          child.stdout.destroy();
          child.kill();
          return;
        }
        out.chunks.push(d);
        out.bytes += d.length;
      });
      child.stderr.on("data", (d: Buffer) => {
        const room = options.maxErrorBytes === undefined ? d.length : Math.max(0, options.maxErrorBytes - err.bytes);
        if (room === 0) return;
        err.chunks.push(room < d.length ? d.subarray(0, room) : d);
        err.bytes += Math.min(room, d.length);
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        fail(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        const stdout = Buffer.concat(out.chunks).toString("utf8");
        let stderr = Buffer.concat(err.chunks).toString("utf8");
        if (timedOut) stderr += `\n[timed out after ${Math.round(options.timeoutMs! / 1000)} s]`;
        done({ code: timedOut ? -1 : (code ?? -1), stdout, stderr, truncated, timedOut });
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
