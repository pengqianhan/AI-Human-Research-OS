/**
 * The Skeleton view page's pure parts (os-ui/PLUGINS.md Part 3, §3): what
 * each field of mockup alternative B shows, by a rule over the project's
 * paper_skeleton.md as md-kit reads it; the labels and quotes a selection
 * reports; and the words of every screen. No DOM and no fetch, so `npm test`
 * runs them in Node. The file is data: everything here builds strings and
 * tokens, and main.ts puts them on screen as text only.
 */
import { claims, inline, linkTargets, resolveLink, section, sections, snapshot, snapshotItem, studies, usedBy } from "../../md-kit.ts";
import type { Doc, Section, Table } from "../../md-kit.ts";
import { clip, cutMarked, LABEL_MAX, QUOTE_MAX, readText, visibleName } from "../../site-kit.ts";

/** The file this view reads, relative to its project. */
export const FILE = "paper_skeleton.md";
/** Bytes of the file the view reads at most (os-ui/PLUGINS.md Part 3, §1 fact 6); a larger file is a screen. */
export const READ_MAX = 1024 * 1024;
/** Sections listed under "The rest of paper_skeleton.md" at most. */
export const SECTIONS_MAX = 300;

/** The file's path relative to the workspace, as the read channel takes it. */
export const filePath = (project: string) => `projects-folder/${project}/${FILE}`;

/** What a selection reports (os.select): a one-line label and the quote. */
export interface Selection {
  label: string;
  quote?: string;
}

/** Words for a screen: a title, a sentence, and whether "Try again" can help. */
export interface Words {
  title: string;
  text: string;
  retry: boolean;
}

const n = (value: number) => value.toLocaleString("en-US");
const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;

// ---- the top bar ----------------------------------------------------------------------

/** The view's bar: the file, its path, the hint, and Reload (added to the mockup: an agent writes the file while the app is open). */
export function topBar(project: string): { title: string; path: string; hint: string; reload: string } {
  return { title: FILE, path: filePath(project), hint: "Select a claim to see its evidence and ask the agent about it.", reload: "Reload" };
}

// ---- labels and quotes ----------------------------------------------------------------

/**
 * Ends a quote the page cut: the host's own mark (src/plugins/select.ts
 * CUT_MARK, which a test pins equal), so a cut is never mistaken for text
 * that really ends in "…".
 */
export const QUOTE_CUT = "…[cut]";

/** "paper_skeleton.md:8" or "paper_skeleton.md:8–9". */
const where = (first: number, last: number) => `${FILE}:${first === last ? first : `${first}–${last}`}`;

/**
 * A label: where, then " · " and `title` as one line of visible characters
 * (blank runs one space, as the host requires of a label; invisible ones as
 * markers). The title is what is cut to keep the label within the host's
 * LABEL_MAX, so the line number always shows.
 */
function label(base: string, title: string): string {
  const shown = visibleName(title.replace(/[\p{Zs}\t]+/gu, " ").trim());
  if (shown === "") return base;
  return `${base} · ${cutMarked(shown, LABEL_MAX - base.length - 3, "…")}`;
}

/**
 * A character the host takes for a line break in a quote (src/plugins/select.ts
 * LINE_BREAKS) but md-kit leaves inside a line: a lone CR. Quoted as the
 * marker the host would show for an invisible character, so the quote has
 * one line for each line its label cites.
 */
const BREAK_IN_LINE = /\r/g;
const marker = (c: string) => `⟨U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}⟩`;

/**
 * A quote: the lines as written, joined by line feeds, cut to the host's
 * QUOTE_MAX (which it ignores a longer quote past) ending in QUOTE_CUT, by
 * the host's own rule: no marker or surrogate pair is split.
 */
function quote(lines: readonly string[]): string {
  return cutMarked(lines.join("\n").replace(BREAK_IN_LINE, marker), QUOTE_MAX, QUOTE_CUT);
}

/** A block of a section, or a Snapshot item: its lines and its section's title in the label, its lines as the quote. */
export const blockSelection = (first: number, last: number, title: string, lines: readonly string[]): Selection => ({
  label: label(where(first, last), title),
  quote: quote(lines),
});

// ---- the Snapshot card ----------------------------------------------------------------

