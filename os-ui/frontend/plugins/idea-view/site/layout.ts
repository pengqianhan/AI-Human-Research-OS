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
 *    column is an arc beside it, on its right. Departing from the rule as
 *    §5.3 wrote it (the review found lines under boxes they do not join, and
 *    words on the wrong node): a line that skips a column runs straight
 *    through it in a lane that column's boxes keep clear of, so no line
 *    passes under a box it does not join; and a line's word, when one of its
 *    nodes is open, sits beside the other node (labelsFor), on no box it does
 *    not join, no other word, the legend, or a column head.
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

/** A piece of a line's path: a cubic curve from (x0, y0) to (x1, y1); a straight run has its control points on it. */
export interface Seg {
  x0: number;
  y0: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  x1: number;
  y1: number;
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
  /** Its ends, on the nodes' sides. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** For a line that skips a column: the height of its straight run through every column it skips; null otherwise. */
  lane: number | null;
  /** The path: one curve inside a gap (or an arc beside a column), or, skipping columns, a curve, the straight run, a curve. */
  segs: Seg[];
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
  /** Each node's column, by node index. */
  col: number[];
  /** By node index. */
  boxes: Rect[];
  /** By edge, in the edges' order. */
  lines: Line[];
  legend: Rect;
}

/**
 * A line's label: the slot its pill is drawn in (style.css draws the pill
 * inside, at most this wide and 14 px tall), and how far a slot beside a box
 * reaches into the gap: to 1 px short of the next column, so it covers the
 * box it names by LABEL.w − LABEL.reach (9 px), less than the box's padding,
 * never its ID, status, or statement.
 */
export const LABEL = { w: 64, h: 16, reach: BOX.gx - 1 } as const;
/** Half the room a line's straight run through a column it skips keeps clear of that column's boxes. */
export const LANE = BOX.gy;

/** The graph's lines in the order main.ts draws them: links in file order, then each result's experiment. */
export function edgesOf(g: Graph): Edge[] {
  return [...g.links.map((l): Edge => ({ a: l.from.index, b: l.to.index, word: l.word })), ...g.came.map((c): Edge => ({ a: c.experiment.index, b: c.result.index, word: "from" }))];
}

/** One decimal: the path's numbers. */
const r1 = (v: number) => Math.round(v * 10) / 10;

/** A curve from one point to another, level at both ends, as the mockup draws its lines: inside the x-range between them. */
const curve = (x0: number, y0: number, x1: number, y1: number): Seg => {
  const dx = (x1 - x0) / 2;
  return { x0, y0, c1x: x0 + dx, c1y: y0, c2x: x1 - dx, c2y: y1, x1, y1 };
};

/** The SVG path of `segs`: numbers only. */
export function pathOf(segs: readonly Seg[]): string {
  const s0 = segs[0]!;
  return `M${r1(s0.x0)} ${r1(s0.y0)}${segs.map((s) => ` C${r1(s.c1x)} ${r1(s.c1y)} ${r1(s.c2x)} ${r1(s.c2y)} ${r1(s.x1)} ${r1(s.y1)}`).join("")}`;
}

