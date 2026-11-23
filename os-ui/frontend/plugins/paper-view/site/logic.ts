/**
 * The Paper view page's pure parts: zoom as mockup C has it, which pages to
 * draw, the canvas size cap, the outline heading a selection falls under, the
 * label and quote a selection reports, and the words each state shows. No
 * DOM, no fetch, and no PDF.js, so `npm test` runs them in Node. Outline
 * titles and the PDF's text are untrusted: this builds strings, and main.ts
 * puts them on screen as text only.
 */
import { clip, LABEL_MAX, QUOTE_MAX, visibleName } from "../../site-kit.ts";

/** The project-relative paths the view reads and names; labels use them as they are. */
export const PDF = "paper/main.pdf";
export const TEX = "paper/main.tex";
export const FOLDER = "paper";

// ---- zoom (mockup C: .sheet is 640px wide at 100%) ------------------------------------

/** A page's width in CSS pixels at 100%, as the mockup's sheet. */
export const SHEET_WIDTH = 640;
/** The zoom steps: the mockup's 80% to 150%, then three more for reading a figure closely. */
export const STEPS: readonly number[] = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.5, 2, 2.5, 3];
/** "Fit width" as the mockup: the scroller's width less its 24px gutters, kept between 80% and 150%. */
export const FIT = { gutter: 48, min: 0.8, max: 1.5 } as const;

export type Zoom = "fit" | number;

export function fitZoom(scrollerWidth: number): number {
  return Math.max(FIT.min, Math.min(FIT.max, (scrollerWidth - FIT.gutter) / SHEET_WIDTH));
}

/** The zoom factor shown for a zoom mode at a scroller width. */
export const zoomFactor = (zoom: Zoom, scrollerWidth: number) => (zoom === "fit" ? fitZoom(scrollerWidth) : zoom);

/** One step in or out from `z`, as the mockup's zoomStep: the next step past it, or the last one. */
export function zoomStep(z: number, direction: 1 | -1): number {
  if (direction > 0) return STEPS.find((s) => s > z + 0.001) ?? STEPS[STEPS.length - 1]!;
  const lower = STEPS.filter((s) => s < z - 0.001);
  return lower.length > 0 ? lower[lower.length - 1]! : STEPS[0]!;
}

/** "Fit · 104%" or "125%", as the mockup's zoom label. */
export const zoomLabel = (zoom: Zoom, z: number) => `${zoom === "fit" ? "Fit · " : ""}${Math.round(z * 100)}%`;

/** CSS pixels per PDF unit: the first page is SHEET_WIDTH · z wide, every other page in proportion. */
export const cssScale = (z: number, firstPageWidth: number) => (SHEET_WIDTH * z) / firstPageWidth;

export const pageLabel = (page: number, total: number) => `Page ${page} of ${total}`;

// ---- which pages to draw --------------------------------------------------------------

/** A page's place in the scroller, in CSS pixels. */
export interface Box {
  top: number;
  height: number;
}

/** The indices of the boxes that reach into [from, to]. */
export function pagesWithin(boxes: readonly Box[], from: number, to: number): number[] {
  const out: number[] = [];
  boxes.forEach((b, i) => {
    if (b.top + b.height >= from && b.top <= to) out.push(i);
  });
  return out;
}

/**
 * What a scroll position means for the pages: the page the label names (the
 * one a quarter down the view, or the last at the bottom), the pages drawn
 * (within one view height above or below), and the pages whose canvases are
 * kept (within three); any other page's canvas is released.
 */
export function pagePlan(boxes: readonly Box[], view: { top: number; height: number; scrollHeight: number }): { current: number; draw: number[]; keep: number[] } {
  if (boxes.length === 0) return { current: 0, draw: [], keep: [] };
  const { top, height } = view;
  const mark = top + height / 4;
  let current = 0;
  boxes.forEach((b, i) => {
    if (b.top <= mark) current = i;
  });
  if (top + height >= view.scrollHeight - 2) current = boxes.length - 1;
  const centre = top + height / 2;
  const draw = pagesWithin(boxes, top - height, top + 2 * height).sort(
    (a, b) => Math.abs(boxes[a]!.top + boxes[a]!.height / 2 - centre) - Math.abs(boxes[b]!.top + boxes[b]!.height / 2 - centre),
  );
  return { current, draw, keep: pagesWithin(boxes, top - 3 * height, top + 4 * height) };
}

/**
 * A canvas holds at most this many pixels (4096 × 4096, 64 MiB at four bytes
 * each). Past it, a page is drawn at a lower resolution and the canvas is
 * scaled up to the page's size: blurrier at high zoom. It bounds the canvas,
 * not what PDF.js holds while it draws (PAGE_BUDGET_MS bounds that in time).
 */
