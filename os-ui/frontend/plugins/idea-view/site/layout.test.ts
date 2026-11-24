/**
 * The Idea view's layout by a general rule (os-ui/PLUGINS.md Part 3, §5.3):
 * columns by kind, order by four sweeps, heights in one pass, lines between
 * sides, the legend's place, and the scale. On the mockup's graph of
 * nanochat_cpu (../../fixtures/idea_graph/), on generated 50- and 200-node
 * graphs, and on random graphs for the no-overlap rule. The design's "within
 * 50 ms in Node" is tested by growth (../../growth.ts), not a wall clock.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { assertOnePass, growth } from "../../growth.ts";
import { parse } from "../../md-kit.ts";
import { BOX, edgesOf, fitScale, LABEL, labelsFor, LANE, layout, LEGEND, overlaps } from "./layout.ts";
import type { Edge, Layout, Rect, Seg } from "./layout.ts";
import { buildGraph, JOINS, KINDS, LIMITS, skeletonFrom, WORDS } from "./logic.ts";
import type { Graph, Kind, Word } from "./logic.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const text = (rel: string) => readFileSync(join(FIXTURES, rel), "utf8").split(/\r?\n/).join("\n");
const SKEL = skeletonFrom({ ok: true, doc: parse(text("nanochat_cpu.paper_skeleton.md")) });

function graphOf(source: string): Graph {
  const b = buildGraph(parse(source), SKEL);
  assert.equal(b.kind, "graph");
  return (b as Extract<typeof b, { kind: "graph" }>).graph;
}
const layOut = (g: Graph, legendRows = 6) => layout(g.nodes.map((n) => n.kind), edgesOf(g), legendRows);

/** Whether two boxes share any point (touching edges do not count). */
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** No node box meets another, the legend, or a column head; each column's boxes are BOX.gy apart at least. */
function assertNoOverlap(l: Layout, what: string): void {
  for (let i = 0; i < l.boxes.length; i++) {
    for (let j = i + 1; j < l.boxes.length; j++) assert.ok(!overlap(l.boxes[i]!, l.boxes[j]!), `${what}: boxes ${i} and ${j} overlap`);
    assert.ok(!overlap(l.boxes[i]!, l.legend), `${what}: box ${i} and the legend overlap`);
    for (const c of l.columns) assert.ok(!overlap(l.boxes[i]!, c.head), `${what}: box ${i} and a column head overlap`);
    assert.ok(l.boxes[i]!.x >= 0 && l.boxes[i]!.y >= 0 && l.boxes[i]!.x + l.boxes[i]!.w <= l.width && l.boxes[i]!.y + l.boxes[i]!.h <= l.height, `${what}: box ${i} inside the map`);
  }
  for (const column of l.order) {
    for (let k = 1; k < column.length; k++) assert.ok(l.boxes[column[k]!]!.y >= l.boxes[column[k - 1]!]!.y + l.boxes[column[k - 1]!]!.h + BOX.gy, `${what}: column order and gap`);
  }
}

/** A seeded generator. */
function rng(seed: number): (n: number) => number {
  let s = seed;
  return (n) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s % n;
  };
}

/**
 * A generated idea file of `count` nodes, every row valid: a fifth questions,
 * a tenth hypotheses, then experiments, results, claims; experiments test a
 * question or hypothesis, results come from an experiment and support a claim,
 * some nodes motivate an experiment; at most `maxLinks` links in all.
 */
