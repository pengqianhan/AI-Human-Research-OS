/**
 * The opener with stand-ins for PDF.js and its worker, and a clock the test
 * turns: two opens at once, a worker that never starts, a document that never
 * opens, and a worker that never lets go. Nothing rejects unhandled, and every
 * worker ends.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { OPEN_BUDGET_MS, Opener, RELEASE_GRACE_MS } from "./opener.ts";
import type { Clock, Made } from "./opener.ts";

/** A clock whose time moves only when the test says. */
function manualClock() {
  let now = 0;
  let id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: Clock = {
    set: (fn, ms) => {
      timers.set(++id, { at: now + ms, fn });
      return id;
    },
    clear: (handle) => void timers.delete(handle as number),
  };
  const advance = async (ms: number) => {
    now += ms;
    for (const [key, timer] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
      if (timer.at <= now && timers.has(key)) {
        timers.delete(key);
        timer.fn();
      }
    }
    await settle();
  };
  return { clock, advance, pending: () => timers.size };
}

/** Lets every queued promise reaction run. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

/** A stand-in worker that records whether it was ended. */
const fakeWorker = (name: string) => ({ name, ended: false, terminate() {
  this.ended = true;
} });
type FakeWorker = ReturnType<typeof fakeWorker>;

/** A deferred promise. */
function later<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A stand-in for getDocument over a worker: its loading task, and what destroying it did. */
function fakeDocument(opens: Promise<string>, destroys: Promise<void> = Promise.resolve()) {
  const record = { taskDestroyed: false, pdfWorkerDestroyed: false };
  const made: Made<string> = {
    task: {
      promise: opens,
      destroy: () => {
        record.taskDestroyed = true;
        return destroys;
      },
    },
    pdfWorker: { destroy: () => void (record.pdfWorkerDestroyed = true) },
  };
  return { made, record };
}

describe("one document at a time, each in its own worker", () => {
  test("two opens at once: the first is stale and its worker ends; the second opens", async () => {
    const { clock } = manualClock();
    const workers: FakeWorker[] = [];
    const opener = new Opener<string>(async () => {
      const w = fakeWorker(`w${workers.length + 1}`);
      workers.push(w);
      return w;
    }, clock);
    const docs: ReturnType<typeof fakeDocument>[] = [];
    const make = (name: string) => () => {
      const d = fakeDocument(Promise.resolve(name));
      docs.push(d);
      return d.made;
    };
    const first = opener.open(make("first"));
    const second = opener.open(make("second"));
    assert.deepEqual(await first, { kind: "stale" });
    const opened = await second;
    assert.equal(opened.kind, "open");
    assert.equal(opened.kind === "open" && opened.doc, "second");
    await settle();
    assert.equal(workers.length, 2);
    assert.equal(workers[0]!.ended, true, "the first open's worker ends");
    assert.equal(workers[1]!.ended, false);
    assert.equal(docs.length, 1, "the stale open never made a document");
    assert.equal(opener.isCurrent(opened.kind === "open" ? opened.generation : -1), true);
  });

  test("opening again closes the document open now: its task is destroyed, then its worker ends", async () => {
    const { clock } = manualClock();
    const workers: FakeWorker[] = [];
    const opener = new Opener<string>(async () => {
      const w = fakeWorker("w");
      workers.push(w);
      return w;
    }, clock);
    const one = fakeDocument(Promise.resolve("one"));
    const two = fakeDocument(Promise.resolve("two"));
    assert.equal((await opener.open(() => one.made)).kind, "open");
    assert.equal((await opener.open(() => two.made)).kind, "open");
    await settle();
    assert.deepEqual(one.record, { taskDestroyed: true, pdfWorkerDestroyed: true });
    assert.equal(workers[0]!.ended, true);
    assert.equal(workers[1]!.ended, false);
  });
});

