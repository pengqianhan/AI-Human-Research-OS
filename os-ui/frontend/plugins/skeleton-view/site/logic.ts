/**
 * The Skeleton view page's pure parts (os-ui/PLUGINS.md Part 3, §3): what
 * each field of mockup alternative B shows, by a rule over the project's
 * paper_skeleton.md as md-kit reads it; the labels and quotes a selection
 * reports; and the words of every screen. No DOM and no fetch, so `npm test`
 * runs them in Node. The file is data: everything here builds strings and
 * tokens, and main.ts puts them on screen as text only.
 */
import { claims, inline, linkTargets, plain, resolveLink, section, sections, snapshot, snapshotItem, studies, trimSpaces, usedBy } from "../../md-kit.ts";
import type { Block, Doc, Inline, Section, SnapshotItem, Table } from "../../md-kit.ts";
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

/**
 * A section's title as a block's label shows it: its plain text (inline
 * Markdown reduced to its words), blank runs one space, a middle dot or a
 * look-alike as "-", curly quotes as straight ones, so the title cannot
 * imitate the label's own " · " and “…”; then invisible characters as
 * markers, as the host requires of a label.
 */
function sectionTitle(title: string): string {
  return visibleName(
    trimSpaces(plain(inline(title)).replace(/[\p{Zs}\t]+/gu, " "))
      .replace(/[··‧∙⋅・]/g, "-")
      .replace(/[“”„‟〝〞＂]/g, '"'),
  );
}

/**
 * A block of a section (a Snapshot item, a paragraph, a list item, a table
 * row, a code block): `paper_skeleton.md:<lines> · section “<title>”`, a
 * form a claim's label (`… · claim C2`) never has, so no title can forge
 * one. The title is what is cut to keep the label within LABEL_MAX.
 */
function sectionLabel(base: string, title: string): string {
  return `${base} · section “${cutMarked(sectionTitle(title), LABEL_MAX - base.length - 13, "…")}”`;
}

/**
 * A block of a section, or a Snapshot item: its lines and its section's
 * title in the label (`title` null: text before the first heading), its
 * lines as the quote.
 */
export const blockSelection = (first: number, last: number, title: string | null, lines: readonly string[]): Selection => ({
  label: title === null ? `${where(first, last)} · before the first heading` : sectionLabel(where(first, last), title),
  quote: quote(lines),
});

/** Lines, first and last, that a part of the page draws. */
export type Lines = [number, number];

// ---- the Snapshot card ----------------------------------------------------------------

/** One line of the Snapshot card: its value (plain text, and its tokens for drawing), or null when it is not filled in. */
export interface SnapLine {
  label: string;
  value: string | null;
  tokens: Inline[];
  selection: Selection;
}

export interface SnapshotCard {
  /** The Status item as written, "not filled in" when empty; null without one (no pill). */
  status: string | null;
  /** The working title; null without that item. */
  title: SnapLine | null;
  /** Thesis, Audience, Research question: those the Snapshot has. */
  lines: SnapLine[];
  /** The lines the card draws: the section's heading and the items above; the rest of the section is listed below the claims. */
  drawn: Lines[];
  /** One line when the card has nothing to draw: no list, or none of the items it draws. */
  note: string | null;
}

const SNAPSHOT_LINES = [
  ["Thesis", "One-sentence thesis"],
  ["Audience", "Target venue or audience"],
  ["Research question", "Main research question"],
] as const;

/** The Snapshot items the card draws, by label: the first item of each. */
const CARD_ITEMS = ["Working title", "Status", ...SNAPSHOT_LINES.map(([, name]) => name)];

/** The items of a Snapshot list that the card draws. */
function cardItems(items: readonly SnapshotItem[]): SnapshotItem[] {
  return CARD_ITEMS.map((name) => snapshotItem(items, name)).filter((i): i is SnapshotItem => i !== null);
}

/**
 * The card: null without a Snapshot section. Labels match on their plain
 * text, so `**Status:** draft` is the Status item. When the section has no
 * list, or none of the items the card draws, the card says so in one line;
 * everything it does not draw is listed below the claims.
 */
