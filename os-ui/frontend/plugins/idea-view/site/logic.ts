/**
 * The Idea view page's pure parts (os-ui/PLUGINS.md Part 3, §5): the idea
 * file's grammar (§5.1) and its validation (§5.2) over md-kit's table, the
 * claims of paper_skeleton.md as the authority for a claim node, the labels
 * and quotes a selection reports, the detail panel's and the bar's words, and
 * every screen's. No DOM and no fetch, so `npm test` runs them in Node. The
 * files are data: everything here builds strings, and main.ts puts them on
 * screen as text only.
 *
 * Every rule costs one pass over what md-kit read: a row's cells are split
 * once, a Links or Points to cell is scanned once (code spans found by one
 * scan with a lookup of the next backtick run of the same length), and an ID
 * is found in a map. What a problem says is built only for the problems
 * listed, so a cell of 100,000 bad items costs one pass and LIMITS.problems
 * sentences. Comparisons follow the design: an ID is first checked against
 * its ASCII pattern, then compared in ASCII lower case (no Unicode case
 * mapping, so the Kelvin sign is never a k); a claim ID is compared exactly.
 */
import { claims as skeletonClaims, cutText, inline, LIMITS as MD, parse, plain, sections, splitCells, trimSpaces } from "../../md-kit.ts";
import type { Doc, Table } from "../../md-kit.ts";
import { clip, cutMarked, LABEL_MAX, markInvisible, QUOTE_MAX, readText, visibleName } from "../../site-kit.ts";

// ---- what the view reads --------------------------------------------------------------

/** The idea file, relative to its project (os-ui/PLUGINS.md Part 3, §5.1). */
export const FILE = "idea_graph.md";
/** The authority for a claim node's status (§5.2). */
export const SKELETON = "paper_skeleton.md";
/** Bytes of the idea file the view reads at most (§1 fact 6); a larger file is a screen. */
export const READ_MAX = 512 * 1024;
/** Bytes of paper_skeleton.md read at most, as the Skeleton view reads it. */
export const SKELETON_MAX = 1024 * 1024;
/** What the view draws and lists at most (§1 fact 6, §5.2). */
export const LIMITS = {
  /** Nodes drawn: the first valid rows, in file order. */
  nodes: 200,
  /** Links drawn: the first valid ones, in file order (a result's experiment is not one). */
  links: 1000,
  /** Problems of rows and links listed; every one is counted, and caps, cycles, and the file's own problems are always listed. */
  problems: 500,
} as const;

export const filePath = (project: string) => `projects-folder/${project}/${FILE}`;
export const skeletonPath = (project: string) => `projects-folder/${project}/${SKELETON}`;

// ---- the grammar (§5.1) ---------------------------------------------------------------

export const HEADER = ["ID", "Kind", "Statement", "Status", "Links", "Points to", "Source"] as const;
/** The header line the empty state shows, as an agent writes it. */
export const HEADER_LINE = `| ${HEADER.join(" | ")} |`;

export const KINDS = ["question", "hypothesis", "experiment", "result", "claim"] as const;
export type Kind = (typeof KINDS)[number];

/** The status words by kind; a claim's are those of the template's claims table (§5.1, I-2). */
export const STATUS: Record<Kind, readonly string[]> = {
  question: ["open", "answered"],
  hypothesis: ["open", "supported", "refuted"],
  experiment: ["planned", "running", "done", "failed"],
  result: ["recorded"],
  claim: ["planned", "verified", "weak", "removed"],
};
/** The statuses "Still open" lists. */
const PENDING = new Set(["open", "planned", "running"]);
/** The panel's row of the nodes not yet settled (PENDING). */
export const STILL_OPEN = "Still open";

/** Text that draws nothing visible: only white space and spaces of any width (a no-break space, U+3000, …). */
const blankDrawn = (text: string) => /^[\s\p{Zs}]*$/u.test(text);

/**
 * A statement as the map's box and its tooltip draw it: one line of its words
 * (md-kit's tokens as plain text, cut at 2,000), invisible characters marked.
 * When that draws nothing visible (a statement of only a no-break space, an
 * image with no alt text), the statement as written, every space other than
 * U+0020 a marker, so no box is blank.
 */
export function nodeWords(statement: string): string {
  const words = markInvisible(plain(inline(cutText(statement))));
  return blankDrawn(words) ? visibleName(cutText(statement)) : words;
}

/** A node's tooltip: its ID, kind, status, and statement, each from the file marked as a label or the box marks it. */
export const tooltipOf = (node: IdeaNode) => `${visibleName(node.id)} (${node.kind}), ${visibleName(node.status)}: ${nodeWords(node.statement)}`;

/** The link words, in the legend's order. */
export const WORDS = ["motivates", "tests", "supports", "refutes"] as const;
export type Word = (typeof WORDS)[number];
/** Which kinds each word may join, from this row's node to the node named. */
export const JOINS: Record<Word, { from: readonly Kind[]; to: readonly Kind[] }> = {
  motivates: { from: KINDS, to: ["question", "hypothesis", "experiment"] },
  tests: { from: ["experiment"], to: ["question", "hypothesis"] },
  supports: { from: ["result"], to: ["hypothesis", "claim"] },
  refutes: { from: ["result"], to: ["hypothesis", "claim"] },
};

/**
 * Which way each link counts when a cycle is looked for (§5.1 "A DAG"): from
 * what must exist first to what follows from it. "row" is the node whose row
 * states the link (a result, for from:), "target" the node it names. So A
 * motivates B is A → B; E tests X is X → E; R supports or refutes X is X → R;
 * R from: E is E → R. A default the directing agent took on 2026-11-24 and
 * told the Human Owner, not yet confirmed. To reverse it to the first build's
 * rule (each link from its row to its target, a result's experiment before
 * the result), set tests, supports, and refutes to "row".
 */
export const FIRST: Record<Word | "from", "row" | "target"> = { motivates: "row", tests: "target", supports: "target", refutes: "target", from: "target" };

/** A node's ID: a letter, then at most 15 letters, digits, "_" or "-" (ASCII only). */
const ID = /^[A-Za-z][A-Za-z0-9_-]{0,15}$/;
/** A claim's ID in paper_skeleton.md (md-kit's CLAIM_ID without its ": "): compared exactly. */
const CLAIM_ID = /^[A-Z]{1,4}[0-9]{1,4}[a-z]?$/;
/** An experiment's commit: 7 to 64 lower-case hex digits, or none. */
const COMMIT = /^(?:[0-9a-f]{7,64}|none)$/;
/** A target with a scheme ("https:") is an address, not a project path. */
const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/**
 * Text in ASCII lower case. Header cells and IDs are compared through it:
 * only A to Z change, so no other character ever equals a letter (the
 * Kelvin sign U+212A stays itself, where toLowerCase() makes it "k").
 */
