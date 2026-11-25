/**
 * The rule of growth.ts, tested with a scripted clock. Each case's machine
 * says how long each run takes, by its size and the (fake) time it starts,
 * and the clock moves only when the helper runs the case or pauses, so every
 * verdict, reading, and cost here is exact. Nothing here reads the real clock.
 * One pass grows 4 times from n to 4n, a pass per element 16 times.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assertOnePass, GROWTH, growth } from "./growth.ts";
import type { Clock } from "./growth.ts";

const N = 1000;
type Size = "n" | "4n";

/** The k-th run of a size (k = 0 is its warm-up), started at fake time t, takes cost(size, k, t) ms. */
function machine(cost: (size: Size, k: number, t: number) => number) {
  let now = 0;
  const runs: Size[] = [];
  const clock: Clock = {
    now: () => now,
    pause: (ms) => {
      now += ms;
    },
  };
  const make = (size: number): Size => {
    assert.ok(size === N || size === 4 * N, `make(${size})`);
    return size === N ? "n" : "4n";
  };
  const run = (input: string) => {
    const size = input as Size;
    const k = runs.filter((r) => r === size).length;
    runs.push(size);
    now += cost(size, k, now);
  };
  return { clock, make, run, runs, now: () => now };
}

/** The case as a test sees it: growth, then assertOnePass with a t that keeps its diagnostics. */
function judged(m: ReturnType<typeof machine>) {
  const g = growth(m.make, m.run, N, m.clock);
  const said: string[] = [];
  let failure: string | null = null;
  try {
    assertOnePass({ diagnostic: (line) => said.push(line) }, "scripted", g);
  } catch (error) {
    failure = (error as Error).message;
  }
  return { g, said, failure };
}

