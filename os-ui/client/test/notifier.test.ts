import assert from "node:assert/strict";
import { appendFileSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { describeTurn, lastTurnEnd, TurnWatcher } from "../src/main/notifier.ts";
import type { TurnEnd } from "../src/main/notifier.ts";
import { tempTree } from "./helpers.ts";

const line = (r: unknown) => JSON.stringify(r) + "\n";
const header = (cwd: string, agent = "claude") => line({ id: "s1", agent, cwd, mode: "full" });

describe("lastTurnEnd", () => {
  test("the last done event, with its turn and first line", () => {
    const text =
      header("/w") +
      line({ type: "prompt", turn: 1, text: "a" }) +
      line({ type: "done", turn: 1, ok: true, result: "first" }) +
      line({ type: "prompt", turn: 2, text: "b" }) +
      line({ type: "done", turn: 2, ok: false, error: "\n\nrate limited\nmore detail" });
    assert.deepEqual(lastTurnEnd("s1", text), { session: "s1", turn: 2, ok: false, agent: "claude", cwd: "/w", summary: "rate limited" });
  });

  test("a turn still running, a header alone, or an empty file: nothing", () => {
    assert.equal(lastTurnEnd("s", header("/w") + line({ type: "prompt", turn: 1 })), null);
    assert.equal(lastTurnEnd("s", header("/w")), null);
    assert.equal(lastTurnEnd("s", ""), null);
  });

  test("a half-written last line is skipped", () => {
    const text = header("/w") + line({ type: "prompt", turn: 1 }) + line({ type: "done", turn: 1, ok: true, result: "r" }) + '{"type": "prompt", "tu';
    assert.equal(lastTurnEnd("s", text)?.turn, 1);
  });

  test("older traces without turn stamps count prompts", () => {
    const text = header("/w") + line({ type: "prompt" }) + line({ type: "done", ok: true }) + line({ type: "prompt" }) + line({ type: "done", ok: true });
    assert.equal(lastTurnEnd("s", text)?.turn, 2);
  });

  test("long summaries are clipped", () => {
    const text = header("/w") + line({ type: "prompt", turn: 1 }) + line({ type: "done", turn: 1, ok: true, result: "x".repeat(400) });
    assert.equal(lastTurnEnd("s", text)!.summary.length, 140);
  });
});

describe("describeTurn", () => {
  const end = (cwd: string, ok: boolean, agent = "codex", summary = "done it"): TurnEnd => ({ session: "s", turn: 1, ok, agent, cwd, summary });
  test("root agent versus a project, and the outcome", () => {
    assert.deepEqual(describeTurn(end("/w/", true), "/w"), { title: "Agent turn finished", body: "Root agent · Codex: done it" });
    assert.deepEqual(describeTurn(end("/w/projects-folder/nanochat_cpu", false, "claude", ""), "/w"), {
      title: "Agent turn failed",
      body: "nanochat_cpu · Claude Code: failed",
    });
  });
});

describe("TurnWatcher", () => {
  test("reports turns that end after prime(), once each", () => {
    const dir = tempTree();
    const file = join(dir, "s1.jsonl");
    writeFileSync(file, header(dir) + line({ type: "prompt", turn: 1 }) + line({ type: "done", turn: 1, ok: true, result: "old" }));
    const seen: TurnEnd[] = [];
    const watcher = new TurnWatcher(dir, (e) => seen.push(e));
    watcher.prime();
    watcher.poll();
    assert.equal(seen.length, 0, "a turn finished before the app started is not news");

    appendFileSync(file, line({ type: "prompt", turn: 2 }));
    bump(file, 1);
    watcher.poll();
    assert.equal(seen.length, 0, "still running");

    appendFileSync(file, line({ type: "done", turn: 2, ok: true, result: "new" }));
    bump(file, 2);
    watcher.poll();
    watcher.poll();
    assert.deepEqual(seen.map((e) => [e.turn, e.summary]), [[2, "new"]]);

    writeFileSync(join(dir, "s2.jsonl"), header(dir) + line({ type: "prompt", turn: 1 }) + line({ type: "done", turn: 1, ok: false, error: "boom" }));
    watcher.poll();
    assert.deepEqual(seen.map((e) => e.session), ["s1", "s2"], "a new session is news too");
  });

  test("a missing sessions folder is fine", () => {
    const watcher = new TurnWatcher(join(tempTree(), "absent"), () => assert.fail("no turns"));
    watcher.prime();
    watcher.poll();
  });
});

function bump(file: string, seconds: number) {
  const t = new Date(Date.now() + seconds * 1000);
  utimesSync(file, t, t);
}
