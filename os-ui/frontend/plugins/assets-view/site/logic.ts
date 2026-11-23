/**
 * The Assets view page's pure parts (os-ui/PLUGINS.md Part 3, §4): what each
 * field of mockup alternative B shows, by a rule over the project's files as
 * the read channel lists and reads them; the labels a selection reports; the
 * CSV reader; and the words of every state. No DOM and no fetch, so `npm test`
 * runs them in Node. File names and contents are data: everything here builds
 * strings and md-kit tokens, and main.ts puts them on screen as text only.
 *
 * Identity is a project path ("Figs/a.svg") for a file and a README line for
 * a dataset, never a name shown on screen: two files of one name in two
 * folders are two items.
 */
import { cutText, inline, plain, resolveLink, section, sections, splitLines, trimSpaces } from "../../md-kit.ts";
import type { Block, Doc, Inline, Table } from "../../md-kit.ts";
import { clip, cutMarked, LABEL_MAX, readText, visibleName } from "../../site-kit.ts";
import { WALK } from "./walk.ts";
import type { WalkResult } from "./walk.ts";

// ---- what the view reads ---------------------------------------------------------------

/** The two files the view reads besides the groups: for "Used in", and for the datasets. */
export const SKELETON = "paper_skeleton.md";
export const README = "Code/README.md";

export type GroupId = "figs" | "baselines" | "results" | "datasets";
export interface Group {
  id: GroupId;
  title: string;
  /** The group's folder, a project path. */
  folder: string;
}

/** The four groups of mockup alternative B, in its order. */
export const GROUPS: readonly Group[] = [
  { id: "figs", title: "Figures", folder: "Figs" },
  { id: "baselines", title: "Reference runs", folder: "Baselines" },
  { id: "results", title: "Results", folder: "Code/results" },
  { id: "datasets", title: "Datasets", folder: "Code/Datasets" },
];

/** What the view reads and shows at most (os-ui/PLUGINS.md Part 3, §1 fact 6, §4.2, §4.3). */
export const LIMITS = {
  /** Bytes of paper_skeleton.md, Code/README.md, and a folder's README.md read for the rules; a larger file is said to be too large. */
  docBytes: 1024 * 1024,
  /** Bytes of a CSV file parsed for its preview. */
  csvBytes: 2 * 1024 * 1024,
  /** Rows and columns of a CSV preview, and characters of a cell. */
  csvRows: 20,
  csvColumns: 30,
  csvCell: 200,
  /** Bytes of any other file read for its preview, lines shown, and characters of a line. */
  previewBytes: 256 * 1024,
  previewLines: 40,
  lineChars: 2000,
  /** md-kit blocks of a Markdown preview. */
  mdBlocks: 200,
  /** Characters of a description. */
  description: 300,
  /** Places listed under "Used in" before "and N more". */
  usedIn: 10,
  /** Figures whose thumbnail loads without a click. */
  thumbs: 200,
} as const;

/** A project path as the read channel takes it, relative to the workspace. */
export const workspacePath = (project: string, path: string) => `projects-folder/${project}/${path}`;

/** What a selection reports (os.select): a one-line label. The Assets view posts no quote. */
export interface Selection {
  label: string;
}

/** Words for a screen: a title, a sentence, and whether "Try again" can help. */
export interface Words {
  title: string;
  text: string;
  retry: boolean;
}

export const n = (value: number) => value.toLocaleString("en-US");
const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;

/** "a", "a and b", "a, b, and c", the first `max` named, then "and N more". */
function listed(items: readonly string[], max = 5): string {
  const shown = items.slice(0, max);
  if (items.length > max) return `${shown.join(", ")}, and ${n(items.length - max)} more`;
  if (shown.length <= 2) return shown.join(" and ");
  return `${shown.slice(0, -1).join(", ")}, and ${shown[shown.length - 1]}`;
}

// ---- sizes and kinds ------------------------------------------------------------------

