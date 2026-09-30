import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { Connect, Plugin } from "vite";
import { hasToken } from "./chat-plugin";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const SCRIPT = resolve(REPO_ROOT, "research-skills-hub/open-paper-skills/paper-search/scripts/paper_search.py");
const SOURCE_ID = /^[a-z]+$/;

/** Tuple, not string[]: the caller destructures the binary out of the front. */
function python(): [string, ...string[]] {
  // Match verify.sh: the repository-pinned interpreter, no project sync.
  const version = readFileSync(resolve(REPO_ROOT, ".python-version"), "utf8").trim();
  return ["uv", "run", "--no-project", "--python", version, "--", "python"];
}

async function readJson(req: Connect.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
}

/**
 * The paper-source switches (Human Owner, 2026-09-30): which literature
 * sources the paper-search skill may query, shown as the Papers button in the
 * agent windows, as OpenResearch shows them in its composer.
 *
 * GET lists the sources; POST `{source, enabled}` flips one. Both shell out to
 * paper-search's `sources` command, which owns the switch file
 * (memory/paper-sources.json) and its defaults, so the rule lives in one
 * place. It sits behind the agent-window token and, like every os-ui
 * endpoint, exists only while start.sh runs (DESIGN.md §2).
 */
export function paperSourcesPlugin(): Plugin {
  let queue: Promise<unknown> = Promise.resolve();

  return {
    name: "os-ui-paper-sources",
    apply: "serve", // never part of a production build
    configureServer(server) {
      server.middlewares.use("/api/paper-sources", (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (!hasToken(req)) return send(401, { error: "token required" });
        if (req.method !== "GET" && req.method !== "POST") return send(405, { error: "GET or POST only" });

        // Serialized so two quick clicks cannot interleave their rewrites.
        const job = queue.then(async () => {
          try {
            const args = ["sources", "--json"];
            if (req.method === "POST") {
              const body = await readJson(req);
              const source = String(body.source ?? "");
              if (!SOURCE_ID.test(source)) return send(400, { error: `bad source: ${source}` });
              if (typeof body.enabled !== "boolean") return send(400, { error: "enabled must be true or false" });
              args.push(body.enabled ? "--enable" : "--disable", source);
            }
            const [bin, ...base] = python();
            // windowsHide: see paper-status-plugin.ts (0xC0000142 without it).
            const { stdout } = await run(bin, [...base, SCRIPT, ...args], {
              cwd: REPO_ROOT,
              env: { ...process.env, PYTHONIOENCODING: "utf-8" },
              windowsHide: true,
            });
            send(200, JSON.parse(stdout));
          } catch (error) {
            // Exit 2 is the script refusing the call (unknown source, bad file);
            // its last stderr line says why without argparse's usage block.
            const err = error as { code?: unknown; stderr?: string; message?: string };
            const reason = (err.stderr ?? "").trim().split(/\r?\n/).pop() || err.message || String(error);
            send(err.code === 2 ? 400 : 500, { error: reason.slice(-500) });
          }
        });
        queue = job;
      });
    },
  };
}
