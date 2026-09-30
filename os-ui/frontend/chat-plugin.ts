import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const HARNESS = resolve(REPO_ROOT, "os-harness/harness.py");
const SESSIONS_DIR = process.env.OS_HARNESS_SESSIONS
  ? resolve(process.env.OS_HARNESS_SESSIONS)
  : resolve(REPO_ROOT, "os-harness/sessions");
const SESSION_ID = /^[A-Za-z0-9-]+$/;
const PROJECT_DIR = /^projects-folder\/([A-Za-z][A-Za-z0-9_-]*)\/?$/;
const AGENTS = new Set(["claude", "codex"]);
const MODES = new Set(["read-only", "workspace", "full"]);
const MAX_PROMPT = 20_000;

/**
 * Every /api/chat request must carry this token in `X-OS-UI-Token`. The dev
 * server is sometimes reached through a public tunnel, and this endpoint runs
 * an agent with full permissions at the repository root, so a bare URL must
 * not be enough to drive it. Set OS_UI_TOKEN to choose it; otherwise a random
 * one is printed when the server starts.
 */
const TOKEN = process.env.OS_UI_TOKEN || randomBytes(6).toString("hex");

/** The same gate for the agent windows' other endpoints (paper-sources-plugin.ts). */
export function hasToken(req: Connect.IncomingMessage): boolean {
  return req.headers["x-os-ui-token"] === TOKEN;
}

type Record_ = Record<string, unknown>;

/** Tuple, not string[]: the caller destructures the binary out of the front. */
function python(): [string, ...string[]] {
  const version = readFileSync(resolve(REPO_ROOT, ".python-version"), "utf8").trim();
  return ["uv", "run", "--no-project", "--python", version, "--", "python"];
}

