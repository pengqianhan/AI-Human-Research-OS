import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { Connect, Plugin } from "vite";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const WIKI = resolve(REPO_ROOT, "paper-wiki");
const SCRIPTS = resolve(
  REPO_ROOT,
  "research-skills-hub/open-paper-skills/paper-wiki-manager/scripts",
);
/** The cache copy start.sh makes so the iframe can load the viewer. */
const PUBLIC_WIKI = resolve(HERE, "public/paper-wiki");

const STATUSES = ["unread", "skimmed", "read"];
/** Only papers and sources carry a reading status. */
const NOTE_ID = /^(papers|sources)\/[A-Za-z0-9._-]+$/;

/** Tuple, not string[]: the caller destructures the binary out of the front. */
function python(): [string, ...string[]] {
  // Match verify.sh: the repository-pinned interpreter, no project sync.
  const version = readFileSync(resolve(REPO_ROOT, ".python-version"), "utf8").trim();
  return ["uv", "run", "--no-project", "--python", version, "--", "python"];
}

async function readJson(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function failure(error: unknown): string {
  const err = error as { stderr?: string; stdout?: string; message?: string; code?: unknown };
  // A child can die without writing stderr; the exit code is then the clue.
  const output = (err.stderr || err.stdout || "").trim();
  const exit = err.code === undefined ? "" : ` (exit ${String(err.code)})`;
  return (output ? `${output}${exit}` : `${err.message || String(error)}${exit}`).trim().slice(-500);
}

/**
 * The human's reading-status write (Human Owner, 2026-09-30): set one paper or
 * source note's `status` to unread, skimmed, or read from the Paper Wiki
 * viewer's Status row.
 *
 * It shells out to paper-wiki-manager's set_status.py, which rewrites only the
 * frontmatter `status:` line, then regenerates paper-wiki/viz.html and
 * refreshes the iframe's cache copy so a reload shows the new state. Writes
 * are serialized so two quick clicks cannot interleave a regeneration.
 *
 * GET answers `{writable: true}`; the viewer probes it and shows the buttons
 * only when this dev server is behind the page. Like the skill toggle, it
 * exists only while start.sh runs (DESIGN.md §2).
 */
export function paperStatusPlugin(): Plugin {
  let queue: Promise<unknown> = Promise.resolve();

  return {
    name: "os-ui-paper-status",
    apply: "serve", // never part of a production build
    configureServer(server) {
      server.middlewares.use("/api/paper-wiki/status", (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };

        if (req.method === "GET") return send(200, { writable: true, values: STATUSES });
        if (req.method !== "POST") return send(405, { error: "GET or POST only" });

        const job = queue.then(async () => {
          try {
            const body = (await readJson(req)) as Record<string, unknown>;
            const id = String(body.id ?? "");
            const status = String(body.status ?? "");
            if (!NOTE_ID.test(id)) return send(400, { error: `bad note id: ${id}` });
            if (!STATUSES.includes(status)) return send(400, { error: `bad status: ${status}` });

            const [bin, ...base] = python();
            // windowsHide gives each child its own hidden console. Without it the
            // child inherits the dev server's console, and once the terminal
            // that started a long-running server is gone, uv and python die at
            // startup with 0xC0000142 (STATUS_DLL_INIT_FAILED) and no stderr.
            const opts = { cwd: REPO_ROOT, windowsHide: true };
            const { stdout } = await run(
              bin,
              [...base, resolve(SCRIPTS, "set_status.py"), id, status, "--root", WIKI],
              opts,
            );

            // The note is written by now, so a regeneration failure is reported
            // next to a successful result rather than as a 500 that would
            // wrongly suggest nothing changed.
            let vizError: string | null = null;
            try {
              await run(bin, [...base, resolve(SCRIPTS, "generate_viz.py"), WIKI], opts);
              await mkdir(resolve(PUBLIC_WIKI, dirname(id)), { recursive: true });
              await copyFile(resolve(WIKI, `${id}.md`), resolve(PUBLIC_WIKI, `${id}.md`));
              await copyFile(resolve(WIKI, "viz.html"), resolve(PUBLIC_WIKI, "viz.html"));
            } catch (error) {
              vizError = failure(error);
            }

            send(200, { ok: true, ...JSON.parse(stdout), vizError });
          } catch (error) {
            send(500, { error: failure(error) });
          }
        });
        queue = job;
      });
    },
  };
}
