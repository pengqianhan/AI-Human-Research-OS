/**
 * The Code view page's pure parts: URLs, text decoding, the patch's rows, the
 * labels a selection reports, and the words each answer state shows. No DOM
 * and no fetch, so `npm test` runs them in Node. Everything here treats file
 * names, contents, diffs, and commit text as data: it builds strings, and
 * main.ts puts them on screen as text only.
 */
import type { Commit, FileChange, LogCommit, Source } from "../../../server/codeGit.ts";

/** A project folder name, as the Git handler and chat.ts accept it. */
const PROJECT = /^[A-Za-z][A-Za-z0-9_-]*$/;

/** The project named in this page's `?project=`, or null when it is missing or not a folder name. */
export function projectFrom(search: string): string | null {
  const name = new URLSearchParams(search).get("project");
  return name !== null && PROJECT.test(name) ? name : null;
}


/** The read channel on this page's own origin (os-ui/client/DESIGN.md §3.2); `rel` is relative to the workspace. */
export const filesUrl = (rel: string) => `./_os/files?path=${encodeURIComponent(rel)}`;
export const listUrl = (rel: string) => `./_os/list?path=${encodeURIComponent(rel)}`;

/** The Git handler on this page's own origin, every value encoded. */
export function gitUrl(route: "" | "log" | "commit" | "diff", query: Record<string, string>): string {
  const params = Object.entries(query)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `/api/code-view/git/${route}?${params}`;
}

/** How much of a file the viewer reads and shows. */
export const VIEW = {
  /** Bytes read from the channel at most; the rest of the stream is cancelled. */
  bytes: 2 * 1024 * 1024,
  /** Lines put on screen at most, for a file or a diff. */
  lines: 5000,
} as const;

/** The host's limits for os.select (src/plugins/select.ts); the page cuts to them. */
export const LABEL_MAX = 200;
export const QUOTE_MAX = 2000;

/**
 * Bytes as text, or null when they are not text: a NUL byte in the first
 * 8,000 (as Git decides), or anything that is not UTF-8. `cut` says the bytes
 * stop before the file does, so up to three bytes of a character split at the
 * end are dropped rather than taken as binary.
 */
export function decodeText(bytes: Uint8Array, cut = false): string | null {
  const read = readText(bytes, cut);
  return read.kind === "text" ? read.text : null;
}

/**
 * What the viewer makes of a file's bytes: UTF-8 text, binary data (a NUL
 * byte in the first 8,000, as Git decides), or text in another encoding
 * (Latin-1, GBK, ...), which the view does not guess at and says so.
 */
export function readText(bytes: Uint8Array, cut = false): { kind: "text"; text: string } | { kind: "binary" } | { kind: "encoding" } {
  if (bytes.subarray(0, 8000).includes(0)) return { kind: "binary" };
  const text = utf8(bytes, cut);
  return text === null ? { kind: "encoding" } : { kind: "text", text };
}

function utf8(bytes: Uint8Array, cut: boolean): string | null {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  for (let drop = 0; drop <= (cut ? 3 : 0) && drop <= bytes.length; drop++) {
    try {
      return decoder.decode(bytes.subarray(0, bytes.length - drop));
    } catch {
      // try again without a split character at the end
    }
  }
  return null;
}

/** A text's lines, at most `max` of them; `total` counts them all (a final newline ends the last line). */
export function splitLines(text: string, max: number = VIEW.lines): { lines: string[]; total: number } {
  const all = text.split(/\r?\n/);
  if (all.length > 1 && all[all.length - 1] === "") all.pop();
  return { lines: all.slice(0, max), total: all.length };
}

/** Characters of one line put on screen at most; the rest is cut with ROW_CUT. */
export const ROW_MAX = 2000;
export const ROW_CUT = " …[line cut]";

/** A line as a row shows it: at most ROW_MAX characters, then ROW_CUT. */
export const rowText = (line: string) => (line.length <= ROW_MAX ? line : line.slice(0, ROW_MAX) + ROW_CUT);

/**
 * The viewer's note: "12 lines · read-only"; "Lines 1–5,000 of 12,345 ·
 * read-only" when the line cap cut it; and when the read cap did (the file
 * goes on past what was read), "The first 3 lines of a longer file · read-only".
 */
export function linesNote(shown: number, total: number, more: boolean): string {
  if (more) return `The first ${n(shown)} line${shown === 1 ? "" : "s"} of a longer file · read-only`;
  if (shown === total) return `${n(total)} line${total === 1 ? "" : "s"} · read-only`;
  return `Lines 1–${n(shown)} of ${n(total)} · read-only`;
}

/** A number with thousands separators, as the mockup writes them ("19,987"). */
export const n = (value: number) => value.toLocaleString("en-US");

/** One row of a patch as the diff shows it. */
export interface DiffRow {
  kind: "file" | "hunk" | "add" | "del" | "same" | "note";
  text: string;
  /** Line numbers before and after, where the row has them. */
  old?: number;
  new?: number;
}