/** Whether two rectangles share any point but an edge. */
export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

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

  // Lines that skip a column (an experiment that tests a question, past the hypotheses) run straight through it at
  // their left node's middle; each column they skip keeps its boxes clear of that run (a lane), so no line passes
  // under a box it does not join. A lane is known once its left node is placed, before any column it skips.
  const leftOf = (e: Edge) => (colOf[e.a]! <= colOf[e.b]! ? e.a : e.b);
  const rightOf = (e: Edge) => (colOf[e.a]! <= colOf[e.b]! ? e.b : e.a);
  const leaving: number[][] = order.map(() => []);
  edges.forEach((e, k) => {
    if (colOf[rightOf(e)]! - colOf[leftOf(e)]! >= 2) leaving[colOf[leftOf(e)]!]!.push(k);
  });
  const lanes = new Float64Array(edges.length).fill(NaN);
  const bands: { top: number; bottom: number }[][] = order.map(() => []);

  // Heights, left to right.
  const ys = new Float64Array(count);
  let bottom = legendH === 0 ? 0 : legend.y + legend.h;
  order.forEach((column, c) => {
    // The lanes through this column, merged, top to bottom; a box goes on below any it would meet.
    const runs = bands[c]!.sort((p, q) => p.top - q.top);
    const merged: { top: number; bottom: number }[] = [];
    for (const run of runs) {
      const last = merged[merged.length - 1];
      if (last !== undefined && run.top <= last.bottom) last.bottom = Math.max(last.bottom, run.bottom);
      else merged.push({ ...run });
    }
    let next = 0;
    let free = BOX.pad + BOX.top + (c === order.length - 1 && legendH > 0 ? legendH + BOX.gy : 0);
    for (const node of column) {
      let sum = 0;
      let seen = 0;
      for (const other of near[node]!) {
        if (colOf[other]! >= c) continue;
        sum += ys[other]!;
        seen++;
      }
      let y = seen === 0 ? free : Math.max(free, Math.round(sum / seen));
      while (next < merged.length && merged[next]!.bottom <= y) next++;
      while (next < merged.length && merged[next]!.top < y + hOf(node)) y = Math.ceil(merged[next++]!.bottom);
      ys[node] = y;
      free = y + hOf(node) + BOX.gy;
      bottom = Math.max(bottom, y + hOf(node));
    }
    // This column is placed: the lanes of the lines leaving it for a column past the next.
    for (const k of leaving[c]!) {
      const e = edges[k]!;
      const left = leftOf(e);
      const lane = ys[left]! + hOf(left) / 2;
      lanes[k] = lane;
      for (let skipped = c + 1; skipped < colOf[rightOf(e)]!; skipped++) bands[skipped]!.push({ top: lane - LANE, bottom: lane + LANE });
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
    const [left, right] = within ? [e.a, e.b] : [leftOf(e), rightOf(e)];
    side(left, true).push({ line: k, other: ys[right]! });
    side(right, within).push({ line: k, other: ys[left]! });
    return { word: e.word, a: e.a, b: e.b, left, right, within, x1: 0, y1: 0, x2: 0, y2: 0, lane: null, segs: [], d: "" };
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
    line.y1 = r1(ends.get(`${k}:${line.left}:r`)!);
    if (line.within) {
      // An arc beside the column, on its right, within half the gap.
      line.x1 = line.x2 = L.x + BOX.w;
      line.y2 = r1(ends.get(`${k}:${line.right}:r`)!);
      const bulge = Math.min(BOX.gx / 2 - 4, 12 + Math.abs(line.y2 - line.y1) * 0.08);
      const cx = r1(line.x1 + bulge / 0.75);
      line.segs = [{ x0: line.x1, y0: line.y1, c1x: cx, c1y: line.y1, c2x: cx, c2y: line.y2, x1: line.x2, y1: line.y2 }];
      // Beside the last column, room for the arc and for a label beside a box there (labelsFor).
      if (colOf[line.left] === order.length - 1) arcRoom = Math.max(BOX.gx / 2, LABEL.reach - BOX.pad);
    } else {
      line.x1 = L.x + BOX.w;
      line.x2 = R.x;
      line.y2 = r1(ends.get(`${k}:${line.right}:l`)!);
      const lane = lanes[k]!;
      if (Number.isNaN(lane)) line.segs = [curve(line.x1, line.y1, line.x2, line.y2)];
      else {
        // Into the lane in the first gap, straight through every column skipped, out of it in the last gap.
        line.lane = r1(lane);
        const into = columnX(colOf[line.left]! + 1);
        const out = columnX(colOf[line.right]! - 1) + BOX.w;
        line.segs = [curve(line.x1, line.y1, into, line.lane), curve(into, line.lane, out, line.lane), curve(out, line.lane, line.x2, line.y2)];
      }
    }
    line.d = pathOf(line.segs);
  });

  const columns: Column[] = present.map((kind, c) => ({ kind, x: columnX(c), count: order[c]!.length, head: { x: columnX(c), y: BOX.pad, w: BOX.w, h: BOX.top - 6 } }));
  const width = order.length === 0 ? 2 * BOX.pad + LEGEND.w : 2 * BOX.pad + order.length * BOX.w + (order.length - 1) * BOX.gx + arcRoom;
  return { width, height: Math.max(bottom, BOX.pad + BOX.top) + BOX.pad, columns, order, col: [...colOf], boxes, lines, legend };
}