function generated(count: number, maxLinks: number, seed = 1): string {
  const rand = rng(seed);
  const kindAt = (k: number): Kind => (k < count * 0.2 ? "question" : k < count * 0.3 ? "hypothesis" : k < count * 0.55 ? "experiment" : k < count * 0.8 ? "result" : "claim");
  const ids = Array.from({ length: count }, (_, k) => `${kindAt(k)[0]!.toUpperCase()}${k + 1}`);
  const of = (kind: Kind) => ids.filter((_, k) => kindAt(k) === kind);
  const pick = (list: readonly string[]) => list[rand(list.length)]!;
  let links = 0;
  const rows = ids.map((id, k) => {
    const kind = kindAt(k);
    const out = new Set<string>();
    const add = (item: string) => {
      if (links < maxLinks && !out.has(item)) {
        out.add(item);
        links++;
      }
    };
    if (kind === "experiment") for (let j = 0; j < 3; j++) add(`tests ${pick([...of("question"), ...of("hypothesis")])}`);
    if (kind === "result") for (let j = 0; j < 2; j++) add(`supports ${pick([...of("claim"), ...of("hypothesis")])}`);
    if (kind !== "claim" && rand(3) === 0) add(`motivates ${pick(of("experiment").filter((e) => e !== id).concat(of("question").filter((q) => q !== id)))}`);
    const points = kind === "experiment" ? "commit: none; files: Code/results/a.json" : kind === "result" ? `from: ${pick(of("experiment"))}` : "";
    const status = { question: "open", hypothesis: "open", experiment: "done", result: "recorded", claim: "planned" }[kind];
    return `| ${id} | ${kind} | Statement of ${id} | ${status} | ${[...out].join("; ")} | ${points} |  |`;
  });
  return `# Idea graph\n\n| ID | Kind | Statement | Status | Links | Points to | Source |\n|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
}

describe("§5.3 1. columns by kind, in a fixed order; a kind with no node has no column", () => {
  test("the mockup's graph: questions, experiments, results, claims (no hypotheses), each with its count", () => {
    const l = layOut(graphOf(text("idea_graph/mockup.idea_graph.md")));
    assert.deepEqual(
      l.columns.map((c) => [c.kind, c.x, c.count]),
      [
        ["question", BOX.pad, 4],
        ["experiment", BOX.pad + BOX.w + BOX.gx, 5],
        ["result", BOX.pad + 2 * (BOX.w + BOX.gx), 6],
        ["claim", BOX.pad + 3 * (BOX.w + BOX.gx), 5],
      ],
    );
    assert.equal(l.width, 2 * BOX.pad + 4 * BOX.w + 3 * BOX.gx, "800 px, as the mockup's map");
    // Every box of a column sits at its x.
    l.order.forEach((column, c) => column.forEach((k) => assert.equal(l.boxes[k]!.x, l.columns[c]!.x)));
  });

  test("all five kinds in their order whatever the file's order; a single kind is one column", () => {
    const kinds: Kind[] = ["claim", "result", "question", "experiment", "hypothesis", "question"];
    assert.deepEqual(layout(kinds, [], 0).columns.map((c) => c.kind), [...KINDS]);
    assert.deepEqual(layout(["result", "result"], [], 0).columns.map((c) => c.kind), ["result"]);
    const none = layout([], [], 6);
    assert.deepEqual([none.columns, none.boxes, none.lines], [[], [], []]);
    assert.ok(none.width >= LEGEND.w && none.height >= none.legend.h, "an empty map still holds its legend");
  });
});

describe("§5.3 2. order within a column: file order, then four sweeps by the mean position of neighbours already swept", () => {
  test("a column is sorted by its neighbours' mean position in the columns swept, adjacent or not; a node with no such neighbour keeps its place", () => {
    // Q1 Q2 | H1 | E1 tests Q2, E2 (no neighbour), E3 tests Q1: E3 and E1 trade places around E2, which stays in the middle.
    const kinds: Kind[] = ["question", "question", "hypothesis", "experiment", "experiment", "experiment"];
    const edges: Edge[] = [
      { a: 3, b: 1, word: "tests" },
      { a: 5, b: 0, word: "tests" },
    ];
    const l = layout(kinds, edges, 0);
    assert.deepEqual(l.order, [[0, 1], [2], [5, 4, 3]]);
  });

  test("the sweeps run right to left too: a left column follows the column to its right", () => {
    // Q1 Q2 | E1 E2, where E1 tests Q2 and E2 tests Q1: the first sweep orders E by Q (E2 first); the
    // second, right to left, orders Q by E and keeps it, so the lines do not cross.
    const kinds: Kind[] = ["question", "question", "experiment", "experiment"];
    const l = layout(kinds, [
      { a: 2, b: 1, word: "tests" },
      { a: 3, b: 0, word: "tests" },
    ], 0);
    assert.deepEqual(l.order, [[0, 1], [3, 2]]);
    const y = (k: number) => l.boxes[k]!.y;
    assert.ok(y(3) < y(2) && y(0) < y(1), "no two lines cross");
  });

  test("deterministic: the same graph gives the same layout, and file order breaks ties", () => {
    const g = graphOf(generated(120, 600, 3));
    assert.deepEqual(layOut(g), layOut(g));
    const tie = layout(["question", "experiment", "experiment"], [
      { a: 1, b: 0, word: "tests" },
      { a: 2, b: 0, word: "tests" },
    ], 0);
    assert.deepEqual(tie.order, [[0], [1, 2]], "equal means keep file order");
  });
});

describe("§5.3 3. height: the further down of the column's next free place and the mean height of neighbours already placed to its left", () => {
  test("related nodes line up across columns, and a column's boxes never overlap", () => {
    // Q1..Q4 stacked; E1 tests Q4 lines up with Q4; E2 tests Q1 lines up with Q1 and comes first.
    const kinds: Kind[] = ["question", "question", "question", "question", "experiment", "experiment"];
    const l = layout(kinds, [
      { a: 4, b: 3, word: "tests" },
      { a: 5, b: 0, word: "tests" },
    ], 0);
    const y = (k: number) => l.boxes[k]!.y;
    assert.deepEqual(l.order[1], [5, 4]);
    assert.equal(y(5), y(0));
    assert.equal(y(4), y(3));
    assert.equal(y(1), y(0) + BOX.h + BOX.gy, "the next free place");
    // Two experiments that both test Q1: the second goes at the next free place under the first.
    const two = layout(["question", "experiment", "experiment"], [
      { a: 1, b: 0, word: "tests" },
      { a: 2, b: 0, word: "tests" },
    ], 0);
    assert.equal(two.boxes[2]!.y, two.boxes[1]!.y + BOX.h + BOX.gy);
    assert.equal(two.boxes[1]!.y, two.boxes[0]!.y);
  });

  test(`boxes are ${BOX.w} × ${BOX.h}, as in the mockup; nothing overlaps on the fixtures or on random graphs`, () => {
    assertNoOverlap(layOut(graphOf(text("idea_graph/mockup.idea_graph.md"))), "mockup");
    assertNoOverlap(layOut(graphOf(text("idea_graph/example.idea_graph.md"))), "example");
    for (let seed = 1; seed <= 60; seed++) {
      const rand = rng(seed);
      const count = 1 + rand(80);
      const kinds = Array.from({ length: count }, () => KINDS[rand(5)]!);
      const edges: Edge[] = Array.from({ length: rand(4 * count) }, () => ({ a: rand(count), b: rand(count), word: "motivates" as const })).filter((e) => e.a !== e.b);
      const l = layout(kinds, edges, rand(10));
      assertNoOverlap(l, `seed ${seed}`);
      assert.ok(l.boxes.every((b) => b.w === BOX.w && b.h === BOX.h));
    }
  });

  test("a box taller than 48 (an ID or a status on a second row, measured by the page) is placed at its own height: nothing overlaps, ends spread over its side", () => {
    // Sixteen wide characters wrap the ID badge, and the status goes to a row of its own: main.ts measures 48 + 38.
    const kinds: Kind[] = ["question", "question", "hypothesis", "experiment", "experiment", "result", "claim"];
    const tall = [48, 86, 48, 67, 86, 48, 120];
    const edges: Edge[] = [
      { a: 3, b: 0, word: "tests" },
      { a: 3, b: 1, word: "tests" },
      { a: 4, b: 2, word: "tests" },
      { a: 3, b: 5, word: "from" },
      { a: 5, b: 6, word: "supports" },
    ];
    const l = layout(kinds, edges, 6, tall);
    assert.deepEqual(l.boxes.map((b) => b.h), tall);
    assertNoOverlap(l, "tall boxes");
    // Q2, 86 tall, is under Q1 by Q1's 48 and the gap; E1's two ends on its left side split its 67 px in thirds.
    assert.equal(l.boxes[1]!.y, l.boxes[0]!.y + 48 + BOX.gy);
    const e1 = l.boxes[3]!;
    assert.deepEqual(l.lines.slice(0, 2).map((line) => line.y2).sort((a, b) => a - b), [Math.round((e1.y + 67 / 3) * 10) / 10, Math.round((e1.y + (2 * 67) / 3) * 10) / 10]);
    for (let seed = 1; seed <= 40; seed++) {
      const rand = rng(seed);
      const count = 1 + rand(60);
      const ks = Array.from({ length: count }, () => KINDS[rand(5)]!);
      const hs = Array.from({ length: count }, () => [48, 48, 48, 67, 86, 105][rand(6)]!);
      const es: Edge[] = Array.from({ length: rand(3 * count) }, () => ({ a: rand(count), b: rand(count), word: "motivates" as const })).filter((e) => e.a !== e.b);
      const r = layout(ks, es, rand(10), hs);
      assertNoOverlap(r, `tall, seed ${seed}`);
      assert.deepEqual(r.boxes.map((b) => b.h), hs);
    }
  });

  test("the legend takes the top of the last column, and that column's nodes start under it", () => {
    const l = layOut(graphOf(text("idea_graph/mockup.idea_graph.md")), 7);
    const last = l.columns[l.columns.length - 1]!;
    assert.deepEqual([l.legend.x, l.legend.y, l.legend.w], [last.x, BOX.pad + BOX.top, LEGEND.w]);
    assert.equal(l.legend.h, 2 * LEGEND.pad + LEGEND.title + 7 * LEGEND.row);
    assert.ok(l.order[l.order.length - 1]!.every((k) => l.boxes[k]!.y >= l.legend.y + l.legend.h + BOX.gy));
  });
});

describe("§5.3 4. and 5. lines: every link and every result's experiment, between sides, spread by the other end's height", () => {
  test("one line for each link and each from:, coloured by its word; a result's experiment is `from`", () => {
    const g = graphOf(text("idea_graph/mockup.idea_graph.md"));
    const l = layOut(g);
    assert.equal(l.lines.length, g.links.length + g.came.length);
    assert.deepEqual(
      l.lines.map((line) => line.word).sort(),
      [...g.links.map((k) => k.word), ...g.came.map(() => "from")].sort(),
    );
  });

  test("a line runs from the left node's right side to the right node's left side; ends on one side are spread by the other end's height", () => {
    // Q1 and Q2 both motivated by... E1 tests Q1 and Q2: two lines leave E1's left side, Q1's line above Q2's.
    const l = layout(["question", "question", "experiment"], [
      { a: 2, b: 0, word: "tests" },
      { a: 2, b: 1, word: "tests" },
    ], 0);
    const [toQ1, toQ2] = l.lines;
    const e1 = l.boxes[2]!;
    for (const line of [toQ1!, toQ2!]) {
      assert.equal(line.x1, l.boxes[line.left]!.x + BOX.w, "starts on the left node's right side");
      assert.equal(line.x2, l.boxes[line.right]!.x, "ends on the right node's left side");
      assert.equal(line.right, 2);
    }
    assert.ok(toQ1!.y2 < toQ2!.y2, "on E1's left side, the end towards Q1 (higher) is above the one towards Q2");
    assert.deepEqual([toQ1!.y2, toQ2!.y2], [e1.y + BOX.h / 3, e1.y + (2 * BOX.h) / 3]);
    assert.match(toQ1!.d, /^M[\d.]+ [\d.]+ C[\d.]+ [\d.]+ [\d.]+ [\d.]+ [\d.]+ [\d.]+$/);
  });

  test("a line within one column is an arc beside it, on its right, within half the gap", () => {
    const l = layout(["question", "question", "question", "experiment"], [{ a: 0, b: 2, word: "motivates" }], 0);
    const arc = l.lines[0]!;
    const q = l.boxes[0]!;
    assert.equal(arc.within, true);
    assert.equal(arc.x1, q.x + BOX.w);
    assert.equal(arc.x2, q.x + BOX.w);
    const c1x = arc.segs[0]!.c1x;
    assert.ok(c1x > arc.x1 && c1x - arc.x1 <= (BOX.gx / 2) / 0.75 + 0.01, `bulge ${c1x - arc.x1}`);
    // An arc beside the last column gets room in the map, for the arc and for a word beside a box there.
    const last = layout(["question", "question"], [{ a: 0, b: 1, word: "motivates" }], 0);
    assert.ok(last.width >= last.lines[0]!.x1 + BOX.gx / 2 + BOX.pad / 2);
    assert.equal(last.width, last.boxes[0]!.x + BOX.w + LABEL.reach);
  });
});

/** Points along a line's path, `steps` a piece. */
function along(segs: readonly Seg[], steps = 24): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const s of segs) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const at = (p0: number, p1: number, p2: number, p3: number) => u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
      out.push({ x: at(s.x0, s.c1x, s.c2x, s.x1), y: at(s.y0, s.c1y, s.c2y, s.y1) });
    }
  }
  return out;
}
/** Whether a point lies inside a rectangle, its edges and a half-pixel margin left out (a line ends on a box's side). */
const within = (p: { x: number; y: number }, r: Rect) => p.x > r.x + 0.5 && p.x < r.x + r.w - 0.5 && p.y > r.y + 0.5 && p.y < r.y + r.h - 0.5;

/** No line passes under a box it does not join, the legend, or a column head. */
function assertRouted(l: Layout, what: string): void {
  l.lines.forEach((line, k) => {
    for (const p of along(line.segs)) {
      for (let i = 0; i < l.boxes.length; i++) if (i !== line.a && i !== line.b && within(p, l.boxes[i]!)) assert.fail(`${what}: line ${k} (${line.a}–${line.b}) passes under box ${i} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      if (within(p, l.legend)) assert.fail(`${what}: line ${k} passes under the legend`);
      for (const c of l.columns) if (within(p, c.head)) assert.fail(`${what}: line ${k} passes under a column head`);
    }
  });
}