/** A listing's size as the mockup writes it: "946 bytes", "11.1 KB", "33.0 MB". */
export function sizeWords(bytes: number): string {
  if (bytes < 1024) return `${n(bytes)} ${bytes === 1 ? "byte" : "bytes"}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type Kind = "figure" | "image" | "csv" | "json" | "markdown" | "pdf" | "text" | "file";

/** Image types the view draws as an <img>, by extension (the Code view's). */
export const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;
const TEXT = /\.(txt|log|py|tex|ya?ml|toml|sh|bib|tsv|r|cfg|ini|out|err|js|ts|xml|html?|ipynb|m|jl|c|h|cpp|rs|go|java)$/i;

/** A file's kind, by extension: an image in Figs/ is a figure (a card), any other image an Image row. */
export function kindOf(group: GroupId, name: string): Kind {
  if (IMAGE.test(name)) return group === "figs" ? "figure" : "image";
  if (/\.csv$/i.test(name)) return "csv";
  if (/\.json$/i.test(name)) return "json";
  if (/\.md$/i.test(name)) return "markdown";
  if (/\.pdf$/i.test(name)) return "pdf";
  return TEXT.test(name) ? "text" : "file";
}

/** The panel's heading for a kind (os-ui/PLUGINS.md Part 3, §4.2 "Panel heading and path"). */
export const HEADING: Record<Kind, string> = {
  figure: "Figure",
  image: "Image",
  csv: "Table (CSV)",
  json: "Data (JSON)",
  markdown: "Note (Markdown)",
  pdf: "File",
  text: "Text",
  file: "File",
};

// ---- labels ---------------------------------------------------------------------------

const marker = (c: string) => `⟨U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}⟩`;

/**
 * Look-alikes of a label's own separators: the middle dot of " · " (and its
 * kin), and the curly quotes of `section “…”`. A name shows them as markers,
 * so no name can make a label read as another form (`… · claim C1`).
 */
const SEPARATOR_LIKE = /[··‧∙⋅・･“”„‟〝〞＂]/gu;
/**
 * In a file or folder name, also what reads as a path's own syntax: ":"
 * (`a.svg:12` would read as line 12 of a.svg), a backslash, and slashes that
 * are not "/" (a name cannot hold "/", so a look-alike would show a second,
 * deeper path).
 */
const PATH_LIKE = /[:\\⁄∕⧸／]/gu;

/**
 * A file or folder name as a label shows it: one line of visible characters
 * (site-kit's visibleName: invisible characters, line breaks, and spaces other
 * than U+0020 as markers, which the host requires), and the look-alikes above
 * as markers too. Plain spaces stay: "a  b.csv" and "a b.csv" are two files.
 */
export const nameInLabel = (name: string) => visibleName(name).replace(SEPARATOR_LIKE, marker).replace(PATH_LIKE, marker);

/**
 * A file's label: its project path, each segment as nameInLabel shows it,
 * cut to the host's LABEL_MAX ending in "…", never inside a marker or a
 * surrogate pair (site-kit's cutMarked).
 */
export function fileLabel(path: string): string {
  return cutMarked(path.split("/").map(nameInLabel).join("/"), LABEL_MAX, "…");
}

/**
 * A dataset's label, `Code/README.md:208 · dataset <name>`: its README line
 * and its name as plain text, blank runs one space, invisible characters and
 * separator look-alikes as markers. The name is what is cut, so the line
 * always shows.
 */
export function datasetLabel(line: number, name: string): string {
  const base = `${README}:${line} · dataset`;
  const shown = visibleName(trimSpaces(name.replace(/[\p{Zs}\t]+/gu, " "))).replace(SEPARATOR_LIKE, marker);
  if (shown === "") return base;
  return `${base} ${cutMarked(shown, LABEL_MAX - base.length - 1, "…")}`;
}

// ---- reading a Markdown file the rules need ------------------------------------------

/** paper_skeleton.md, Code/README.md, or a folder's README.md as the view got it. */
export type DocRead = { ok: true; doc: Doc } | { ok: false; status: number } | { ok: false; problem: "too-large" | "binary" | "encoding" };

/** The bytes readStart gave for LIMITS.docBytes + 1: more than LIMITS.docBytes is too large. */
export function docFrom(bytes: Uint8Array, cut: boolean, parse: (text: string) => Doc): DocRead {
  if (cut || bytes.length > LIMITS.docBytes) return { ok: false, problem: "too-large" };
  const read = readText(bytes);
  return read.kind === "text" ? { ok: true, doc: parse(read.text) } : { ok: false, problem: read.kind };
}

/** Why a file the rules need could not be used, in a few words: "it is larger than 1 MiB". */
export function readProblem(read: Exclude<DocRead, { ok: true }>): string {
  if ("problem" in read) {
    if (read.problem === "too-large") return "it is larger than 1 MiB, the most the Assets view reads of it";
    if (read.problem === "binary") return "it holds binary data";
    return "it is text in an encoding other than UTF-8";
  }
  return statusWords(read.status);
}

/**
 * What md-kit left unread of a file (its caps: LIMITS.lines lines, rows and
 * columns of a table), as one sentence ending in `then`, or null when it read
 * everything: "Code/README.md: the view does not read lines past 20,000, so
 * places there are not listed."
 */
export function unreadWords(doc: Doc, file: string, then: string): string | null {
  const parts: string[] = [];
  if (doc.cut) parts.push(`lines past ${n(doc.lines)}`);
  for (const block of doc.blocks) {
    if (block.kind !== "table" || (block.more === 0 && !block.columnsCut)) continue;
    const what = [...(block.more > 0 ? [`rows past ${n(block.rows.length)}`] : []), ...(block.columnsCut ? [`columns past ${n(block.header.length)}`] : [])].join(" and ");
    parts.push(`${what} of the table at line ${n(block.first)}`);
  }
  return parts.length === 0 ? null : `${visibleName(file)}: the view does not read ${listed(parts, 3)}, so ${then}.`;
}

/** A read channel status, in a few words. */
export function statusWords(status: number): string {
  if (status === 404) return "it is not there, or it is a link the Assets view may not follow";
  if (status === 413) return "it is larger than 32 MiB, the most the app reads";
  if (status === 503) return "too many files were being read at once; Reload to try again";
  if (status === 0) return "the Assets view could not reach the app";
  return `the app answered ${status}`;
}

// ---- inline tokens: links, images, and code spans -------------------------------------

/** Tokens with bold dropped, its children in its place, in order: what "first link" and "after the link" read. */
function flatten(tokens: readonly Inline[]): Inline[] {
  return tokens.flatMap((t) => (t.kind === "bold" ? flatten(t.children) : [t]));
}

/** What a run of tokens names: link and image targets, and code spans' text, in order. */
function named(tokens: readonly Inline[], out: { target?: string; code?: string }[] = []): { target?: string; code?: string }[] {
  for (const t of tokens) {
    if (t.kind === "link") {
      out.push({ target: t.target });
      named(t.children, out);
    } else if (t.kind === "image") out.push({ target: t.target });
    else if (t.kind === "code") out.push({ code: t.text });
    else if (t.kind === "bold") named(t.children, out);
  }
  return out;
}

/** The project paths `tokens` name from `file`: a link or image whose target resolves to it, or a code span whose whole text is it. */
function pathsNamed(tokens: readonly Inline[], file: string): Set<string> {
  const out = new Set<string>();
  for (const thing of named(tokens)) {
    if (thing.code !== undefined) {
      if (thing.code !== "") out.add(thing.code);
      continue;
    }
    const resolved = resolveLink(thing.target!, file);
    if (resolved?.kind === "path") out.add(resolved.path);
  }
  return out;
}

// ---- descriptions ---------------------------------------------------------------------

export interface Description {
  text: string;
  /** The README.md and the line that says it. */
  readme: string;
  line: number;
}

/**
 * What a folder's README.md says about the files beside it (os-ui/PLUGINS.md
 * Part 3, §4.2 "Description"), by project path: for each file, the first list
 * item or table row whose first link resolves to it. A list item's
 * description is its text after that link, without a leading ":" or "—"; a
 * table row's, its other cells joined with " · ". Cut to LIMITS.description
 * characters. One pass over the README's blocks.
 */
export function descriptions(doc: Doc, readme: string): Map<string, Description> {
  const out = new Map<string, Description>();
  const describe = (path: string, text: string, line: number) => {
    if (out.has(path)) return;
    out.set(path, { text: cutText(trimSpaces(text), LIMITS.description), readme, line });
  };
  for (const block of doc.blocks) {
    if (block.kind === "list") {
      for (const item of block.items) {
        const tokens = flatten(inline(item.text));
        const at = tokens.findIndex((t) => t.kind === "link");
        if (at === -1) continue;
        const resolved = resolveLink((tokens[at] as Extract<Inline, { kind: "link" }>).target, readme);
        if (resolved?.kind !== "path") continue;
        let rest = trimSpaces(plain(tokens.slice(at + 1)));
        if (rest.startsWith(":") || rest.startsWith("—")) rest = rest.slice(1);
        describe(resolved.path, rest, item.first);
      }
    } else if (block.kind === "table") {
      for (const row of block.rows) {
        let found: { cell: number; target: string } | null = null;
        for (let c = 0; c < row.cells.length && found === null; c++) {
          const link = flatten(inline(row.cells[c]!)).find((t): t is Extract<Inline, { kind: "link" }> => t.kind === "link");
          if (link !== undefined) found = { cell: c, target: link.target };
        }
        if (found === null) continue;
        const resolved = resolveLink(found.target, readme);
        if (resolved?.kind !== "path") continue;
        const others = row.cells
          .filter((_, c) => c !== found!.cell)
          .map((cell) => trimSpaces(plain(inline(cell))))
          .filter((t) => t !== "");
        describe(resolved.path, others.join(" · "), row.line);
      }
    }
  }
  return out;
}

// ---- Used in --------------------------------------------------------------------------

/** One place a file is named: the file and its lines, and a table row's first cell. */
export interface Place {
  file: string;
  first: number;
  last: number;
  cell: string | null;
}

/** "paper_skeleton.md:126", "Code/README.md:120–130": the file and its lines. */
export const placeWhere = (p: Place) => `${p.file}:${p.first === p.last ? p.first : `${p.first}–${p.last}`}`;

/** "paper_skeleton.md:126 · Figure 1", "Code/README.md:131". */
export const placeText = (p: Place) => `${placeWhere(p)}${p.cell === null || p.cell === "" ? "" : ` · ${p.cell}`}`;

/**
 * Where each project path is named in paper_skeleton.md and Code/README.md
 * (os-ui/PLUGINS.md Part 3, §4.2 "Used in"), built once for every file: a
 * link or image whose target resolves to it from that file, or a code span
 * whose whole text is it. A place is the line that names it (a table row,
 * with its first cell), or the block's lines when only the joined text of a
 * paragraph or list item does (a link broken across lines). Code blocks are
 * not read. In file order, the files in the order given.
 */
export function usedInIndex(docs: readonly { file: string; doc: Doc }[]): Map<string, Place[]> {
  const index = new Map<string, Place[]>();
  for (const { file, doc } of docs) {
    const seen = new Set<string>();
    const add = (paths: Iterable<string>, first: number, last: number, cell: string | null) => {
      for (const path of paths) {
        const key = `${path}\u0000${first}\u0000${last}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const list = index.get(path) ?? [];
        list.push({ file, first, last, cell });
        index.set(path, list);
      }
    };
    /** Lines one by one, then the joined text for what no single line names. */
    const lines = (from: number, source: readonly string[], joined: readonly string[], last: number) => {
      const found = new Set<string>();
      source.forEach((line, k) => {
        const paths = pathsNamed(inline(line), file);
        for (const p of paths) found.add(p);
        add(paths, from + k, from + k, null);
      });
      const spanning = new Set<string>();
      for (const text of joined) for (const p of pathsNamed(inline(text), file)) if (!found.has(p)) spanning.add(p);
      add(spanning, from, last, null);
    };
    for (const block of doc.blocks) {
      if (block.kind === "heading") add(pathsNamed(inline(block.text), file), block.first, block.first, null);
      else if (block.kind === "paragraph") lines(block.first, block.lines, [block.text], block.last);
      else if (block.kind === "list") {
        for (const item of block.items) lines(item.first, item.lines, [item.text, ...item.children.map((c) => c.text)], item.last);
      } else if (block.kind === "table") {
        add(block.header.flatMap((cell) => [...pathsNamed(inline(cell), file)]), block.first, block.first, null);
        for (const row of block.rows) {
          const cell = trimSpaces(plain(inline(row.cells[0] ?? "")));
          add(row.cells.flatMap((c) => [...pathsNamed(inline(c), file)]), row.line, row.line, clip(cell, 80));
        }
      }
    }
  }
  // In the order of `docs`, then by line.
  const order = new Map(docs.map((d, k) => [d.file, k]));
  for (const list of index.values()) list.sort((a, b) => order.get(a.file)! - order.get(b.file)! || a.first - b.first || a.last - b.last);
  return index;
}

