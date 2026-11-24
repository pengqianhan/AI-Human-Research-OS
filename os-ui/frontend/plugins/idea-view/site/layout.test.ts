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
import { BOX, edgesOf, fitScale, labelPoint, layout, LEGEND } from "./layout.ts";
import type { Edge, Layout } from "./layout.ts";
import { buildGraph, KINDS, LIMITS, skeletonFrom } from "./logic.ts";
import type { Graph, Kind } from "./logic.ts";

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
    assert.ok(arc.c1x > arc.x1 && arc.c1x - arc.x1 <= (BOX.gx / 2) / 0.75 + 0.01, `bulge ${arc.c1x - arc.x1}`);
    // An arc beside the last column gets room in the map.
    const last = layout(["question", "question"], [{ a: 0, b: 1, word: "motivates" }], 0);
    assert.ok(last.width >= last.lines[0]!.x1 + BOX.gx / 2 + BOX.pad / 2);
  });

  test("a line's label sits nearer the other node (the mockup's 0.34 or 0.66 along it); an arc's at its middle", () => {
    const l = layout(["question", "experiment"], [{ a: 1, b: 0, word: "tests" }], 0);
    const line = l.lines[0]!;
    const fromLeft = labelPoint(line, line.left);
    const fromRight = labelPoint(line, line.right);
    assert.ok(fromLeft.x > fromRight.x, "opened on the left node, the label is towards the right");
    assert.ok(Math.abs(fromLeft.x - (line.x1 + 0.66 * (line.x2 - line.x1))) < 25);
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

  test("reading, checking, and laying out 50 then 200 nodes grows as one pass does (the design's 50 ms, by growth)", (t) => {
    const run = (source: string) => {
      const g = graphOf(source);
      return layOut(g);
    };
    assertOnePass(t, "50 and 200 nodes", growth((n) => generated(n, n * 5), run, 50));
  });

  // Sized so that a pass per line (each line looking itself up among the lines, as a first draft did) takes seconds at 4n here.
  test("the layout alone, with the caps lifted, grows as one pass does: 4,000 nodes and 20,000 edges, then four times as many", (t) => {
    const make = (n: number) => {
      const rand = rng(5);
      const kinds = Array.from({ length: n }, (_, k) => KINDS[k % 5]!);
      const edges: Edge[] = Array.from({ length: 5 * n }, () => ({ a: rand(n), b: rand(n), word: "motivates" as const })).filter((e) => e.a !== e.b);
      return JSON.stringify({ kinds, edges });
    };
    const run = (input: string) => {
      const { kinds, edges } = JSON.parse(input) as { kinds: Kind[]; edges: Edge[] };
      return layout(kinds, edges, 6);
    };
    assertOnePass(t, "layout, 4,000 and 16,000 nodes", growth(make, run, 4000));
  });
});