/** With each node open in turn: every line of it has a word, and no other line; no word lies on a box its line does not join, on the legend, a column head, or another word, or outside the map. */
function assertLabelled(l: Layout, what: string, nodes: Iterable<number> = l.boxes.keys()): { words: number; inside: number } {
  let words = 0;
  let inside = 0;
  for (const open of nodes) {
    const slots = labelsFor(l, open);
    const placed: [number, Rect][] = [];
    l.lines.forEach((line, k) => {
      const r = slots[k];
      const mine = line.a === open || line.b === open;
      assert.equal(r !== null, mine, `${what}: node ${open}, line ${k} ${mine ? "has no word" : "has a word"}`);
      if (r === null || r === undefined) return;
      words++;
      assert.deepEqual([r.w, r.h], [LABEL.w, LABEL.h]);
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= l.width && r.y + r.h <= l.height, `${what}: node ${open}, line ${k}'s word outside the map`);
      for (let i = 0; i < l.boxes.length; i++) if (i !== line.a && i !== line.b) assert.ok(!overlaps(r, l.boxes[i]!), `${what}: node ${open}, line ${k}'s word on box ${i}, which it does not join`);
      assert.ok(!overlaps(r, l.legend), `${what}: node ${open}, line ${k}'s word on the legend`);
      for (const c of l.columns) assert.ok(!overlaps(r, c.head), `${what}: node ${open}, line ${k}'s word on a column head`);
      for (const [j, other] of placed) assert.ok(!overlaps(r, other), `${what}: node ${open}, the words of lines ${j} and ${k} overlap`);
      placed.push([k, r]);
      // On its node's padding only (beside it), or, when nothing beside is free, inside it.
      const far = l.boxes[line.a === open ? line.b : line.a]!;
      if (r.x >= far.x && r.x + r.w <= far.x + far.w) inside++;
      else assert.ok(r.x + r.w <= far.x + (LABEL.w - LABEL.reach) || r.x >= far.x + far.w - (LABEL.w - LABEL.reach), `${what}: a word beside a box reaches past its padding`);
    });
  }
  return { words, inside };
}

