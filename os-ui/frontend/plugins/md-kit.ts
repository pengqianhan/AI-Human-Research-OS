/**
 * md-kit: the small Markdown reader the step 2 project views share
 * (os-ui/PLUGINS.md Part 3, §2). Pure, no DOM: it turns a file's text into
 * blocks and inline tokens, never into HTML, and site-kit's inlineNodes draws
 * the tokens as text. Bundled into each site that imports it, as site-kit is.
 *
 * The file is untrusted. Everything here is one pass over the lines and one
 * left-to-right scan over a line's characters, with lookups built once per
 * string, so no input makes it backtrack: 100,000 "[" or backticks in one
 * line cost one scan. What it reads is bounded: at most LIMITS.lines lines,
 * LIMITS.rows rows a table, LIMITS.columns columns, and LIMITS.cell
 * characters of a cell or a drawn line.
 *
 * The subset, as paper_skeleton.md uses it: ATX headings, fenced code, tables
 * with a leading "|", lists ("- ", "* ", "+ ", "1. ") with one nested level,
 * and paragraphs; inline, code spans, links, images, bold, and backslash
 * escapes. Anything else (setext headings, block quotes, HTML, footnotes,
 * reference links, a table without a leading "|", deeper lists) is kept as
 * its literal text. Every non-blank line belongs to exactly one block, and no
 * block keeps the CR of a CRLF: CRLF and LF end a line, and a lone CR stays in
 * its line as a character (line numbers are LF-counted, as grep -n counts).
 */

/** What the reader takes at most (os-ui/PLUGINS.md Part 3, §1 fact 6). */
export const LIMITS = {
  /** Lines read from a file; the rest are left out and the document says `cut`. */
  lines: 20_000,
  /** Rows kept of one table; the table's `more` counts the others. */
  rows: 500,
  /** Columns kept of one table. */
  columns: 30,
  /** Characters of one cell, or of one line as drawn, before CUT. */
  cell: 2_000,
} as const;

/** Ends a cell or a drawn line cut at LIMITS.cell characters. */
export const CUT = " …[cut]";

/** `text` at most `max` characters, never splitting a surrogate pair, then CUT when it was longer. */
export function cutText(text: string, max: number = LIMITS.cell): string {
  if (text.length <= max) return text;
  let end = max;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end--;
  return text.slice(0, end) + CUT;
}

// ---- inline ---------------------------------------------------------------------------

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "bold"; children: Inline[] }
  | { kind: "link"; children: Inline[]; target: string }
  | { kind: "image"; alt: string; target: string };