// ---- datasets -------------------------------------------------------------------------

export interface DatasetCell {
  /** The column's header as plain text ("column 3" when it has none). */
  header: string;
  /** The cell as written (Markdown). */
  text: string;
}

export interface Dataset {
  key: string;
  line: number;
  /** The text of the row's first link, or its first cell's plain text. */
  name: string;
  /** "Data: Pretraining text · Used: shard_00000 (train), …": the cells but the one that is just the name, and empty ones. */
  meta: string;
  cells: DatasetCell[];
  selection: Selection;
}

export type DatasetsView =
  | { state: "no-section" }
  | { state: "no-table"; note: Block[] }
  | { state: "table"; note: Block[]; rows: Dataset[]; notes: string[] };

/**
 * The datasets Code/README.md lists (os-ui/PLUGINS.md Part 3, §4.2
 * "Datasets"): the first table of its "Data" section, one dataset a body
 * row. The section's blocks before the table are the group's note; with no
 * table, all of them are.
 */
export function datasets(doc: Doc): DatasetsView {
  const sec = section(sections(doc), "Data");
  if (sec === null) return { state: "no-section" };
  const at = sec.blocks.findIndex((b) => b.kind === "table");
  if (at === -1) return { state: "no-table", note: sec.blocks };
  const table = sec.blocks[at] as Table;
  const headers = table.header.map((h, k) => trimSpaces(plain(inline(h))) || `column ${k + 1}`);
  const rows = table.rows.map((row): Dataset => {
    const cells = row.cells.map((text, k) => ({ header: headers[k]!, text }));
    let name: string | null = null;
    for (const cell of row.cells) {
      const link = flatten(inline(cell)).find((t): t is Extract<Inline, { kind: "link" }> => t.kind === "link");
      if (link !== undefined) {
        name = trimSpaces(plain(link.children));
        break;
      }
    }
    name ??= trimSpaces(plain(inline(row.cells[0] ?? "")));
    const meta = cells
      .map((c) => ({ header: c.header, text: trimSpaces(plain(inline(c.text))) }))
      .filter((c) => c.text !== "" && c.text !== name)
      .map((c) => `${c.header}: ${c.text}`)
      .join(" · ");
    return { key: `dataset:${row.line}`, line: row.line, name, meta, cells, selection: { label: datasetLabel(row.line, name) } };
  });
  const after = sec.blocks.slice(at + 1);
  const notes = tableNotes(table);
  if (after.length > 0) {
    const first = after[0]!.first;
    const last = after[after.length - 1]!.last;
    notes.push(`The Data section goes on after the table (${README}:${first === last ? first : `${first}–${last}`}); that text is not shown here.`);
  }
  return { state: "table", note: sec.blocks.slice(0, at), rows, notes };
}

