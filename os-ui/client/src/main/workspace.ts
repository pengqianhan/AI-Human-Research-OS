import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** What makes a folder a Research OS workspace the client can drive. */
export const MARKERS = ["AGENTS.md", "os-harness/harness.py", "os-ui/generator/generate.py"];

export function missingMarkers(dir: string): string[] {
  let isDir = false;
  try {
    isDir = statSync(dir).isDirectory();
  } catch {
    // missing
  }
  if (!isDir) return ["the folder itself"];
  return MARKERS.filter((marker) => !existsSync(join(dir, marker)));
}

export function describeProblem(dir: string, missing: string[]): string | null {
  if (missing.length === 0) return null;
  if (missing[0] === "the folder itself") return `${dir} does not exist or is not a folder.`;
  return `${dir} is not a Research OS folder: missing ${missing.join(", ")}.`;
}

/**
 * The folder's real path (symlinks, junctions, and macOS /var → /private/var
 * resolved). os-harness records each session's cwd this way, so the client
 * must name the workspace the same way to find its sessions and enforce the
 * one-agent-per-folder rule.
 */
export function canonical(dir: string): string {
  try {
    return realpathSync.native(dir);
  } catch {
    return resolve(dir);
  }
}

/** The nearest folder at or above `start` that is a workspace (a development run inside a checkout). */
export function findEnclosingWorkspace(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    if (missingMarkers(dir).length === 0) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** `--workspace <dir>` or `--workspace=<dir>`. */
export function workspaceArgument(argv: readonly string[]): string | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--workspace" && i + 1 < argv.length) return argv[i + 1]!;
    if (arg.startsWith("--workspace=")) return arg.slice("--workspace=".length);
  }
  return null;
}

export type WorkspaceSource = "argument" | "environment" | "settings" | "checkout";

export interface InitialWorkspace {
  dir: string | null;
  source: WorkspaceSource | null;
  /** Set when an explicitly requested or saved folder is not usable. */
  problem: string | null;
}

/**
 * First match wins: the command-line argument, OS_CLIENT_WORKSPACE, the saved
 * setting, then the checkout that contains the running client. An explicit
 * choice that is not a workspace is reported rather than silently replaced.
 */
export function initialWorkspace(options: {
  argv: readonly string[];
  env: NodeJS.ProcessEnv;
  saved: string | null;
  appPath: string;
  cwd: string;
}): InitialWorkspace {
  const candidates: [string | null | undefined, WorkspaceSource][] = [
    [workspaceArgument(options.argv), "argument"],
    [options.env.OS_CLIENT_WORKSPACE, "environment"],
    [options.saved, "settings"],
  ];
  for (const [raw, source] of candidates) {
    if (!raw) continue;
    const dir = canonical(resolve(options.cwd, raw));
    const problem = describeProblem(dir, missingMarkers(dir));
    if (problem === null) return { dir, source, problem: null };
    return { dir: null, source, problem };
  }
  const checkout = findEnclosingWorkspace(options.appPath);
  return { dir: checkout === null ? null : canonical(checkout), source: checkout === null ? null : "checkout", problem: null };
}