describe("nothing waits forever", () => {
  test("a worker that never starts: timeout after OPEN_BUDGET_MS, and it is ended if it starts later", async () => {
    const { clock, advance } = manualClock();
    const starting = later<FakeWorker>();
    const opener = new Opener<string>(() => starting.promise, clock);
    let outcome: unknown = null;
    void opener.open(() => fakeDocument(Promise.resolve("x")).made).then((o) => (outcome = o));
    await advance(OPEN_BUDGET_MS - 1);
    assert.equal(outcome, null);
    await advance(1);
    assert.deepEqual(outcome, { kind: "timeout", stage: "start" });
    const late = fakeWorker("late");
    starting.resolve(late);
    await settle();
    assert.equal(late.ended, true, "a worker that starts after the timeout is ended");
  });

  test("a document that never opens: timeout, its task destroyed and its worker ended, without waiting for the destroy", async () => {
    const { clock, advance } = manualClock();
    const worker = fakeWorker("w");
    const opener = new Opener<string>(async () => worker, clock);
    const stuck = fakeDocument(new Promise<string>(() => {}), new Promise<void>(() => {}));
    let outcome: unknown = null;
    void opener.open(() => stuck.made).then((o) => (outcome = o));
    await settle(); // the worker starts; the document is asked for
    await advance(OPEN_BUDGET_MS);
    assert.deepEqual(outcome, { kind: "timeout", stage: "open" });
    assert.equal(stuck.record.taskDestroyed, true);
    assert.equal(worker.ended, false, "the destroy is given its grace first");
    await advance(RELEASE_GRACE_MS);
    assert.equal(worker.ended, true, "a worker that does not let go is ended after the grace");
    assert.equal(stuck.record.pdfWorkerDestroyed, true);
  });

  test("closing a document whose worker hangs does not hold the next open", async () => {
    const { clock, advance } = manualClock();
    const workers: FakeWorker[] = [];
    const opener = new Opener<string>(async () => {
      const w = fakeWorker(`w${workers.length + 1}`);
      workers.push(w);
      return w;
    }, clock);
    const hung = fakeDocument(Promise.resolve("hung"), new Promise<void>(() => {}));
    assert.equal((await opener.open(() => hung.made)).kind, "open");
    const fresh = await opener.open(() => fakeDocument(Promise.resolve("fresh")).made);
    assert.equal(fresh.kind === "open" && fresh.doc, "fresh");
    assert.equal(workers[0]!.ended, false);
    await advance(RELEASE_GRACE_MS);
    assert.equal(workers[0]!.ended, true);
    assert.equal(workers[1]!.ended, false);
  });

  test("failures are outcomes, never rejections: a worker that fails to start, getDocument throwing, a document that does not parse", async () => {
    const { clock } = manualClock();
    const broken = new Opener<string>(() => Promise.reject(new Error("the worker failed to load")), clock);
    const outcome = await broken.open(() => fakeDocument(Promise.resolve("x")).made);
    assert.equal(outcome.kind === "failed" && outcome.stage, "start");
    const worker = fakeWorker("w");
    const opener = new Opener<string>(async () => worker, clock);
    const thrown = await opener.open(() => {
      throw new Error("PDFWorker.create - the worker is being destroyed.");
    });
    assert.equal(thrown.kind === "failed" && thrown.stage, "open");
    await settle();
    assert.equal(worker.ended, true);
    const invalid = Object.assign(new Error("Invalid PDF structure."), { name: "InvalidPDFException" });
    const bad = fakeDocument(Promise.reject(invalid));
    const failed = await opener.open(() => bad.made);
    assert.equal(failed.kind === "failed" && failed.error, invalid);
    assert.equal(bad.record.taskDestroyed, true);
  });

  test("close() with nothing open, or twice, does nothing", async () => {
    const opener = new Opener<string>(async () => fakeWorker("w"), manualClock().clock);
    opener.close();
    opener.close();
    assert.equal(opener.isCurrent(1), false);
  });
});