/** What the view says under the dataset table: rows past md-kit's cap, columns past it, rows of another width. */
function tableNotes(table: Table): string[] {
  const notes: string[] = [];
  if (table.more > 0) notes.push(`The dataset table has ${plural(table.more, "more row")}; the first ${n(table.rows.length)} are listed.`);
  if (table.columnsCut) notes.push(`The dataset table has more than ${n(table.header.length)} columns; the first ${n(table.header.length)} are shown.`);
  const uneven = table.rows.filter((r) => r.uneven).map((r) => n(r.line));
  if (uneven.length > 0) notes.push(`${uneven.length === 1 ? "Line" : "Lines"} ${listed(uneven)} of ${README} ${uneven.length === 1 ? "has" : "have"} another number of cells than the header; padded or cut to it.`);
  return notes;
}

// ---- the model: every group, item, and note ------------------------------------------

export interface FileItem {
  /** "file:" and the project path: what selects it, opens it, and finds its card. */
  key: string;
  path: string;
  /** Below the group's folder, as the list shows it ("openresearch-demo/README.md"). */
  rel: string;
  name: string;
  size: number;
  group: GroupId;
  kind: Kind;
  description: Description | null;
  /** The folder's README.md could not be read, so it describes nothing: why. */
  readmeNote: string | null;
  usedIn: Place[];
  selection: Selection;
}