/** A seeded graph that follows §5.1's grammar: each word joins only the kinds it may, a result comes from an experiment, no duplicate; some boxes taller. */
function grammarGraph(seed: number, count: number, perNode: number, tall = false): { kinds: Kind[]; edges: Edge[]; heights: number[] } {
  const rand = rng(seed);
  const kinds = Array.from({ length: count }, () => KINDS[rand(5)]!);
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const experiments = kinds.flatMap((k, i) => (k === "experiment" ? [i] : []));
  kinds.forEach((kind, a) => {
    for (let j = 0; j < perNode; j++) {
      const word = WORDS[rand(WORDS.length)]! as Word;
      if (!JOINS[word].from.includes(kind)) continue;
      const targets = kinds.flatMap((k, i) => (i !== a && JOINS[word].to.includes(k) ? [i] : []));
      if (targets.length === 0) continue;
      const b = targets[rand(targets.length)]!;
      if (seen.has(`${a} ${word} ${b}`)) continue;
      seen.add(`${a} ${word} ${b}`);
      edges.push({ a, b, word });
    }
    if (kind === "result" && experiments.length > 0) edges.push({ a: experiments[rand(experiments.length)]!, b: a, word: "from" });
  });
  const heights = kinds.map(() => (tall ? [48, 48, 48, 67, 86][rand(5)]! : BOX.h));
  return { kinds, edges, heights };
}