const asciiLower = (text: string) => text.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

// ---- the model ------------------------------------------------------------------------

/** What a node points to, as read from its Points to cell. A run's `commit` and `files` are null for `none`: the run recorded no commit, or left no result file. */
export type Points =
  | { kind: "empty" }
  | { kind: "run"; commit: string | null; files: string[] | null }
  | { kind: "from"; id: string }
  | { kind: "claim"; id: string };

/** One node: a row of the table that passed every row rule. */
export interface IdeaNode {
  /** The ID in ASCII lower case: what identifies the node (IDs are unique ignoring case). */
  key: string;
  /** The ID as written. */
  id: string;
  kind: Kind;
  /** The Statement cell as written (inline Markdown, drawn as text). */
  statement: string;
  status: string;
  points: Points;
  /** The Source cell as written, "" when empty. */
  source: string;
  line: number;
  /** The row as written: the quote. */
  row: string;
  /** Its place among the nodes drawn, in file order. */
  index: number;
  /** The Links cell, read once every node is known. */
  linksCell: string;
}

export interface Link {
  word: Word;
  from: IdeaNode;
  to: IdeaNode;
  /** The line of the row that states it. */
  line: number;
}

/** A result and the experiment its `from:` names: drawn as a dotted line, not a link word (§5.3, N-6). */
export interface Came {
  result: IdeaNode;
  experiment: IdeaNode;
}

/** A problem of the file: where (null for the whole file), its line for ordering, and what. */
export interface Problem {
  at: string | null;
  line: number;
  text: string;
}

/** A pointer as resolved: a result's experiment, or a claim's row of paper_skeleton.md. */
export type Pointer =
  | { kind: "from"; state: "found"; id: string; node: IdeaNode }
  | { kind: "from"; state: "missing"; id: string; why: string }
  | { kind: "claim"; state: "found"; id: string; line: number; text: string; status: string }
  | { kind: "claim"; state: "missing"; id: string; why: string }
  | { kind: "claim"; state: "unchecked"; id: string }
  | { kind: "claim"; state: "none" };

export type ClaimCheck = { checked: true; verified: number; total: number } | { checked: false; total: number; why: string };

export interface Graph {
  /** The nodes drawn (at most LIMITS.nodes), in file order. */
  nodes: IdeaNode[];
  byKey: Map<string, IdeaNode>;
  /** The links drawn (at most LIMITS.links), in file order. */
  links: Link[];
  came: Came[];
  /** By node key. */
  pointers: Map<string, Pointer>;
  /** The problems listed, by line; `problemCount` is every one. */
  problems: Problem[];
  problemCount: number;
  /** Valid nodes and links before the caps. */
  totals: { nodes: number; links: number };
  claims: ClaimCheck;
  table: { first: number; last: number };
}

/** The graph's header found where md-kit reads no table: inside a code block, or a list item (lines `first` to `last`). */
export interface Nested {
  line: number;
  where: "code" | "list";
  first: number;
  last: number;
}

export type Built = { kind: "graph"; graph: Graph } | { kind: "no-table"; first: { line: number; source: string } | null; nested: Nested | null; notes: string[] };

// ---- words ----------------------------------------------------------------------------

const n = (value: number) => value.toLocaleString("en-US");
const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;
const KIND_PLURAL: Record<Kind, string> = { question: "questions", hypothesis: "hypotheses", experiment: "experiments", result: "results", claim: "claims" };
const article = (kind: string) => (/^[aeiou]/.test(kind) ? `an ${kind}` : `a ${kind}`);

/** "a", "a or b", "a, b, or c". */
function either(items: readonly string[], and = "or"): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} ${and} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${and} ${items[items.length - 1]}`;
}

/** Items joined with "and", the first `max` named, then "and N more". */
function listOf(items: readonly string[], max = 10): string {
  return items.length > max ? `${items.slice(0, max).join(", ")}, and ${n(items.length - max)} more` : either(items, "and");
}

/** File text inside a sentence: as a label shows it (invisible characters, and spaces other than U+0020, as markers), at most `max` characters. */
function shown(text: string, max = 60): string {
  // A marker is at most 10 characters for 1 or 2, so the first 10 × max characters give the same cut.
  return cutMarked(visibleName(text.length > max * 10 ? text.slice(0, max * 10) : text), max, "…");
}

/** "line 5", "lines 5 and 6", "lines 5, 6, and 7", or "lines 205–234". */
function atLines(lines: readonly number[]): string {
  return lines.length === 1 ? `line ${n(lines[0]!)}` : `lines ${listOf(lines.map(n))}`;
}
const atRange = (first: number, last: number) => (first === last ? `line ${n(first)}` : `lines ${n(first)}–${n(last)}`);

/** A problem as the list shows it: "line 7: …". */
export const problemLine = (p: Problem) => (p.at === null ? p.text : `${p.at}: ${p.text}`);
/** The bar's problems line. */
export const problemsTitle = (count: number) => `${plural(count, "problem")} in ${FILE}`;
/** The list's last line when not every problem is listed, or null. */
export const moreWords = (g: Graph) => {
  const more = g.problemCount - g.problems.length;
  return more > 0 ? `and ${n(more)} more ${more === 1 ? "problem is" : "problems are"} not listed` : null;
};

/** The problems of one build: every one counted, the first LIMITS.problems of rows and links kept (their words built only then). */
class Problems {
  list: Problem[] = [];
  count = 0;
  private kept = 0;
  add(at: string | null, line: number, text: () => string, always = false): void {
    this.count++;
    if (always) this.list.push({ at, line, text: text() });
    else if (this.kept < LIMITS.problems) {
      this.kept++;
      this.list.push({ at, line, text: text() });
    }
  }
}

// ---- paper_skeleton.md ----------------------------------------------------------------

/** paper_skeleton.md as the view got it (main.ts reads it as the Skeleton view does). */
export type SkeletonInput = { ok: true; doc: Doc } | { ok: false; status: number } | { ok: false; problem: "too-large" | "binary" | "encoding" };

/** A file as main.ts read it through the channel: at most `max` + 1 bytes (`cut` when readStart stopped there), or the channel's status. */
export type Read = { ok: true; bytes: Uint8Array; cut: boolean } | { ok: false; status: number };

/** paper_skeleton.md as the claims' authority takes it: more than SKELETON_MAX bytes is too large. */
export function skeletonInput(r: Read): SkeletonInput {
  if (!r.ok) return { ok: false, status: r.status };
  if (r.cut || r.bytes.length > SKELETON_MAX) return { ok: false, problem: "too-large" };
  const text = readText(r.bytes);
  return text.kind === "text" ? { ok: true, doc: parse(text.text) } : { ok: false, problem: text.kind };
}

interface SkeletonClaim {
  line: number;
  text: string;
  status: string | null;
}

/** Its claims by ID, and what of the table the view does not read; or why the claims cannot be checked. */
export type SkeletonRead = { ok: true; claims: Map<string, SkeletonClaim[]>; partial: string | null } | { ok: false; why: string };

/** A read channel status for paper_skeleton.md, in a few words. */
function skeletonStatus(status: number): string {
  if (status === 404) return `${SKELETON} is not there, or it is a link the Idea view may not follow`;
  if (status === 413) return `${SKELETON} is larger than 32 MiB, the most the app reads`;
  if (status === 503) return "too many files were being read at once; Reload to try again";
  if (status === 0) return "the Idea view could not reach the app";
  return `the app answered ${status} for ${SKELETON}`;
}

/** The skeleton's claims table by md-kit's rules (§2: the claim ID rule), or why it gives none. */
export function skeletonFrom(read: SkeletonInput): SkeletonRead {
  if (!read.ok) {
    if ("status" in read) return { ok: false, why: skeletonStatus(read.status) };
    if (read.problem === "too-large") return { ok: false, why: `${SKELETON} is larger than 1 MiB, the most the Idea view reads of it` };
    if (read.problem === "binary") return { ok: false, why: `${SKELETON} holds binary data` };
    return { ok: false, why: `${SKELETON} is text in an encoding other than UTF-8` };
  }
  const found = skeletonClaims(sections(read.doc));
  if (!found.found) {
    const fence = read.doc.blocks.find((b) => b.kind === "code" && !b.closed);
    const after = fence === undefined ? "" : ` (everything after its code fence opened on line ${n(fence.first)} and never closed is read as code)`;
    return { ok: false, why: `no Claims and Evidence table was found in ${SKELETON}${after}` };
  }
  if (found.columns[0] === -1) return { ok: false, why: `the Claims and Evidence table in ${SKELETON} has no Claim column` };
  const claims = new Map<string, SkeletonClaim[]>();
  for (const c of found.claims) {
    if (c.id === null) continue;
    const list = claims.get(c.id) ?? [];
    list.push({ line: c.line, text: c.text, status: c.status });
    claims.set(c.id, list);
  }
  const partial = found.table.more > 0 ? `the table's first ${n(found.table.rows.length)}` : read.doc.cut && found.table.last === read.doc.lines ? `the first ${n(read.doc.lines)} lines of the file` : null;
  return { ok: true, claims, partial };
}

