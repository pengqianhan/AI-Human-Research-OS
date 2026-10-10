import assert from "node:assert/strict";
import { appendFileSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, test } from "node:test";
import { chatApi, resolveCwd, statusOf } from "./chat.ts";
import { context, fail, fakeRunner, ok, request, tempTree, writeTrace } from "./testkit.ts";

const DEAD_PID = 2 ** 22 + 12345; // above any default pid_max

function repo() {
  return tempTree({
    ".python-version": "3.13\n",
    "projects-folder/Alpha/PROJECT_MEMORY.md": "# Alpha\n",
    "projects-folder/Stray/index.md": "# no project memory\n",
  });
}

describe("resolveCwd", () => {
  const root = repo();
  test("empty is the repository root", () => assert.equal(resolveCwd(root, ""), root));
  test("a registered project, with either slash", () => {
    const alpha = resolve(root, "projects-folder", "Alpha");
    assert.equal(resolveCwd(root, "projects-folder/Alpha"), alpha);
    assert.equal(resolveCwd(root, "projects-folder/Alpha/"), alpha);
    assert.equal(resolveCwd(root, "projects-folder\\Alpha"), alpha);
  });
  test("anything else is refused", () => {
    for (const raw of ["projects-folder/Stray", "projects-folder/Missing", "projects-folder/Alpha/../..", "..", "/etc", "projects-folder/1x", "os-harness"]) {
      assert.equal(resolveCwd(root, raw), null, raw);
    }
  });
});

describe("statusOf", () => {
  const alive = (pid: unknown) => pid === 1;
  test("the last done or prompt decides", () => {
    assert.equal(statusOf([], alive), "new");
    assert.equal(statusOf([{ type: "prompt", pid: 1 }], alive), "running");
    assert.equal(statusOf([{ type: "prompt", pid: 2 }], alive), "stopped");
    assert.equal(statusOf([{ type: "prompt", pid: 1 }, { type: "text" }, { type: "done", ok: true }], alive), "ok");
    assert.equal(statusOf([{ type: "done", ok: true }, { type: "prompt", pid: 2 }, { type: "done", ok: false }], alive), "failed");
  });
});

