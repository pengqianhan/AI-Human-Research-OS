/**
 * The plugin tests' check that a run costs one pass over its input, not a
 * pass per element (md-kit.test.ts, the Assets view's logic.test.ts and
 * svg.test.ts). Tests only: no site imports it, and the build copies none
 * of it.
 *
 * The cost at n and at 4n, the best of several timings each: one pass grows
 * about 4 times, a pass per element about 16, whatever the machine's speed.
 * A ratio alone is noise when the times are a few milliseconds (a garbage
 * collection or a busy runner: macOS CI once saw 13.4 times on 14 ms), so a
 * case fails only when both hold: the ratio is GROWTH.ratio or more, and the
 * best time at 4n is over GROWTH.floorMs. Each test picks its sizes so that
 * its code stays far under the floor on any runner, and the quadratic code it
 * guards against, put back on a scratch copy, is at least four times over it
 * here (os-ui/PLUGINS.md, the Assets view, says what was measured).
 */
import assert from "node:assert/strict";

export const GROWTH = {
  /** One pass measures about 4, a pass per element about 16. */
  ratio: 10,
  /** Below this, the best time at 4n passes whatever the ratio. */
  floorMs: 500,
} as const;

export interface Growth {
  /** The best time at 4n over the best at n. */
  ratio: number;
  smallMs: number;
  bigMs: number;
}

/**
 * Times `run` on `make(n)` and `make(4 * n)`: each once to warm up (so both
 * are timed in optimised code), then the best of `tries` at n, and at 4n until
 * the case passes or `tries` are spent.
 */
export function growth(make: (n: number) => string, run: (input: string) => unknown, n: number, tries = 5): Growth {
  const small = make(n);
  const big = make(4 * n);
  const time = (input: string) => {
    const start = performance.now();
    run(input);
    return performance.now() - start;
  };
  time(small);
  time(big);
  let smallMs = Infinity;
  for (let k = 0; k < tries; k++) smallMs = Math.min(smallMs, time(small));
  const ratioOf = (bigMs: number) => bigMs / Math.max(smallMs, 0.05);
  let bigMs = Infinity;
  for (let k = 0; k < tries && !passes({ ratio: ratioOf(bigMs), smallMs, bigMs }); k++) bigMs = Math.min(bigMs, time(big));
  return { ratio: ratioOf(bigMs), smallMs, bigMs };
}

const passes = (g: Growth) => g.ratio < GROWTH.ratio || g.bigMs <= GROWTH.floorMs;

/** Fails the case unless it passes, and prints its margins either way: the ratio and the best time at 4n. */
export function assertOnePass(t: { diagnostic(message: string): void }, label: string, g: Growth): void {
  const line = `${label}: 4× the input, ${g.ratio.toFixed(1)}× the time, ${g.bigMs.toFixed(1)} ms at 4n`;
  t.diagnostic(line);
  assert.ok(passes(g), `${line} (a case fails at ${GROWTH.ratio}× or more with over ${GROWTH.floorMs} ms at 4n)`);
}