const isVerified = (status: string | null) => status !== null && asciiLower(trimSpaces(status)) === "verified";

// ---- Points to ------------------------------------------------------------------------

/**
 * Where each code span of `text` ends, by the index of its opening run: a
 * run of N backticks opens a span closed by the next run of exactly N, as
 * md-kit reads one (backslash escapes aside); a run with no such close is
 * text. One scan, with the next same-length run looked up, not searched.
 */
function codeSpans(text: string): Map<number, number> {
  const starts: number[] = [];
  const lengths: number[] = [];
  for (let i = 0; i < text.length; ) {
    if (text.charCodeAt(i) !== 96) {
      i++;
      continue;
    }
    let j = i;
    while (j < text.length && text.charCodeAt(j) === 96) j++;
    starts.push(i);
    lengths.push(j - i);
    i = j;
  }
  const next = new Int32Array(starts.length).fill(-1);
  const latest = new Map<number, number>();
  for (let r = starts.length - 1; r >= 0; r--) {
    next[r] = latest.get(lengths[r]!) ?? -1;
    latest.set(lengths[r]!, r);
  }
  const ends = new Map<number, number>();
  for (let r = 0; r < starts.length; ) {
    const close = next[r]!;
    if (close === -1) {
      r++;
      continue;
    }
    ends.set(starts[r]!, starts[close]! + lengths[close]!);
    r = close + 1;
  }
  return ends;
}

/** `text` split where `isSeparator(i)` holds, outside code spans; the pieces as written. */
function splitOutside(text: string, isSeparator: (i: number) => boolean): string[] {
  const spans = codeSpans(text);
  const pieces: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const end = spans.get(i);
    if (end !== undefined) {
      i = end - 1;
      continue;
    }
    if (isSeparator(i)) {
      pieces.push(text.slice(start, i));
      start = i + 1;
    }
  }
  pieces.push(text.slice(start));
  return pieces;
}

/** A path as written in a files list: bare, or exactly one code span (one space trimmed from each end when both have one, as md-kit). Null when it is neither. */
function pathOf(piece: string): string | null {
  if (!piece.includes("`")) return piece;
  const spans = codeSpans(piece);
  const end = spans.get(0);
  if (end !== piece.length || spans.size !== 1) return null;
  let run = 0;
  while (piece.charCodeAt(run) === 96) run++;
  let inner = piece.slice(run, piece.length - run);
  if (inner.length >= 2 && inner.startsWith(" ") && inner.endsWith(" ") && trimSpaces(inner) !== "") inner = inner.slice(1, -1);
  return inner;
}

/** A project-relative path: no leading "/", no "\", no address, and every segment a name that does not start with "." (so no "." or ".."). */
const isProjectPath = (path: string) => path !== "" && !path.startsWith("/") && !path.includes("\\") && !SCHEME.test(path) && path.split("/").every((s) => s !== "" && !s.startsWith("."));

const KEYS: Record<Kind, readonly string[]> = { question: [], hypothesis: [], experiment: ["commit", "files"], result: ["from"], claim: ["claim"] };

