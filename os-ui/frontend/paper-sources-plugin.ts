import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin } from "vite";
import { hasToken } from "./chat-plugin";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const SCRIPT = resolve(REPO_ROOT, "research-skills-hub/open-paper-skills/paper-search/scripts/paper_search.py");
const SOURCE_ID = /^[a-z]+$/;
const KEY_NAME = /^[A-Z][A-Z_]*$/;
/** Same shape paper_search.py accepts; checked here too so a bad value never reaches a child. */
const KEY_VALUE = /^[A-Za-z0-9._~+/=:-]{8,256}$/;

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

/** Run paper_search.py; `input` goes to stdin, which is how a key value travels. */
function script(args: string[], input = ""): Promise<{ code: number; stdout: string; stderr: string }> {
  const [bin, ...base] = python();
  return new Promise((done, fail) => {
    const child = spawn(bin, [...base, SCRIPT, ...args], {
      cwd: REPO_ROOT,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true, // see paper-status-plugin.ts (0xC0000142 without it)
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf8")));
    child.on("error", fail);
    child.on("close", (code) => done({ code: code ?? -1, stdout, stderr }));
    child.stdin.end(input, "utf8");
  });
}

/**
 * The Papers button's two writes (Human Owner, 2026-09-30), both behind the
 * agent-window token and both run through paper-search, which owns the files
 * and their rules:
 *
 * - `GET /api/paper-sources`: the switches and which per-user keys are set.
 * - `POST /api/paper-sources` `{source, enabled}`: flip one source's switch in
 *   memory/paper-sources.json.
 * - `POST /api/paper-sources/read-order` `{order}`: set the sources `fetch`
 *   reads a paper's full text from, first tried first.
 * - `POST /api/paper-sources/key` `{name, value}`: store one key in the
 *   repository's gitignored .env, or clear it when `value` is empty. The value
 *   reaches the script on stdin and never comes back: responses carry only
 *   whether each key is set.
 *
 * Like every os-ui endpoint, it exists only while start.sh runs (DESIGN.md §2).
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
        const path = new URL(req.url ?? "/", "http://localhost").pathname;
        const route = `${req.method} ${path}`;
        if (!["GET /", "POST /", "POST /read-order", "POST /key"].includes(route)) return send(404, { error: `no route ${route}` });

        // Serialized so two quick clicks cannot interleave their rewrites.
        const job = queue.then(async () => {
          try {
            let args = ["sources", "--json"];
            let input = "";
            if (route === "POST /") {
              const body = await readJson(req);
              const source = String(body.source ?? "");
              if (!SOURCE_ID.test(source)) return send(400, { error: `bad source: ${source}` });
              if (typeof body.enabled !== "boolean") return send(400, { error: "enabled must be true or false" });
              args.push(body.enabled ? "--enable" : "--disable", source);
            } else if (route === "POST /read-order") {
              const body = await readJson(req);
              const order = body.order;
              if (!Array.isArray(order) || order.length === 0 || !order.every((s) => typeof s === "string" && SOURCE_ID.test(s))) {
                return send(400, { error: "order must be a list of source ids" });
              }
              // paper_search.py checks the ids against its readers.
              args.push("--read-order", order.join(","));
            } else if (route === "POST /key") {
              const body = await readJson(req);
              const name = String(body.name ?? "");
              const value = typeof body.value === "string" ? body.value.trim() : "";
              if (!KEY_NAME.test(name)) return send(400, { error: `bad key name: ${name}` });
              if (value !== "" && !KEY_VALUE.test(value)) {
                return send(400, { error: "a key is one token of 8 to 256 letters, digits, or ._~+/=:-" });
              }
              args = value === "" ? ["keys", "--clear", name, "--json"] : ["keys", "--set", name, "--json"];
              input = value;
            }
            const result = await script(args, input);
            if (result.code !== 0) {
              // Exit 2 is the script refusing the call; its last stderr line says
              // why without argparse's usage block. It never contains the value.
              const reason = result.stderr.trim().split(/\r?\n/).pop() || `exit ${result.code}`;
              return send(result.code === 2 ? 400 : 500, { error: reason.slice(-500) });
            }
            send(200, JSON.parse(result.stdout));
          } catch (error) {
            send(500, { error: String((error as Error).message ?? error).slice(-500) });
          }
        });
        queue = job;
      });
    },
  };
}