/** One line of the Snapshot card: its value, or null when it is not filled in. */
export interface SnapLine {
  label: string;
  value: string | null;
  selection: Selection;
}

export interface SnapshotCard {
  /** The Status item as written, "not filled in" when empty; null without one (no pill). */
  status: string | null;
  /** The working title; null without that item. */
  title: SnapLine | null;
  /** Thesis, Audience, Research question: those the Snapshot has. */
  lines: SnapLine[];
}

const SNAPSHOT_LINES = [
  ["Thesis", "One-sentence thesis"],
  ["Audience", "Target venue or audience"],
  ["Research question", "Main research question"],
] as const;

/** The card: null without a Snapshot section (or a list in it). */
export function snapshotCard(doc: Doc): SnapshotCard | null {
  const snap = snapshot(sections(doc));
  if (snap === null) return null;
  const line = (shown: string, name: string): SnapLine | null => {
    const item = snapshotItem(snap.items, name);
    if (item === null) return null;
    return { label: shown, value: item.value === "" ? null : item.value, selection: blockSelection(item.first, item.last, snap.section.title, item.lines) };
  };
  const status = snapshotItem(snap.items, "Status");
  return {
    status: status === null ? null : status.value === "" ? "not filled in" : status.value,
    title: line("Working title", "Working title"),
    lines: SNAPSHOT_LINES.map(([shown, name]) => line(shown, name)).filter((l): l is SnapLine => l !== null),
  };
}

// ---- the claims -----------------------------------------------------------------------

export interface ClaimRow {
  /** The claim's ID ("C2"), or "—" when its Claim cell has none. */
  id: string;
  /** The Status cell as written; null without a Status column. */
  status: string | null;
  verified: boolean;
  /** The Claim cell after its ID, and the other cells; null when their column is missing. */
  text: string;
  evidence: string | null;
  result: string | null;
  source: string | null;
  line: number;
  selection: Selection;
}

export type ClaimsView =
  | { state: "no-table"; message: string }
  | { state: "no-claims"; message: string; notes: string[] }
  | { state: "claims"; summary: string; rows: ClaimRow[]; notes: string[] };

/** "“A”", "“A” or “B”", "“A”, “B”, or “C”". */
function names(list: readonly string[]): string {
  const quoted = list.map((s) => `“${s}”`);
  if (quoted.length <= 2) return quoted.join(" or ");
  return `${quoted.slice(0, -1).join(", ")}, or ${quoted[quoted.length - 1]}`;
}

const isVerified = (status: string | null) => status !== null && status.trim().toLowerCase() === "verified";

/** The Claims and Evidence table as the view lists it, or why it lists nothing. */
export function claimsView(doc: Doc): ClaimsView {
  const found = claims(sections(doc));
  if (!found.found) return { state: "no-table", message: `No Claims and Evidence table in ${FILE}` };
  const notes = [
    ...(found.missing.length > 0 ? [`No ${names(found.missing)} column in the Claims and Evidence table.`] : []),
    ...tableNotes(found.table),
  ];
  if (found.claims.length === 0) return { state: "no-claims", message: "No claims yet: the Claims and Evidence table has no filled row", notes };
  const rows = found.claims.map(
    (c): ClaimRow => ({
      id: c.id ?? "—",
      status: c.status,
      verified: isVerified(c.status),
      text: c.text,
      evidence: c.evidence,
      result: c.result,
      source: c.source,
      line: c.line,
      selection: { label: c.id === null ? label(where(c.line, c.line), found.section.title) : `${where(c.line, c.line)} · claim ${c.id}`, quote: quote([c.row]) },
    }),
  );
  const verified = rows.filter((r) => r.verified).length;
  return {
    state: "claims",
    summary: `${plural(rows.length, "claim")} · ${n(verified)} verified · ${where(found.table.first, found.table.last)}`,
    rows,
    notes: [...repeatedIds(rows), ...notes],
  };
}

/** The claim whose evidence shows: by its line; its ID is kept only to find it again after a Reload. */
export interface OpenClaim {
  line: number;
  id: string | null;
}

/**
 * The row whose evidence shows after the file is read again: the one with
 * the same ID when exactly one row has it (a line added above moves it),
 * otherwise the row on the same line if it is still a claim, otherwise none.
 */