/** A row's Points to by its kind (§5.1), or the first reason it is not one. */
function pointsOf(kind: Kind, status: string, cell: string): { ok: true; points: Points } | { ok: false; why: string } {
  const fail = (why: string) => ({ ok: false as const, why });
  if (kind === "question" || kind === "hypothesis") return cell === "" ? { ok: true, points: { kind: "empty" } } : fail(`${article(kind)} points to nothing, so its Points to cell must be empty`);
  if (cell === "") {
    if (kind === "claim") return { ok: true, points: { kind: "empty" } };
    if (kind === "result") return fail("a result needs “from: <ID of an experiment>” in Points to");
    if (status === "planned") return { ok: true, points: { kind: "empty" } };
    return fail(STATUS.experiment.includes(status) ? `a ${status} experiment needs “commit:” and “files:” in Points to` : "an experiment needs “commit:” and “files:” in Points to unless it is planned");
  }
  const values = new Map<string, string>();
  for (const raw of splitOutside(cell, (i) => cell.charCodeAt(i) === 59)) {
    const pair = trimSpaces(raw);
    if (pair === "") continue;
    const colon = pair.indexOf(":");
    if (colon === -1) return fail(`“${shown(pair)}” in Points to is not a “key: value” pair`);
    const key = trimSpaces(pair.slice(0, colon));
    if (!KEYS[kind].includes(key)) return fail(`“${shown(key)}” is not a key ${article(kind)} points with (${KEYS[kind].join(", ")})`);
    if (values.has(key)) return fail(`Points to names “${key}:” twice`);
    values.set(key, trimSpaces(pair.slice(colon + 1)));
  }
  if (kind === "result") {
    const from = values.get("from");
    if (from === undefined) return fail("a result needs “from: <ID of an experiment>” in Points to");
    return ID.test(from) ? { ok: true, points: { kind: "from", id: from } } : fail(`“${shown(from)}” after “from:” is not an ID`);
  }
  if (kind === "claim") {
    const claim = values.get("claim");
    if (claim === undefined) return { ok: true, points: { kind: "empty" } };
    return CLAIM_ID.test(claim) ? { ok: true, points: { kind: "claim", id: claim } } : fail(`“${shown(claim)}” after “claim:” is not a claim ID (1 to 4 capitals, 1 to 4 digits, an optional small letter, as C1)`);
  }
  const commit = values.get("commit");
  const files = values.get("files");
  if (commit === undefined) return fail("Points to has no “commit:”");
  if (files === undefined) return fail("Points to has no “files:”");
  if (!COMMIT.test(commit)) return fail(`“${shown(commit)}” is not a commit (7 to 64 lower-case hex digits, or none)`);
  // Paths are separated by ", " (a comma and a space or tab); a path holding one is a code span. `none`, bare, says
  // the run left no result file (as `commit: none` says it recorded no commit); a file named none is written `none`.
  const paths: string[] = [];
  let none = false;
  for (const raw of splitOutside(files, (i) => files.charCodeAt(i) === 44 && (files.charCodeAt(i + 1) === 32 || files.charCodeAt(i + 1) === 9))) {
    const piece = trimSpaces(raw);
    if (piece === "") continue;
    if (piece === "none") {
      none = true;
      continue;
    }
    const path = pathOf(piece);
    if (path === null) return fail(`“${shown(piece)}” is not a path written bare or as one code span`);
    if (!isProjectPath(path)) return fail(`“${shown(path)}” is not a path inside the project (no leading “/”, no “.” or “..” segment or name starting with “.”, no empty segment, no “\\”, no address)`);
    paths.push(path);
  }
  if (none && paths.length > 0) return fail(`“files:” names none and also ${plural(paths.length, "path")} (${listOf(paths.map((p) => `“${shown(p)}”`), 3)}); none stands alone (a file named none is written as a code span, \`none\`)`);
  if (!none && paths.length === 0) return fail("“files:” names no path (a run with no result file says “files: none”)");
  return { ok: true, points: { kind: "run", commit: commit === "none" ? null : commit, files: none ? null : paths } };
}

// ---- the table and its rows -----------------------------------------------------------

/** Header cells that are exactly HEADER, ignoring ASCII case and the spaces around them (md-kit trims those). */
const isGraphHeader = (cells: readonly string[]) => cells.length === HEADER.length && cells.every((cell, k) => asciiLower(cell) === asciiLower(HEADER[k]!));
/** A table whose header cells are exactly HEADER. */
const isGraphTable = (t: Table) => !t.columnsCut && isGraphHeader(t.header);

/** A list item's marker and the space after it, at a line's start ("- ", "1. "). */
const ITEM_MARKER = /^[ \t]*(?:[-*+]|[0-9]{1,9}\.)(?:[ \t]+|$)/;

/**
 * The first line holding the graph's header where md-kit reads no table: in a
 * code block's body (§5.1 prints its example in a fence), or in a list item's
 * lines, its marker aside. One pass over those blocks' lines.
 */
function nestedHeader(doc: Doc): Nested | null {
  for (const block of doc.blocks) {
    if (block.kind !== "code" && block.kind !== "list") continue;
    // A code block's first line is its fence; its body is the lines after it (to the closing fence, if any).
    const from = block.kind === "code" ? 1 : 0;
    const to = block.kind === "code" && block.closed ? block.lines.length - 1 : block.lines.length;
    for (let k = from; k < to; k++) {
      const line = trimSpaces(block.kind === "list" ? block.lines[k]!.replace(ITEM_MARKER, "") : block.lines[k]!);
      if (line.startsWith("|") && isGraphHeader(splitCells(line))) return { line: block.first + k, where: block.kind, first: block.first, last: block.last };
    }
  }
  return null;
}

/** What md-kit leaves unread that could hide a table: a fence never closed, lines past its cap. */
function unreadNotes(doc: Doc): string[] {
  const notes: string[] = [];
  const fence = doc.blocks.find((b) => b.kind === "code" && !b.closed);
  if (fence !== undefined) notes.push(`Everything after the code fence opened on line ${n(fence.first)} and never closed is read as code, not as a table.`);
  if (doc.cut) notes.push(`${FILE} has more than ${n(doc.lines)} lines; the view reads the first ${n(doc.lines)}.`);
  return notes;
}

/**
 * The graph of an idea file as md-kit read it (§5.1, §5.2): the first table
 * with the expected header; each row a node or a problem, the first
 * LIMITS.nodes nodes drawn; each link checked once every node is known, the
 * first LIMITS.links drawn; each pointer resolved; cycles found. `skeleton`
 * is paper_skeleton.md's claims, or why there are none.
 */