export function snapshotCard(doc: Doc): SnapshotCard | null {
  const all = sections(doc);
  const sec = section(all, "Snapshot");
  if (sec === null) return null;
  const snap = snapshot(all);
  const heading: Lines = [sec.line, sec.line];
  if (snap === null) return { status: null, title: null, lines: [], drawn: [heading], note: "The Snapshot section has no list of items." };
  const line = (shown: string, name: string): SnapLine | null => {
    const item = snapshotItem(snap.items, name);
    if (item === null) return null;
    return { label: shown, value: item.value === "" ? null : item.value, tokens: item.tokens, selection: blockSelection(item.first, item.last, sec.title, item.lines) };
  };
  const status = snapshotItem(snap.items, "Status");
  const drawn = cardItems(snap.items);
  return {
    status: status === null ? null : status.value === "" ? "not filled in" : status.value,
    title: line("Working title", "Working title"),
    lines: SNAPSHOT_LINES.map(([shown, name]) => line(shown, name)).filter((l): l is SnapLine => l !== null),
    drawn: [heading, ...drawn.map((i): Lines => [i.first, i.last])],
    note: drawn.length > 0 ? null : `None of ${CARD_ITEMS.slice(0, -1).join(", ")}, or ${CARD_ITEMS[CARD_ITEMS.length - 1]} is in the Snapshot list.`,
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

/** `drawn`: the lines the claims part draws, the section's heading and its table, whose rows not listed as claims a note names. */
export type ClaimsView =
  | { state: "no-table"; message: string; drawn: Lines[] }
  | { state: "no-claims"; message: string; notes: string[]; drawn: Lines[] }
  | { state: "claims"; summary: string; rows: ClaimRow[]; notes: string[]; drawn: Lines[] };

/** "2nd", "3rd", "4th", … */
const ordinal = (k: number) => `${k}${k % 10 === 1 && k % 100 !== 11 ? "st" : k % 10 === 2 && k % 100 !== 12 ? "nd" : k % 10 === 3 && k % 100 !== 13 ? "rd" : "th"}`;

/** The table's columns the view does not draw, by header: another name, or a second column of a name it draws ("Status (2nd)"). */
function columnsNotShown(header: readonly string[], drawn: readonly number[]): string[] {
  const seen = new Map<string, number>();
  const out: string[] = [];
  header.forEach((cell, k) => {
    const name = trimSpaces(plain(inline(cell)));
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (drawn.includes(k)) return;
    const shown = name === "" ? `column ${k + 1}` : name;
    out.push(count > 1 ? `${shown} (${ordinal(count)})` : shown);
  });
  return out;
}

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
  if (!found.found) return { state: "no-table", message: `No Claims and Evidence table in ${FILE}`, drawn: [] };
  const drawn: Lines[] = [
    [found.section.line, found.section.line],
    [found.table.first, found.table.last],
  ];
  const hiddenColumns = columnsNotShown(found.table.header, found.columns);
  const notes = [
    ...(found.missing.length > 0 ? [`No ${names(found.missing)} column in the Claims and Evidence table.`] : []),
    ...(hiddenColumns.length > 0 ? [`Columns not shown here: ${hiddenColumns.join(", ")}; a claim's quote holds its whole row.`] : []),
    ...tableNotes(found.table),
  ];
  if (found.claims.length === 0) return { state: "no-claims", message: "No claims yet: the Claims and Evidence table has no filled row", notes, drawn };
  if (found.empty.length > 0) {
    notes.push(
      found.empty.length === 1
        ? `Line ${n(found.empty[0]!)} has an empty Claim cell, so it is not listed as a claim.`
        : `Lines ${lineList(found.empty)} have an empty Claim cell, so they are not listed as claims.`,
    );
  }
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
    drawn,
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

/** One foldable entry of "The rest of paper_skeleton.md". */
export interface RestSection {
  /** Keeps an entry open across a Reload: its name and which of that name it is. */
  key: string;
  /** The entry's name: a section's title, or "Snapshot, other items", "Claims and Evidence, besides the table", "Before the first heading". */
  title: string;
  /** The section title its blocks' labels name, or null for text before the first heading. */
  labelTitle: string | null;
  /** Its heading's line, or null when the heading is drawn above (Snapshot, Claims and Evidence) or there is none. */
  heading: number | null;
  line: number;
  /** "line 23 · 9 entries": table rows, list items, paragraphs, and code blocks. */
  summary: string;
  blocks: Block[];
}

export interface Rest {
  sections: RestSection[];
  /** More entries than SECTIONS_MAX. */
  note: string | null;
  /** What the view leaves out and says so, in one muted line each: the title and opening paragraph, headings with nothing under them. */
  notShown: string[];
  /** The lines `notShown` speaks for. */
  accounted: Lines[];
  /** True only when the card and the claims table draw the whole file. */
  nothingElse: boolean;
}

/** Headings named at most in the "nothing under them" line. */
const EMPTY_HEADINGS_MAX = 20;

/**
 * Everything the card and the claims table do not draw, in file order, so
 * nothing in the file is hidden without the view saying so (os-ui/PLUGINS.md
 * Part 3, §1 fact 2): text before the first heading; each section with a
 * block, at any level; the Snapshot items the card does not draw and the
 * rest of that section; the claims section besides its first table. Left
 * out, with a muted line that says so: the file's level-1 title and the
 * paragraph right under it, and headings with nothing under them. At most
 * SECTIONS_MAX entries.
 */
export function restSections(doc: Doc): Rest {
  const all = sections(doc);
  const snap = snapshot(all);
  const snapSection = section(all, "Snapshot");
  const found = claims(all);
  const claimsSection = section(all, "Claims and Evidence");
  const drawnItems = new Set(snap === null ? [] : cardItems(snap.items).map((i) => i.first));
  const table = found.found ? found.table : null;
  /** A section whose heading the card or the claims part draws. */
  const drawnAbove = (s: Section) => s === snapSection || (s === claimsSection && table !== null);
  const listed: { title: string; labelTitle: string | null; heading: number | null; blocks: Block[] }[] = [];
  const notShown: string[] = [];
  const accounted: Lines[] = [];

  const firstHeading = doc.blocks.findIndex((b) => b.kind === "heading");
  const before = firstHeading === -1 ? doc.blocks : doc.blocks.slice(0, firstHeading);
  if (before.length > 0) listed.push({ title: "Before the first heading", labelTitle: null, heading: null, blocks: before });

  // The file's title: its first heading when that is level 1 (and not a section the card or the table draws), and the paragraph under it.
  const first = all[0];
  const title = first !== undefined && first.level === 1 && first !== snapSection && first !== claimsSection ? first : null;
  const opening = title !== null && title.blocks[0]?.kind === "paragraph" ? title.blocks[0] : null;
  if (title !== null) {
    const last = opening === null ? title.line : opening.last;
    notShown.push(opening === null ? `The title (line ${n(title.line)}) is not shown.` : `The title and opening paragraph (lines ${n(title.line)}–${n(last)}) are not shown.`);
    accounted.push([title.line, last]);
  }

  const empty: Section[] = [];
  for (const s of all) {
    let blocks = s.blocks;
    let name = s.title;
    let heading: number | null = s.line;
    if (s === title) {
      blocks = opening === null ? s.blocks : s.blocks.slice(1);
      heading = null;
    } else if (s === snapSection) {
      blocks = s.blocks.flatMap((b) => {
        if (snap === null || b !== snap.list) return [b];
        const items = b.items.filter((i) => !drawnItems.has(i.first));
        if (items.length === b.items.length) return [b];
        if (items.length === 0) return [];
        return [{ ...b, items, first: items[0]!.first, last: items[items.length - 1]!.last, lines: items.flatMap((i) => i.lines) }];
      });
      name = "Snapshot, other items";
      heading = null;
    } else if (s === claimsSection && table !== null) {
      blocks = s.blocks.filter((b) => b !== table);
      name = "Claims and Evidence, besides the table";
      heading = null;
    }
    if (blocks.length > 0) listed.push({ title: name, labelTitle: s.title, heading, blocks });
    else if (s.blocks.length === 0 && s !== title && !drawnAbove(s)) empty.push(s);
  }
  if (empty.length > 0) {
    const named = empty.slice(0, EMPTY_HEADINGS_MAX).map((s) => `${s.title} (line ${n(s.line)})`);
    const more = empty.length > EMPTY_HEADINGS_MAX ? `, and ${n(empty.length - EMPTY_HEADINGS_MAX)} more` : "";
    notShown.push(`Headings with nothing under them: ${named.join(", ")}${more}.`);
    for (const s of empty) accounted.push([s.line, s.line]);
  }

  const seen = new Map<string, number>();
  const entries = listed.map((e): RestSection => {
    const count = (seen.get(e.title) ?? 0) + 1;
    seen.set(e.title, count);
    const line = e.heading ?? e.blocks[0]!.first;
    const size = e.blocks.reduce((sum, b) => sum + (b.kind === "table" ? b.rows.length + b.more : b.kind === "list" ? b.items.length : 1), 0);
    return { key: `${count}\u0000${e.title}`, title: e.title, labelTitle: e.labelTitle, heading: e.heading, line, summary: `line ${n(line)} · ${plural(size, "entry", "entries")}`, blocks: e.blocks };
  });
  return {
    sections: entries.slice(0, SECTIONS_MAX),
    note: entries.length > SECTIONS_MAX ? `${FILE} has ${n(entries.length)} sections; the first ${n(SECTIONS_MAX)} are listed.` : null,
    notShown,
    accounted,
    nothingElse: entries.length === 0 && notShown.length === 0,
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
  if (table.skipped.length === 1) notes.push(`Line ${n(table.skipped[0]!)} holds only invisible characters; the table goes on after it.`);
  else if (table.skipped.length > 1) notes.push(`Lines ${lineList(table.skipped)} hold only invisible characters; the table goes on after them.`);
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
