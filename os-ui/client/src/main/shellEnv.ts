import { spawn } from "node:child_process";
import { join } from "node:path";

export const MARKER = "__RESEARCH_OS_ENV__";
const SHELL_TIMEOUT_MS = 5000;

/** Variables that describe the probe shell itself rather than the user's environment. */
const SHELL_ONLY = /^(PWD|OLDPWD|SHLVL|_|COLUMNS|LINES|TERM|TERM_.*|ELECTRON_RUN_AS_NODE|ELECTRON_NO_ATTACH_CONSOLE)$/;

/** The JSON environment the probe printed between two markers; rc-file noise around it is ignored. */
export function parseShellEnv(stdout: string): Record<string, string> | null {
  const start = stdout.indexOf(MARKER);
  const end = start === -1 ? -1 : stdout.indexOf(MARKER, start + MARKER.length);
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(stdout.slice(start + MARKER.length, end)) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && !SHELL_ONLY.test(key)) env[key] = value;
    }
    return env;
  } catch {
    return null;
  }
}

/**
 * The command the login shell runs: this executable as plain Node, printing
 * its environment as JSON between markers (the approach VS Code uses).
 * Quoting works in sh, bash, zsh, and fish; a path with a quote is refused.
 */
export function probeCommand(execPath: string): string | null {
  if (execPath.includes("'")) return null;
  return `'${execPath}' -p '"${MARKER}" + JSON.stringify(process.env) + "${MARKER}"'`;
}

/** Where uv, Claude Code, Codex, and Homebrew usually install, which a GUI launch may not have on PATH. */
export function extraDirs(platform: NodeJS.Platform, home: string, env: NodeJS.ProcessEnv): string[] {
  if (platform === "win32") {
    return [join(home, ".local", "bin"), env.APPDATA ? join(env.APPDATA, "npm") : null].filter((d): d is string => d !== null);
  }
  const dirs = [`${home}/.local/bin`, `${home}/.cargo/bin`, "/usr/local/bin"];
  if (platform === "darwin") dirs.push("/opt/homebrew/bin");
  return dirs;
}

/** Join PATH fragments, keeping the first occurrence of each directory. */
export function mergePath(parts: (string | null | undefined)[], platform: NodeJS.Platform): string {
  const delimiter = platform === "win32" ? ";" : ":";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    for (const dir of part.split(delimiter)) {
      const key = platform === "win32" ? dir.toLowerCase().replace(/\\+$/, "") : dir.replace(/\/+$/, "");
      if (dir === "" || seen.has(key)) continue;
      seen.add(key);
      out.push(dir);
    }
  }
  return out.join(delimiter);
}

/**
 * An AppImage's launcher points PATH, LD_LIBRARY_PATH, and friends into its
 * own mount. Children (uv, git, the agents, and turns that outlive the app)
 * must not inherit that, so those entries and the AppImage variables go.
 */
export function withoutAppImage(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const appDir = env.APPDIR;
  if (!env.APPIMAGE || !appDir) return env;
  const clean: NodeJS.ProcessEnv = { ...env };
  for (const key of ["APPDIR", "APPIMAGE", "ARGV0", "OWD"]) delete clean[key];
  for (const key of ["PATH", "LD_LIBRARY_PATH", "XDG_DATA_DIRS", "GSETTINGS_SCHEMA_DIR"]) {
    const value = clean[key];
    if (value === undefined) continue;
    const kept = value.split(":").filter((dir) => dir !== "" && !dir.startsWith(appDir));
    if (kept.length === 0) delete clean[key];
    else clean[key] = kept.join(":");
  }
  return clean;
}

export type ShellRunner = (shell: string, args: string[], env: NodeJS.ProcessEnv) => Promise<string>;

/** Runs the user's login shell once, with no stdin, and returns its stdout. */
export const runLoginShell: ShellRunner = (shell, args, env) =>
  new Promise((done, fail) => {
    // detached: its own process group, so a timeout kills whatever the rc files started too.
    const child = spawn(shell, args, { env, stdio: ["ignore", "pipe", "ignore"], detached: true });
    let stdout = "";
    const timer = setTimeout(() => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
      fail(new Error(`${shell} took longer than ${SHELL_TIMEOUT_MS / 1000} s`));
    }, SHELL_TIMEOUT_MS);
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
    child.on("error", (error) => {
      clearTimeout(timer);
      fail(error);
    });
    child.on("close", () => {
      clearTimeout(timer);
      done(stdout);
    });
  });

export interface ResolvedEnv {
  env: NodeJS.ProcessEnv;
  /** "login-shell" when the shell answered, else "inherited". */
  source: "login-shell" | "inherited";
  problem: string | null;
}

/**
 * The environment children get. An app opened from Finder, the Dock, or a
 * desktop launcher inherits a minimal environment: no PATH to uv, Claude Code,
 * or Codex, and none of the user's OS_HARNESS_*, CODEX_HOME, or proxy
 * variables. On macOS and Linux the login shell is asked once and its
 * environment is laid over the inherited one; on Windows GUI apps already get
 * the user's environment. The usual install directories are appended to PATH
 * either way.
 */
export async function resolveEnv(options: {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  home: string;
  execPath: string;
  runShell?: ShellRunner;
}): Promise<ResolvedEnv> {
  const { platform, env, home } = options;
  const inheritedPath = env.PATH ?? env.Path ?? "";
  const extras = extraDirs(platform, home, env).join(platform === "win32" ? ";" : ":");
  const finish = (base: NodeJS.ProcessEnv, path: string, source: ResolvedEnv["source"], problem: string | null): ResolvedEnv => {
    const merged: NodeJS.ProcessEnv = { ...base, PATH: path };
    if (platform === "win32" && merged.Path !== undefined) delete merged.Path; // one spelling of PATH
    return { env: withoutAppImage(merged), source, problem };
  };

  if (platform === "win32") return finish(env, mergePath([inheritedPath, extras], platform), "inherited", null);

  const shell = env.SHELL || (platform === "darwin" ? "/bin/zsh" : "/bin/bash");
  const command = probeCommand(options.execPath);
  if (command === null) return finish(env, mergePath([inheritedPath, extras], platform), "inherited", "executable path contains a quote");
  try {
    const stdout = await (options.runShell ?? runLoginShell)(shell, ["-ilc", command], {
      ...env,
      ELECTRON_RUN_AS_NODE: "1",
      DISABLE_AUTO_UPDATE: "true", // oh-my-zsh: no update prompt
    });
    const fromShell = parseShellEnv(stdout);
    if (fromShell === null) {
      return finish(env, mergePath([inheritedPath, extras], platform), "inherited", `${shell} printed no environment`);
    }
    return finish({ ...env, ...fromShell }, mergePath([fromShell.PATH, inheritedPath, extras], platform), "login-shell", null);
  } catch (error) {
    return finish(env, mergePath([inheritedPath, extras], platform), "inherited", String((error as Error).message ?? error));
  }
}