export function buildGraph(doc: Doc, skeleton: SkeletonRead): Built {
  const tables = doc.blocks.filter((b): b is Table => b.kind === "table");
  const graphTables = tables.filter(isGraphTable);
  const table = graphTables[0];
  if (table === undefined) {
    const first = tables[0];
    return { kind: "no-table", first: first === undefined ? null : { line: first.first, source: first.lines[0]! }, nested: nestedHeader(doc), notes: unreadNotes(doc) };
  }
  const problems = new Problems();

  // What md-kit leaves unread of the table, and a second table with the graph's header.
  if (table.more > 0) problems.add(null, 0, () => `the table has ${plural(table.more, "row")} past the ${n(table.rows.length)} the view reads; they are not read.`, true);
  if (doc.cut && table.last === doc.lines) problems.add(null, 0, () => `${FILE} has more than ${n(doc.lines)} lines; the view reads the first ${n(doc.lines)}.`, true);
  for (const line of table.skipped) problems.add(atLines([line]), line, () => "it holds only invisible characters; the table goes on after it.");
  for (const other of graphTables.slice(1)) problems.add(atLines([other.first]), other.first, () => `another table with the graph's header; only the first, on line ${n(table.first)}, is read.`, true);
  // Lines that start with "|" after the table ended: rows an agent may have meant, which md-kit read as a paragraph
  // (a blank line or other text ends a table) or as a list item's text (rows indented under an item). Said, so no
  // node vanishes without a note.
  let stray = false;
  for (const block of doc.blocks) {
    if ((block.kind !== "paragraph" && block.kind !== "list") || block.first <= table.last) continue;
    const pipes = block.lines.map((l, k) => (/^[ \t]*\|/.test(l) ? block.first + k : 0)).filter((l) => l > 0);
    if (pipes.length === 0) continue;
    stray = true;
    const one = pipes.length === 1;
    const at = pipes[pipes.length - 1]! - pipes[0]! === pipes.length - 1 ? atRange(pipes[0]!, pipes[pipes.length - 1]!) : atLines(pipes);
    const where = block.kind === "list" ? " inside a list item" : "";
    const why = block.kind === "list" ? "a table inside a list item is read as the item's text" : "a blank line or other text ends it";
    problems.add(at, pipes[0]!, () => `${one ? "this line starts" : "these lines start"} with “|”${where} after the table, which ends on line ${n(table.last)} (${why}); ${one ? "it is not read as a row" : "they are not read as rows"}.`);
  }
  /** Some rows an agent wrote are not read: past md-kit's caps, or after the table ended. */
  const partial = table.more > 0 || (doc.cut && table.last === doc.lines) || stray;

  // Rows: each a node, or left out with every reason.
  const seen = new Map<string, { line: number; id: string }>();
  const leftOut = new Map<string, { line: number; id: string }>();
  const valid: IdeaNode[] = [];
  for (const row of table.rows) {
    const cells = splitCells(row.source, Infinity);
    const line = row.line;
    const causes: string[] = [];
    let id: string | null = null;
    if (cells[0] !== undefined && ID.test(cells[0])) id = cells[0];
    if (cells.length !== HEADER.length) {
      causes.push(`it has ${n(cells.length)} cells, and a node's row has ${HEADER.length} (${HEADER.join(", ")})`);
    } else {
      const [idCell, kindCell, statement, status, , pointsCell] = cells as [string, string, string, string, string, string, string];
      if (idCell === "") causes.push("its ID cell is empty");
      else if (id === null) causes.push(`“${shown(idCell)}” is not an ID (a letter, then at most 15 letters, digits, “_”, or “-”)`);
      else {
        const before = seen.get(asciiLower(id));
        if (before !== undefined) causes.push(`the ID ${id} is already used on line ${n(before.line)}${before.id === id ? "" : `, as ${before.id}`} (IDs are compared ignoring case)`);
      }
      const kind = (KINDS as readonly string[]).includes(kindCell) ? (kindCell as Kind) : null;
      if (kind === null) causes.push(kindCell === "" ? "its Kind cell is empty" : `its kind “${shown(kindCell)}” is not ${either(KINDS)}`);
      if (statement === "") causes.push("its Statement cell is empty");
      if (kind !== null) {
        const words = STATUS[kind];
        if (status === "") causes.push(`its Status cell is empty (${article(kind)}'s status is ${either(words)})`);
        else if (!words.includes(status)) causes.push(`“${shown(status)}” is not a status of ${article(kind)} (${either(words)})`);
        const points = pointsOf(kind, status, pointsCell);
        if (!points.ok) causes.push(points.why);
        else if (causes.length === 0) {
          valid.push({ key: asciiLower(id!), id: id!, kind, statement, status, points: points.points, source: cells[6]!, line, row: row.source, index: -1, linksCell: cells[4]! });
        }
      }
    }
    // Every row with an ID by the pattern takes it, a row left out too: IDs are unique in the file.
    if (id !== null && !seen.has(asciiLower(id))) seen.set(asciiLower(id), { line, id });
    if (causes.length > 0) {
      if (id !== null && !leftOut.has(asciiLower(id))) leftOut.set(asciiLower(id), { line, id });
      problems.add(atLines([line]), line, () => `the row is left out: ${causes.join("; ")}.`);
    }
  }

  // The first LIMITS.nodes valid rows are drawn.
  const nodes = valid.slice(0, LIMITS.nodes);
  nodes.forEach((node, k) => (node.index = k));
  const past = valid.slice(LIMITS.nodes);
  if (past.length > 0) problems.add(atRange(past[0]!.line, past[past.length - 1]!.line), past[0]!.line, () => `${plural(past.length, "node")} past the first ${n(LIMITS.nodes)} ${past.length === 1 ? "is" : "are"} not drawn.`, true);
  const byKey = new Map(nodes.map((node) => [node.key, node]));
  const pastKey = new Map(past.map((node) => [node.key, node]));
  /** Why `target` names no node drawn, by what was read. */
  const notDrawn = (target: string): string => {
    const key = asciiLower(target);
    const beyond = pastKey.get(key);
    if (beyond !== undefined) return `${beyond.id} (line ${n(beyond.line)}) is past the first ${n(LIMITS.nodes)} nodes, which are all the view draws`;
    const out = leftOut.get(key);
    if (out !== undefined) return `${out.id} (line ${n(out.line)}) is left out for a problem of its own`;
    return partial ? `no node among the rows the view reads has the ID ${target}` : `no node in the table has the ID ${target}`;
  };

  // Links, now that every node is known.
  const all: Link[] = [];
  for (const node of nodes) {
    const stated = new Set<string>();
    // Where this row's link problems are: built once a row, not once a link (a hostile cell holds 170,000 links).
    const at = atLines([node.line]);
    for (const raw of node.linksCell.split(";")) {
      const item = trimSpaces(raw);
      if (item === "") continue;
      const fail = (why: () => string) => problems.add(at, node.line, () => `${node.id}'s link “${shown(item)}” is left out: ${why()}.`);
      const parts = item.split(/[ \t]+/);
      if (parts.length !== 2) {
        fail(() => "it is not a link word and an ID, as “tests Q1”");
        continue;
      }
      const [word, target] = parts as [string, string];
      if (!(WORDS as readonly string[]).includes(word)) {
        fail(() => `“${shown(word)}” is not a link word (${either(WORDS)})`);
        continue;
      }
      if (!ID.test(target)) {
        fail(() => `“${shown(target)}” is not an ID`);
        continue;
      }
      if (asciiLower(target) === node.key) {
        fail(() => `${node.id} would link to itself`);
        continue;
      }
      const to = byKey.get(asciiLower(target));
      if (to === undefined) {
        fail(() => notDrawn(target));
        continue;
      }
      const join = JOINS[word as Word];
      if (!join.from.includes(node.kind) || !join.to.includes(to.kind)) {
        fail(() => `“${word}” goes from ${kindsText(join.from)} to ${kindsText(join.to)}; ${node.id} is ${article(node.kind)} and ${to.id} ${article(to.kind)}`);
        continue;
      }
      const key = `${word} ${to.key}`;
      if (stated.has(key)) {
        fail(() => `it states “${word} ${to.id}” again`);
        continue;
      }
      stated.add(key);
      all.push({ word: word as Word, from: node, to, line: node.line });
    }
  }
  const links = all.slice(0, LIMITS.links);
  const extra = all.slice(LIMITS.links);
  if (extra.length > 0) problems.add(atRange(extra[0]!.line, extra[extra.length - 1]!.line), extra[0]!.line, () => `${plural(extra.length, "link")} past the first ${n(LIMITS.links)} ${extra.length === 1 ? "is" : "are"} not drawn.`, true);

  // Pointers: a result's experiment, a claim's row of paper_skeleton.md.
  const pointers = new Map<string, Pointer>();
  const came: Came[] = [];
  const pointsToSkeleton = nodes.some((node) => node.points.kind === "claim");
  if (pointsToSkeleton && !skeleton.ok) problems.add(null, 0, () => `claims not checked: ${skeleton.why}.`, true);
  let verified = 0;
  for (const node of nodes) {
    const p = node.points;
    const asWritten = (written: string, why: string) => problems.add(atLines([node.line]), node.line, () => `${node.id}'s “${written}” is shown as written: ${why}.`);
    if (p.kind === "from") {
      const to = byKey.get(asciiLower(p.id));
      if (to !== undefined && to.kind === "experiment") {
        pointers.set(node.key, { kind: "from", state: "found", id: p.id, node: to });
        came.push({ result: node, experiment: to });
      } else {
        const why = to === undefined ? notDrawn(p.id) : `${to.id} is ${article(to.kind)}, not an experiment`;
        pointers.set(node.key, { kind: "from", state: "missing", id: p.id, why });
        asWritten(`from: ${p.id}`, why);
      }
    } else if (node.kind === "claim") {
      if (p.kind !== "claim") {
        pointers.set(node.key, { kind: "claim", state: "none" });
        continue;
      }
      if (!skeleton.ok) {
        pointers.set(node.key, { kind: "claim", state: "unchecked", id: p.id });
        continue;
      }
      const rows = skeleton.claims.get(p.id) ?? [];
      if (rows.length === 1) {
        const row = rows[0]!;
        pointers.set(node.key, { kind: "claim", state: "found", id: p.id, line: row.line, text: row.text, status: row.status ?? "" });
        if (isVerified(row.status)) verified++;
        if (row.status !== null && asciiLower(trimSpaces(row.status)) !== asciiLower(node.status)) {
          problems.add(atLines([node.line]), node.line, () => `${node.id} is “${node.status}” here, “${shown(row.status!)}” in ${SKELETON}:${n(row.line)}.`);
        }
      } else {
        const why =
          rows.length === 0
            ? `no row of the Claims and Evidence table in ${SKELETON} starts with “${p.id}: ”${skeleton.partial === null ? "" : ` among the rows the view reads (${skeleton.partial})`}`
            : `rows on lines ${either(rows.map((r) => n(r.line)), "and")} of ${SKELETON} ${rows.length === 2 ? "both" : "all"} start with “${p.id}: ”`;
        pointers.set(node.key, { kind: "claim", state: "missing", id: p.id, why });
        asWritten(`claim: ${p.id}`, why);
      }
    }
  }
  const total = nodes.filter((node) => node.kind === "claim").length;
  const claims: ClaimCheck = skeleton.ok ? { checked: true, verified, total } : { checked: false, total, why: skeleton.why };

  // A DAG: each link and from: counts from what must exist first to what follows from it (FIRST); each cycle is one
  // problem, which names its nodes and one loop step by step, each step with the link that makes it.
  const edges: number[][] = nodes.map(() => []);
  /** Why each edge is there, by its place in `edges`: the link as the file states it. */
  const why: string[][] = nodes.map(() => []);
  const edge = (first: IdeaNode, then: IdeaNode, stated: string) => {
    edges[first.index]!.push(then.index);
    why[first.index]!.push(stated);
  };
  for (const link of links) {
    const [first, then] = FIRST[link.word] === "row" ? [link.from, link.to] : [link.to, link.from];
    edge(first, then, `${link.from.id} ${link.word} ${link.to.id}`);
  }
  for (const c of came) {
    const [first, then] = FIRST.from === "row" ? [c.result, c.experiment] : [c.experiment, c.result];
    edge(first, then, `${c.result.id} from ${c.experiment.id}`);
  }
  for (const cycle of cycles(edges)) {
    const members = cycle.map((k) => nodes[k]!);
    const loop = loopThrough(cycle, edges);
    const steps = loop.map(([k, at]) => `${nodes[k]!.id} before ${nodes[edges[k]![at]!]!.id} (${why[k]![at]})`);
    const head = loop.length === members.length ? ":" : "; one of its loops:";
    problems.add(atLines(members.map((m) => m.line)), members[0]!.line, () => `a cycle runs through ${listOf(members.map((m) => m.id))}${head} ${listOf(steps)}, counting each link from what must exist first to what follows from it; each node is still drawn.`, true);
  }

  // Listed by line, the file's own problems first; the order found is kept within a line.
  const listed = problems.list.map((p, k) => ({ p, k })).sort((a, b) => a.p.line - b.p.line || a.k - b.k).map(({ p }) => p);
  return {
    kind: "graph",
    graph: { nodes, byKey, links, came, pointers, problems: listed, problemCount: problems.count, totals: { nodes: valid.length, links: all.length }, claims, table: { first: table.first, last: table.last } },
  };
}