export function openRow(rows: readonly ClaimRow[], previous: OpenClaim | null): ClaimRow | null {
  if (previous === null) return null;
  if (previous.id !== null) {
    const same = rows.filter((r) => r.id === previous.id);
    if (same.length === 1) return same[0]!;
  }
  return rows.find((r) => r.line === previous.line) ?? null;
}

/** "5 and 6", "5, 6, and 7". */
function lineList(lines: readonly number[]): string {
  const shown = lines.map(n);
  if (shown.length <= 2) return shown.join(" and ");
  return `${shown.slice(0, -1).join(", ")}, and ${shown[shown.length - 1]}`;
}

/** A note for each claim ID that more than one row uses: "C3 is used by 2 rows: lines 5 and 6." */
function repeatedIds(rows: readonly ClaimRow[]): string[] {
  const byId = new Map<string, number[]>();
  for (const r of rows) if (r.id !== "—") byId.set(r.id, [...(byId.get(r.id) ?? []), r.line]);
  return [...byId].filter(([, lines]) => lines.length > 1).map(([id, lines]) => `${id} is used by ${n(lines.length)} rows: lines ${lineList(lines)}.`);
}

/** A file the Source cell names: a project path, an address as written, or a target that leaves the project. */
export type FileNamed = { kind: "path" | "address" | "outside"; text: string };

export interface Evidence {
  heading: string;
  /** Evidence, Source, Citation/result: the cells the table has, as the skeleton states them. */
  stated: string[];
  files: FileNamed[];
  filesNote: string | null;
  /** "Main result (paper_skeleton.md:83)" for each study naming the claim; null for a claim with no ID (the line is left out). */
  usedBy: string[] | null;
  usedByNote: string | null;
}

/** The evidence panel of a claim (the mockup's "What the source file says" is left out: os-ui/PLUGINS.md Part 3, §7 N-3). */
export function evidenceOf(doc: Doc, row: ClaimRow): Evidence {
  const files: FileNamed[] = linkTargets(inline(row.source ?? "")).map((target) => {
    const resolved = resolveLink(target, FILE);
    if (resolved === null) return { kind: "outside", text: target.trim() };
    return resolved.kind === "path" ? { kind: "path", text: resolved.path } : { kind: "address", text: resolved.text };
  });
  let used: string[] | null = null;
  let usedNote: string | null = null;
  if (row.id !== "—") {
    const rows = studies(sections(doc));
    if (rows === null) usedNote = `No Experiments table in ${FILE}`;
    else {
      used = usedBy(rows, row.id).map((s) => `${s.study} (${where(s.line, s.line)})`);
      if (used.length === 0) usedNote = `No study in the Experiments table names ${row.id}`;
    }
  }
  return {
    heading: row.id === "—" ? `Claim at ${where(row.line, row.line)}` : `Claim ${row.id} · ${where(row.line, row.line)}`,
    stated: [row.evidence, row.source, row.result].filter((c): c is string => c !== null),
    files,
    filesNote: files.length === 0 ? "The source cell names no file" : null,
    usedBy: used,
    usedByNote: usedNote,
  };
}

// ---- the rest of the file -------------------------------------------------------------

export interface RestSection {
  /** Keeps a section open across a Reload: its title and which of that title it is. */
  key: string;
  title: string;
  line: number;
  /** "line 23 · 9 entries": table rows, list items, paragraphs, and code blocks. */
  summary: string;
  section: Section;
}

/**
 * Every section of levels 2 to 6 but Snapshot and Claims and Evidence (the
 * card and the table above) that has a block, in file order, at most
 * SECTIONS_MAX; `note` says how many there are when there are more.
 */