/**
 * The rows of one file's patch (git show --patch): the file header, each hunk
 * header, and its lines with their numbers; "Binary files … differ" and "\ No
 * newline at end of file" are notes; the index, ---, +++ and mode lines are
 * left out, as in the mockup.
 */
export function parsePatch(diff: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let before = 0;
  let after = 0;
  let inHunk = false;
  const lines = diff.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      inHunk = false;
      continue;
    }
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk !== null) {
      before = Number(hunk[1]);
      after = Number(hunk[2]);
      inHunk = true;
      rows.push({ kind: "hunk", text: line });
      continue;
    }
    if (!inHunk) {
      if (/^Binary files .* differ$/.test(line)) rows.push({ kind: "note", text: line });
      continue;
    }
    if (line.startsWith("+")) rows.push({ kind: "add", text: line, new: after++ });
    else if (line.startsWith("-")) rows.push({ kind: "del", text: line, old: before++ });
    else if (line.startsWith("\\")) rows.push({ kind: "note", text: line });
    else rows.push({ kind: "same", text: line, old: before++, new: after++ });
  }
  return rows;
}

/** `text` cut to `max` characters, ending in "…" when cut. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** A label cut to the host's limit from the left, so the file's own name stays readable. */
export function clipLabel(label: string): string {
  return label.length <= LABEL_MAX ? label : `…${label.slice(label.length - (LABEL_MAX - 1))}`;
}

/** What a selection reports (os.select): a one-line label and, for text, the quote. */
export interface Selection {
  label: string;
  quote?: string;
}

/** Labels are one line: any control character in a name (a newline is legal in a file name) becomes a space. */
/**
 * Labels are one line of visible text (the host refuses anything else): a
 * line break, an invisible character, or a space other than U+0020 in a name
 * (all legal in a file name) shows as a marker naming it, "⟨U+200B⟩".
 * Plain spaces stay as they are: the path is the file's.
 */
const oneLine = (text: string) =>
  text.replace(/(?! )[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\p{Zs}\u2028\u2029\u2800]/gu, (c) => `⟨U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}⟩`);

/** A file of the project, by its path relative to the project ("Code/README.md"). */
export const fileSelection = (path: string): Selection => ({ label: clipLabel(oneLine(path)) });

/** One line of a file: "Code/README.md:12" and that line. */
export const lineSelection = (path: string, line: number, text: string): Selection => ({
  label: clipLabel(`${oneLine(path)}:${line}`),
  quote: clip(text, QUOTE_MAX),
});

/** Text selected across lines of a file: "Code/README.md:12–14" and the text. */
export const rangeSelection = (path: string, first: number, last: number, text: string): Selection => ({
  label: clipLabel(first === last ? `${oneLine(path)}:${first}` : `${oneLine(path)}:${first}–${last}`),
  quote: clip(text, QUOTE_MAX),
});

/** A commit: its short hash, and its subject as the quote. */
export const commitSelection = (commit: Pick<LogCommit, "short" | "subject">): Selection => ({
  label: commit.short,
  quote: clip(commit.subject, QUOTE_MAX),
});

/** One line of a commit's diff, as the mockup words it: "63ead0b · Code/README.md · added line 12". */
export function diffSelection(short: string, path: string, row: DiffRow): Selection | null {
  const where =
    row.kind === "add" ? `added line ${row.new}` : row.kind === "del" ? `removed line ${row.old}` : row.kind === "same" ? `line ${row.new}` : null;
  if (where === null) return null;
  return { label: clipLabel(`${short} · ${oneLine(path)} · ${where}`), quote: clip(row.text, QUOTE_MAX) };
}

/** Text selected across rows of a commit's diff: "63ead0b · Code/README.md · diff" and the text. */
export const diffTextSelection = (short: string, path: string, text: string): Selection => ({
  label: clipLabel(`${short} · ${oneLine(path)} · diff`),
  quote: clip(text, QUOTE_MAX),
});

/** A commit row's counts: "9 files in this project · +350 −135"; zero counts are left out. */
export function commitStat(c: Pick<LogCommit, "files" | "added" | "deleted">): string {
  const lines = [c.added > 0 ? `+${n(c.added)}` : "", c.deleted > 0 ? `−${n(c.deleted)}` : ""].filter(Boolean).join(" ");
  return `${n(c.files)} file${c.files === 1 ? "" : "s"} in this project${lines === "" ? "" : ` · ${lines}`}`;
}

/** A changed file's count in the list: "+4 −2", "Bin 0 → 140601 bytes" for a binary file, or "Bin" when its sizes are unknown. */
export function changeCount(f: Pick<FileChange, "added" | "deleted" | "sizes">): string {
  if (f.added === null || f.deleted === null) return f.sizes === null ? "Bin" : `Bin ${f.sizes.old} → ${f.sizes.new} bytes`;
  return [f.added > 0 || f.deleted === 0 ? `+${n(f.added)}` : "", f.deleted > 0 ? `−${n(f.deleted)}` : ""].filter(Boolean).join(" ");
}