/** "an experiment", "a question or a hypothesis", "any node". */
const kindsText = (kinds: readonly Kind[]) => (kinds.length === KINDS.length ? "any node" : either(kinds.map(article)));

/**
 * One loop through the first node of a strongly connected component
 * (`component`, in file order), the shortest by breadth-first search inside
 * it: each step as [node, its edge's place in edges[node]], from the first
 * node back to it. One pass over the component's nodes and edges.
 */
function loopThrough(component: readonly number[], edges: readonly (readonly number[])[]): [number, number][] {
  const start = component[0]!;
  const inside = new Set(component);
  /** How each node was reached: [the node before it, that node's edge]. */
  const reached = new Map<number, [number, number]>();
  const queue = [start];
  let close: [number, number] | null = null;
  for (let q = 0; q < queue.length && close === null; q++) {
    const v = queue[q]!;
    const out = edges[v]!;
    for (let at = 0; at < out.length; at++) {
      const w = out[at]!;
      if (w === start) {
        close = [v, at];
        break;
      }
      if (!inside.has(w) || reached.has(w)) continue;
      reached.set(w, [v, at]);
      queue.push(w);
    }
  }
  // A component of more than one node always has a loop through each of its nodes.
  const steps: [number, number][] = [close!];
  for (let v = close![0]; v !== start; ) {
    const step = reached.get(v)!;
    steps.push(step);
    v = step[0];
  }
  return steps.reverse();
}

