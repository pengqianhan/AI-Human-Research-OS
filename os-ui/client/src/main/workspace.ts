import { existsSync, realpathSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

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

/**
 * The checkout a development run lives in: the client is `os-ui/client`, so
 * the repository root is two levels up. Only that fixed place is tried, never
 * any further ancestor, and a packaged app (appPath null) has no checkout.
 */
export function checkoutOf(appPath: string | null): string | null {
  if (appPath === null) return null;
  const root = resolve(appPath, "..", "..");
  return missingMarkers(root).length === 0 ? root : null;
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
 * setting, then (development runs only) the checkout the client sits in. An
 * explicit choice that is not a workspace is reported rather than silently
 * replaced.
 */
export function initialWorkspace(options: {
  argv: readonly string[];
  env: NodeJS.ProcessEnv;
  saved: string | null;
  /** The running client's folder in a development run; null when packaged. */
  appPath: string | null;
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
  const checkout = checkoutOf(options.appPath);
  return { dir: checkout === null ? null : canonical(checkout), source: checkout === null ? null : "checkout", problem: null };
}