function harness(args: string[], input?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const [bin, ...base] = python();
  return new Promise((done, fail) => {
    const child = spawn(bin, [...base, HARNESS, ...args], {
      cwd: REPO_ROOT,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      // See paper-status-plugin.ts (0xC0000142 once the terminal that started
      // the dev server is gone).
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf8")));
    child.on("error", fail);
    child.on("close", (code) => done({ stdout, stderr, code: code ?? -1 }));
    child.stdin.end(input ?? "", "utf8");
  });
}

async function readJson(req: Connect.IncomingMessage): Promise<Record_> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record_;
}

function pidAlive(pid: unknown): boolean {
  if (typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Same rule as os-harness core.Session.status, read straight from the trace. */
function statusOf(events: Record_[]): string {
  for (const r of [...events].reverse()) {
    if (r.type === "done") return r.ok ? "ok" : "failed";
    if (r.type === "prompt") return pidAlive(r.pid) ? "running" : "stopped";
  }
  return "new";
}

function readTrace(id: string): { meta: Record_; events: Record_[] } | null {
  const path = resolve(SESSIONS_DIR, `${id}.jsonl`);
  if (!existsSync(path)) return null;
  const records = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as Record_);
  return { meta: records[0] ?? {}, events: records.slice(1) };
}

function samePath(a: unknown, b: string): boolean {
  if (typeof a !== "string") return false;
  const norm = (p: string) => resolve(p).replace(/[\\/]+$/, "").toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Where a conversation runs: "" is the repository root (the root agent), and
 * `projects-folder/<Name>` is a registered project's directory (that
 * project's agent). Anything else is refused, so the UI can never start an
 * agent outside the OS.
 */
function resolveCwd(raw: unknown): string | null {
  const text = String(raw ?? "").trim().replace(/\\/g, "/");
  if (text === "") return REPO_ROOT;
  const name = PROJECT_DIR.exec(text)?.[1];
  if (name === undefined) return null;
  const dir = resolve(REPO_ROOT, "projects-folder", name);
  return existsSync(resolve(dir, "PROJECT_MEMORY.md")) ? dir : null;
}

/** Sessions whose working directory is `cwd`: one directory's conversations. */
function listSessions(cwd: string): Record_[] {
  if (!existsSync(SESSIONS_DIR)) return [];
  const rows: Record_[] = [];
  for (const name of readdirSync(SESSIONS_DIR).sort()) {
    if (!name.endsWith(".jsonl")) continue;
    const id = name.slice(0, -".jsonl".length);
    const trace = readTrace(id);
    if (trace === null || !samePath(trace.meta.cwd, cwd)) continue;
    const prompts = trace.events.filter((e) => e.type === "prompt");
    const last = trace.events[trace.events.length - 1];
    rows.push({
      id,
      agent: trace.meta.agent,
      mode: trace.meta.mode,
      turns: prompts.length,
      status: statusOf(trace.events),
      updated: (last?.time as string | undefined) ?? trace.meta.created ?? null,
      first_prompt: String(prompts[0]?.text ?? "").slice(0, 200),
    });
  }
  return rows;
}

/**
 * The agent conversations: the OS's own execution surface, authorized by the
 * Human Owner on 2026-09-26 (HANDOFF, Agent-harness decisions). Each message
 * becomes one os-harness turn, run by the user's own Claude Code or Codex
 * login, either at the repository root (the root agent, which follows
 * AGENTS.md and the project-dispatch skill) or inside one registered project
 * (that project's agent). This plugin only starts, resumes, stops, and reads
 * harness sessions; it never runs model or shell commands itself.
 *
 * Like the skill toggle, it lives on the dev server and dies with it.
 */
export function chatPlugin(): Plugin {
  return {
    name: "os-ui-agent-chat",
    apply: "serve",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        server.config.logger.info(`  ➜  Root Agent token: ${TOKEN}  (paste it into the Root Agent window)`);
      });

      server.middlewares.use("/api/chat", (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (!hasToken(req)) return send(401, { error: "token required" });

        const url = new URL(req.url ?? "/", "http://localhost");
        void (async () => {
          try {
            if (req.method === "GET" && url.pathname === "/sessions") {
              const cwd = resolveCwd(url.searchParams.get("cwd"));
              if (cwd === null) return send(400, { error: "cwd must be empty or a registered project directory" });
              return send(200, { cwd, sessions: listSessions(cwd) });
            }
            if (req.method === "GET" && url.pathname === "/session") {
              const id = url.searchParams.get("id") ?? "";
              if (!SESSION_ID.test(id)) return send(400, { error: "bad session id" });
              const trace = readTrace(id);
              if (trace === null) return send(404, { error: `no session ${id}` });
              return send(200, { id, ...trace, status: statusOf(trace.events) });
            }
            if (req.method === "POST" && url.pathname === "/send") {
              const body = await readJson(req);
              const text = String(body.text ?? "").trim();
              const agent = String(body.agent ?? "claude");
              const mode = String(body.mode ?? "full");
              const session = body.session ? String(body.session) : null;
              const cwd = resolveCwd(body.cwd);
              if (text === "" || text.length > MAX_PROMPT) return send(400, { error: "message is empty or too long" });
              if (!AGENTS.has(agent)) return send(400, { error: `unknown agent ${agent}` });
              if (!MODES.has(mode)) return send(400, { error: `unknown mode ${mode}` });
              if (cwd === null) return send(400, { error: "cwd must be empty or a registered project directory" });
              if (session !== null && !SESSION_ID.test(session)) return send(400, { error: "bad session id" });
              // One running agent per directory (the project-dispatch Write Lease):
              // a new conversation waits for, or stops, the one that is running.
              if (session === null && listSessions(cwd).some((row) => row.status === "running")) {
                return send(409, { error: "an agent is already running in this directory; wait for it to finish or stop it" });
              }
              const args = session
                ? ["resume", session, "-", "--detach", "--json"]
                : ["run", "--agent", agent, "--cwd", cwd, "--mode", mode, "--detach", "--json", "-"];
              const result = await harness(args, text);
              const dispatched = result.stdout
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.startsWith("{"))
                .map((line) => JSON.parse(line) as Record_)
                .find((line) => line.type === "dispatched");
              if (result.code !== 0 || dispatched === undefined) {
                return send(500, { error: (result.stderr || result.stdout || `harness exited ${result.code}`).trim().slice(-800) });
              }
              return send(200, { session: dispatched.session, turn: dispatched.turn });
            }
            if (req.method === "POST" && url.pathname === "/stop") {
              const body = await readJson(req);
              const session = String(body.session ?? "");
              if (!SESSION_ID.test(session)) return send(400, { error: "bad session id" });
              const result = await harness(["stop", session]);
              if (result.code !== 0) return send(500, { error: (result.stderr || result.stdout).trim().slice(-800) });
              return send(200, { ok: true });
            }
            return send(404, { error: "unknown chat endpoint" });
          } catch (error) {
            const err = error as { message?: string };
            send(500, { error: (err.message ?? String(error)).slice(-800) });
          }
        })();
      });
    },
  };
}
