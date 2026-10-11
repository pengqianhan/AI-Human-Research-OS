import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { errorText, failureText } from "./process.ts";
import { json } from "./types.ts";
import type { ApiContext, ApiHandler, ApiResponse } from "./types.ts";

const STATUSES = ["unread", "skimmed", "read"];
/** Only papers and sources carry a reading status. */
const NOTE_ID = /^(papers|sources)\/[A-Za-z0-9._-]+$/;

/**
 * The human's reading-status write (Human Owner, 2026-09-30): set one paper or
 * source note's `status` to unread, skimmed, or read from the Paper Wiki
 * viewer's Status row.
 *
 * It shells out to paper-wiki-manager's set_status.py, which rewrites only the
 * frontmatter `status:` line, then regenerates paper-wiki/viz.html and, on the
 * dev server, refreshes the iframe's cache copy so a reload shows the new
 * state. Writes are serialized so two quick clicks cannot interleave a
 * regeneration.
 *
 * GET answers `{writable: true}`; the viewer probes it and shows the buttons
 * only when a live server is behind the page.
 */
export function paperStatusApi(ctx: ApiContext): ApiHandler {
  const wiki = resolve(ctx.repoRoot, "paper-wiki");
  const scripts = resolve(ctx.repoRoot, "research-skills-hub/open-paper-skills/paper-wiki-manager/scripts");
  let queue: Promise<unknown> = Promise.resolve();

  async function write(req: Parameters<ApiHandler>[0]): Promise<ApiResponse> {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const id = String(body.id ?? "");
      const status = String(body.status ?? "");
      if (!NOTE_ID.test(id)) return json(400, { error: `bad note id: ${id}` });
      if (!STATUSES.includes(status)) return json(400, { error: `bad status: ${status}` });

      const python = ctx.python();
      const set = await ctx.run([...python, resolve(scripts, "set_status.py"), id, status, "--root", wiki], {
        cwd: ctx.repoRoot,
      });
      if (set.code !== 0) return json(500, { error: failureText(set) });

      // The note is written by now, so a regeneration failure is reported
      // next to a successful result rather than as a 500 that would wrongly
      // suggest nothing changed.
      let vizError: string | null = null;
      try {
        const viz = await ctx.run([...python, resolve(scripts, "generate_viz.py"), wiki], { cwd: ctx.repoRoot });
        if (viz.code !== 0) {
          vizError = failureText(viz);
        } else if (ctx.publicWikiDir !== null) {
          await mkdir(resolve(ctx.publicWikiDir, dirname(id)), { recursive: true });
          await copyFile(resolve(wiki, `${id}.md`), resolve(ctx.publicWikiDir, `${id}.md`));
          await copyFile(resolve(wiki, "viz.html"), resolve(ctx.publicWikiDir, "viz.html"));
        }
      } catch (error) {
        vizError = errorText(error, 500);
      }

      return json(200, { ok: true, ...JSON.parse(set.stdout), vizError });
    } catch (error) {
      return json(500, { error: errorText(error, 500) });
    }
  }

  return (req) => {
    if (req.method === "GET") return Promise.resolve(json(200, { writable: true, values: STATUSES }));
    if (req.method !== "POST") return Promise.resolve(json(405, { error: "GET or POST only" }));
    const job = queue.then(() => write(req));
    queue = job;
    return job;
  };
}