export interface GroupView {
  group: Group;
  /** Beside the title: "Figs/", or for the datasets "listed in Code/README.md". */
  where: string;
  /** Muted lines: the group's own sentence, its folder's state, where the walk stopped, READMEs that could not be read. */
  notes: string[];
  /** Figures: images anywhere under Figs/, drawn as cards. */
  cards: FileItem[];
  /** Every other file, as rows. */
  rows: FileItem[];
  /** The Datasets group: what Code/README.md lists, before the rows of Code/Datasets/. */
  datasets: { view: DatasetsView | null; message: string | null } | null;
}

export interface Model {
  /** The bar's count: "12 items · Figs/ · Baselines/ · Code/results/ · datasets". */
  count: string;
  groups: GroupView[];
  /** Every item by its key. */
  items: Map<string, FileItem | Dataset>;
  /** Why "Used in" leaves a file out: paper_skeleton.md or Code/README.md could not be read. */
  usedInNotes: string[];
}

export interface ModelInput {
  /** The walk of each group, in GROUPS order. */
  walks: readonly WalkResult[];
  skeleton: DocRead;
  readme: DocRead;
  /** Each folder's README.md the walks found, by project path. */
  readmes: ReadonlyMap<string, DocRead>;
}

/** The group's folder as the view writes it, "Figs/". */
const folderOf = (group: Group) => `${group.folder}/`;
/** A folder path from the file system, shown as text: "Figs/a/". */
const shownFolder = (path: string) => `${visibleName(path)}/`;

/** What a group's walk adds to its notes: the folder's state and where the walk stopped. */
export function walkNotes(group: Group, walk: WalkResult): string[] {
  const where = folderOf(group);
  if (walk.root === "missing") return [`No ${where} folder this view can read`];
  if (walk.root === "error") return [`${where} could not be listed: ${statusWords(walk.status)}`];
  const notes: string[] = [];
  const complete = walk.truncated.length === 0 && walk.failed.length === 0 && walk.deeper.length === 0 && walk.unlisted.length === 0 && !walk.capped;
  if (walk.empty) notes.push(`${where} is empty`);
  else if (walk.files.length === 0) notes.push(complete ? `${where} holds only empty folders` : `No files in the part of ${where} the view could list`);
  for (const folder of walk.truncated) notes.push(`More files than shown: ${shownFolder(folder)} has more than 5,000 entries, and the app lists only part of it.`);
  if (walk.capped) notes.push(`More files than shown: ${where} holds more than ${n(WALK.files)} files; the first ${n(WALK.files)} the view found are listed.`);
  if (walk.deeper.length > 0) notes.push(`More files than shown: folders more than ${WALK.depth} levels below ${where} are not listed (${listed(walk.deeper.map(shownFolder))}).`);
  if (walk.unlisted.length > 0) notes.push(`More files than shown: the view lists at most ${WALK.listings} folders of ${where}; not listed: ${listed(walk.unlisted.map(shownFolder))}.`);
  for (const f of walk.failed) notes.push(`${shownFolder(f.folder)} could not be listed: ${statusWords(f.status)}.`);
  return notes;
}