export const MAX_CANVAS_PIXELS = 4096 * 4096;

// ---- bounds on a hostile or enormous PDF (the review of S6b measured each) ------------

/**
 * How long one page may take to draw (PDF.js reading its content in the
 * worker, then drawing it), or to lay out its text, before the view stops it.
 * The nanochat_cpu paper's pages draw in well under a second; a page that
 * takes fifteen is unreadable anyway, and a hostile one (nested forms, many
 * large images) is stopped before it holds the worker and its memory longer.
 */
export const PAGE_BUDGET_MS = 15_000;

/**
 * Pages laid out at most. Every page is a sheet in one scrolling column, and
 * each scroll frame looks at every sheet (300,000 pages took about 2 s a
 * frame in the review); 1,000 keeps that under a few milliseconds and is more
 * than any paper or thesis this view is for. Past it the view says how many
 * it shows, of how many.
 */
export const PAGES_MAX = 1000;

/**
 * The tallest the column of pages may be, in CSS pixels, at the largest zoom.
 * Chromium clamps an element's height at 16,777,216 px, so pages laid out
 * below that could never be scrolled to; this stays under it with room for
 * the scroller's padding.
 */
export const LAYOUT_MAX_PX = 16_000_000;

/** The scroller's padding above the first page and below the last, and the gap between pages (style.css), in CSS pixels. */
export const LAYOUT_PADDING = { top: 26, bottom: 96, gap: 18 } as const;

/**
 * How many pages, from the first, the view lays out: at most PAGES_MAX, and
 * only as many as fit in LAYOUT_MAX_PX when every one is drawn at the largest
 * zoom step. `heightAt(i)` is page i's height in PDF units (a page not read
 * yet counts as the first page's height; the view checks again as it reads
 * each). At least the first page is laid out.
 */
export function pagesShown(total: number, heightAt: (index: number) => number, firstWidth: number): number {
  const scale = cssScale(STEPS[STEPS.length - 1]!, firstWidth);
  let height = LAYOUT_PADDING.top + LAYOUT_PADDING.bottom;
  const most = Math.min(total, PAGES_MAX);
  for (let i = 0; i < most; i++) {
    height += Math.floor(heightAt(i) * scale) + LAYOUT_PADDING.gap;
    if (height > LAYOUT_MAX_PX) return Math.max(1, i);
  }
  return most;
}

/**
 * Text runs (PDF.js text items) of one page made selectable at most. The
 * review's page of 100,000 one-character runs took 138 s to lay out and about
 * 1 GB; a dense page of an ordinary paper has a few hundred to a few thousand.
 */
export const TEXT_RUNS_MAX = 10_000;

/** One chunk of a page's text content as PDF.js streams it. */
export interface TextChunk {
  items: unknown[];
  styles?: unknown;
  lang?: unknown;
}

/**
 * A page's text content stream, cut after `max` text items: the stream ends
 * there, the source is cancelled, and `onCut` is called once.
 */