const isPunct = (c: number) => (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
const BACKSLASH = 92;
const TICK = 96;

/**
 * The inline tokens of one line of text, left to right:
 * - "\" before ASCII punctuation is that character, as text;
 * - a run of N backticks opens a code span that ends at the next run of
 *   exactly N backticks (one space trimmed from each end when both have one);
 *   without one, the run is text;
 * - "[text](target)" is a link whose text has no "[" and whose target runs
 *   to the first ")"; "![alt](target)" is an image of the same shape;
 * - "**" opens bold to the next "**" (not nested), with links and code inside;
 * - anything else, an unmatched opener included, is text.
 * Lookups for the next "]", "[", ")", "**", and same-length backtick run are
 * built once, so every opener is decided in constant time.
 */
export function inline(text: string): Inline[] {
  const n = text.length;
  // escaped[i]: the character at i follows a backslash that escapes it.
  const escaped = new Uint8Array(n + 1);
  for (let i = 0; i < n; i++) {
    if (text.charCodeAt(i) === BACKSLASH && i + 1 < n && isPunct(text.charCodeAt(i + 1)) && escaped[i] === 0) escaped[i + 1] = 1;
  }
  const delimiter = (i: number, code: number) => text.charCodeAt(i) === code && escaped[i] === 0;
  const nextClose = new Int32Array(n + 2).fill(n);
  const nextOpen = new Int32Array(n + 2).fill(n);
  const nextParen = new Int32Array(n + 2).fill(n);
  const nextStars = new Int32Array(n + 2).fill(n);
  for (let i = n - 1; i >= 0; i--) {
    nextClose[i] = delimiter(i, 93) ? i : nextClose[i + 1]!;
    nextOpen[i] = delimiter(i, 91) ? i : nextOpen[i + 1]!;
    nextParen[i] = text.charCodeAt(i) === 41 ? i : nextParen[i + 1]!;
    nextStars[i] = delimiter(i, 42) && text.charCodeAt(i + 1) === 42 ? i : nextStars[i + 1]!;
  }
  // Backtick runs: where each starts and how long it is, and the next run of the same length.
  const runStart: number[] = [];
  const runLength: number[] = [];
  const runAt = new Int32Array(n + 1).fill(-1);
  for (let i = 0; i < n; ) {
    if (text.charCodeAt(i) !== TICK || escaped[i] === 1) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && text.charCodeAt(j) === TICK) j++;
    runAt[i] = runStart.length;
    runStart.push(i);
    runLength.push(j - i);
    i = j;
  }
  const nextSame = new Int32Array(runStart.length).fill(-1);
  const latest = new Map<number, number>();
  for (let r = runStart.length - 1; r >= 0; r--) {
    nextSame[r] = latest.get(runLength[r]!) ?? -1;
    latest.set(runLength[r]!, r);
  }

  /** The link or image whose "[" is at `open`, within [.., to): its "]" and ")" positions, or null. */
  const linkAt = (open: number, to: number): { close: number; paren: number } | null => {
    const close = nextClose[open + 1]!;
    if (close >= to || nextOpen[open + 1]! < close) return null;
    if (close + 1 >= to || text.charCodeAt(close + 1) !== 40) return null;
    const paren = nextParen[close + 2]!;
    return paren < to ? { close, paren } : null;
  };

  const scan = (from: number, to: number, bold: boolean): Inline[] => {
    const out: Inline[] = [];
    let buf = "";
    const flush = () => {
      if (buf !== "") out.push({ kind: "text", text: buf });
      buf = "";
    };
    let i = from;
    while (i < to) {
      const c = text.charCodeAt(i);
      if (c === BACKSLASH && escaped[i + 1] === 1 && i + 1 < to) {
        buf += text[i + 1];
        i += 2;
        continue;
      }
      if (c === TICK && runAt[i]! >= 0) {
        const r = runAt[i]!;
        const len = runLength[r]!;
        const close = nextSame[r]!;
        if (i + len <= to && close >= 0 && runStart[close]! + len <= to) {
          flush();
          let code = text.slice(i + len, runStart[close]);
          if (code.length >= 2 && code.startsWith(" ") && code.endsWith(" ") && trimSpaces(code) !== "") code = code.slice(1, -1);
          out.push({ kind: "code", text: code });
          i = runStart[close]! + len;
          continue;
        }
        buf += text.slice(i, Math.min(i + len, to));
        i += len;
        continue;
      }
      if (c === 33 && i + 1 < to && delimiter(i + 1, 91)) {
        const link = linkAt(i + 1, to);
        if (link !== null) {
          flush();
          out.push({ kind: "image", alt: plain(scan(i + 2, link.close, false)), target: text.slice(link.close + 2, link.paren) });
          i = link.paren + 1;
          continue;
        }
      }
      if (c === 91 && escaped[i] === 0) {
        const link = linkAt(i, to);
        if (link !== null) {
          flush();
          out.push({ kind: "link", children: scan(i + 1, link.close, bold), target: text.slice(link.close + 2, link.paren) });
          i = link.paren + 1;
          continue;
        }
      }
      if (bold && nextStars[i] === i && i + 1 < to) {
        const close = nextStars[i + 2]!;
        if (close > i + 2 && close + 1 < to) {
          flush();
          out.push({ kind: "bold", children: scan(i + 2, close, false) });
          i = close + 2;
          continue;
        }
      }
      buf += text[i];
      i++;
    }
    flush();
    return out;
  };
  return scan(0, n, true);
}

