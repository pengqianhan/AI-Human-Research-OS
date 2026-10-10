/**
 * The chat handler against the real os-harness, driving its fake Claude CLI
 * (os-harness/tests/fake_claude.py) through a detached turn and a resume.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { chatApi } from "./chat.ts";
import { processRunner } from "./process.ts";
import { context, request } from "./testkit.ts";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function findPython(): string | null {
  for (const candidate of [process.env.PYTHON, "python3", "python"]) {
    if (!candidate) continue;
    const probe = spawnSync(candidate, ["-c", "import sys; print(sys.version_info >= (3, 9))"], { encoding: "utf8" });
    if (probe.status === 0 && probe.stdout.trim() === "True") return candidate;
  }
  return null;
}

const python = findPython();

async function until<T>(probe: () => Promise<T | null>, ms = 30_000): Promise<T> {
  const deadline = Date.now() + ms;
  for (;;) {
    const value = await probe();
    if (value !== null) return value;
    if (Date.now() > deadline) throw new Error("timed out");
    await new Promise((done) => setTimeout(done, 200));
  }
}

test("a root-agent turn and its resume run through os-harness", { skip: python === null && "no Python 3.9+ found" }, async () => {
  const sessionsDir = mkdtempSync(join(tmpdir(), "os-ui-sessions-"));
  const fake = resolve(REPO, "os-harness/tests/fake_claude.py");
  const run = processRunner({
    ...process.env,
    OS_HARNESS_SESSIONS: sessionsDir,
    OS_HARNESS_CLAUDE: JSON.stringify([python, fake]),
  });
  const api = chatApi(context(REPO, { python: () => [python!], run, sessionsDir }));

  const sent = await api(request("POST", "/send", { text: "hello desktop", agent: "claude", mode: "read-only", cwd: "" }));
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  const { session } = sent.body as { session: string; turn: number };

  type Trace = { status: string; events: { type: string; text?: string }[] };
  const finished = async (turns: number) =>
    until(async () => {
      const res = await api(request("GET", "/session", undefined, `id=${session}`));
      const body = res.body as Trace;
      const done = body.events.filter((e) => e.type === "done").length;
      return body.status !== "running" && done >= turns ? body : null;
    });

  const first = await finished(1);
  assert.equal(first.status, "ok");
  assert.ok(first.events.some((e) => e.type === "text" && e.text?.includes("echo: hello desktop")));

  const resumed = await api(request("POST", "/send", { text: "and again", session }));
  assert.equal(resumed.status, 200, JSON.stringify(resumed.body));
  assert.equal((resumed.body as { turn: number }).turn, 2);
  const second = await finished(2);
  assert.ok(second.events.some((e) => e.type === "text" && e.text?.includes("echo: and again")));

  const listed = await api(request("GET", "/sessions", undefined, "cwd="));
  const rows = (listed.body as { sessions: { id: string; turns: number; status: string }[] }).sessions;
  assert.deepEqual(rows.map((r) => [r.id, r.turns, r.status]), [[session, 2, "ok"]]);
});
