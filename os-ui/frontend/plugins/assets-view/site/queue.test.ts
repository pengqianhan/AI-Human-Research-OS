/**
 * The image queue (os-ui/PLUGINS.md Part 3, §4.3) with a fake loader and a
 * fake clock: at most four loads at once, nearest first, one retry of a busy
 * load, a time-out, and no state left behind by Reload or a late answer.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ImageQueue, QUEUE } from "./queue.ts";
import type { JobState, Load, LoadOutcome } from "./queue.ts";

/** A fake clock: `later` registers, `tick(ms)` runs what is due. */
function clock() {
  let now = 0;
  let timers: { at: number; fn: () => void; live: boolean }[] = [];
  return {
    later: (fn: () => void, ms: number) => {
      const t = { at: now + ms, fn, live: true };
      timers.push(t);
      return () => {
        t.live = false;
      };
    },
    async tick(ms: number) {
      now += ms;
      const due = timers.filter((t) => t.live && t.at <= now);
      timers = timers.filter((t) => t.live && t.at > now);
      for (const t of due) t.fn();
      await settle();
    },
    pending: () => timers.filter((t) => t.live).length,
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

/** A fake loader: each start makes a load the test ends by hand. */
function loader() {
  const live = new Map<string, { end: (o: LoadOutcome) => void; cancelled: boolean }[]>();
  const started: string[] = [];
  const start = (key: string) => (): Load => {
    started.push(key);
    let end!: (o: LoadOutcome) => void;
    const done = new Promise<LoadOutcome>((resolve) => (end = resolve));
    const record = { end, cancelled: false };
    live.set(key, [...(live.get(key) ?? []), record]);
    return {
      done,
      cancel() {
        record.cancelled = true;
      },
    };
  };
  return {
    start,
    started,
    /** Ends `key`'s latest load. */
    async end(key: string, outcome: LoadOutcome) {
      const list = live.get(key)!;
      list[list.length - 1]!.end(outcome);
      await settle();
    },
    cancelled: (key: string) => (live.get(key) ?? []).map((r) => r.cancelled),
  };
}

function setup() {
  const time = clock();
  const load = loader();
  const states = new Map<string, JobState>();
  const changes: string[] = [];
  const q = new ImageQueue({
    later: time.later,
    onChange: (key, state) => {
      states.set(key, state);
      changes.push(`${key}:${state.state}`);
    },
  });
  const want = (key: string, order: number) => q.want(key, order, load.start(key));
  return { q, time, load, states, changes, want };
}

describe("the image queue", () => {
  test(`at most ${QUEUE.loads} loads at once; the next waiting one starts as one ends, lowest order first`, async () => {
    const { q, load, states, want } = setup();
    for (const k of [5, 1, 9, 3, 7, 2]) want(`k${k}`, k);
    assert.equal(q.inFlight, QUEUE.loads);
    // The first four asked for start at once (the queue does not wait to sort); the rest wait.
    assert.deepEqual(load.started, ["k5", "k1", "k9", "k3"]);
    assert.deepEqual([states.get("k7")?.state, states.get("k2")?.state], ["waiting", "waiting"]);
    await load.end("k9", { kind: "ok" });
    assert.deepEqual(load.started.slice(4), ["k2"], "the lowest order among those waiting");
    assert.equal(states.get("k9")?.state, "loaded");
    await load.end("k5", { kind: "ok" });
    assert.deepEqual(load.started.slice(5), ["k7"]);
    assert.equal(q.inFlight, QUEUE.loads);
    for (const k of ["k1", "k3", "k2", "k7"]) await load.end(k, { kind: "ok" });
    assert.equal(q.inFlight, 0);
  });

  test("asking again for a job that waits, loads, or is done changes nothing but a lower order", async () => {
    const { q, load, want } = setup();
    for (let k = 0; k < 6; k++) want(`k${k}`, 10 + k);
    want("k5", 1); // k5 came near the view: it goes first among those waiting
    want("k0", 99);
    await load.end("k0", { kind: "ok" });
    assert.deepEqual(load.started, ["k0", "k1", "k2", "k3", "k5"]);
    want("k0", 0);
    assert.equal(load.started.filter((k) => k === "k0").length, 1, "a loaded image is not loaded again");
    assert.equal(q.stateOf("k0")?.state, "loaded");
  });

  test("a load answered 503 is tried once more after a second, then waits for Try again", async () => {
    const { q, time, load, states, want } = setup();
    want("a", 0);
    await load.end("a", { kind: "error", status: 503 });
    assert.equal(states.get("a")?.state, "retrying");
    assert.equal(q.inFlight, 0, "its slot is free while it waits");
    await time.tick(QUEUE.retryMs - 1);
    assert.equal(load.started.length, 1);
    await time.tick(1);
    assert.equal(load.started.length, 2);
    await load.end("a", { kind: "error", status: 503 });
    assert.deepEqual(states.get("a"), { state: "failed", status: 503 });
    await time.tick(10 * QUEUE.retryMs);
    assert.equal(load.started.length, 2, "no third try by itself");
    q.retry("a");
    assert.equal(load.started.length, 3);
    await load.end("a", { kind: "ok" });
    assert.equal(states.get("a")?.state, "loaded");
  });

  test("a failed load whose file the channel serves (200) is tried once more too; a missing one (404) is not", async () => {
    const { time, load, states, want } = setup();
    want("bad", 0);
    want("gone", 1);
    await load.end("bad", { kind: "error", status: 200 });
    await load.end("gone", { kind: "error", status: 404 });
    assert.deepEqual(states.get("gone"), { state: "failed", status: 404 });
    await time.tick(QUEUE.retryMs);
    await load.end("bad", { kind: "error", status: 200 });
    assert.deepEqual(states.get("bad"), { state: "failed", status: 200 });
    assert.deepEqual(load.started, ["bad", "gone", "bad"]);
  });

  test("a load that does not end in time is cancelled, frees its slot, and shows Try again", async () => {
    const { q, time, load, states, want } = setup();
    for (let k = 0; k < 5; k++) want(`k${k}`, k);
    await time.tick(QUEUE.timeoutMs);
    assert.deepEqual(states.get("k0"), { state: "failed", status: "timeout" });
    assert.deepEqual(load.cancelled("k0"), [true]);
    // The four timed out together, and the fifth started in a freed slot.
    assert.equal(states.get("k4")?.state, "loading");
    assert.equal(q.inFlight, 1);
    // An answer after the time-out changes nothing.
    await load.end("k0", { kind: "ok" });
    assert.deepEqual(states.get("k0"), { state: "failed", status: "timeout" });
    assert.equal(q.inFlight, 1);
  });

  test("Reload (reset) while images load: every load cancelled, every slot free, late answers dropped, new ones start at once", async () => {
    const { q, time, load, states, changes, want } = setup();
    for (let k = 0; k < 6; k++) want(`k${k}`, k);
    await load.end("k0", { kind: "error", status: 503 }); // one waits to retry
    q.reset();
    assert.equal(q.inFlight, 0);
    assert.deepEqual(
      ["k1", "k2", "k3", "k4"].map((k) => load.cancelled(k)),
      [[true], [true], [true], [true]],
    );
    assert.equal(time.pending(), 0, "no retry or time-out is left to fire");
    const before = changes.length;
    // The old loads answer late: nothing changes, no slot is freed twice.
    for (const k of ["k1", "k2", "k3", "k4"]) await load.end(k, { kind: "ok" });
    await time.tick(QUEUE.retryMs + QUEUE.timeoutMs);
    assert.equal(changes.length, before);
    assert.equal(q.inFlight, 0);
    // After the reset the same keys are new jobs, and four start at once.
    for (let k = 0; k < 6; k++) want(`k${k}`, k);
    assert.equal(q.inFlight, QUEUE.loads);
    assert.equal(states.get("k5")?.state, "waiting");
    for (let k = 0; k < 4; k++) await load.end(`k${k}`, { kind: "ok" });
    for (let k = 4; k < 6; k++) await load.end(`k${k}`, { kind: "ok" });
    assert.deepEqual([...states.values()].map((s) => s.state), Array(6).fill("loaded"));
    assert.equal(q.inFlight, 0);
  });

  test("drop: the panel's image of an item the user left is cancelled and forgotten, its slot free, its late answer dropped", async () => {
    const { q, time, load, states, changes, want } = setup();
    for (let k = 0; k < 5; k++) want(`k${k}`, k);
    q.drop("k1"); // loading
    q.drop("k4"); // waiting
    q.drop("none"); // never asked for
    assert.deepEqual(load.cancelled("k1"), [true]);
    assert.equal(q.stateOf("k1"), null);
    assert.equal(q.stateOf("k4"), null);
    assert.equal(q.inFlight, 3, "the dropped load's slot is free, and nothing waits to take it");
    const before = changes.length;
    await load.end("k1", { kind: "ok" });
    assert.equal(changes.length, before, "no change reported after the drop");
    assert.equal(states.get("k1")?.state, "loading");
    assert.equal(q.inFlight, 3);
    assert.equal(time.pending(), 3, "the dropped load's time-out is gone too");
    // Asked for again, it is a new job, which starts in the free slot.
    want("k1", 0);
    assert.equal(q.stateOf("k1")?.state, "loading");
    assert.equal(load.started.filter((k) => k === "k1").length, 2);
  });

  test("a load whose picture the page could not place (its card was replaced by a Reload) leaves no job: asking again loads it (review S4)", async () => {
    const { q, load, states, changes, want } = setup();
    want("p201", 0);
    const before = changes.length;
    await load.end("p201", { kind: "dropped" });
    assert.equal(q.stateOf("p201"), null, "not counted as loaded");
    assert.equal(q.inFlight, 0);
    assert.equal(changes.length, before, "no state is reported for it");
    // Show on the new card: a new load, which draws.
    want("p201", 0);
    assert.equal(load.started.filter((k) => k === "p201").length, 2);
    await load.end("p201", { kind: "ok" });
    assert.equal(states.get("p201")?.state, "loaded");
  });

  test("a picture the check refused (an SVG that would freeze the view) frees its slot, is not retried, and says why (review M2)", async () => {
    const { q, time, load, states, want } = setup();
    want("bomb", 0);
    want("plain", 1);
    await load.end("bomb", { kind: "refused", words: "This SVG repeats its parts 6,802,462 times over; drawing it may freeze the view." });
    assert.deepEqual(states.get("bomb"), { state: "refused", words: "This SVG repeats its parts 6,802,462 times over; drawing it may freeze the view." });
    assert.equal(q.inFlight, 1);
    await time.tick(QUEUE.retryMs * 5);
    assert.equal(load.started.filter((k) => k === "bomb").length, 1, "not tried again by itself");
    // Show: the page forgets the job and asks again without the check; a new load starts.
    q.drop("bomb");
    want("bomb", 0);
    assert.equal(load.started.filter((k) => k === "bomb").length, 2);
  });

  test("a load that throws as it starts, or whose promise rejects, fails (status 0) and frees its slot", async () => {
    const { q, states } = setup();
    q.want("throws", 0, () => {
      throw new Error("no");
    });
    q.want("rejects", 1, () => ({ done: Promise.reject(new Error("no")), cancel() {} }));
    await settle();
    assert.deepEqual(states.get("throws"), { state: "failed", status: 0 });
    assert.deepEqual(states.get("rejects"), { state: "failed", status: 0 });
    assert.equal(q.inFlight, 0);
  });

  test("many images, some busy: every one is drawn in the end, and none is left busy", async () => {
    const { q, time, load, states, want } = setup();
    for (let k = 0; k < 60; k++) want(`p${k}`, k);
    // The channel answers 503 to every first try of an even image, as when other reads hold its slots.
    const tried = new Set<string>();
    for (let round = 0; round < 200 && [...states.values()].some((s) => s.state !== "loaded"); round++) {
      const loading = [...states].filter(([, s]) => s.state === "loading").map(([k]) => k);
      for (const k of loading) {
        const busy = Number(k.slice(1)) % 2 === 0 && !tried.has(k);
        tried.add(k);
        await load.end(k, busy ? { kind: "error", status: 503 } : { kind: "ok" });
        assert.ok(q.inFlight <= QUEUE.loads);
      }
      await time.tick(QUEUE.retryMs);
    }
    assert.deepEqual([...states.values()].filter((s) => s.state !== "loaded"), []);
    assert.equal(q.inFlight, 0);
  });
});