/** Tokens as the plain text they show: link text without its target, code without its backticks. */
export function plain(tokens: readonly Inline[]): string {
  let out = "";
  for (const t of tokens) {
    if (t.kind === "text" || t.kind === "code") out += t.text;
    else if (t.kind === "image") out += t.alt;
    else out += plain(t.children);
  }
  return out;
}

/** Every link target in `tokens`, in order (images are not links). */
export function linkTargets(tokens: readonly Inline[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    if (t.kind === "link") out.push(t.target, ...linkTargets(t.children));
    else if (t.kind === "bold") out.push(...linkTargets(t.children));
  }
  return out;
}

// ---- blocks ---------------------------------------------------------------------------

/** One table row: its line, its source line as written, its cells (cut, padded or cut to the header's count), and whether it had another count. */
export interface Row {
  line: number;
  source: string;
  cells: string[];
  uneven: boolean;
}

/** One list item and its nested items (one level). `text` is the item's own text, continuation lines joined; `lines` its source lines, nested items included. */
export interface Item {
  first: number;
  last: number;
  lines: string[];
  text: string;
  children: { first: number; last: number; text: string; ordered: boolean }[];
}

interface Span {
  /** First and last line, counted from 1. */
  first: number;
  last: number;
  /** The block's lines as written, without line endings. */
  lines: string[];
}

export type Heading = Span & { kind: "heading"; level: number; text: string };
export type Code = Span & { kind: "code"; info: string; body: string[]; closed: boolean };
/** `skipped`: lines inside the table holding nothing visible, which do not end it (they are no rows). */
export type Table = Span & { kind: "table"; header: string[]; rows: Row[]; more: number; columnsCut: boolean; skipped: number[] };
export type List = Span & { kind: "list"; ordered: boolean; items: Item[] };
export type Paragraph = Span & { kind: "paragraph"; text: string };
export type Block = Heading | Code | Table | List | Paragraph;

export interface Doc {
  blocks: Block[];
  /** Lines read (at most LIMITS.lines). */
  lines: number;
  /** The text had more lines than LIMITS.lines; those were not read. */
  cut: boolean;
}

/**
 * A text's lines: LF ends one, and a CR right before it is dropped (CRLF); a
 * final line break ends the last line. A lone CR is no line break: it stays
 * in its line as a character (drawn as a marker), so line numbers are the
 * ones `grep -n`, the Code view, and an agent's tools count.
 */
export function splitLines(text: string): string[] {
  const lines: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) !== 10) continue;
    lines.push(text.slice(start, i > start && text.charCodeAt(i - 1) === 13 ? i - 1 : i));
    start = i + 1;
  }
  if (start < text.length) lines.push(text.slice(start));
  return lines;
}

const spaceOrTab = (c: number) => c === 32 || c === 9;

/** `text` without the spaces and tabs at either end (not JavaScript's trim, which also takes a CR, a byte-order mark, a no-break space, …). */
export function trimSpaces(text: string): string {
  let a = 0;
  let b = text.length;
  while (a < b && spaceOrTab(text.charCodeAt(a))) a++;
  while (b > a && spaceOrTab(text.charCodeAt(b - 1))) b--;
  return text.slice(a, b);
}

/** A blank line: spaces and tabs only. A line of other characters JavaScript's trim() takes (U+FEFF, a no-break space, U+2028, U+3000 …) is not blank. */
const blank = (line: string) => trimSpaces(line) === "";

/**
 * A line of nothing visible that is not blank: invisible, format, and space
 * characters other than plain spaces and tabs. Inside a table it does not
 * end the table (the rows after it are still rows); the table records it.
 */
const INVISIBLE_ONLY = /^[ \t\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\p{Z}⠀]+$/u;
const invisibleOnly = (line: string) => !blank(line) && INVISIBLE_ONLY.test(line);

/** Leading white space as columns: a space is 1, a tab 4. */
function indentOf(line: string): number {
  let width = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if (c === 32) width++;
    else if (c === 9) width += 4;
    else break;
  }
  return width;
}