/** Builds the page's model from what was read. Pure. */
export function buildModel(input: ModelInput): Model {
  const docs: { file: string; doc: Doc }[] = [];
  const usedInNotes: string[] = [];
  for (const [file, read] of [
    [SKELETON, input.skeleton],
    [README, input.readme],
  ] as const) {
    if (read.ok) {
      docs.push({ file, doc: read.doc });
      const unread = unreadWords(read.doc, file, "places there are not listed");
      if (unread !== null) usedInNotes.push(unread);
    } else usedInNotes.push(`${file} could not be read (${readProblem(read)}), so places in it are not listed.`);
  }
  const used = usedInIndex(docs);
  const described = new Map<string, Description>();
  const readmeNotes = new Map<string, string>();
  const folderOfPath = (path: string) => path.slice(0, path.lastIndexOf("/"));
  for (const [path, read] of input.readmes) {
    const folder = folderOfPath(path);
    // Only a README.md in the file's own folder describes it: a link to another folder's file is no description.
    if (read.ok) {
      for (const [file, d] of descriptions(read.doc, path)) if (folderOfPath(file) === folder) described.set(file, d);
      const unread = unreadWords(read.doc, path, "they describe no file here");
      if (unread !== null) readmeNotes.set(folder, unread);
    } else readmeNotes.set(folder, `${visibleName(path)} could not be read (${readProblem(read)}), so it describes no file here.`);
  }
  const items = new Map<string, FileItem | Dataset>();
  let count = 0;
  const present: string[] = [];
  const groups = GROUPS.map((group, k): GroupView => {
    const walk = input.walks[k]!;
    const files = walk.files.map((f): FileItem => {
      const item: FileItem = {
        key: `file:${f.path}`,
        path: f.path,
        rel: f.rel,
        name: f.name,
        size: f.size,
        group: group.id,
        kind: kindOf(group.id, f.name),
        description: described.get(f.path) ?? null,
        // Why the folder's README.md may not describe it: it could not be read, or not all of it was.
        readmeNote: described.has(f.path) ? null : (readmeNotes.get(f.folder) ?? null),
        usedIn: used.get(f.path) ?? [],
        selection: { label: fileLabel(f.path) },
      };
      items.set(item.key, item);
      return item;
    });
    count += files.length;
    const notes = [...(group.id === "results" ? ["The Code view also lists these files."] : []), ...walkNotes(group, walk)];
    for (const folder of walk.folders) {
      const note = readmeNotes.get(folder);
      if (note !== undefined) notes.push(note);
    }
    if (group.id === "figs") {
      const figures = files.filter((f) => f.kind === "figure").length;
      if (figures > LIMITS.thumbs) notes.push(`Pictures are drawn for the first ${n(LIMITS.thumbs)} of ${n(figures)} figures; click Show on a card past them to draw it.`);
    }
    if (group.id !== "datasets") {
      if (walk.root === "ok") present.push(folderOf(group));
      return { group, where: folderOf(group), notes, cards: files.filter((f) => f.kind === "figure"), rows: files.filter((f) => f.kind !== "figure"), datasets: null };
    }
    let view: DatasetsView | null = null;
    let message: string | null = null;
    if (!input.readme.ok) message = "status" in input.readme && input.readme.status === 404 ? `No ${README}` : `${README} could not be read: ${readProblem(input.readme)}`;
    else {
      view = datasets(input.readme.doc);
      if (input.readme.doc.cut) notes.unshift(`${README}: the view does not read lines past ${n(input.readme.doc.lines)}, so datasets listed there are not shown.`);
      if (view.state === "no-section") message = `${README} has no Data section`;
      else if (view.state === "no-table") message = `No dataset table in ${README}'s Data section`;
      else {
        for (const d of view.rows) items.set(d.key, d);
        count += view.rows.length;
      }
    }
    if (input.readme.ok || walk.root === "ok") present.push("datasets");
    return { group, where: `listed in ${README}`, notes, cards: [], rows: files, datasets: { view, message } };
  });
  return { count: `${plural(count, "item")}${present.length > 0 ? ` · ${present.join(" · ")}` : ""}`, groups, items, usedInNotes };
}

/**
 * "Used in" for one file: at most LIMITS.usedIn places and how many more;
 * "Not named in …" only when both files were read whole and name it nowhere;
 * and, beside the places or in their stead, what could not be read (`notes`).
 */
export function usedInWords(item: FileItem, notes: readonly string[]): { places: string[]; more: number; none: string | null; notes: string[] } {
  const places = item.usedIn.slice(0, LIMITS.usedIn).map(placeText);
  const more = Math.max(0, item.usedIn.length - LIMITS.usedIn);
  const none = places.length === 0 && notes.length === 0 ? `Not named in ${SKELETON} or ${README}` : null;
  return { places, more, none, notes: [...notes] };
}

// ---- previews -------------------------------------------------------------------------

/** The bytes to read of a preview: one past its cap, so a file of exactly the cap is read whole (readStart says `cut` at its limit). */
export const previewCap = (kind: Kind) => (kind === "csv" ? LIMITS.csvBytes : LIMITS.previewBytes) + 1;

/** "2 MiB", "256 KiB". */
const capWords = (bytes: number) => (bytes >= 1024 * 1024 ? `${bytes / 1024 / 1024} MiB` : `${bytes / 1024} KiB`);