export function capTextRuns(source: ReadableStream<TextChunk>, max: number, onCut: () => void): ReadableStream<TextChunk> {
  const reader = source.getReader();
  let count = 0;
  return new ReadableStream<TextChunk>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const room = max - count;
      if (value.items.length <= room) {
        count += value.items.length;
        controller.enqueue(value);
        return;
      }
      controller.enqueue({ ...value, items: value.items.slice(0, room) });
      count = max;
      onCut();
      controller.close();
      void reader.cancel().catch(() => {});
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/**
 * The pages a selection quotes: the first and the last page (1-based) whose
 * part of the selection holds any text that is not blank. A selection that
 * starts at the very end of one page's text, or ends at the very start of
 * another's, does not reach that page. null when no page holds text.
 */
export function quotedPages(parts: readonly { page: number; text: string }[]): { first: number; last: number } | null {
  const pages = parts.filter((p) => p.text.trim() !== "").map((p) => p.page);
  return pages.length === 0 ? null : { first: Math.min(...pages), last: Math.max(...pages) };
}

/** Canvas pixels per CSS pixel for a page of `width` × `height` CSS pixels: the display's ratio, lowered to the cap. */
export function outputScale(width: number, height: number, devicePixelRatio: number, max: number = MAX_CANVAS_PIXELS): number {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const area = width * height;
  if (!(area > 0) || area * ratio * ratio <= max) return ratio;
  return Math.sqrt(max / area);
}

// ---- outline headings -----------------------------------------------------------------

/** An outline entry that points into the document: its title, its page (0-based), and the top it shows, in PDF units (null: the top of the page). */
export interface Heading {
  title: string;
  page: number;
  top: number | null;
}

/** Outline entries read at most, and how deep; a hostile outline cannot keep the page busy. */
export const OUTLINE_MAX = { entries: 2000, depth: 8 } as const;
/** Characters of a title kept: more than a label can show, so the cut is visible. */
const TITLE_MAX = 400;

/**
 * The top coordinate an explicit destination shows ([page, {name}, ...args]),
 * or null when it shows the whole page or names no top (PDF 32000-1 §12.3.2.2).
 */
export function destTop(dest: readonly unknown[]): number | null {
  const kind = (dest[1] as { name?: unknown } | null | undefined)?.name;
  const at = (i: number) => (typeof dest[i] === "number" && Number.isFinite(dest[i]) ? (dest[i] as number) : null);
  if (kind === "XYZ") return at(3);
  if (kind === "FitH" || kind === "FitBH") return at(2);
  if (kind === "FitR") return at(5);
  return null;
}

/** A title as a heading keeps it: at most TITLE_MAX characters, trimmed; null when nothing is left. */
export function headingTitle(title: unknown): string | null {
  if (typeof title !== "string") return null;
  const kept = title.slice(0, TITLE_MAX).trim();
  return kept === "" ? null : kept;
}

/** Headings in reading order: by page, then from the top of the page down (a page-top heading first); the outline's order breaks ties. */
export function readingOrder(headings: readonly Heading[]): Heading[] {
  return headings
    .map((h, i) => ({ h, i }))
    .sort((a, b) => a.h.page - b.h.page || (b.h.top ?? Infinity) - (a.h.top ?? Infinity) || a.i - b.i)
    .map(({ h }) => h);
}

/**
 * The heading a point of the document falls under: the last heading, in
 * reading order, at or above it. `y` is the point's height on page `page`
 * (0-based) in PDF units, which grow upwards; null means the top of the
 * page. A destination's top usually sits a little above its heading's text,
 * so a selection that starts on the heading itself counts as under it.
 */
export function headingAt(sorted: readonly Heading[], page: number, y: number | null): Heading | null {
  let found: Heading | null = null;
  for (const h of sorted) {
    if (h.page > page) break;
    if (h.page < page || h.top === null || (y !== null && h.top >= y - 2)) found = h;
    else if (y === null) break;
  }
  return found;
}

// ---- what a selection reports (os.select) ---------------------------------------------

/** Ends a quote cut to the host's limit, as the host's own CUT_MARK (src/plugins/select.ts). */
export const CUT = "…[cut]";

/** `text` at most `max` characters, never splitting a surrogate pair; `mark` ends it when cut. */
function cutAt(text: string, max: number, mark: string): string {
  if (text.length <= max) return text;
  let end = max - mark.length;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end--;
  return text.slice(0, end) + mark;
}

/**
 * A selection's label: "paper/main.pdf p. 2", or "pp. 2–3" across pages,
 * then " · " and the outline heading it starts under when there is one. The
 * heading is shown with its invisible characters as markers and is what is
 * cut to keep the label within the host's 200 characters; the page stays.
 */
export function selectionLabel(first: number, last: number, heading: string | null): string {
  const base = `${PDF} ${first === last ? `p. ${first}` : `pp. ${first}–${last}`}`;
  if (heading === null) return base;
  // Blank runs collapse to one space, as the host collapses a label's (src/plugins/select.ts), so what is posted is what shows.
  const shown = visibleName(heading.replace(/[\p{Zs}\t]+/gu, " ").trim());
  return `${base} · ${cutAt(shown, LABEL_MAX - base.length - 3, "…")}`;
}

/** The selected text as the quote, without the whitespace around it, cut to the host's 2,000 characters with CUT; null when only whitespace is selected. */
export function quoteOf(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : cutAt(trimmed, QUOTE_MAX, CUT);
}

// ---- words on screen ------------------------------------------------------------------

/** Words for a screen: a title, a sentence, and whether "Try again" can help. */
export interface Words {
  title: string;
  text: string;
  retry: boolean;
}

/** The PDF could not be fetched: by the read channel's status (0: the request did not reach the app). */
export function fetchWords(status: number): Words {
  if (status === 413) return { title: "Too large to show", text: `${PDF} is larger than 32 MiB, the most the Paper view reads.`, retry: true };
  if (status === 503) return { title: "Too many files are being read at once", text: "Try again in a moment.", retry: true };
  if (status === 0) return { title: "The Paper view could not reach the app", text: "Try again; if it keeps failing, restart the app.", retry: true };
  return { title: "The paper could not be read", text: `The app answered ${status} for ${PDF}.`, retry: true };
}

/** No main.pdf: what paper/ holds instead (null: there is no paper/ folder). */
export function missingWords(project: string, entries: readonly { name: string; dir: boolean }[] | null): Words {
  if (entries === null) return { title: "No paper yet", text: "This project has no paper/ folder.", retry: true };
  if (entries.some((e) => !e.dir && e.name === "main.tex")) {
    return { title: "Not built yet", text: `The paper has not been built yet: ${TEX} exists, ${PDF} does not.`, retry: true };
  }
  return { title: "No paper yet", text: `projects-folder/${project}/paper/ holds neither main.pdf nor main.tex.`, retry: true };
}

/** An error PDF.js gave for the document, as its name, code, and message travel from the worker. */
export interface OpenError {
  name?: unknown;
  code?: unknown;
  message?: unknown;
}

/** What PDF.js could not do with the bytes, in plain words. */
export function openWords(error: OpenError): Words {
  if (error.name === "PasswordException") {
    return { title: "The paper is password-protected", text: `${PDF} is protected by a password, and the Paper view does not open protected files.`, retry: true };
  }
  const message = typeof error.message === "string" && error.message.trim() !== "" ? clip(error.message.trim(), 200) : null;
  const reason =
    error.name === "InvalidPDFException"
      ? "it is not a valid PDF file"
      : error.name === "ResponseException"
        ? "its bytes could not be read"
        : message !== null
          ? `PDF.js reported: ${message}`
          : "PDF.js gave no reason";
  return { title: "The paper could not be opened", text: `${PDF} could not be opened (${reason}).`, retry: true };
}

export const zeroPagesWords: Words = { title: "The paper has no pages", text: `${PDF} opened, but it has no pages to show.`, retry: true };

/** PDF.js itself did not load or its worker did not start. */
export const readerWords = (detail: string): Words => ({
  title: "The PDF reader could not start",
  text: `The Paper view's copy of PDF.js did not load (${clip(detail, 200)}). Rebuild the app (npm run build) or restart it.`,
  retry: true,
});

/** The words for a page whose ?project= is missing, or not a project folder name. */
export function projectWords(search: string): Words {
  const given = new URLSearchParams(search).get("project");
  if (given === null || given === "") return { title: "No project given", text: "The Paper view opens from a project's workspace, which names the project it shows.", retry: false };
  return { title: "Not a project name", text: `“${clip(given, 80)}” is not a project folder name the Paper view can open (a letter, then letters, digits, _ or -).`, retry: false };
}

/**
 * The bar's note: "paper/main.pdf · 4 pages · select text to ask the agent
 * about it", or "… · first 1,000 of 300,000 pages · …" when the view lays out
 * fewer than the PDF has.
 */
export function pagesNote(total: number, shown: number = total): string {
  const pages = shown < total ? `first ${n(shown)} of ${n(total)} pages` : `${n(total)} page${total === 1 ? "" : "s"}`;
  return `${PDF} · ${pages} · select text to ask the agent about it`;
}

/** What the end of the column says when the view lays out fewer pages than the PDF has. */
export const pagesLimitWords = (shown: number, total: number): string =>
  `The Paper view shows the first ${n(shown)} of this PDF's ${n(total)} pages (it lays out at most ${n(PAGES_MAX)}, and no more than fit in one scrolling column at ${Math.round(STEPS[STEPS.length - 1]! * 100)}%). Open ${PDF} in a PDF reader for the rest.`;

/** A page stopped for taking longer than PAGE_BUDGET_MS to draw. */
export const overBudgetWords = (page: number): string =>
  `Page ${page} took longer than ${PAGE_BUDGET_MS / 1000} s to draw, so the Paper view stopped it and the rest of the paper is shown. Reload tries again.`;

/** A page whose text was cut at TEXT_RUNS_MAX runs, or stopped for taking longer than PAGE_BUDGET_MS. */
export const textCutWords = (page: number, why: "runs" | "time"): string =>
  why === "runs"
    ? `Only the first ${n(TEXT_RUNS_MAX)} pieces of page ${page}'s text can be selected.`
    : `Page ${page}'s text took longer than ${PAGE_BUDGET_MS / 1000} s to lay out, so only part of it can be selected.`;

/** PDF.js did not start, or did not open the file, within its budget (opener.ts OPEN_BUDGET_MS). */
export const slowWords = (stage: "start" | "open", seconds: number): Words =>
  stage === "start"
    ? { title: "The PDF reader did not start", text: `PDF.js's worker did not start within ${seconds} s, so it was stopped.`, retry: true }
    : { title: "The paper took too long to open", text: `PDF.js did not open ${PDF} within ${seconds} s, so it was stopped. The file may be damaged or built to be slow.`, retry: true };

/** A number with thousands separators. */
const n = (value: number) => value.toLocaleString("en-US");