/** An ATX heading: 1 to 6 "#" and a space, then its text without a closing run of "#". */
function headingOf(line: string): { level: number; text: string } | null {
  let level = 0;
  while (level < line.length && line.charCodeAt(level) === 35) level++;
  if (level < 1 || level > 6) return null;
  const after = line.charCodeAt(level);
  if (after !== 32 && after !== 9) return null;
  let text = trimSpaces(line.slice(level));
  // A closing sequence: "#"s at the end, after a space (or all of it).
  let end = text.length;
  while (end > 0 && text.charCodeAt(end - 1) === 35) end--;
  if (end === 0) text = "";
  else if (end < text.length && (text.charCodeAt(end - 1) === 32 || text.charCodeAt(end - 1) === 9)) text = trimSpaces(text.slice(0, end));
  return { level, text };
}

/** A fence: three or more backticks or tildes; its character, length, and info string. */
function fenceOf(line: string): { char: number; length: number; info: string } | null {
  const char = line.charCodeAt(0);
  if (char !== TICK && char !== 126) return null;
  let length = 0;
  while (length < line.length && line.charCodeAt(length) === char) length++;
  return length >= 3 ? { char, length, info: trimSpaces(line.slice(length)) } : null;
}

function closesFence(line: string, fence: { char: number; length: number }): boolean {
  let end = line.length;
  while (end > 0 && spaceOrTab(line.charCodeAt(end - 1))) end--;
  const trimmed = line.slice(0, end);
  let length = 0;
  while (length < trimmed.length && trimmed.charCodeAt(length) === fence.char) length++;
  return length >= fence.length && length === trimmed.length;
}

/** A list item's marker at the start of `text`: "-", "*", "+", or 1 to 9 digits and ".", then a space or the end. */
function markerOf(text: string): { kind: string; width: number } | null {
  const c = text.charCodeAt(0);
  if (c === 45 || c === 42 || c === 43) {
    const after = text.charCodeAt(1);
    return text.length === 1 || after === 32 || after === 9 ? { kind: text[0]!, width: 1 } : null;
  }
  let digits = 0;
  while (digits < text.length && digits < 10 && text.charCodeAt(digits) >= 48 && text.charCodeAt(digits) <= 57) digits++;
  if (digits === 0 || digits > 9 || text.charCodeAt(digits) !== 46) return null;
  const after = text.charCodeAt(digits + 1);
  return text.length === digits + 1 || after === 32 || after === 9 ? { kind: "1.", width: digits + 1 } : null;
}

/**
 * A table row's cells: split on "|" but not "\|", which becomes "|" (as in
 * GFM, inside code spans too); the leading "|" and a trailing one dropped;
 * each cell trimmed and cut at LIMITS.cell characters.
 */
export function splitCells(line: string): string[] {
  const cells: string[] = [];
  const body = trimSpaces(line);
  let cell = "";
  // body starts with "|": skip it.
  for (let i = 1; i < body.length; i++) {
    const c = body.charCodeAt(i);
    if (c === BACKSLASH && body.charCodeAt(i + 1) === 124) {
      cell += "|";
      i++;
    } else if (c === 124) {
      cells.push(cell);
      cell = "";
    } else cell += body[i];
  }
  // Text after the last "|" is a cell; nothing (a trailing "|") is none.
  if (trimSpaces(cell) !== "" || !body.endsWith("|") || body.endsWith("\\|")) cells.push(cell);
  return cells.map((c) => cutText(trimSpaces(c)));
}

/** A delimiter row: every cell dashes, optionally with a ":" at either end. */
function isDelimiterRow(line: string): boolean {
  if (!startsRow(line)) return false;
  const cells = splitCells(line);
  if (cells.length === 0) return false;
  return cells.every((cell) => {
    let from = 0;
    let to = cell.length;
    if (cell.charCodeAt(0) === 58) from++;
    if (to > from && cell.charCodeAt(to - 1) === 58) to--;
    if (to <= from) return false;
    for (let i = from; i < to; i++) if (cell.charCodeAt(i) !== 45) return false;
    return true;
  });
}

