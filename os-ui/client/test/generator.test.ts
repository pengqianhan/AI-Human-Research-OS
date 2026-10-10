import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Generator } from "../src/main/generator.ts";
import type { SnapshotEvent } from "../../frontend/src/lib/desktop.ts";
import type { RunResult } from "../../frontend/server/types.ts";

function deferred() {
  let resolve!: (r: RunResult) => void;
  const promise = new Promise<RunResult>((done) => (resolve = done));
  return { promise, resolve };
}

describe("Generator", () => {
  test("a run reports running, then ok with its duration", async () => {
    const events: SnapshotEvent[] = [];
    let t = 1000;
    const gen = new Generator(async () => ((t += 250), { code: 0, stdout: "wrote", stderr: "" }), (e) => events.push(e), () => t);
    const result = await gen.request();
    assert.equal(result.state, "ok");
    assert.equal(result.durationMs, 250);
    assert.deepEqual(events.map((e) => e.state), ["running", "ok"]);
    assert.equal(gen.last, result);
  });

  test("a failed run carries the generator's own words", async () => {
    const gen = new Generator(async () => ({ code: 1, stdout: "", stderr: "Traceback ...\nKeyError: 'x'\n" }));
    const result = await gen.request();
    assert.equal(result.state, "error");
    assert.match(result.error!, /KeyError/);
  });

  test("a runner that throws (no Python) is an error event, not a crash", async () => {
    const gen = new Generator(() => {
      throw new Error("uv not found and no Python 3.11+ on PATH");
    });
    const result = await gen.request();
    assert.equal(result.state, "error");
    assert.match(result.error!, /no Python/);
  });

  test("requests during a run coalesce into exactly one more run", async () => {
    const runs: ReturnType<typeof deferred>[] = [];
    const gen = new Generator(() => {
      const d = deferred();
      runs.push(d);
      return d.promise;
    });
    const first = gen.request();
    const second = gen.request();
    const third = gen.request();
    assert.equal(second, third, "both wait for the same follow-up run");
    assert.equal(runs.length, 1);
    runs[0]!.resolve({ code: 0, stdout: "", stderr: "" });
    assert.equal((await first).state, "ok");
    await new Promise((done) => setImmediate(done));
    assert.equal(runs.length, 2, "the follow-up started after the first finished");
    runs[1]!.resolve({ code: 1, stdout: "", stderr: "second failed" });
    assert.equal((await second).error, "second failed");
    // Idle again: a new request starts a new run at once.
    const fourth = gen.request();
    assert.equal(runs.length, 3);
    runs[2]!.resolve({ code: 0, stdout: "", stderr: "" });
    assert.equal((await fourth).state, "ok");
  });
});