describe("lines and their words go where they read right: a line skipping a column runs through it in a lane; a word sits beside the node it names (departing from §5.3 4 as written)", () => {
  const P02: Kind[] = ["question", "hypothesis", "hypothesis", "hypothesis", "experiment"];

  test("the review's graph: E1 tests Q1, past three hypotheses it does not join; the line runs straight through their column, which keeps clear of it", () => {
    const l = layout(P02, [{ a: 4, b: 0, word: "tests" }], 7);
    const line = l.lines[0]!;
    const q1 = l.boxes[0]!;
    assert.equal(line.lane, q1.y + q1.h / 2, "at Q1's middle");
    assert.equal(line.segs.length, 3);
    // The straight run spans the hypotheses' column at the lane's height.
    const run = line.segs[1]!;
    assert.deepEqual([run.x0, run.y0, run.x1, run.y1], [l.columns[1]!.x, line.lane, l.columns[1]!.x + BOX.w, line.lane]);
    for (const k of [1, 2, 3]) {
      const h = l.boxes[k]!;
      assert.ok(h.y >= line.lane! + LANE || h.y + h.h <= line.lane! - LANE, `H${k} keeps clear of the lane`);
    }
    assertRouted(l, "p02");
    // E1 open: the word sits beside Q1, where the line meets it, on no hypothesis; Q1 open: beside E1.
    const atE1 = labelsFor(l, 4)[0]!;
    assert.deepEqual([atE1.x, atE1.y], [q1.x + BOX.w - (LABEL.w - LABEL.reach), q1.y + LABEL.h], "beside Q1's right side, the slot the line meets");
    const e1 = l.boxes[4]!;
    assert.equal(labelsFor(l, 0)[0]!.x, e1.x - LABEL.reach, "beside E1's left side");
    assertLabelled(l, "p02");
    // With nothing to skip, nothing moves: the mockup's graph keeps every box where the first build put it.
    const mock = layOut(graphOf(text("idea_graph/mockup.idea_graph.md")));
    assert.ok(mock.lines.every((x) => x.lane === null && x.segs.length === 1));
  });

  test("two words between one pair of nodes: each beside the node it names, apart, and not on the legend", () => {
    // The review's pair: E1 tests H1 and motivates H1; H1 motivates E1 too, the most two kinds allow (three).
    const l = layout(["hypothesis", "experiment"], [{ a: 1, b: 0, word: "tests" }, { a: 1, b: 0, word: "motivates" }, { a: 0, b: 1, word: "motivates" }], 7);
    const { words, inside } = assertLabelled(l, "pair");
    assert.deepEqual([words, inside], [6, 0]);
    const atH1 = labelsFor(l, 0).map((r) => r!.y).sort((a, b) => a - b);
    const e1 = l.boxes[1]!;
    assert.deepEqual(atH1, [e1.y, e1.y + LABEL.h, e1.y + 2 * LABEL.h], "stacked down E1's side");
  });

  test("seeded property: on random graphs that follow the grammar, no line passes under a box it does not join, and no word lies where it may not", (t) => {
    let words = 0;
    let inside = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = grammarGraph(seed, 5 + (seed * 7) % 45, 1 + (seed % 3), seed % 2 === 0);
      const l = layout(g.kinds, g.edges, 4 + (seed % 6), g.heights);
      assertNoOverlap(l, `seed ${seed}`);
      assertRouted(l, `seed ${seed}`);
      const r = assertLabelled(l, `seed ${seed}`);
      words += r.words;
      inside += r.inside;
    }
    assert.ok(words > 2000, `${words} words checked`);
    t.diagnostic(`${inside} of ${words} words fell back inside their node's box`);
    assert.ok(inside <= words / 100, `${inside} of ${words} words fell back inside their node's box`);
  });

  test("the shapes the review timed: 200 nodes and 1,000 links, every node in one column, 1,000 links between two columns (and through a third)", (t) => {
    // 200 nodes of every kind, some boxes taller, 1,000 links by the grammar and each result's experiment.
    const g200 = grammarGraph(9, 200, 8, true);
    const links1000 = g200.edges.filter((e) => e.word !== "from").slice(0, 1000);
    assert.equal(links1000.length, 1000);
    const big = layout(g200.kinds, [...links1000, ...g200.edges.filter((e) => e.word === "from")], 6, g200.heights);
    assertNoOverlap(big, "200 nodes");
    assertRouted(big, "200 nodes");
    // Every node a question: every line an arc.
    const rand = rng(3);
    const one: Edge[] = [];
    const pairs = new Set<string>();
    while (one.length < 400) {
      const a = rand(200);
      const b = rand(200);
      if (a === b || pairs.has(`${a} ${b}`)) continue;
      pairs.add(`${a} ${b}`);
      one.push({ a, b, word: "motivates" });
    }
    const column = layout(Array.from({ length: 200 }, () => "question"), one, 8);
    assertNoOverlap(column, "one column");
    assertRouted(column, "one column");
    // 20 questions and 50 experiments, each experiment testing every question: 1,000 lines between two columns;
    // then with one hypothesis between them, 1,000 lines through its column.
    const kinds: Kind[] = [...Array.from({ length: 20 }, () => "question" as const), ...Array.from({ length: 50 }, () => "experiment" as const)];
    const tests: Edge[] = [];
    for (let e = 20; e < 70; e++) for (let q = 0; q < 20; q++) tests.push({ a: e, b: q, word: "tests" });
    for (const [name, ks, es] of [
      ["two columns", kinds, tests],
      ["through a third", [...kinds, "hypothesis" as const], tests],
    ] as const) {
      const l = layout(ks, es, 6);
      assert.equal(l.lines.length, 1000);
      assertNoOverlap(l, name);
      assertRouted(l, name);
      const r = assertLabelled(l, name);
      t.diagnostic(`${name}: ${r.inside} of ${r.words} words inside their node's box`);
    }
    for (const [name, l] of [["200 nodes", big], ["one column", column]] as const) {
      const r = assertLabelled(l, name);
      t.diagnostic(`${name}: ${r.inside} of ${r.words} words inside their node's box`);
    }
  });
});