/** A table row: "|" after spaces and tabs only. */
function startsRow(line: string): boolean {
  let i = 0;
  while (i < line.length && spaceOrTab(line.charCodeAt(i))) i++;
  return line.charCodeAt(i) === 124;
}

/** Whether `line` (followed by `next`) starts a block other than a paragraph, so a paragraph ends before it. */
function startsBlock(line: string, next: string | undefined): boolean {
  return headingOf(line) !== null || fenceOf(line) !== null || (startsRow(line) && next !== undefined && isDelimiterRow(next)) || markerOf(line) !== null;
}

/** A drawn line: without spaces and tabs at either end, and cut at LIMITS.cell characters. */
const drawn = (line: string) => cutText(trimSpaces(line));

/** The blocks of a Markdown text, in one pass over at most LIMITS.lines lines. */
export function parse(source: string): Doc {
  const all = splitLines(source.startsWith("﻿") ? source.slice(1) : source);
  const cut = all.length > LIMITS.lines;
  const lines = cut ? all.slice(0, LIMITS.lines) : all;
  const blocks: Block[] = [];
  const span = (from: number, to: number) => ({ first: from + 1, last: to + 1, lines: lines.slice(from, to + 1) });
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (blank(line)) {
      i++;
      continue;
    }
    const heading = headingOf(line);
    if (heading !== null) {
      blocks.push({ kind: "heading", level: heading.level, text: cutText(heading.text), ...span(i, i) });
      i++;
      continue;
    }
    const fence = fenceOf(line);
    if (fence !== null) {
      let j = i + 1;
      while (j < lines.length && !closesFence(lines[j]!, fence)) j++;
      const closed = j < lines.length;
      const end = closed ? j : lines.length - 1;
      blocks.push({ kind: "code", info: cutText(fence.info), body: lines.slice(i + 1, closed ? j : lines.length), closed, ...span(i, end) });
      i = end + 1;
      continue;
    }
    if (startsRow(line) && i + 1 < lines.length && isDelimiterRow(lines[i + 1]!)) {
      const head = splitCells(line);
      const width = Math.min(head.length, LIMITS.columns);
      const rows: Row[] = [];
      const skipped: number[] = [];
      let more = 0;
      let j = i + 2;
      for (; j < lines.length; j++) {
        if (!startsRow(lines[j]!)) {
          // Lines of nothing visible do not end the table when a row follows them.
          let k = j;
          while (k < lines.length && invisibleOnly(lines[k]!)) k++;
          if (k === j || k === lines.length || !startsRow(lines[k]!)) break;
          for (let s = j; s < k; s++) skipped.push(s + 1);
          j = k;
        }
        if (rows.length >= LIMITS.rows) {
          more++;
          continue;
        }
        const cells = splitCells(lines[j]!);
        const uneven = cells.length !== head.length;
        const fitted = cells.slice(0, width);
        while (fitted.length < width) fitted.push("");
        rows.push({ line: j + 1, source: lines[j]!, cells: fitted, uneven });
      }
      blocks.push({ kind: "table", header: head.slice(0, width), rows, more, columnsCut: head.length > width, skipped, ...span(i, j - 1) });
      i = j;
      continue;
    }
    const marker = markerOf(line);
    if (marker !== null) {
      const items: Item[] = [];
      let j = i;
      while (j < lines.length && !blank(lines[j]!)) {
        const current = lines[j]!;
        const top = markerOf(current);
        if (top !== null && indentOf(current) === 0) {
          if (top.kind !== marker.kind) break;
          items.push({ first: j + 1, last: j + 1, lines: [current], text: drawn(current.slice(top.width)), children: [] });
          j++;
          continue;
        }
        // A continuation line: indented by two or more columns.
        if (indentOf(current) < 2) break;
        const item = items[items.length - 1]!;
        const inner = trimSpaces(current);
        const nested = markerOf(inner);
        if (nested !== null) item.children.push({ first: j + 1, last: j + 1, text: drawn(inner.slice(nested.width)), ordered: nested.kind === "1." });
        else if (item.children.length > 0) {
          const child = item.children[item.children.length - 1]!;
          child.text = joinText(child.text, drawn(inner));
          child.last = j + 1;
        } else item.text = joinText(item.text, drawn(inner));
        item.lines.push(current);
        item.last = j + 1;
        j++;
      }
      blocks.push({ kind: "list", ordered: marker.kind === "1.", items, ...span(i, j - 1) });
      i = j;
      continue;
    }
    let j = i + 1;
    while (j < lines.length && !blank(lines[j]!) && !startsBlock(lines[j]!, lines[j + 1])) j++;
    blocks.push({ kind: "paragraph", text: lines.slice(i, j).map(drawn).join(" "), ...span(i, j - 1) });
    i = j;
  }
  return { blocks, lines: lines.length, cut };
}