describe("chat routes", () => {
  test("GET /sessions lists one directory's sessions", async () => {
    const root = repo();
    const ctx = context(root);
    const alpha = join(root, "projects-folder", "Alpha");
    writeTrace(ctx.sessionsDir, "s-root", { agent: "claude", cwd: root, mode: "full", created: "t0" }, [
      { type: "prompt", text: "hello root", pid: DEAD_PID, time: "t1" },
      { type: "done", ok: true, time: "t2" },
    ]);
    writeTrace(ctx.sessionsDir, "s-alpha", { agent: "codex", cwd: alpha, mode: "workspace", created: "t0" }, [
      { type: "prompt", text: "hello alpha", pid: DEAD_PID, time: "t3" },
    ]);
    const api = chatApi(ctx);

    const rootRows = await api(request("GET", "/sessions", undefined, "cwd="));
    assert.equal(rootRows.status, 200);
    assert.deepEqual((rootRows.body as { sessions: unknown[] }).sessions, [
      { id: "s-root", agent: "claude", mode: "full", turns: 1, status: "ok", updated: "t2", first_prompt: "hello root" },
    ]);

    const alphaRows = await api(request("GET", "/sessions", undefined, "cwd=projects-folder/Alpha"));
    const rows = (alphaRows.body as { sessions: { id: string; status: string }[] }).sessions;
    assert.deepEqual(rows.map((r) => [r.id, r.status]), [["s-alpha", "stopped"]]);

    assert.equal((await api(request("GET", "/sessions", undefined, "cwd=projects-folder/Nope"))).status, 400);
  });

  test("a half-written trace line breaks neither the list nor the Write Lease", async () => {
    const root = repo();
    const ctx = context(root);
    writeTrace(ctx.sessionsDir, "s-ok", { agent: "claude", cwd: root }, [{ type: "prompt", text: "a", pid: DEAD_PID }, { type: "done", ok: true }]);
    writeTrace(ctx.sessionsDir, "s-busy", { agent: "claude", cwd: root }, [{ type: "prompt", text: "b", pid: process.pid }]);
    appendFileSync(join(ctx.sessionsDir, "s-busy.jsonl"), '{"type": "text", "text": "half');
    const api = chatApi(ctx);
    const res = await api(request("GET", "/sessions", undefined, "cwd="));
    assert.equal(res.status, 200);
    const rows = (res.body as { sessions: { id: string; status: string }[] }).sessions;
    assert.deepEqual(rows.map((r) => [r.id, r.status]), [["s-busy", "running"], ["s-ok", "ok"]]);
    assert.equal((await api(request("POST", "/send", { text: "hi" }))).status, 409);
  });

  test("GET /sessions on a missing sessions directory is empty", async () => {
    const api = chatApi(context(repo()));
    const res = await api(request("GET", "/sessions"));
    assert.deepEqual((res.body as { sessions: unknown[] }).sessions, []);
  });

  test("GET /session replays one trace", async () => {
    const root = repo();
    const ctx = context(root);
    writeTrace(ctx.sessionsDir, "abc-1", { agent: "claude", cwd: root }, [{ type: "prompt", text: "x", pid: DEAD_PID }]);
    const api = chatApi(ctx);
    const res = await api(request("GET", "/session", undefined, "id=abc-1"));
    assert.equal(res.status, 200);
    const body = res.body as { id: string; meta: { agent: string }; events: unknown[]; status: string };
    assert.equal(body.meta.agent, "claude");
    assert.equal(body.events.length, 1);
    assert.equal(body.status, "stopped");
    assert.equal((await api(request("GET", "/session", undefined, "id=../etc"))).status, 400);
    assert.equal((await api(request("GET", "/session", undefined, "id=missing"))).status, 404);
  });

  test("POST /send validates before running anything", async () => {
    const root = repo();
    const { run, calls } = fakeRunner();
    const api = chatApi(context(root, { run }));
    const cases: [unknown, number][] = [
      [{ text: "" }, 400],
      [{ text: "x".repeat(20_001) }, 400],
      [{ text: "hi", agent: "gpt" }, 400],
      [{ text: "hi", mode: "yolo" }, 400],
      [{ text: "hi", cwd: "projects-folder/Stray" }, 400],
      [{ text: "hi", session: "../x" }, 400],
    ];
    for (const [body, status] of cases) {
      assert.equal((await api(request("POST", "/send", body))).status, status, JSON.stringify(body).slice(0, 60));
    }
    assert.equal(calls.length, 0);
  });

  test("POST /send starts a detached turn and returns its session", async () => {
    const root = repo();
    const { run, calls } = fakeRunner(() => ok('noise\n{"type": "dispatched", "session": "new-1", "turn": 1}\n'));
    const api = chatApi(context(root, { run, python: () => ["uv", "run", "python"] }));
    const res = await api(request("POST", "/send", { text: "  plan it  ", agent: "codex", mode: "read-only", cwd: "projects-folder/Alpha" }));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { session: "new-1", turn: 1 });
    assert.equal(calls.length, 1);
    const alpha = resolve(root, "projects-folder", "Alpha");
    assert.deepEqual(calls[0]!.command, [
      "uv", "run", "python", resolve(root, "os-harness/harness.py"),
      "run", "--agent", "codex", "--cwd", alpha, "--mode", "read-only", "--detach", "--json", "-",
    ]);
    assert.equal(calls[0]!.input, "plan it");
    assert.equal(calls[0]!.cwd, root);
  });

  test("POST /send resumes a session with its own settings", async () => {
    const { run, calls } = fakeRunner(() => ok('{"type":"dispatched","session":"s1","turn":3}'));
    const api = chatApi(context(repo(), { run }));
    const res = await api(request("POST", "/send", { text: "more", session: "s1", agent: "codex" }));
    assert.equal(res.status, 200);
    assert.deepEqual(calls[0]!.command.slice(2), ["resume", "s1", "-", "--detach", "--json"]);
  });

  test("POST /send refuses a second agent in a busy directory (Write Lease)", async () => {
    const root = repo();
    const { run, calls } = fakeRunner();
    const ctx = context(root, { run });
    writeTrace(ctx.sessionsDir, "busy", { agent: "claude", cwd: root }, [{ type: "prompt", text: "x", pid: process.pid }]);
    const api = chatApi(ctx);
    assert.equal((await api(request("POST", "/send", { text: "hi" }))).status, 409);
    // Another directory is free, and resuming is the harness's call to refuse.
    writeTrace(ctx.sessionsDir, "other", { agent: "claude", cwd: join(root, "projects-folder", "Alpha") }, []);
    const freeRun = fakeRunner(() => ok('{"type":"dispatched","session":"x","turn":1}'));
    const free = chatApi(context(root, { run: freeRun.run, sessionsDir: ctx.sessionsDir }));
    assert.equal((await free(request("POST", "/send", { text: "hi", cwd: "projects-folder/Alpha" }))).status, 200);
    assert.equal(calls.length, 0);
  });

  test("a workspace opened through a symlink still sees its sessions and the Write Lease", async () => {
    const root = repo();
    const link = join(tempTree(), "link");
    symlinkSync(root, link, process.platform === "win32" ? "junction" : "dir");
    // os-harness records the cwd with symlinks resolved.
    const sessionsDir = join(root, "os-harness/sessions");
    writeTrace(sessionsDir, "busy", { agent: "claude", cwd: root }, [{ type: "prompt", text: "x", pid: process.pid }]);
    const { run, calls } = fakeRunner();
    const api = chatApi(context(link, { run, sessionsDir }));
    const listed = await api(request("GET", "/sessions", undefined, "cwd="));
    assert.deepEqual((listed.body as { sessions: { id: string }[] }).sessions.map((s) => s.id), ["busy"]);
    assert.equal((await api(request("POST", "/send", { text: "hi" }))).status, 409);
    assert.equal(calls.length, 0);
  });

  test("POST /send reports a harness failure with its stderr tail", async () => {
    const { run } = fakeRunner(() => fail(2, "harness: claude was not found on PATH\n"));
    const api = chatApi(context(repo(), { run }));
    const res = await api(request("POST", "/send", { text: "hi" }));
    assert.equal(res.status, 500);
    assert.match((res.body as { error: string }).error, /not found on PATH/);
  });

  test("POST /send with exit 0 but no dispatched line is a failure", async () => {
    const { run } = fakeRunner(() => ok("nothing useful"));
    const res = await chatApi(context(repo(), { run }))(request("POST", "/send", { text: "hi" }));
    assert.equal(res.status, 500);
  });

  test("malformed JSON is a 500, not a crash", async () => {
    const res = await chatApi(context(repo()))(request("POST", "/send", "{nope"));
    assert.equal(res.status, 500);
  });

  test("a runner that cannot start (uv missing) is a 500", async () => {
    const run = async () => {
      throw Object.assign(new Error("spawn uv ENOENT"), { code: "ENOENT" });
    };
    const res = await chatApi(context(repo(), { run }))(request("POST", "/send", { text: "hi" }));
    assert.equal(res.status, 500);
    assert.match((res.body as { error: string }).error, /ENOENT/);
  });

  test("POST /stop", async () => {
    const { run, calls } = fakeRunner();
    const api = chatApi(context(repo(), { run }));
    assert.equal((await api(request("POST", "/stop", { session: "a b" }))).status, 400);
    assert.deepEqual((await api(request("POST", "/stop", { session: "s1" }))).body, { ok: true });
    assert.deepEqual(calls[0]!.command.slice(2), ["stop", "s1"]);
    const failing = chatApi(context(repo(), { run: fakeRunner(() => fail(1, "no such session")).run }));
    assert.equal((await failing(request("POST", "/stop", { session: "s1" }))).status, 500);
  });

  test("unknown routes are 404", async () => {
    const api = chatApi(context(repo()));
    for (const [method, path] of [["GET", "/"], ["POST", "/sessions"], ["GET", "/send"], ["DELETE", "/stop"]]) {
      assert.equal((await api(request(method!, path!))).status, 404, `${method} ${path}`);
    }
  });
});