describe("§5.3 6. scale: the map fits the view's width at a scale between 0.8 and 1", () => {
  test("fitScale", () => {
    assert.equal(fitScale(2000, 800), 1);
    assert.equal(fitScale(722, 800), 0.9);
    assert.equal(fitScale(300, 800), 0.8);
    assert.equal(fitScale(0, 800), 0.8);
  });
});

describe(`the design's 50- and 200-node graphs (§6), and the caps of ${LIMITS.nodes} nodes and ${LIMITS.links} links`, () => {
  test("a 50-node and a 200-node graph: every row a node, every link and from: a line, nothing overlaps", () => {
    for (const [count, links] of [
      [50, 250],
      [200, 1000],
    ] as const) {
      const g = graphOf(generated(count, links));
      assert.equal(g.nodes.length, count);
      assert.deepEqual(g.problems.filter((p) => !p.text.includes("cycle")), [], `${count}: only cycles, which generated motivates may close`);
      const l = layOut(g);
      assert.equal(l.lines.length, g.links.length + g.came.length);
      assertNoOverlap(l, `${count} nodes`);
    }
  });

  // The growth cases are sized by logic.test.ts's rule (honest at most about 17 ms at 4n here; the mistake put back at
  // least 2 s and failing), with the case run alone on an M1 Pro. This one: honest at most 4.6 ms at 4n in nine
  // runs. No mistake found that fails it, since the caps bound it: a line looking itself up among the lines
  // (`const k = lines.indexOf(line)` in layout's lines loop) is 4.4 times the time, 3.3 ms at 4n; a row looking its
  // ID up among the rows before it, 6.0 times, 6.0 ms.
  test("reading, checking, and laying out 50 then 200 nodes grows as one pass does (the design's 50 ms, by growth)", (t) => {
    const run = (source: string) => {
      const g = graphOf(source);
      return layOut(g);
    };
    assertOnePass(t, "50 and 200 nodes", growth((n) => generated(n, n * 5), run, 50));
  });

  // Honest at most 11.6 ms at 4n in eleven runs. No mistake found that fails it at any size the suite can afford:
  // at 2,000 then 8,000 nodes (its old size; 189 ms at 4n here, and 10.0 times, 1,202 ms on macos-x64, passing by a
  // hair) neither a line looking itself up among the lines (6.3 times, 337 ms) nor labelsFor checking every word
  // placed, scanning a column's boxes from the top, or a line looking itself up there (4.3 to 6.2 times, at most
  // 336 ms) failed it, and at 4,000 the first still did not (9.4 times, 1.2 s). Here they are 3.7 to 5.6 times, at
  // most 13.0 ms.
  test("routing grows as one pass does: lines that skip two columns, and the words of the node with the most lines, 200 then 800 nodes", (t) => {
    const make = (n: number) => {
      const rand = rng(11);
      // Questions, two hypotheses, experiments: every line from an experiment to a question skips the hypotheses' column.
      const kinds: Kind[] = Array.from({ length: n }, (_, k) => (k < n / 2 ? "question" : k < n / 2 + 2 ? "hypothesis" : "experiment"));
      const edges: Edge[] = Array.from({ length: 4 * n }, () => ({ a: n / 2 + 2 + rand(n / 2 - 2), b: rand(n / 2), word: "tests" as const }));
      // One question every experiment tests: its words are as many as the experiments.
      for (let e = n / 2 + 2; e < n; e++) edges.push({ a: e, b: 0, word: "tests" });
      return JSON.stringify({ kinds, edges });
    };
    const run = (input: string) => {
      const { kinds, edges } = JSON.parse(input) as { kinds: Kind[]; edges: Edge[] };
      return labelsFor(layout(kinds, edges, 6), 0);
    };
    assertOnePass(t, "routing and words, 200 and 800 nodes", growth(make, run, 200));
  });

  // No case times the layout at thousands of nodes: the view reaches it only under the caps. Its one caller, main.ts's
  // placeMap, passes graph.nodes (at most LIMITS.nodes, 200) and edgesOf(graph): the links (at most LIMITS.links,
  // 1,000) and a line for each result whose experiment is drawn, so at most 1,199 lines (a valid file reaches 1,197:
  // 197 results from one experiment, beside two hypotheses). There a line looking itself up among the lines
  // (`const k = lines.indexOf(line)` in layout's lines loop) costs 1.8 to 2.0 ms against 1.5 to 1.6 on that file
  // (2.1 to 2.4 against 2.0 to 2.3 on 200 nodes and 1,199 random lines; best of 15, four runs), and no test fails on
  // it. The case at 6,000 then 24,000 nodes that guarded it was removed: on macos-x64 its honest ratio (8.3 times,
  // 2.4 s at 4n) and the mistake's (10.7 to 11.2 times on the machine the view was built on) could not be told apart,
  // just either side of the 10 times a case fails at. The caps are the guard, tested in logic.test.ts: "past 200
  // nodes, the first 200 are drawn and the problems and the bar say so" and "past 1000 links, the first 1000 in file
  // order are drawn" count what buildGraph returns (each fails with its slice removed), and "the problems listed stop
  // at 500, …" pins their values; the 50- and 200-node case above draws a line for each link and each from:. No
  // end-to-end test goes past the caps.
});