/**
 * Where each line of node `open` shows its word, by line (null for a line not
 * of `open`): a slot of LABEL.w × LABEL.h beside the other node, where the line
 * meets it, so the word sits by the node it names. A slot beside a box lies in
 * the gap and on that box's padding only; the first free one is taken, nearest
 * the line's end first. Free means: on no box but the line's own two, not on
 * the legend or a column head, on no other label, inside the map. When none
 * beside the box is free, the slot is inside the other node's box, which only
 * this node's lines to it (three at most, and a box has three slots) can take.
 * Each check looks a column's boxes up by binary search and the labels by row.
 */
export function labelsFor(l: Layout, open: number): (Rect | null)[] {
  const placed = new Map<number, Rect[]>();
  const rows = (r: Rect) => {
    const out: number[] = [];
    for (let row = Math.floor(r.y / LABEL.h); row * LABEL.h < r.y + r.h; row++) out.push(row);
    return out;
  };
  const free = (r: Rect, ends: readonly number[]): boolean => {
    if (r.x < 0 || r.y < 0 || r.x + r.w > l.width || r.y + r.h > l.height) return false;
    if (overlaps(r, l.legend)) return false;
    for (const [c, column] of l.columns.entries()) {
      if (overlaps(r, column.head)) return false;
      if (r.x >= column.x + BOX.w || r.x + r.w <= column.x) continue;
      // The column's boxes are top to bottom and apart: the first that ends below the slot's top, then on down.
      const ids = l.order[c]!;
      let lo = 0;
      let hi = ids.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const b = l.boxes[ids[mid]!]!;
        if (b.y + b.h <= r.y) lo = mid + 1;
        else hi = mid;
      }
      for (let i = lo; i < ids.length && l.boxes[ids[i]!]!.y < r.y + r.h; i++) if (!ends.includes(ids[i]!) && overlaps(r, l.boxes[ids[i]!]!)) return false;
    }
    for (const row of rows(r)) for (const other of placed.get(row) ?? []) if (overlaps(r, other)) return false;
    return true;
  };
  return l.lines.map((line) => {
    if (line.left !== open && line.right !== open) return null;
    const far = line.left === open ? line.right : line.left;
    const port = far === line.right ? line.y2 : line.y1;
    // The side the line meets the other node on: an arc's is the right; otherwise the side facing the open node.
    const right = line.within || far === line.left;
    const box = l.boxes[far]!;
    const slots = Array.from({ length: Math.max(1, Math.floor(box.h / LABEL.h)) }, (_, s) => box.y + s * LABEL.h).sort((p, q) => Math.abs(p + LABEL.h / 2 - port) - Math.abs(q + LABEL.h / 2 - port) || p - q);
    const beside = (y: number): Rect => ({ x: right ? box.x + box.w - (LABEL.w - LABEL.reach) : box.x - LABEL.reach, y, w: LABEL.w, h: LABEL.h });
    const inside = (y: number): Rect => ({ x: right ? box.x + box.w - LABEL.w : box.x, y, w: LABEL.w, h: LABEL.h });
    const ends = [line.a, line.b];
    const at = slots.map(beside).find((r) => free(r, ends)) ?? slots.map(inside).find((r) => free(r, ends)) ?? inside(slots[0]!);
    for (const row of rows(at)) {
      const list = placed.get(row) ?? [];
      list.push(at);
      placed.set(row, list);
    }
    return at;
  });
}

/** §5.3 6: the scale that fits a map `mapWidth` wide into a view `viewWidth` wide, between 0.8 and 1 (the mockup leaves 2 px). */
export const fitScale = (viewWidth: number, mapWidth: number) => Math.min(1, Math.max(0.8, (viewWidth - 2) / mapWidth));