export function restSections(doc: Doc): { sections: RestSection[]; note: string | null } {
  const all = sections(doc);
  const shownAbove = [section(all, "Snapshot"), section(all, "Claims and Evidence")];
  const seen = new Map<string, number>();
  const listed: RestSection[] = [];
  for (const s of all) {
    if (s.level < 2 || s.blocks.length === 0 || shownAbove.includes(s)) continue;
    const entries = s.blocks.reduce((sum, b) => sum + (b.kind === "table" ? b.rows.length + b.more : b.kind === "list" ? b.items.length : 1), 0);
    const count = (seen.get(s.title) ?? 0) + 1;
    seen.set(s.title, count);
    listed.push({ key: `${count}\u0000${s.title}`, title: s.title, line: s.line, summary: `line ${s.line} · ${plural(entries, "entry", "entries")}`, section: s });
  }
  return {
    sections: listed.slice(0, SECTIONS_MAX),
    note: listed.length > SECTIONS_MAX ? `${FILE} has ${n(listed.length)} sections; the first ${n(SECTIONS_MAX)} are listed.` : null,
  };
}

// ---- notes ----------------------------------------------------------------------------

/** What the view says about the whole file: more lines than md-kit reads. */
export function docNotes(doc: Doc): string[] {
  return doc.cut ? [`${FILE} has more than ${n(doc.lines)} lines; the view reads the first ${n(doc.lines)}.`] : [];
}

/** What the view says under a table: rows past the cap, columns past the cap, rows of another width. */
export function tableNotes(table: Table): string[] {
  const notes: string[] = [];
  if (table.more > 0) notes.push(`This table has ${plural(table.more, "more row")}; the first ${n(table.rows.length)} are shown.`);
  if (table.columnsCut) notes.push(`This table has more than ${n(table.header.length)} columns; the first ${n(table.header.length)} are shown.`);
  const uneven = table.rows.filter((r) => r.uneven).map((r) => n(r.line));
  if (uneven.length === 1) notes.push(`Line ${uneven[0]} has another number of cells than the header; it is padded or cut to it.`);
  else if (uneven.length > 1) notes.push(`Lines ${uneven.slice(0, -1).join(", ")} and ${uneven[uneven.length - 1]} have another number of cells than the header; they are padded or cut to it.`);
  return notes;
}

// ---- reading the file -----------------------------------------------------------------

/** The bytes as the view takes them; `bytes` are what readStart gave for READ_MAX + 1, so more than READ_MAX is too large. */
export function fileVerdict(bytes: Uint8Array, cut: boolean): { kind: "text"; text: string } | { kind: "too-large" } | { kind: "binary" } | { kind: "encoding" } {
  if (cut || bytes.length > READ_MAX) return { kind: "too-large" };
  return readText(bytes);
}

/** The read channel's answer when it is not a 200, by status (0: the request did not reach the app). */
export function fileWords(status: number, project: string): Words {
  if (status === 404) {
    return {
      title: `No ${FILE} to show`,
      text: `${filePath(project)} is not there, or it is a link the Skeleton view may not follow (one leading outside the project's ${FILE}).`,
      retry: true,
    };
  }
  if (status === 413) return { title: "Too large to show", text: `${FILE} is larger than 32 MiB, the most the app reads.`, retry: true };
  if (status === 503) return { title: "Too many files are being read at once", text: "Try again in a moment.", retry: true };
  if (status === 0) return { title: "The Skeleton view could not reach the app", text: "Try again; if it keeps failing, restart the app.", retry: true };
  return { title: `${FILE} could not be read`, text: `The app answered ${status} for ${FILE}.`, retry: true };
}

/** What the file holds when the view does not show it. */
export function contentWords(kind: "too-large" | "binary" | "encoding"): Words {
  if (kind === "too-large") return { title: "Too large to show", text: `${FILE} is larger than 1 MiB, the most the Skeleton view reads.`, retry: true };
  if (kind === "binary") return { title: "Not a text file", text: `${FILE} holds binary data, so it is not shown here.`, retry: true };
  return { title: "Text in another encoding", text: `${FILE} seems to be text in an encoding other than UTF-8, which the Skeleton view cannot show.`, retry: true };
}

/** The words for a page whose ?project= is missing, or not a project folder name. */
export function projectWords(search: string): Words {
  const given = new URLSearchParams(search).get("project");
  if (given === null || given === "") return { title: "No project given", text: "The Skeleton view opens from a project's workspace, which names the project it shows.", retry: false };
  return { title: "Not a project name", text: `“${clip(given, 80)}” is not a project folder name the Skeleton view can open (a letter, then letters, digits, _ or -).`, retry: false };
}