/** Git's summary line: "9 files changed, 350 insertions(+), 135 deletions(−)". */
export function statLine(stat: Commit["stat"]): string {
  const parts = [`${n(stat.files)} file${stat.files === 1 ? "" : "s"} changed`];
  if (stat.added > 0) parts.push(`${n(stat.added)} insertion${stat.added === 1 ? "" : "s"}(+)`);
  if (stat.deleted > 0) parts.push(`${n(stat.deleted)} deletion${stat.deleted === 1 ? "" : "s"}(−)`);
  return parts.join(", ");
}

/** Why a changed file has no diff to open (FileChange.openable is false). */
export function notOpenable(path: string): string {
  return path.split("/").some((s) => s.startsWith("."))
    ? "Not shown here: hidden files (names starting with a dot) cannot be opened in the Code view."
    : "Not shown here: the Code view cannot open a file with this name.";
}

/** The command a Changes list reflects, so a reader can run it: the project's own repository or the workspace's. */
export function logCommand(source: Source, project: string): string {
  return source.repo === "project" ? `git -C projects-folder/${project} log -- .` : `git log -- ${source.filter}`;
}

/** Words for a screen: a title, a sentence, and whether "Try again" can help. */
export interface Words {
  title: string;
  text: string;
  retry: boolean;
}

/** The Changes view's words when the repository cannot be read: none at all, or the handler's problem as given. */
export function unavailableWords(problem: string | undefined, project: string): Words {
  if (problem === undefined) {
    return {
      title: "No history to show",
      text: `Neither projects-folder/${project}/ nor the Research OS folder is a Git repository, so no changes are recorded. Files still shows the project's code.`,
      retry: true,
    };
  }
  return { title: "Git cannot be used here", text: problem, retry: true };
}

/**
 * The words for an answer that is not a usable 200, from the Git handler or
 * the read channel: `status` (0 when the request did not reach the app) and
 * the handler's `error` text, shown as given.
 */
export function answerWords(what: "history" | "commit" | "diff", status: number, error: string | null): Words {
  const given = error ?? `the app answered ${status}`;
  if (status === 0) return { title: "The Code view could not reach the app", text: "Try again; if it keeps failing, restart the app.", retry: true };
  if (status === 503) return { title: "Not available right now", text: given, retry: true };
  if (status === 500) {
    const step = what === "history" ? "this project's history" : what === "commit" ? "this commit" : "this file's changes";
    return { title: `Git could not read ${step}`, text: given, retry: true };
  }
  if (status === 404) {
    return { title: what === "history" ? "Not found" : `This ${what === "commit" ? "commit" : "change"} is no longer in the history`, text: `${given}. The history may have changed; reload the list.`, retry: false };
  }
  return { title: "The Code view asked for something it cannot open", text: given, retry: false };
}

/** The words for a file the viewer does not show, by the read channel's status. */
export function fileWords(status: number, name: string): Words {
  if (status === 413) return { title: "Too large to show", text: `${name} is larger than 32 MiB, the most the Code view reads.`, retry: false };
  if (status === 503) return { title: "Too many files are being read at once", text: "Try again in a moment.", retry: true };
  if (status === 0) return { title: "The Code view could not reach the app", text: "Try again; if it keeps failing, restart the app.", retry: true };
  if (status === 404) return { title: "This file cannot be opened", text: `${name} is not there any more, or it lies outside Code/.`, retry: false };
  return { title: "This file could not be read", text: `The app answered ${status} for ${name}.`, retry: true };
}

/** An image the channel sent (status 200) but the view could not show. */
export const imageWords = (name: string): Words => ({ title: "This image cannot be shown", text: `${name} is not an image the Code view can draw (it may be damaged).`, retry: false });

/** The words for a page whose ?project= is missing, or not a project folder name. */
export function projectWords(search: string): Words {
  const given = new URLSearchParams(search).get("project");
  if (given === null || given === "") return { title: "No project given", text: "The Code view opens from a project's workspace, which names the project it shows.", retry: false };
  return { title: "Not a project name", text: `“${clip(given, 80)}” is not a project folder name the Code view can open (a letter, then letters, digits, _ or -).`, retry: false };
}

/** Whether a message is the workspace clearing the selection: from the parent window, at the app's origin, and nothing else. */
export function isHostClear(event: { source: unknown; origin: string; data: unknown }, parent: unknown, host: string): boolean {
  if (event.source !== parent || event.origin !== host) return false;
  const data = event.data as { type?: unknown } | null;
  return typeof data === "object" && data !== null && data.type === "os.select.clear";
}

/** Folders first, then files, each in the channel's order. */
export function treeOrder<T extends { dir: boolean }>(entries: readonly T[]): T[] {
  return [...entries.filter((e) => e.dir), ...entries.filter((e) => !e.dir)];
}

/** Image types the viewer shows as an image, by extension. */
export const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;
