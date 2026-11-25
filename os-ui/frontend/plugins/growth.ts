/**
 * The plugin tests' check that a run costs one pass over its input, not a
 * pass per element (md-kit.test.ts, the Assets view's logic.test.ts and
 * svg.test.ts, the Idea view's logic.test.ts and layout.test.ts). Tests only:
 * no site imports it, and the build copies none of it. Its own rule is tested
 * with a scripted clock in growth.test.ts.
 *
 * Each case times its code at n and at 4n: one pass grows about 4 times, a
 * pass per element about 16, whatever the machine's speed. After a warm-up of
 * both (so both are timed in optimised code), it reads n, then 4n, round after
 * round, and judges by the best at n and the best at 4n over all rounds so
 * far. A machine that slows down or speeds up partway through a case so
 * changes both sizes alike; until 2026-11-25 every n was read before any 4n,
 * which put such a change on one size only. A ratio alone is noise when the
 * times are a few milliseconds (a garbage collection or a busy runner: macOS
 * CI once saw 13.4 times on 14 ms), so a case fails only when both hold: the
 * ratio is GROWTH.ratio or more, and the best time at 4n is over
 * GROWTH.floorMs.
 *
 * The time at n is the ratio's denominator, and one slow reading there makes a
 * pass per element look like one pass, so no case passes before GROWTH.rounds
 * rounds: each best is the least of at least that many readings. A case that
 * fails after them reads on, pausing GROWTH.pauseMs before each extra round
 * (without returning to the event loop, so the callers stay synchronous) so
 * that a slow spell of the machine can pass, until it passes, or
 * GROWTH.maxRounds rounds are read, or the case has taken GROWTH.wallMs,
 * warm-up and pauses included. The wall cap leaves room for extra rounds past
 * the 11 s that the warm-up and five rounds take, on a runner 30 times slower
 * than an M1 Pro, for the heaviest case the sizing allows (50 ms at 4n here),
 * and is far under the runner's 10 minutes a file; the round cap, four times
 * the five, ends sooner a case just over the floor (under a second a round).
 * A reading is never cut short, so a case ends at most one pause and one round
 * past the wall cap, and never before its warm-up and one round: a pass per
 * element of 2 s at 4n here, 60 s on that runner, fails there in about 2
 * minutes (reading every n first, then 4n until a pass, took about 6.4). Here
 * the recorded mistakes of 1 to 5 s at 4n fail in 30 to 37 s. A failure prints
 * every reading in order, so a red shows whether the machine slowed partway
 * (some rounds fast at both sizes) or 4n was slow out of proportion in every
 * round.
 *
 * Each test picks its sizes so that its code stays far under the floor on any
 * runner, and the quadratic code it guards against, put back on a scratch copy,
 * is at least four times over it here (os-ui/PLUGINS.md, the Assets view and the
 * Idea view, says what was measured).
 */
import assert from "node:assert/strict";

export const GROWTH = {
  /** One pass measures about 4, a pass per element about 16. */
  ratio: 10,
  /** Below this, the best time at 4n passes whatever the ratio. */
  floorMs: 500,
  /** No case passes before this many rounds. */
  rounds: 5,
  /** A case that fails after its first rounds reads on to at most this many, */
  maxRounds: 20,
  /** or until it has taken this long, warm-up and pauses included. */
  wallMs: 30_000,
  /** The wait before each extra round, so that a slow spell of the machine can pass. */
  pauseMs: 250,
} as const;

/** One reading of each size, in ms. */
export interface Reading {
  smallMs: number;
  bigMs: number;
}

export interface Growth {
  /** The best time at 4n over the best at n. */
  ratio: number;
  /** The best at n over all rounds. */
  smallMs: number;
  /** The best at 4n over all rounds. */
  bigMs: number;
  /** The warm-up's readings, not judged. */
  warmUp: Reading;
  /** Each round's readings, in the order read. */
  rounds: Reading[];
  /** The case's time: warm-up, rounds, and pauses. */
  ms: number;
}

/** Where growth reads the time and how it waits; growth.test.ts passes a scripted one. */
export interface Clock {
  now(): number;
  /** Waits without returning to the event loop, so growth stays synchronous. */
  pause(ms: number): void;
}

const asleep = new Int32Array(new SharedArrayBuffer(4));
const machine: Clock = {
  now: () => performance.now(),
  pause: (ms) => void Atomics.wait(asleep, 0, 0, ms),
};

/**
 * Times `run` on `make(n)` and `make(4 * n)`: each once to warm up, then in
 * turn, round after round, until the case passes after GROWTH.rounds rounds or
 * a cap ends it. `clock` is for growth.test.ts; the callers leave it out.
 */
export function growth(make: (n: number) => string, run: (input: string) => unknown, n: number, clock: Clock = machine): Growth {
  const small = make(n);
  const big = make(4 * n);
  const start = clock.now();
  const time = (input: string) => {
    const begin = clock.now();
    run(input);
    return clock.now() - begin;
  };
  const warmUp: Reading = { smallMs: time(small), bigMs: time(big) };
  const rounds: Reading[] = [];
  for (;;) {
    if (rounds.length >= GROWTH.rounds) clock.pause(GROWTH.pauseMs);
    const smallMs = time(small);
    rounds.push({ smallMs, bigMs: time(big) });
    const g = judge(warmUp, rounds, clock.now() - start);
    if (passes(g) || rounds.length >= GROWTH.maxRounds || g.ms >= GROWTH.wallMs) return g;
  }
}

function judge(warmUp: Reading, rounds: Reading[], ms: number): Growth {
  const smallMs = Math.min(...rounds.map((r) => r.smallMs));
  const bigMs = Math.min(...rounds.map((r) => r.bigMs));
  return { ratio: bigMs / Math.max(smallMs, 0.05), smallMs, bigMs, warmUp, rounds: [...rounds], ms };
}

const holds = (g: Growth) => g.ratio < GROWTH.ratio || g.bigMs <= GROWTH.floorMs;
const passes = (g: Growth) => g.rounds.length >= GROWTH.rounds && holds(g);

/**
 * Fails the case unless it passes, and prints its margins either way: the
 * ratio and the best time at 4n. A failure also says which cap ended the case
 * and gives every reading in order.
 */
export function assertOnePass(t: { diagnostic(message: string): void }, label: string, g: Growth): void {
  const line = `${label}: 4× the input, ${g.ratio.toFixed(1)}× the time, ${g.bigMs.toFixed(1)} ms at 4n`;
  t.diagnostic(line);
  if (passes(g)) return;
  const rule = holds(g)
    ? `a case passes only after ${GROWTH.rounds} rounds`
    : `a case fails at ${GROWTH.ratio}× or more with over ${GROWTH.floorMs} ms at 4n`;
  const cap = g.rounds.length >= GROWTH.maxRounds ? `the cap of ${GROWTH.maxRounds} rounds` : `the cap of ${GROWTH.wallMs / 1000} s on the case's time`;
  const ms = (r: Reading) => `${r.smallMs.toFixed(1)} ms, ${r.bigMs.toFixed(1)} ms`;
  const rounds = `${g.rounds.length} ${g.rounds.length === 1 ? "round" : "rounds"}`;
  assert.fail(
    [
      `${line} (${rule}); ended by ${cap}, ${rounds} in ${(g.ms / 1000).toFixed(1)} s. Every reading in order, at n and at 4n:`,
      `warm-up: ${ms(g.warmUp)}`,
      ...g.rounds.map((r, k) => `round ${k + 1}: ${ms(r)}`),
    ].join("\n"),
  );
}