describe("growth reads n and 4n in turn and judges by the two bests (a scripted clock)", () => {
  test("the rule's numbers: 10 times and 500 ms; five rounds before a pass; at most 20 rounds or 30 s; 250 ms between extra rounds", () => {
    // Pinned by value: a test that used the names would pass whatever they were.
    assert.deepEqual({ ...GROWTH }, { ratio: 10, floorMs: 500, rounds: 5, maxRounds: 20, wallMs: 30_000, pauseMs: 250 });
  });

  test("a machine uniformly 30 times slower passes: one pass is over the floor there, and the ratio decides", () => {
    // One pass at 12.5 ms at n and 50 ms at 4n here (the heaviest the sizing rule allows), 30 times slower.
    const m = machine((size) => 30 * (size === "n" ? 12.5 : 50));
    const { g, said, failure } = judged(m);
    assert.equal(failure, null);
    assert.deepEqual(said, ["scripted: 4× the input, 4.0× the time, 1500.0 ms at 4n"]);
    assert.equal(g.rounds.length, 5);
    assert.equal(m.now(), 6 * 1875, "the warm-up and five rounds, 11.25 s, inside the 30 s cap");
  });

  test("a slowdown that starts after the first round and lasts to the end slows both sizes alike, so it passes", () => {
    // One pass, 40 then 160 ms; five times slower from 400 ms on, once the warm-up and round 1 are read. Timing every
    // n before any 4n, as the helper did before, put all of the slowdown on 4n: 800 ms over 40, 20 times.
    const m = machine((size, _k, t) => (size === "n" ? 40 : 160) * (t >= 400 ? 5 : 1));
    const { g, said, failure } = judged(m);
    assert.equal(failure, null);
    assert.deepEqual(said, ["scripted: 4× the input, 4.0× the time, 160.0 ms at 4n"], "the line is the two bests', not the last round's");
    assert.deepEqual(g.rounds.slice(0, 2), [
      { smallMs: 40, bigMs: 160 },
      { smallMs: 200, bigMs: 800 },
    ]);
    assert.equal(g.rounds.length, 5);
  });

  test("a slowdown that starts after n's first reading and lifts later passes: it reads on past five rounds", () => {
    // Five times slower from 240 ms, after round 1's n, to 7 s. Rounds 1 to 7 read 4n at 800 ms (20 times the best n);
    // round 8 starts at 7.79 s, after the pauses before rounds 6, 7, and 8, and reads 4n at 160.
    const m = machine((size, _k, t) => (size === "n" ? 40 : 160) * (t >= 240 && t < 7000 ? 5 : 1));
    const { g, said, failure } = judged(m);
    assert.equal(failure, null);
    assert.deepEqual(said, ["scripted: 4× the input, 4.0× the time, 160.0 ms at 4n"]);
    assert.equal(g.rounds.length, 8);
    assert.deepEqual(g.rounds[0], { smallMs: 40, bigMs: 800 });
    assert.deepEqual(g.rounds[7], { smallMs: 40, bigMs: 160 });
  });

  test("a true 16 times on every round fails, and ends at the cap of 20 rounds", () => {
    const m = machine((size) => (size === "n" ? 40 : 640));
    const { g, failure } = judged(m);
    assert.ok(failure !== null);
    assert.equal(g.ratio, 16);
    assert.equal(g.rounds.length, 20);
    assert.equal(m.now(), 6 * 680 + 15 * (250 + 680), "18.03 s: the warm-up, five rounds, and 15 more each after a pause");
    assert.match(failure, /ended by the cap of 20 rounds, 20 rounds in 18\.0 s/);
  });

  test("a true 16 times with one slow reading at n in the first round still fails: no pass before five rounds", () => {
    // Round 1 reads n at 160 ms (a collection, say): 640 over 160 is 4 times, a pass if one round could grant it.
    const m = machine((size, k) => (size === "n" ? (k === 1 ? 160 : 40) : 640));
    const { g, failure } = judged(m);
    assert.ok(failure !== null);
    assert.equal(g.smallMs, 40);
    assert.equal(g.ratio, 16);
    assert.deepEqual(g.rounds[0], { smallMs: 160, bigMs: 640 });
  });

  test("code that passes costs exactly five rounds: a warm-up, then five of n and 4n in turn", () => {
    const m = machine((size) => (size === "n" ? 4 : 18));
    const { g, said, failure } = judged(m);
    assert.equal(failure, null);
    assert.deepEqual(said, ["scripted: 4× the input, 4.5× the time, 18.0 ms at 4n"], "the line it printed before, in the same format");
    assert.deepEqual(m.runs, ["n", "4n", "n", "4n", "n", "4n", "n", "4n", "n", "4n", "n", "4n"]);
    assert.equal(g.rounds.length, 5);
  });

  test("the 30 s cap ends a hopeless case: a pass per element on a slow runner stops after the round that crosses it", () => {
    // 400 ms at n and 6,400 at 4n, 6.8 s a round: the warm-up and rounds 1 to 3 end at 27.2 s, round 4 at 34 s.
    const m = machine((size) => (size === "n" ? 400 : 6400));
    const { g, failure } = judged(m);
    assert.ok(failure !== null);
    assert.equal(g.rounds.length, 4);
    assert.equal(m.now(), 34_000);
    assert.match(failure, /ended by the cap of 30 s on the case's time, 4 rounds in 34\.0 s/);
  });

  test("a case the 30 s cap ends before five rounds fails, though its two bests would pass", () => {
    // One pass, but 2 s at n and 8 s at 4n: the warm-up and two rounds take 30 s.
    const m = machine((size) => (size === "n" ? 2000 : 8000));
    const { g, failure } = judged(m);
    assert.ok(failure !== null);
    assert.equal(g.ratio, 4);
    assert.equal(g.rounds.length, 2);
    assert.match(failure, /a case passes only after 5 rounds/);
  });

  test("a failure prints every reading in order: the warm-up, then each round's n and 4n", () => {
    // Every reading distinct, so their order shows: the k-th run takes k ms more than the warm-up at n, 2k at 4n.
    const m = machine((size, k) => (size === "n" ? 40 + k : 640 + 2 * k));
    const { failure } = judged(m);
    assert.ok(failure !== null);
    assert.deepEqual(failure.split("\n"), [
      "scripted: 4× the input, 15.7× the time, 642.0 ms at 4n (a case fails at 10× or more with over 500 ms at 4n);" +
        " ended by the cap of 20 rounds, 20 rounds in 18.7 s. Every reading in order, at n and at 4n:",
      "warm-up: 40.0 ms, 640.0 ms",
      ...Array.from({ length: 20 }, (_, r) => `round ${r + 1}: ${(41 + r).toFixed(1)} ms, ${(642 + 2 * r).toFixed(1)} ms`),
    ]);
  });
});