export interface CsvPreview {
  /** The first record, drawn as the header; then up to LIMITS.csvRows rows; every row padded to `width` cells. */
  header: string[];
  rows: string[][];
  width: number;
  /** Rows after the header in the text read, or null when the file goes on past what was read. */
  total: number | null;
  /** "First 20 of 943 rows", "All 3 rows", "First 20 rows of a file over 2 MiB". */
  words: string;
  /** What else the preview leaves out or changes: columns past the cap, cut cells, rows of another width, an open quote. */
  notes: string[];
}

/**
 * A CSV file's preview (os-ui/PLUGINS.md Part 3, §4.2 "Preview: CSV"), in
 * one pass over the text: fields split on ",", records on LF or CRLF (a lone
 * CR is a character, as everywhere in the view); a field that starts with a
 * double quote runs to the next lone one, line breaks and commas included,
 * and "" inside it is one quote; a quote anywhere else is a character. Only
 * the first rows' cells are kept, each cut at LIMITS.csvCell characters; the
 * rest are counted. `cut`: the text stops before the file does.
 */
export function csvPreview(text: string, cut: boolean): CsvPreview {
  const keep = LIMITS.csvRows + 1;
  const kept: string[][] = [];
  let record: string[] = [];
  let field = "";
  let fieldCut = false;
  let started = false; // the field has a character (or its opening quote)
  let quoted = false; // inside a quoted field
  let any = false; // the record has begun
  let records = 0;
  let columns = 0;
  let cells = 0; // cells of the current record, counted for every record
  let headerCells = 0;
  const uneven: number[] = [];
  let unevenCount = 0;
  let cellsCut = false;
  let quoteRecord = 0; // the record whose quoted field is open
  const storing = () => records < keep;
  const push = (c: string) => {
    if (!storing()) return;
    if (field.length < LIMITS.csvCell + 1) field += c;
    else fieldCut = true;
  };
  const endField = () => {
    cells++;
    if (storing()) {
      if (fieldCut || field.length > LIMITS.csvCell) {
        cellsCut = true;
        record.push(cutText(field, LIMITS.csvCell));
      } else record.push(field);
    }
    field = "";
    fieldCut = false;
    started = false;
  };
  const endRecord = () => {
    if (records === 0) headerCells = cells;
    else if (cells !== headerCells) {
      unevenCount++;
      if (uneven.length < 5) uneven.push(records);
    }
    columns = Math.max(columns, cells);
    if (storing()) kept.push(record);
    records++;
    record = [];
    cells = 0;
    any = false;
  };
  const length = text.length;
  for (let i = 0; i < length; i++) {
    const c = text.charCodeAt(i);
    if (quoted) {
      if (c === 34) {
        if (text.charCodeAt(i + 1) === 34) {
          push('"');
          i++;
        } else quoted = false;
      } else push(text[i]!);
      continue;
    }
    if (c === 44) {
      any = true;
      endField();
    } else if (c === 10 || (c === 13 && text.charCodeAt(i + 1) === 10)) {
      if (c === 13) i++;
      endField();
      endRecord();
    } else if (c === 34 && !started) {
      any = true;
      started = true;
      quoted = true;
      quoteRecord = records;
    } else {
      any = true;
      started = true;
      push(text[i]!);
    }
  }
  // Still inside quotes at the end: the field that opened them ran to the end of the text.
  const openQuote = quoted ? quoteRecord : null;
  if (any) {
    endField();
    endRecord();
  }
  const header = kept[0] ?? [];
  const body = kept.slice(1);
  const width = Math.min(LIMITS.csvColumns, Math.max(header.length, ...body.map((r) => r.length)));
  const pad = (row: string[]) => {
    const out = row.slice(0, width);
    while (out.length < width) out.push("");
    return out;
  };
  const total = cut ? null : Math.max(0, records - 1);
  const shown = body.length;
  let words: string;
  if (records === 0) words = cut ? `The first ${capWords(LIMITS.csvBytes)} hold no row` : "The file holds no row";
  else if (total === null) words = `First ${n(shown)} ${shown === 1 ? "row" : "rows"} of a file over ${capWords(LIMITS.csvBytes)}`;
  else if (shown === total) words = total === 0 ? "No row after the first" : `All ${plural(total, "row")}`;
  else words = `First ${n(shown)} of ${plural(total, "row")}`;
  const notes: string[] = [];
  if (columns > LIMITS.csvColumns) notes.push(`Rows have up to ${n(columns)} cells; the first ${LIMITS.csvColumns} columns are shown.`);
  if (cellsCut) notes.push(`Cells longer than ${LIMITS.csvCell} characters are cut.`);
  if (unevenCount > 0) {
    const which = uneven.map(n);
    notes.push(`${plural(unevenCount, "row")} (${unevenCount > uneven.length ? `${which.join(", ")}, …` : listed(which)}) ${unevenCount === 1 ? "has" : "have"} another number of cells than the first; shown padded.`);
  }
  if (openQuote !== null && !cut) {
    notes.push(`A quoted field opened in ${openQuote === 0 ? "the first row" : `row ${n(openQuote)}`} is never closed; the rest of the file is read as its text.`);
  }
  return { header: pad(header), rows: body.map(pad), width, total, words, notes };
}

