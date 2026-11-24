/**
 * The Idea view's map, laid out by a general rule (os-ui/PLUGINS.md Part 3,
 * §5.3), not by hand as the mockup's was. Pure: numbers in, numbers out, so
 * `npm test` checks it in Node, and main.ts sets them as SVG attributes.
 *
 * 1. Columns by kind, in a fixed order; a kind with no node has no column.
 * 2. Order within a column: file order, then four sweeps, left to right and
 *    back, each stably sorting a column by the mean position of each node's
 *    neighbours in the columns already swept (adjacent or not); a node with
 *    no such neighbour keeps its place.
 * 3. Height in one pass from left to right: each node at the further down of
 *    its column's next free place and the mean height of its neighbours
 *    already placed to its left. Boxes are 150 × 48, as in the mockup, or
 *    taller when a node's ID and status need more than one row (main.ts
 *    measures each box as drawn and passes its height).
 * 4. Lines from the left node's right side to the right node's left side,
 *    each side's ends spread by the other end's height; a line within one
 *    column is an arc beside it, on its right.
 * 6. The scale fits the view's width, between 0.8 and 1.
 *
 * The legend, which the mockup put in a corner its hand-placed nodes left
 * empty, takes the top of the last column, whose nodes start under it, so it
 * never covers one. Every step is a pass over the nodes and edges (the sweeps
 * four, plus a sort of each column), so the caps of 200 nodes and 1,000 links
 * bound it, and so does any input: the tests time it with the caps lifted.
 */
import { KINDS } from "./logic.ts";
import type { Graph, Kind, Word } from "./logic.ts";

/**
 * A box, the gaps between columns and between boxes, the map's padding, and
 * the column heads' height (the mockup's GA); `row` is the height of a box's
 * top row (its ID badge, style.css's 19 px), which a box of `h` holds once.
 */
export const BOX = { w: 150, h: 48, gx: 56, gy: 10, pad: 16, top: 26, row: 19 } as const;
/** The legend: its width, padding, title, and one row's height (style.css draws it to these). */
export const LEGEND = { w: 150, pad: 8, title: 18, row: 15 } as const;