/**
 * The strongly connected components of more than one node, each in file
 * order, the components ordered by their first node (Tarjan's algorithm,
 * without recursion): one pass over the nodes and edges.
 */
export function cycles(edges: readonly (readonly number[])[]): number[][] {
  const count = edges.length;
  const index = new Int32Array(count).fill(-1);
  const low = new Int32Array(count);
  const onStack = new Uint8Array(count);
  const stack: number[] = [];
  const found: number[][] = [];
  let next = 0;
  for (let root = 0; root < count; root++) {
    if (index[root] !== -1) continue;
    const work: [number, number][] = [[root, 0]];
    index[root] = low[root] = next++;
    stack.push(root);
    onStack[root] = 1;
    while (work.length > 0) {
      const top = work[work.length - 1]!;
      const [v, at] = top;
      const out = edges[v]!;
      if (at < out.length) {
        top[1] = at + 1;
        const w = out[at]!;
        if (index[w] === -1) {
          index[w] = low[w] = next++;
          stack.push(w);
          onStack[w] = 1;
          work.push([w, 0]);
        } else if (onStack[w] === 1) low[v] = Math.min(low[v]!, index[w]!);
        continue;
      }
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1]![0];
        low[parent] = Math.min(low[parent]!, low[v]!);
      }
      if (low[v] === index[v]) {
        const component: number[] = [];
        let w: number;
        do {
          w = stack.pop()!;
          onStack[w] = 0;
          component.push(w);
        } while (w !== v);
        if (component.length > 1) found.push(component.sort((a, b) => a - b));
      }
    }
  }
  return found.sort((a, b) => a[0]! - b[0]!);
}

// ---- labels and quotes (§1 fact 5) ----------------------------------------------------

/** Ends a quote the page cut: the host's own mark (src/plugins/select.ts CUT_MARK). */
export const QUOTE_CUT = "…[cut]";

const marker = (c: string) => `⟨U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}⟩`;
/**
 * What a label shows as a marker, in one pass: the host's classes (controls,
 * format and default-ignorable characters, the Braille blank, line and
 * paragraph separators, spaces other than U+0020), and ⟨ and ⟩ themselves,
 * so a name that spells a marker is never another's. An ID by the pattern
 * holds none of them; the pass is what keeps the label one line of visible
 * characters, and one label per name, if anything else ever reaches it.
 */
const LABEL_MARKED = /(?! )[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\p{Zs}\u2028\u2029\u2800\u27E8\u27E9]/gu;

/** A node's label, `idea_graph.md · E2 (experiment)`: the ID marked in one pass (and a space at either end), cut by the host's rule if it ever had to be. */
export function labelOf(id: string, kind: string): string {
  const base = `${FILE} · `;
  const end = ` (${kind})`;
  const name = id.replace(LABEL_MARKED, marker).replace(/^ +| +$/g, (spaces) => "⟨U+0020⟩".repeat(spaces.length));
  return `${base}${cutMarked(name, LABEL_MAX - base.length - end.length, "…")}${end}`;
}

/**
 * The characters the host takes for a line break in a quote
 * (src/plugins/select.ts LINE_BREAKS) but md-kit leaves inside a line: a
 * lone CR, VT, FF, NEL, U+2028, U+2029. Quoted as markers, as the Skeleton
 * view does, so a row's quote is one line.
 */
const BREAK_IN_LINE = /[\r\v\f\u0085\u2028\u2029]/g;

/** A row as the quote: as written, line breaks inside it as markers, cut to the host's QUOTE_MAX by its own rule. */
export const quoteOf = (row: string) => cutMarked(row.replace(BREAK_IN_LINE, marker), QUOTE_MAX, QUOTE_CUT);

/** What selecting a node reports (os.select). */
export const selectionOf = (node: IdeaNode): { label: string; quote: string } => ({ label: labelOf(node.id, node.kind), quote: quoteOf(node.row) });

// ---- the bar, the summary, the detail panel (§5.4) ------------------------------------

const counted = (drawn: number, total: number, one: string) => (drawn === total ? plural(drawn, one) : `${n(drawn)} of ${n(total)} ${one}s`);

/** The bar's count: "20 nodes · 9 links", "200 of 230 nodes · …" past a cap. */
export const barWords = (g: Graph) => `${counted(g.nodes.length, g.totals.nodes, "node")} · ${counted(g.links.length, g.totals.links, "link")}`;

export interface Summary {
  counts: string;
  /** "Still open": open, planned, or running. */
  open: IdeaNode[];
  claims: string;
}

/** The detail panel with nothing selected: counts by kind, what is still open, the claims verified in paper_skeleton.md. */
export function summary(g: Graph): Summary {
  const by = (kind: Kind) => g.nodes.filter((node) => node.kind === kind).length;
  const present = KINDS.filter((k) => by(k) > 0);
  const absent = KINDS.filter((k) => by(k) === 0);
  const counts =
    g.nodes.length === 0
      ? "No node is drawn."
      : `${plural(g.nodes.length, "node")}: ${present.map((k) => plural(by(k), k, KIND_PLURAL[k])).join(", ")}${absent.length === 0 ? "" : `; none is ${either(absent.map(article))}`}.`;
  const c = g.claims;
  const claims = c.total === 0 ? "no claim node is drawn" : c.checked ? `${n(c.verified)} of ${n(c.total)} verified in ${SKELETON}` : `not checked: ${c.why}`;
  return { counts, open: g.nodes.filter((node) => PENDING.has(node.status)), claims };
}

export interface PointsView {
  lines: string[];
  /** Result files, drawn as text, never opened. */
  files: string[];
  /** The node a result came from, as a chip. */
  chip: IdeaNode | null;
  /** A claim's row of paper_skeleton.md. */
  claim: { text: string; status: string } | null;
  /** Why a pointer is shown as written. */
  problem: string | null;
}

/** One group of the panel's links: "Tests", "Tested by", …, "Came from", "Its results". */
export interface LinkGroup {
  label: string;
  nodes: IdeaNode[];
}

export interface Details {
  /** The statement as drawn, cut at md-kit's 2,000 characters. */
  statement: string;
  /** What the panel leaves out, said beside it. */
  notes: string[];
  /** Links by word, out then in, in the mockup's order; then "Came from" and "Its results". */
  links: LinkGroup[];
  points: PointsView;
  /** The Source cell as drawn, or null when it is empty. */
  source: string | null;
}

const GROUPS: [Word, string, string][] = [
  ["tests", "Tests", "Tested by"],
  ["motivates", "Motivates", "Motivated by"],
  ["supports", "Supports", "Supported by"],
  ["refutes", "Refutes", "Refuted by"],
];