export interface LinesPreview {
  /** The first LIMITS.previewLines lines, each cut at LIMITS.lineChars characters. */
  lines: string[];
  /** Lines in the text read, or null when the file goes on past what was read. */
  total: number | null;
  /** "First 40 of 217 lines", "12 lines", "First 40 lines of a file over 256 KiB". */
  words: string;
}

/** A text file's first lines (JSON or any other text): LF or CRLF ends a line, a lone CR does not (md-kit's splitLines). */
export function linesPreview(text: string, cut: boolean): LinesPreview {
  const all = splitLines(text);
  const lines = all.slice(0, LIMITS.previewLines).map((l) => cutText(l, LIMITS.lineChars));
  const total = cut ? null : all.length;
  let words: string;
  if (total === null) words = `First ${plural(lines.length, "line")} of a file over ${capWords(LIMITS.previewBytes)}`;
  else if (total === 0) words = "The file is empty";
  else if (lines.length === total) words = plural(total, "line");
  else words = `First ${n(lines.length)} of ${plural(total, "line")}`;
  return { lines, total, words };
}

/** A Markdown file's first blocks, and what the preview leaves out. */
export function markdownPreview(doc: Doc, cut: boolean): { blocks: Block[]; notes: string[] } {
  const notes: string[] = [];
  const blocks = doc.blocks.slice(0, LIMITS.mdBlocks);
  for (const block of blocks) {
    if (block.kind !== "table") continue;
    if (block.more > 0) notes.push(`The table at line ${n(block.first)} has ${plural(block.more, "more row")}; the first ${n(block.rows.length)} are shown.`);
    if (block.columnsCut) notes.push(`The table at line ${n(block.first)} has more than ${n(block.header.length)} columns; the first ${n(block.header.length)} are shown.`);
  }
  if (doc.blocks.length > LIMITS.mdBlocks) notes.push(`The first ${n(LIMITS.mdBlocks)} of ${n(doc.blocks.length)} blocks are shown.`);
  if (doc.cut) notes.push(`Only the first ${n(doc.lines)} lines are read.`);
  if (cut) notes.push(`Only the first ${capWords(LIMITS.previewBytes)} of the file are read.`);
  return { blocks, notes };
}

/** The panel's Size line: the listing's size, then the rows or lines once the preview has counted them. */
export function sizeLine(size: number, counted: { rows: number } | { lines: number } | null): string {
  if (counted === null) return sizeWords(size);
  return "rows" in counted ? `${sizeWords(size)} · ${plural(counted.rows, "row")}` : `${sizeWords(size)} · ${plural(counted.lines, "line")}`;
}

/** A preview's words when the read channel did not give the file (status 0: the app could not be reached). */
export function previewWords(status: number, name: string): Words {
  if (status === 413) return { title: "Too large to show", text: `${name} is larger than 32 MiB, the most the app reads.`, retry: false };
  if (status === 503) return { title: "Too many files are being read at once", text: "Try again in a moment.", retry: true };
  if (status === 0) return { title: "The Assets view could not reach the app", text: "Try again; if it keeps failing, restart the app.", retry: true };
  if (status === 404) return { title: "This file cannot be opened", text: `${name} is not there any more, or it is a link the Assets view may not follow. Reload lists the folders again.`, retry: false };
  return { title: "This file could not be read", text: `The app answered ${status} for ${name}.`, retry: true };
}

/** What a preview shows instead of a file the view will not draw. */
export function noPreviewWords(kind: "pdf" | "binary" | "encoding", name: string): Words {
  if (kind === "pdf") return { title: "No preview", text: "PDF files are not previewed here.", retry: false };
  if (kind === "binary") return { title: "No preview", text: `${name} holds binary data.`, retry: false };
  return { title: "No preview", text: `${name} seems to be text in an encoding other than UTF-8, which the Assets view cannot show.`, retry: false };
}

/** An image whose load failed for good: by the channel's status for it, or the time-out. */
export function imageWords(status: number | "timeout", name: string): Words {
  if (status === "timeout") return { title: "Not drawn", text: `${name} took too long to load.`, retry: true };
  if (status === 200) return { title: "Not drawn", text: `${name} is not an image the view can draw (it may be damaged).`, retry: true };
  return previewWords(status, name);
}

/** The words for a page whose ?project= is missing, or not a project folder name. */
export function projectWords(search: string): Words {
  const given = new URLSearchParams(search).get("project");
  if (given === null || given === "") return { title: "No project given", text: "The Assets view opens from a project's workspace, which names the project it shows.", retry: false };
  return { title: "Not a project name", text: `“${clip(given, 80)}” is not a project folder name the Assets view can open (a letter, then letters, digits, _ or -).`, retry: false };
}