/** One line to draw: a link from `a` to `b`, or a result's experiment (`a`) and the result (`b`). */
export interface Edge {
  a: number;
  b: number;
  word: Word | "from";
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Line {
  word: Word | "from";
  a: number;
  b: number;
  /** The node at the line's start (x1) and end (x2): left and right, or `a` and `b` for an arc. */
  left: number;
  right: number;
  /** Within one column: an arc beside it. */
  within: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  /** The SVG path. */
  d: string;
}

export interface Column {
  kind: Kind;
  x: number;
  count: number;
  /** Where its head ("Q Questions · 4") is drawn. */
  head: Rect;
}

export interface Layout {
  width: number;
  height: number;
  columns: Column[];
  /** Node indices by column, top to bottom. */
  order: number[][];
  /** By node index. */
  boxes: Rect[];
  /** By edge, in the edges' order. */
  lines: Line[];
  legend: Rect;
}

/** The graph's lines in the order main.ts draws them: links in file order, then each result's experiment. */
export function edgesOf(g: Graph): Edge[] {
  return [...g.links.map((l): Edge => ({ a: l.from.index, b: l.to.index, word: l.word })), ...g.came.map((c): Edge => ({ a: c.experiment.index, b: c.result.index, word: "from" }))];
}

/** One decimal: the path's numbers. */
const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The map of nodes of `kinds` (by index, in file order) and their `edges`,
 * with a legend of `legendRows` rows (none for 0). `heights` are the boxes'
 * heights by node, BOX.h when not given.
 */
export function layout(kinds: readonly Kind[], edges: readonly Edge[], legendRows: number, heights?: readonly number[]): Layout {
  const count = kinds.length;
  const hOf = (i: number) => heights?.[i] ?? BOX.h;
  const present = KINDS.filter((k) => kinds.includes(k));
  const colOf = new Int32Array(count);
  const order: number[][] = present.map(() => []);
  for (let i = 0; i < count; i++) {
    colOf[i] = present.indexOf(kinds[i]!);
    order[colOf[i]!]!.push(i);
  }
  // Neighbours, both ways, by links and from: alike.
  const near: number[][] = Array.from({ length: count }, () => []);
  for (const e of edges) {
    if (e.a === e.b) continue;
    near[e.a]!.push(e.b);
    near[e.b]!.push(e.a);
  }
  const pos = new Float64Array(count);
  const place = (c: number) => order[c]!.forEach((k, i) => (pos[k] = i));
  order.forEach((_, c) => place(c));

  /** Sorts column `c` by the mean position of each node's neighbours in the columns `swept` holds; a node with none keeps its slot. */
  const sweep = (c: number, swept: (col: number) => boolean) => {
    const column = order[c]!;
    const slots: number[] = [];
    const movers: { node: number; key: number }[] = [];
    column.forEach((node, i) => {
      let sum = 0;
      let seen = 0;
      for (const other of near[node]!) {
        if (!swept(colOf[other]!)) continue;
        sum += pos[other]!;
        seen++;
      }
      if (seen === 0) return;
      slots.push(i);
      movers.push({ node, key: sum / seen });
    });
    // Array.prototype.sort is stable: equal means keep the order they had.
    movers.sort((p, q) => p.key - q.key);
    slots.forEach((slot, j) => (column[slot] = movers[j]!.node));
    place(c);
  };
  for (let s = 0; s < 4; s++) {
    if (s % 2 === 0) for (let c = 1; c < order.length; c++) sweep(c, (col) => col < c);
    else for (let c = order.length - 2; c >= 0; c--) sweep(c, (col) => col > c);
  }

  // The legend at the top of the last column.
  const legendH = legendRows === 0 ? 0 : 2 * LEGEND.pad + LEGEND.title + legendRows * LEGEND.row;
  const columnX = (c: number) => BOX.pad + c * (BOX.w + BOX.gx);
  const lastX = order.length === 0 ? BOX.pad : columnX(order.length - 1);
  const legend: Rect = { x: lastX, y: BOX.pad + BOX.top, w: legendH === 0 ? 0 : LEGEND.w, h: legendH };

  // Heights, left to right.
  const ys = new Float64Array(count);
  let bottom = legendH === 0 ? 0 : legend.y + legend.h;
  order.forEach((column, c) => {
    let free = BOX.pad + BOX.top + (c === order.length - 1 && legendH > 0 ? legendH + BOX.gy : 0);
    for (const node of column) {
      let sum = 0;
      let seen = 0;
      for (const other of near[node]!) {
        if (colOf[other]! >= c) continue;
        sum += ys[other]!;
        seen++;
      }
      const y = seen === 0 ? free : Math.max(free, Math.round(sum / seen));
      ys[node] = y;
      free = y + hOf(node) + BOX.gy;
      bottom = Math.max(bottom, y + hOf(node));
    }
  });
  const boxes: Rect[] = Array.from({ length: count }, (_, i) => ({ x: columnX(colOf[i]!), y: ys[i]!, w: BOX.w, h: hOf(i) }));

  // Lines: each side's ends, spread by the other end's height.
  const sides = new Map<string, { line: number; other: number }[]>();
  const side = (node: number, right: boolean) => {
    const key = `${node}${right ? "r" : "l"}`;
    let list = sides.get(key);
    if (list === undefined) sides.set(key, (list = []));
    return list;
  };
  const lines: Line[] = edges.map((e, k) => {
    const within = colOf[e.a] === colOf[e.b];
    const [left, right] = within || colOf[e.a]! < colOf[e.b]! ? [e.a, e.b] : [e.b, e.a];
    side(left, true).push({ line: k, other: ys[right]! });
    side(right, within).push({ line: k, other: ys[left]! });
    return { word: e.word, a: e.a, b: e.b, left, right, within, x1: 0, y1: 0, x2: 0, y2: 0, c1x: 0, c1y: 0, c2x: 0, c2y: 0, d: "" };
  });
  const ends = new Map<string, number>();
  for (const [key, list] of sides) {
    const node = Number(key.slice(0, -1));
    list.sort((p, q) => p.other - q.other || p.line - q.line);
    list.forEach((entry, i) => {
      const y = ys[node]! + (hOf(node) * (i + 1)) / (list.length + 1);
      // An arc has both ends on the right side; which one this is, by the node.
      ends.set(`${entry.line}:${node}:${key.endsWith("r") ? "r" : "l"}`, y);
    });
  }
  let arcRoom = 0;
  lines.forEach((line, k) => {
    const L = boxes[line.left]!;
    const R = boxes[line.right]!;
    if (line.within) {
      line.x1 = line.x2 = L.x + BOX.w;
      line.y1 = ends.get(`${k}:${line.left}:r`)!;
      line.y2 = ends.get(`${k}:${line.right}:r`)!;
      const bulge = Math.min(BOX.gx / 2 - 4, 12 + Math.abs(line.y2 - line.y1) * 0.08);
      line.c1x = line.c2x = r1(line.x1 + bulge / 0.75);
      line.c1y = line.y1;
      line.c2y = line.y2;
      if (colOf[line.left] === order.length - 1) arcRoom = BOX.gx / 2;
    } else {
      line.x1 = L.x + BOX.w;
      line.x2 = R.x;
      line.y1 = ends.get(`${k}:${line.left}:r`)!;
      line.y2 = ends.get(`${k}:${line.right}:l`)!;
      const dx = (line.x2 - line.x1) / 2;
      line.c1x = line.x1 + dx;
      line.c1y = line.y1;
      line.c2x = line.x2 - dx;
      line.c2y = line.y2;
    }
    line.y1 = r1(line.y1);
    line.y2 = r1(line.y2);
    line.c1y = r1(line.c1y);
    line.c2y = r1(line.c2y);
    line.d = `M${r1(line.x1)} ${line.y1} C${r1(line.c1x)} ${line.c1y} ${r1(line.c2x)} ${line.c2y} ${r1(line.x2)} ${line.y2}`;
  });

  const columns: Column[] = present.map((kind, c) => ({ kind, x: columnX(c), count: order[c]!.length, head: { x: columnX(c), y: BOX.pad, w: BOX.w, h: BOX.top - 6 } }));
  const width = order.length === 0 ? 2 * BOX.pad + LEGEND.w : 2 * BOX.pad + order.length * BOX.w + (order.length - 1) * BOX.gx + arcRoom;
  return { width, height: Math.max(bottom, BOX.pad + BOX.top) + BOX.pad, columns, order, boxes, lines, legend };
}

/** A point on a line for its word, when one of its nodes is open: nearer the other node (the mockup's 0.34 or 0.66), an arc's at its middle. */
export function labelPoint(line: Line, open: number): { x: number; y: number } {
  const t = line.within ? 0.5 : line.left === open ? 0.66 : 0.34;
  const u = 1 - t;
  const at = (p0: number, p1: number, p2: number, p3: number) => u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  return { x: r1(at(line.x1, line.c1x, line.c2x, line.x2)), y: r1(at(line.y1, line.c1y, line.c2y, line.y2)) };
}

/** §5.3 6: the scale that fits a map `mapWidth` wide into a view `viewWidth` wide, between 0.8 and 1 (the mockup leaves 2 px). */
export const fitScale = (viewWidth: number, mapWidth: number) => Math.min(1, Math.max(0.8, (viewWidth - 2) / mapWidth));
