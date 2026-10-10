import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { errorText } from "./process.ts";
import { json } from "./types.ts";
import type { ApiContext, ApiHandler, RunResult } from "./types.ts";

const SESSION_ID = /^[A-Za-z0-9-]+$/;
const PROJECT_DIR = /^projects-folder\/([A-Za-z][A-Za-z0-9_-]*)\/?$/;
const AGENTS = new Set(["claude", "codex"]);
const MODES = new Set(["read-only", "workspace", "full"]);
const MAX_PROMPT = 20_000;

type Record_ = Record<string, unknown>;

export function pidAlive(pid: unknown): boolean {
  if (typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Same rule as os-harness core.Session.status, read straight from the trace. */
export function statusOf(events: Record_[], alive: (pid: unknown) => boolean = pidAlive): string {
  for (const r of [...events].reverse()) {
    if (r.type === "done") return r.ok ? "ok" : "failed";
    if (r.type === "prompt") return alive(r.pid) ? "running" : "stopped";
  }
  return "new";
}

/**
 * One session trace. A line that does not parse — the record os-harness is
 * appending right now, or one a dead worker left half-written — is skipped,
 * so one trace can never break every conversation list.
 */
export function readTrace(sessionsDir: string, id: string): { meta: Record_; events: Record_[] } | null {
  const path = resolve(sessionsDir, `${id}.jsonl`);
  if (!existsSync(path)) return null;
  const records: Record_[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      records.push(JSON.parse(line) as Record_);
    } catch {
      // partial line
    }
  }
  return { meta: records[0] ?? {}, events: records.slice(1) };
}

/**
 * os-harness records a session's cwd with symlinks resolved, so compare real
 * paths: a workspace opened through a symlink, a junction, or macOS's /var
 * must still find its sessions, or the Write Lease below would fail open.
 */
function samePath(a: unknown, b: string): boolean {
  if (typeof a !== "string") return false;
  const norm = (p: string) => {
    let full = resolve(p);
    try {
      full = realpathSync.native(full);
    } catch {
      // a folder that no longer exists compares by its resolved name
    }
    return full.replace(/[\\/]+$/, "").toLowerCase();
  };
  return norm(a) === norm(b);
}

/**
 * Where a conversation runs: "" is the repository root (the root agent), and
 * `projects-folder/<Name>` is a registered project's directory (that
 * project's agent). Anything else is refused, so the UI can never start an
 * agent outside the OS.
 */
export function resolveCwd(repoRoot: string, raw: unknown): string | null {
  const text = String(raw ?? "").trim().replace(/\\/g, "/");
  if (text === "") return repoRoot;
  const name = PROJECT_DIR.exec(text)?.[1];
  if (name === undefined) return null;
  const dir = resolve(repoRoot, "projects-folder", name);
  return existsSync(resolve(dir, "PROJECT_MEMORY.md")) ? dir : null;
}

/** Sessions whose working directory is `cwd`: one directory's conversations. */
export function listSessions(sessionsDir: string, cwd: string): Record_[] {
  if (!existsSync(sessionsDir)) return [];
  const rows: Record_[] = [];
  for (const name of readdirSync(sessionsDir).sort()) {
    if (!name.endsWith(".jsonl")) continue;
    const id = name.slice(0, -".jsonl".length);
    const trace = readTrace(sessionsDir, id);
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
 * (that project's agent). This handler only starts, resumes, stops, and reads
 * harness sessions; it never runs model or shell commands itself.
 *
 * Routes: GET /sessions?cwd=, GET /session?id=, POST /send, POST /stop.
 */
export function chatApi(ctx: ApiContext): ApiHandler {
  const harnessScript = resolve(ctx.repoRoot, "os-harness/harness.py");
  const harness = (args: string[], input?: string): Promise<RunResult> =>
    ctx.run([...ctx.python(), harnessScript, ...args], { cwd: ctx.repoRoot, input });

  return async (req) => {
    try {
      if (req.method === "GET" && req.path === "/sessions") {
        const cwd = resolveCwd(ctx.repoRoot, req.query.get("cwd"));
        if (cwd === null) return json(400, { error: "cwd must be empty or a registered project directory" });
        return json(200, { cwd, sessions: listSessions(ctx.sessionsDir, cwd) });
      }
      if (req.method === "GET" && req.path === "/session") {
        const id = req.query.get("id") ?? "";
        if (!SESSION_ID.test(id)) return json(400, { error: "bad session id" });
        const trace = readTrace(ctx.sessionsDir, id);
        if (trace === null) return json(404, { error: `no session ${id}` });
        return json(200, { id, ...trace, status: statusOf(trace.events) });
      }
      if (req.method === "POST" && req.path === "/send") {
        const body = (await req.json()) as Record_;
        const text = String(body.text ?? "").trim();
        const agent = String(body.agent ?? "claude");
        const mode = String(body.mode ?? "full");
        const session = body.session ? String(body.session) : null;
        const cwd = resolveCwd(ctx.repoRoot, body.cwd);
        if (text === "" || text.length > MAX_PROMPT) return json(400, { error: "message is empty or too long" });
        if (!AGENTS.has(agent)) return json(400, { error: `unknown agent ${agent}` });
        if (!MODES.has(mode)) return json(400, { error: `unknown mode ${mode}` });
        if (cwd === null) return json(400, { error: "cwd must be empty or a registered project directory" });
        if (session !== null && !SESSION_ID.test(session)) return json(400, { error: "bad session id" });
        // One running agent per directory (the project-dispatch Write Lease):
        // a new conversation waits for, or stops, the one that is running.
        if (session === null && listSessions(ctx.sessionsDir, cwd).some((row) => row.status === "running")) {
          return json(409, { error: "an agent is already running in this directory; wait for it to finish or stop it" });
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
          return json(500, { error: (result.stderr || result.stdout || `harness exited ${result.code}`).trim().slice(-800) });
        }
        return json(200, { session: dispatched.session, turn: dispatched.turn });
      }
      if (req.method === "POST" && req.path === "/stop") {
        const body = (await req.json()) as Record_;
        const session = String(body.session ?? "");
        if (!SESSION_ID.test(session)) return json(400, { error: "bad session id" });
        const result = await harness(["stop", session]);
        if (result.code !== 0) return json(500, { error: (result.stderr || result.stdout).trim().slice(-800) });
        return json(200, { ok: true });
      }
      return json(404, { error: "unknown chat endpoint" });
    } catch (error) {
      return json(500, { error: errorText(error) });
    }
  };
}