/** The detail panel of a selected node (§5.4). */
export function details(g: Graph, node: IdeaNode): Details {
  const links: LinkGroup[] = [];
  for (const [word, out, into] of GROUPS) {
    const from = g.links.filter((l) => l.word === word && l.from === node).map((l) => l.to);
    const to = g.links.filter((l) => l.word === word && l.to === node).map((l) => l.from);
    if (from.length > 0) links.push({ label: out, nodes: from });
    if (to.length > 0) links.push({ label: into, nodes: to });
  }
  const origin = g.came.filter((c) => c.result === node).map((c) => c.experiment);
  const results = g.came.filter((c) => c.experiment === node).map((c) => c.result);
  if (origin.length > 0) links.push({ label: "Came from", nodes: origin });
  if (results.length > 0) links.push({ label: "Its results", nodes: results });

  const view: PointsView = { lines: [], files: [], chip: null, claim: null, problem: null };
  const p = node.points;
  const pointer = g.pointers.get(node.key);
  if (p.kind === "run") {
    view.lines.push(p.commit === null ? "Commit: none recorded by the run" : `Commit ${p.commit}`);
    if (p.files === null) view.lines.push("Result files: none (the row says “files: none”)");
    // A path is a name: a space other than U+0020 in it is a marker, as in a label.
    else view.files = p.files.map(visibleName);
  } else if (node.kind === "experiment") view.lines.push("No run yet");
  else if (pointer?.kind === "from") {
    view.lines.push(`from: ${pointer.id}`);
    if (pointer.state === "found") view.chip = pointer.node;
    else view.problem = `Shown as written: ${pointer.why}.`;
  } else if (pointer?.kind === "claim") {
    if (pointer.state === "none") view.lines.push(`This claim names no row of ${SKELETON}: its Points to is empty.`);
    else if (pointer.state === "found") {
      view.lines.push(`Row ${pointer.id} of the Claims and Evidence table, ${SKELETON}:${n(pointer.line)}`);
      view.claim = { text: pointer.text, status: pointer.status };
    } else {
      view.lines.push(`claim: ${pointer.id}`);
      view.problem = pointer.state === "missing" ? `Shown as written: ${pointer.why}.` : `Not checked: ${g.claims.checked ? "" : g.claims.why}.`;
    }
  }

  const notes: string[] = [];
  if (node.statement.length > MD.cell) notes.push(`The statement is longer than ${n(MD.cell)} characters; the rest is not shown here (the agent gets the row as written, up to ${n(QUOTE_MAX)} characters).`);
  if (node.source.length > MD.cell) notes.push(`The source is longer than ${n(MD.cell)} characters; the rest is not shown here.`);
  // A statement whose words draw nothing visible is given with its spaces marked, as the map's box shows it.
  const statement = cutText(node.statement);
  return { statement: blankDrawn(plain(inline(statement))) ? visibleName(statement) : statement, notes, links, points: view, source: node.source === "" ? null : cutText(node.source) };
}

// ---- reading the file, and every screen's words ---------------------------------------

/** Words for a screen: a title, a sentence, and whether "Try again" can help. */
export interface Words {
  title: string;
  text: string;
  retry: boolean;
}

/** The bytes as the view takes them: those readStart gave for READ_MAX + 1, so more than READ_MAX is too large. */
export function verdict(bytes: Uint8Array, cut: boolean): { kind: "text"; text: string } | { kind: "too-large" } | { kind: "binary" } | { kind: "encoding" } {
  if (cut || bytes.length > READ_MAX) return { kind: "too-large" };
  return readText(bytes);
}

/** The empty state (§5.2): idea_graph.md answers 404. The view writes nothing. */
export function emptyWords(): { title: string; text: string; header: string } {
  return {
    title: "No idea file to draw",
    text: `The Idea view draws ${FILE} in the project folder: a table with one row per question, hypothesis, experiment, result, or claim, and the links between them. This project has none, or it is a link the view may not follow. Ask the project agent to write one.`,
    header: HEADER_LINE,
  };
}

/** The screen for a file with no table of the expected header: what was searched, the first header found beside the expected one. */
export function noTableWords(b: Extract<Built, { kind: "no-table" }>): { title: string; text: string; expected: string; found: string; notes: string[]; retry: true } {
  const nested =
    b.nested === null
      ? null
      : `The graph's header is on line ${n(b.nested.line)}, inside the ${b.nested.where === "code" ? "code block" : "list item"} on ${atRange(b.nested.first, b.nested.last)}, ${
          b.nested.where === "code" ? "which is read as code, not as a table: write the table outside the fence." : "which is read as the item's text, not as a table: start the table at the left margin, outside the list."
        }`;
  return {
    title: "No idea graph table",
    text: `No table with the expected header was found in ${FILE}.`,
    expected: HEADER_LINE,
    found: b.first !== null ? `The first table's header, on line ${n(b.first.line)}: ${shown(b.first.source, 300)}` : (nested ?? `No table was found in ${FILE}.`),
    notes: b.first !== null && nested !== null ? [nested, ...b.notes] : b.notes,
    retry: true,
  };
}

/** The read channel's answer when it is not a 200; null for 404, which is the empty state. */
export function fileWords(status: number, project: string): Words | null {
  if (status === 404) return null;
  if (status === 413) return { title: "Too large to show", text: `${FILE} is larger than 32 MiB, the most the app reads.`, retry: true };
  if (status === 503) return { title: "Too many files are being read at once", text: "Try again in a moment.", retry: true };
  if (status === 0) return { title: "The Idea view could not reach the app", text: "Try again; if it keeps failing, restart the app.", retry: true };
  return { title: `${FILE} could not be read`, text: `The app answered ${status} for ${filePath(project)}.`, retry: true };
}

/** What the file holds when the view does not draw it. */
export function contentWords(kind: "too-large" | "binary" | "encoding"): Words {
  if (kind === "too-large") return { title: "Too large to show", text: `${FILE} is larger than 512 KiB, the most the Idea view reads.`, retry: true };
  if (kind === "binary") return { title: "Not a text file", text: `${FILE} holds binary data, so it is not drawn here.`, retry: true };
  return { title: "Text in another encoding", text: `${FILE} seems to be text in an encoding other than UTF-8, which the Idea view cannot read.`, retry: true };
}

/** The words for a page whose ?project= is missing, or not a project folder name. */
export function projectWords(search: string): Words {
  const given = new URLSearchParams(search).get("project");
  if (given === null || given === "") return { title: "No project given", text: "The Idea view opens from a project's workspace, which names the project it shows.", retry: false };
  return { title: "Not a project name", text: `“${clip(given, 80)}” is not a project folder name the Idea view can open (a letter, then letters, digits, _ or -).`, retry: false };
}