const joinText = (a: string, b: string) => (a === "" ? b : b === "" ? a : `${a} ${b}`);

// ---- sections and paper_skeleton.md's conventions -------------------------------------

/** A heading at any level and the blocks up to the next heading of any level. */
export interface Section {
  level: number;
  title: string;
  line: number;
  blocks: Block[];
}

/** The document's sections, flat, in file order (blocks before the first heading belong to none). */
export function sections(doc: Doc): Section[] {
  const out: Section[] = [];
  for (const block of doc.blocks) {
    if (block.kind === "heading") out.push({ level: block.level, title: block.text, line: block.first, blocks: [] });
    else out[out.length - 1]?.blocks.push(block);
  }
  return out;
}

const same = (a: string, b: string) => trimSpaces(a).toLowerCase() === trimSpaces(b).toLowerCase();

/** The first section whose title is `title`, ignoring case. */
export function section(all: readonly Section[], title: string): Section | null {
  return all.find((s) => same(s.title, title)) ?? null;
}

/** A link's target as a project path ("Code/README.md"), or as written when it is an address, or null when it leaves the project. */
export type Resolved = { kind: "path"; path: string } | { kind: "address"; text: string };

/**
 * A link's target, resolved from `fromFile` (a project path). A target with a
 * scheme ("https:") or a leading "/" or "#" stays as written. Any other
 * loses its "#…" and "?…", is percent-decoded once, and is resolved from
 * `fromFile`'s folder ("." and ".." applied); it is null when it leaves the
 * project, or when the path it names has a dot segment (a name starting with
 * ".", which the read channel never serves), an empty segment, or a
 * backslash.
 */
