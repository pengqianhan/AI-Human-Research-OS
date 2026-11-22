import { codeGitHandler } from "../../../frontend/server/codeGit.ts";
import { findProgram, isExecutableFile } from "../../../frontend/server/process.ts";
import type { HandlerFactory } from "../../../frontend/server/registry.ts";
import type { ApiHandler } from "../../../frontend/server/types.ts";
import { isXcodeStub } from "./python.ts";
import type { Probe } from "./python.ts";

/** How long a "git not found" answer is kept before the next request looks again (after installing Git). */
export const GIT_RETRY_MS = 5000;

/**
 * The git the Code view runs for the workspace `dir`, as the client finds
 * other programs: in the children's environment (`env`, the login shell's
 * PATH laid over the inherited one, client/DESIGN.md §5), by the handler's
 * own rules (absolute PATH entries only, nothing inside the workspace:
 * findProgram), and never the Command Line Tools stub at /usr/bin/git on a
 * Mac without them, which opens an install dialog when run (as choosePython
 * and the Settings check skip it). null when there is none.
 */
export async function findGit(options: {
  env: NodeJS.ProcessEnv;
  dir: string;
  probe: Probe;
  platform?: NodeJS.Platform;
  exists?: (file: string) => boolean;
}): Promise<string | null> {
  const platform = options.platform ?? process.platform;
  const git = findProgram("git", options.env, platform, options.exists ?? isExecutableFile, options.dir);
  if (git === null) return null;
  return (await isXcodeStub(git, platform, options.probe)) ? null : git;
}

/**
 * `find`, remembered: a git found is kept for the workspace; none found is
 * asked again once GIT_RETRY_MS has passed, so installing Git takes effect
 * without reopening the folder, and a page asking often does not probe each time.
 */
export function rememberGit(find: () => Promise<string | null>, now: () => number = Date.now): () => Promise<string | null> {
  let last: { git: string | null; at: number } | null = null;
  let pending: Promise<string | null> | null = null;
  return async () => {
    if (last !== null && (last.git !== null || now() - last.at < GIT_RETRY_MS)) return last.git;
    pending ??= find().then(
      (git) => {
        last = { git, at: now() };
        return git;
      },
      () => {
        last = { git: null, at: now() };
        return null;
      },
    );
    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}

/**
 * The plugin handlers the desktop client mounts for one workspace: `base`
 * (BUNDLED_HANDLERS), with code-view/git built on the git `git` resolves
 * and logging what Git printed on failures to `log`, the client's log file
 * (which no endpoint serves). One handler per git found, so its limits and
 * its version probe hold for that git. The client skips no handler, unlike
 * the dev server (DESKTOP_ONLY_HANDLERS).
 */
export function desktopHandlers(
  base: Readonly<Record<string, HandlerFactory>>,
  deps: { git: () => Promise<string | null>; log: (line: string) => void },
): Record<string, HandlerFactory> {
  if (!Object.prototype.hasOwnProperty.call(base, "code-view/git")) return { ...base };
  const codeGit: HandlerFactory = (ctx) => {
    const handlers = new Map<string | null, ApiHandler>();
    return async (req) => {
      const git = await deps.git();
      let handler = handlers.get(git);
      if (handler === undefined) {
        handler = codeGitHandler(ctx, git, deps.log);
        handlers.set(git, handler);
      }
      return handler(req);
    };
  };
  return { ...base, "code-view/git": codeGit };
}