export function resolveLink(target: string, fromFile: string): Resolved | null {
  const raw = trimSpaces(target);
  if (raw === "") return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw) || raw.startsWith("/") || raw.startsWith("#")) return { kind: "address", text: raw };
  let path = raw;
  const stop = path.search(/[?#]/);
  if (stop !== -1) path = path.slice(0, stop);
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (path === "" || /[\\\0]/.test(path)) return null;
  const folder = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")).split("/") : [];
  const dir = path.endsWith("/");
  const parts = [...folder];
  const segments = (dir ? path.slice(0, -1) : path).split("/");
  for (const segment of segments) {
    if (segment === ".") continue;
    if (segment === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else parts.push(segment);
  }
  if (parts.length === 0 || parts.some((s) => s === "" || s.startsWith("."))) return null;
  return { kind: "path", path: parts.join("/") + (dir ? "/" : "") };
}

/** One Snapshot item: "<Label>: <value>", the value with its continuation lines joined. */
export interface SnapshotItem {
  label: string;
  value: string;
  first: number;
  last: number;
  lines: string[];
}

/** The first list of section "Snapshot", as label-value items; null without that section or list. */
export function snapshot(all: readonly Section[]): { section: Section; list: List; items: SnapshotItem[] } | null {
  const sec = section(all, "Snapshot");
  const list = sec?.blocks.find((b): b is List => b.kind === "list");
  if (sec === null || sec === undefined || list === undefined) return null;
  const items = list.items.map((item) => {
    const colon = item.text.indexOf(":");
    const label = colon === -1 ? item.text : item.text.slice(0, colon);
    const value = colon === -1 ? "" : item.text.slice(colon + 1);
    return { label: trimSpaces(label), value: trimSpaces(value), first: item.first, last: item.last, lines: item.lines };
  });
  return { section: sec, list, items };
}

/** A Snapshot item by its label, ignoring case. */
export const snapshotItem = (items: readonly SnapshotItem[], label: string) => items.find((i) => same(i.label, label)) ?? null;

/** The column of `header` named `name`, ignoring case, or -1. */
export const column = (header: readonly string[], name: string) => header.findIndex((h) => same(h, name));

/** The Claims and Evidence table's columns, by header name. */
export const CLAIM_COLUMNS = ["Claim", "Evidence", "Source file or link", "Citation/result", "Status"] as const;

export interface Claim {
  /** The leading "C1" of the Claim cell, or null. */
  id: string | null;
  /** The Claim cell after its ID. */
  text: string;
  evidence: string | null;
  source: string | null;
  result: string | null;
  status: string | null;
  line: number;
  /** The row as written. */
  row: string;
}

export type Claims =
  | { found: false; section: Section | null }
  | { found: true; section: Section; table: Table; missing: string[]; claims: Claim[]; columns: number[]; empty: number[] };

/** A claim's ID: 1 to 4 capitals, 1 to 4 digits, an optional small letter, then ": ". */
const CLAIM_ID = /^([A-Z]{1,4}[0-9]{1,4}[a-z]?): /;

/**
 * The first table of section "Claims and Evidence", its columns found by
 * header name. A row whose Claim cell is empty is not a claim (the
 * template's placeholder row; `empty` lists their lines). `missing` names
 * the headers not found; `columns` is the column of each of CLAIM_COLUMNS, or -1.
 */
export function claims(all: readonly Section[]): Claims {
  const sec = section(all, "Claims and Evidence");
  const table = sec?.blocks.find((b): b is Table => b.kind === "table");
  if (sec === null || table === undefined) return { found: false, section: sec };
  const at = CLAIM_COLUMNS.map((name) => column(table.header, name));
  const missing = CLAIM_COLUMNS.filter((_, k) => at[k] === -1);
  const cell = (row: Row, k: number) => (at[k] === -1 ? null : row.cells[at[k]!]!);
  const out: Claim[] = [];
  const empty: number[] = [];
  if (at[0] !== -1) {
    for (const row of table.rows) {
      const claim = cell(row, 0)!;
      if (claim === "") {
        empty.push(row.line);
        continue;
      }
      const id = CLAIM_ID.exec(claim);
      out.push({
        id: id === null ? null : id[1]!,
        text: id === null ? claim : claim.slice(id[0].length),
        evidence: cell(row, 1),
        source: cell(row, 2),
        result: cell(row, 3),
        status: cell(row, 4),
        line: row.line,
        row: row.source,
      });
    }
  }
  return { found: true, section: sec, table, missing, claims: out, columns: at, empty };
}

/** One row of the Experiments table: its Study (first cell), its line, and the claim IDs its Claim cell lists. */
export interface Study {
  study: string;
  line: number;
  ids: string[];
}

/** The rows of the first table of section "Experiments"; null without that table, or when it has no Claim column. */
export function studies(all: readonly Section[]): Study[] | null {
  const table = section(all, "Experiments")?.blocks.find((b): b is Table => b.kind === "table");
  if (table === undefined) return null;
  const at = column(table.header, "Claim");
  if (at === -1) return null;
  return table.rows.map((row) => ({
    study: row.cells[0] ?? "",
    line: row.line,
    ids: row.cells[at]!.split(",").map((s) => trimSpaces(s)).filter((s) => s !== ""),
  }));
}

/** The studies that list `id` in their Claim cell. */
export const usedBy = (all: readonly Study[], id: string) => all.filter((s) => s.ids.includes(id));
