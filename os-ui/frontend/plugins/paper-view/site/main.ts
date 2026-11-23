/**
 * The Paper view's page (os-ui/PLUGINS.md, S6b), framed by the project
 * workspace on its own origin, app://paper-view, for the project in its
 * `?project=`. It reads the project's paper/main.pdf through the read channel
 * (./_os/files, and ./_os/list when the file is missing) and draws it with the
 * vendored PDF.js (pdfjs.ts): every page on a canvas, with PDF.js's text layer
 * above it so text can be selected. It never builds the PDF, and it reads
 * nothing else and has no bridge.
 *
 * Selected text is reported to the workspace with `os.select` (posted to the
 * app's origin only): the label names the pages whose text is quoted and the
 * outline heading that text starts under; the quote is the selected text of
 * the text layer, cut to the host's limits here. The text layer holds every
 * run of the page's text, drawn or not (white on white, clipped, a remapped
 * font): the workspace shows the quote before and after "Ask the agent about
 * this", and only what it shows is sent.
 *
 * Each document runs in a PDF.js worker of its own (opener.ts). Pages are
 * drawn lazily, near the view, far pages' canvases and text released; a page
 * that takes longer than PAGE_BUDGET_MS is stopped, its worker replaced, and
 * the rest of the paper drawn. Each load and each zoom carries a number, so a
 * page drawn for an older document or zoom never replaces a newer one.
 * Outline titles and the PDF's text are untrusted and reach the DOM as text
 * only (site-kit, and PDF.js's TextLayer, which sets textContent).
 */
import { button, clear, el, filesUrl, icon, isHostClear, listUrl, projectFrom } from "../../site-kit.ts";
import {
  capTextRuns,
  cssScale,
  destTop,
  fetchWords,
  headingAt,
  headingTitle,
  missingWords,
  OUTLINE_MAX,
  openWords,
  outputScale,
  overBudgetWords,
  PAGE_BUDGET_MS,
  pageLabel,
  pagePlan,
  pagesLimitWords,
  pagesNote,
  pagesShown,
  projectWords,
  quotedPages,
  quoteOf,
  readerWords,
  readingOrder,
  selectionLabel,
  slowWords,
  TEX,
  TEXT_RUNS_MAX,
  textCutWords,
  visibleBudget,
  zeroPagesWords,
  zoomFactor,
  zoomLabel,
  zoomStep,
} from "./logic.ts";
import type { Box, Heading, OpenError, TextChunk, Words, Zoom } from "./logic.ts";
import { OPEN_BUDGET_MS, Opener } from "./opener.ts";
import { DOCUMENT_OPTIONS, loadPdfJs, startWorker } from "./pdfjs.ts";
import type { OutlineItem, PdfDocument, PdfJs, PdfPage, RenderTask, TextLayerTask, Viewport } from "./pdfjs.ts";

/** The app's origin: the only window this page reports a selection to. */
const HOST = "app://research-os";

const project = projectFrom(location.search);
const app = document.getElementById("app")!;

// ---- selection: reported to the workspace -------------------------------------------

/** The selection last reported, as label and quote, or null when none is. */
let reported: string | null = null;

function post(message: { type: "os.select"; label: string | null; quote?: string }): void {
  if (window.parent !== window) window.parent.postMessage(message, HOST);
}

function report(label: string, quote?: string): void {
  const key = JSON.stringify([label, quote ?? null]);
  if (key === reported) return;
  reported = key;
  post({ type: "os.select", label, ...(quote === undefined ? {} : { quote }) });
}

/** Tells the workspace nothing is selected, once. */
function unreport(): void {
  if (reported === null) return;
  reported = null;
  post({ type: "os.select", label: null });
}

/** Clears the selection; `tell` false when the workspace asked for it. */
function unselect(tell = true): void {
  document.querySelector(".fileref.picked")?.classList.remove("picked");
  window.getSelection()?.removeAllRanges();
  if (tell) unreport();
  else reported = null;
}

window.addEventListener("message", (event) => {
  if (isHostClear(event, window.parent, HOST)) unselect(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") unselect();
});

/** The part of `range` inside each page's text layer it reaches, in page order. */
function partsByPage(range: Range): { slot: Slot; part: Range }[] {
  if (view === null) return [];
  const out: { slot: Slot; part: Range }[] = [];
  for (const slot of view.slots) {
    if (!range.intersectsNode(slot.text)) continue;
    const part = document.createRange();
    part.selectNodeContents(slot.text);
    if (range.comparePoint(part.startContainer, part.startOffset) < 0) part.setStart(range.startContainer, range.startOffset);
    if (range.comparePoint(part.endContainer, part.endOffset) > 0) part.setEnd(range.endContainer, range.endOffset);
    out.push({ slot, part });
  }
  return out;
}

/** Reports the text selected in the pages, or that none is. */
function reportSelection(): void {
  if (view === null) return;
  const s = window.getSelection();
  if (s === null || s.isCollapsed || s.rangeCount === 0) {
    unreport();
    return;
  }
  const parts = partsByPage(s.getRangeAt(0));
  // The label names the pages whose text the quote holds, and the heading that text starts under.
  const pages = quotedPages(parts.map(({ slot, part }) => ({ page: slot.index + 1, text: part.toString() })));
  const quote = quoteOf(s.toString());
  if (pages === null || quote === null) {
    unreport();
    return;
  }
  const first = parts.find(({ slot }) => slot.index + 1 === pages.first)!;
  report(selectionLabel(pages.first, pages.last, headingFor(first.slot, first.part)?.title ?? null), quote);
}

/** The outline heading the quoted text starts under: by the top of its first line on its first page. */
function headingFor(slot: Slot, part: Range): Heading | null {
  if (view === null || view.headings.length === 0) return null;
  let y: number | null = null;
  const rect = [...part.getClientRects()].find((r) => r.width > 0 && r.height > 0);
  if (rect !== undefined && slot.page !== null) {
    const box = slot.sheet.getBoundingClientRect();
    const point = slot.page.getViewport({ scale: view.scale }).convertToPdfPoint(rect.left - box.left, rect.top - box.top);
    y = typeof point[1] === "number" && Number.isFinite(point[1]) ? point[1] : null;
  }
  return headingAt(view.headings, slot.index, y);
}

/** Whether the current selection reaches into a page (whose text layer must then stay). */
function selectionTouches(slot: Slot): boolean {
  const s = window.getSelection();
  return s !== null && s.rangeCount > 0 && !s.isCollapsed && s.getRangeAt(0).intersectsNode(slot.sheet);
}

let settleTimer: ReturnType<typeof setTimeout> | null = null;
// A drag or a key ends a selection: report it then. A selection made some
// other way (select all, a double click) is reported once it has settled;
// one cleared is reported at once. Never on every change, which the workspace
// would take as too many messages.
document.addEventListener("mouseup", () => setTimeout(reportSelection, 0));
document.addEventListener("keyup", () => reportSelection());
document.addEventListener("selectionchange", () => {
  if (view === null) return;
  if (settleTimer !== null) clearTimeout(settleTimer);
  const s = window.getSelection();
  if (s === null || s.isCollapsed) {
    unreport();
    return;
  }
  settleTimer = setTimeout(reportSelection, 400);
});

// ---- pieces ---------------------------------------------------------------------------

/** A placeholder screen, as the mockup's: a title, a sentence, and "Try again" when it can help. */
function screen(words: Words, retry?: () => void, extra?: Node): HTMLElement {
  const box = el("div", "placeholder");
  box.append(el("h4", "", words.title), el("p", "", words.text));
  if (extra !== undefined) box.append(extra);
  if (words.retry && retry !== undefined) {
    const again = button("btn", "Try again");
    again.addEventListener("click", retry);
    box.append(again);
  }
  return box;
}

/** An icon button of the bar, named for assistive technology and in its tooltip. */
function iconButton(name: string, label: string): HTMLButtonElement {
  const b = button("icon-btn");
  b.title = label;
  b.setAttribute("aria-label", label);
  b.append(icon(name));
  return b;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// ---- the bar and the scroller (mockup C's .paperbar and .paper-scroll) -----------------

const prev = iconButton("prev", "Previous page");
const pageText = el("span", "lbl2", "Page 1");
pageText.setAttribute("aria-live", "polite");
const next = iconButton("chev-right", "Next page");
const pageGroup = el("div", "grp");
pageGroup.append(prev, pageText, next);
const zoomOut = iconButton("minus", "Zoom out");
const zoomText = el("span", "lbl2", "Fit");
const zoomIn = iconButton("plus", "Zoom in");
const zoomGroup = el("div", "grp");
zoomGroup.append(zoomOut, zoomText, zoomIn);
const fit = button("btn ghost active");
fit.title = "Fit page to width";
fit.append(icon("fit", "sm"), document.createTextNode("Fit width"));
const hint = el("span", "hint", "");
const reload = button("link reload", "Reload");
reload.title = "Read paper/main.pdf again, as it is on disk now (after the agent rebuilds the paper)";
const bar = el("div", "paperbar");
bar.append(pageGroup, zoomGroup, fit, hint, reload);

/** The scroller's padding above the first page (style.css .paper-scroll): a page shown at its top keeps this gap above it. */
const PAGE_GAP = 26;
const scroller = el("div", "paper-scroll");
scroller.tabIndex = 0;
scroller.setAttribute("aria-label", "Paper");
const pages = el("div", "pages");
scroller.append(pages);

prev.addEventListener("click", () => goToPage(-1));
next.addEventListener("click", () => goToPage(1));
zoomOut.addEventListener("click", () => setZoom(zoomStep(currentZoom(), -1)));
zoomIn.addEventListener("click", () => setZoom(zoomStep(currentZoom(), 1)));
fit.addEventListener("click", () => setZoom("fit"));
reload.addEventListener("click", () => void load());
scroller.addEventListener("scroll", () => schedule(), { passive: true });
// The workspace hides this frame while another tab is shown: nothing is laid
// out at zero width, and the reader's place is put back when it shows again.
let hiddenFrame = false;
new ResizeObserver(() => {
  if (view === null) return;
  if (scroller.clientWidth === 0) {
    hiddenFrame = true;
    return;
  }
  if (hiddenFrame) {
    hiddenFrame = false;
    relayout(place);
  } else if (zoom === "fit") relayout();
  else schedule();
}).observe(scroller);

// ---- the document on screen -----------------------------------------------------------

/** One page of the document: its sheet, the canvas drawn on it, and its text layer. */
interface Slot {
  index: number;
  sheet: HTMLDivElement;
  text: HTMLDivElement;
  /** Its size in PDF units; the first page's until the page itself has been read. */
  width: number;
  height: number;
  page: PdfPage | null;
  pageLoad: Promise<PdfPage> | null;
  canvas: HTMLCanvasElement | null;
  /** The zoom number the canvas was drawn for. */
  drawn: number;
  task: RenderTask | null;
  textLayer: TextLayerTask | null;
  /** The text layer: not started, being built, or finished (or given up on). */
  textState: "none" | "building" | "done";
  /** Stopped for taking longer than PAGE_BUDGET_MS: shown as a note, never drawn again until Reload. */
  stopped: boolean;
}

/** The open document; null while a screen shows instead. */
let view: {
  lib: PdfJs;
  doc: PdfDocument;
  slots: Slot[];
  /** CSS pixels per PDF unit at the current zoom. */
  scale: number;
  headings: Heading[];
} | null = null;

/** Each document in its own PDF.js worker; opening one closes the one before. */
const opener = new Opener<PdfDocument>(() => startWorker());
/** The document load in progress or shown: each load, restart, and teardown takes the next number. */
let generation = 0;
/** The zoom number: each zoom change and each load takes the next, and a canvas drawn for another is stale. */
let zoomGeneration = 0;
let zoom: Zoom = "fit";
let current = 0;
/** The file as read, kept to open it again in a fresh worker after a page was stopped. */
let bytes: Uint8Array | null = null;
/** Pages (0-based) stopped for taking too long, since the last Reload. */
let stoppedPages = new Set<number>();

const currentZoom = () => zoomFactor(zoom, scroller.clientWidth);

/** Shows a screen instead of the pages. */
function show(node: HTMLElement): void {
  clear(app);
  app.append(node);
}

function showPages(): void {
  clear(app);
  app.append(bar, scroller);
}

/**
 * Drops the document on screen, at once: cancels every drawing, closes the
 * document (its worker ends without anything waiting for it), and tells the
 * workspace the selection went with it. Anything still running for the old
 * number finds it stale.
 */
function teardown(): void {
  generation++;
  unselect();
  const old = view;
  view = null;
  wanted = [];
  if (old !== null) {
    for (const slot of old.slots) {
      slot.task?.cancel();
      slot.textLayer?.cancel();
      releaseCanvas(slot);
    }
  }
  clear(pages);
  opener.close();
}

function releaseCanvas(slot: Slot): void {
  if (slot.canvas === null) return;
  // A canvas's memory goes with its size, not with the element.
  slot.canvas.width = 0;
  slot.canvas.height = 0;
  slot.canvas.remove();
  slot.canvas = null;
  slot.drawn = -1;
}

/** Reads paper/main.pdf and opens it, or shows the screen for what is there instead. */
async function load(): Promise<void> {
  const keepPage = view === null ? 0 : current;
  teardown();
  // Taken before any await: a second Reload in the same task makes this load stale.
  const mine = generation;
  bytes = null;
  stoppedPages = new Set();
  show(el("div", "loading", "Loading the paper…"));
  const pdfPath = `projects-folder/${project}/paper/main.pdf`;
  let res: Response;
  try {
    res = await fetch(filesUrl(pdfPath), { cache: "no-store" });
  } catch {
    if (mine === generation) show(screen(fetchWords(0), () => void load()));
    return;
  }
  if (mine !== generation) {
    void res.body?.cancel().catch(() => {});
    return;
  }
  if (res.status === 404) {
    void res.body?.cancel().catch(() => {});
    await showMissing(mine);
    return;
  }
  if (!res.ok) {
    void res.body?.cancel().catch(() => {});
    show(screen(fetchWords(res.status), () => void load()));
    return;
  }
  let data: Uint8Array;
  try {
    data = new Uint8Array(await res.arrayBuffer());
  } catch {
    if (mine === generation) show(screen(fetchWords(0), () => void load()));
    return;
  }
  if (mine !== generation) return;
  bytes = data;
  await openDocument(mine, { page: keepPage, down: null, gap: PAGE_GAP });
}

/**
 * Opens the bytes read in a fresh worker (opener.ts, within OPEN_BUDGET_MS)
 * and lays the pages out at `at`; a screen with Try again for anything else.
 */
async function openDocument(mine: number, at: Place): Promise<void> {
  let lib: PdfJs;
  try {
    lib = await loadPdfJs();
  } catch (error) {
    if (mine === generation) show(screen(readerWords(errorText(error)), () => void load()));
    return;
  }
  if (mine !== generation || bytes === null) return;
  const data = bytes;
  const result = await opener.open(
    (worker) => new lib.PDFWorker({ port: worker as Worker }),
    // A copy: PDF.js hands its buffer to the worker, and a restart needs the bytes again.
    (pdfWorker) => lib.getDocument({ ...DOCUMENT_OPTIONS, data: data.slice(), worker: pdfWorker }),
  );
  if (mine !== generation || result.kind === "stale") return;
  if (result.kind === "timeout") {
    show(screen(slowWords(result.stage, OPEN_BUDGET_MS / 1000), () => void load()));
    return;
  }
  if (result.kind === "failed") {
    show(screen(result.stage === "start" ? readerWords(errorText(result.error)) : openWords((result.error ?? {}) as OpenError), () => void load()));
    return;
  }
  const doc = result.doc;
  if (doc.numPages === 0) {
    show(screen(zeroPagesWords, () => void load()));
    return;
  }
  const first = await withBudget(doc.getPage(1), OPEN_BUDGET_MS);
  if (mine !== generation) return;
  if (first === "timeout" || "error" in first) {
    opener.close();
    show(screen(first === "timeout" ? slowWords("open", OPEN_BUDGET_MS / 1000) : openWords((first.error ?? {}) as OpenError), () => void load()));
    return;
  }
  open(lib, doc, first.value, { ...at, page: Math.min(at.page, doc.numPages - 1) });
  void readHeadings(doc, mine);
}

/** `promise`'s outcome, or "timeout" after `ms`; never rejects. */
function withBudget<T>(promise: Promise<T>, ms: number): Promise<{ value: T } | { error: unknown } | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<"timeout">((resolve) => (timer = setTimeout(() => resolve("timeout"), ms)));
  return Promise.race([promise.then((value) => ({ value }), (error: unknown) => ({ error })), expired]).finally(() => clearTimeout(timer));
}

/** No main.pdf: lists paper/ to say why. */
async function showMissing(mine: number): Promise<void> {
  let entries: { name: string; dir: boolean }[] | null = null;
  try {
    const res = await fetch(listUrl(`projects-folder/${project}/paper`), { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as { entries?: unknown } | null;
      entries = Array.isArray(body?.entries) ? (body.entries as { name: string; dir: boolean }[]) : [];
    } else if (res.status !== 404) {
      if (mine === generation) show(screen(fetchWords(res.status), () => void load()));
      return;
    }
  } catch {
    if (mine === generation) show(screen(fetchWords(0), () => void load()));
    return;
  }
  if (mine !== generation) return;
  const words = missingWords(project!, entries);
  const tex = entries?.some((e) => !e.dir && e.name === "main.tex") === true ? texReference() : undefined;
  show(screen(words, () => void load(), tex));
}

/** paper/main.tex, selectable, so the user can ask the agent about the unbuilt paper. */
function texReference(): HTMLElement {
  const line = el("p", "texline");
  const ref = button("fileref", TEX);
  ref.title = "Select paper/main.tex to ask the agent about it";
  ref.setAttribute("aria-pressed", "false");
  ref.addEventListener("click", () => {
    const on = !ref.classList.contains("picked");
    ref.classList.toggle("picked", on);
    ref.setAttribute("aria-pressed", String(on));
    if (on) report(TEX);
    else unreport();
  });
  line.append(icon("file", "sm muted"), ref);
  return line;
}

/**
 * Lays out the pages the view shows (pagesShown: at most PAGES_MAX, and no
 * more than one scrolling column can hold), each at the first page's size
 * until it is read, and shows the bar.
 */
function open(lib: PdfJs, doc: PdfDocument, first: PdfPage, at: Place): void {
  const base = first.getViewport({ scale: 1 });
  const shown = pagesShown(doc.numPages, () => base.height, base.width);
  const slots: Slot[] = [];
  for (let i = 0; i < shown; i++) {
    const sheet = el("div", "sheet");
    sheet.dataset.page = String(i + 1);
    sheet.setAttribute("aria-label", `Page ${i + 1}`);
    const text = el("div", "textLayer");
    sheet.append(text);
    pages.append(sheet);
    const slot: Slot = {
      index: i,
      sheet,
      text,
      width: base.width,
      height: base.height,
      page: i === 0 ? first : null,
      pageLoad: null,
      canvas: null,
      drawn: -1,
      task: null,
      textLayer: null,
      textState: "none",
      stopped: false,
    };
    if (stoppedPages.has(i)) stopSlot(slot);
    slots.push(slot);
  }
  view = { lib, doc, slots, scale: 1, headings: [] };
  showLimit(doc.numPages);
  showPages();
  current = Math.min(at.page, slots.length - 1);
  relayout({ ...at, page: current });
}

/** The bar's note, and a closing note in the column when the view shows fewer pages than the PDF has. */
function showLimit(total: number): void {
  if (view === null) return;
  const shown = view.slots.length;
  hint.textContent = pagesNote(total, shown);
  hint.title = hint.textContent;
  pages.querySelector(".pages-note")?.remove();
  if (shown < total) pages.append(el("p", "pages-note", pagesLimitWords(shown, total)));
}

/**
 * Lays out fewer pages once a page read later turns out taller than the first
 * (pagesShown, with every height known so far), so no page is ever beyond
 * what the column can scroll to.
 */
function enforceLimit(): void {
  if (view === null) return;
  const v = view;
  const shown = pagesShown(v.doc.numPages, (i) => (v.slots[i] ?? v.slots[0]!).height, v.slots[0]!.width);
  if (shown >= v.slots.length) return;
  for (const slot of v.slots.splice(shown)) {
    slot.task?.cancel();
    slot.textLayer?.cancel();
    releaseCanvas(slot);
    slot.sheet.remove();
  }
  if (current >= shown) current = shown - 1;
  showLimit(v.doc.numPages);
  schedule();
}

/** The reader's place: a page and how far down it (a fraction of its height), or the gap above it when the view starts above the page. */
interface Place {
  page: number;
  down: number | null;
  gap: number;
}

/** The place last shown, kept while the frame is hidden and across a restart. */
let place: Place = { page: 0, down: null, gap: PAGE_GAP };

function placeNow(): Place {
  const box = sheetBoxes()[current];
  if (box === undefined || box.height === 0) return place;
  const offset = scroller.scrollTop - box.top;
  return offset < 0 ? { page: current, down: null, gap: -offset } : { page: current, down: offset / box.height, gap: 0 };
}

/** Sizes every sheet for the current zoom and puts the reader back at `at` (by default, where the view is now). */
function relayout(at: Place = placeNow()): void {
  if (view === null) return;
  const z = currentZoom();
  const scale = cssScale(z, view.slots[0]!.width);
  // Canvases drawn at another scale are stale; at the same one (the frame shown again, a resize that keeps the zoom) they stand.
  if (scale !== view.scale) zoomGeneration++;
  view.scale = scale;
  pages.style.setProperty("--total-scale-factor", String(view.scale));
  for (const slot of view.slots) sizeSheet(slot);
  const sheet = view.slots[at.page]?.sheet;
  if (sheet !== undefined) scroller.scrollTop = sheet.offsetTop + (at.down === null ? -at.gap : at.down * sheet.offsetHeight);
  current = Math.min(at.page, view.slots.length - 1);
  place = at;
  zoomText.textContent = zoomLabel(zoom, z);
  fit.classList.toggle("active", zoom === "fit");
  fit.setAttribute("aria-pressed", String(zoom === "fit"));
  schedule();
}

function sizeSheet(slot: Slot): void {
  const scale = view!.scale;
  slot.sheet.style.width = `${Math.floor(slot.width * scale)}px`;
  slot.sheet.style.height = `${Math.floor(slot.height * scale)}px`;
}

function setZoom(next: Zoom): void {
  if (view === null) return;
  zoom = next;
  relayout();
}

function sheetBoxes(): Box[] {
  return view === null ? [] : view.slots.map((s) => ({ top: s.sheet.offsetTop, height: s.sheet.offsetHeight }));
}

/** Scrolls to the previous or next page; as in the mockup, the selection goes. */
function goToPage(step: 1 | -1): void {
  if (view === null) return;
  const target = Math.max(0, Math.min(view.slots.length - 1, current + step));
  unselect();
  current = target;
  scroller.scrollTop = view.slots[target]!.sheet.offsetTop - PAGE_GAP;
  showPageNumber();
  schedule();
}

function showPageNumber(): void {
  if (view === null) return;
  pageText.textContent = pageLabel(current + 1, view.slots.length);
  prev.disabled = current === 0;
  next.disabled = current === view.slots.length - 1;
}

// ---- drawing, near the view only ------------------------------------------------------

let frame = 0;
function schedule(): void {
  if (frame !== 0) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    update();
  });
}

/**
 * Names the current page; releases far pages (their canvas, what PDF.js kept
 * for drawing them, and their text unless the selection reaches it); and
 * draws the pages near the view, nearest first, one at a time.
 */
function update(): void {
  if (view === null || scroller.clientWidth === 0) return;
  const plan = pagePlan(sheetBoxes(), { top: scroller.scrollTop, height: scroller.clientHeight, scrollHeight: scroller.scrollHeight });
  current = plan.current;
  place = placeNow();
  showPageNumber();
  const keep = new Set(plan.keep);
  for (const slot of view.slots) {
    if (keep.has(slot.index)) continue;
    slot.task?.cancel();
    slot.task = null;
    releaseCanvas(slot);
    slot.page?.cleanup();
    if (slot.textState !== "none" && !slot.stopped && !selectionTouches(slot)) {
      slot.textLayer?.cancel();
      slot.textLayer = null;
      clear(slot.text);
      slot.textState = "none";
    }
  }
  wanted = plan.draw;
  void pump();
}

/** The pages to draw, nearest first, from the last update. */
let wanted: number[] = [];
/** The document number the drawing loop runs for; a loop left waiting on a stopped worker is simply abandoned. */
let pumping = -1;

async function pump(): Promise<void> {
  const mine = generation;
  if (pumping === mine) return;
  pumping = mine;
  try {
    for (;;) {
      if (view === null || mine !== generation) return;
      const v = view;
      const slot = wanted.map((i) => v.slots[i]).find((s) => s !== undefined && !s.stopped && (s.drawn !== zoomGeneration || s.textState === "none"));
      if (slot === undefined) return;
      await drawSlot(slot);
    }
  } finally {
    if (pumping === mine) pumping = -1;
  }
}

/** The page proxy of a slot, read once; its real size replaces the first page's. */
async function pageOf(slot: Slot): Promise<PdfPage> {
  if (slot.page !== null) return slot.page;
  slot.pageLoad ??= view!.doc.getPage(slot.index + 1);
  const page = await slot.pageLoad;
  slot.page = page;
  const size = page.getViewport({ scale: 1 });
  if (size.width !== slot.width || size.height !== slot.height) {
    slot.width = size.width;
    slot.height = size.height;
    if (view !== null) {
      sizeSheet(slot);
      enforceLimit();
      schedule();
    }
  }
  return page;
}

/** Whether the page can be seen: the window in front and this frame's tab shown. */
const onScreen = () => !document.hidden && scroller.clientWidth > 0;

/**
 * Draws one page within PAGE_BUDGET_MS of visible time, from reading the page
 * to the last stroke on its canvas. Past it the page is stopped (overrun).
 */
async function drawSlot(slot: Slot): Promise<void> {
  const mine = generation;
  const v = view!;
  const stopBudget = visibleBudget(PAGE_BUDGET_MS, () => overrun(slot, mine), onScreen);
  try {
    let page: PdfPage;
    try {
      page = await pageOf(slot);
    } catch (error) {
      if (mine === generation) pageProblem(slot, error);
      return;
    }
    // Gone: another document, a page stopped, or one no longer laid out (enforceLimit).
    if (mine !== generation || slot.stopped || !v.slots.includes(slot)) return;
    if (slot.textState === "none") void buildText(slot, page, v.lib, mine);
    if (slot.drawn === zoomGeneration) return;
    const key = zoomGeneration;
    const viewport: Viewport = page.getViewport({ scale: v.scale });
    const ratio = outputScale(viewport.width, viewport.height, window.devicePixelRatio);
    const canvas = el("canvas", "pg");
    canvas.width = Math.max(1, Math.floor(viewport.width * ratio));
    canvas.height = Math.max(1, Math.floor(viewport.height * ratio));
    const context = canvas.getContext("2d", { alpha: false });
    if (context === null) return;
    slot.task?.cancel();
    const task = page.render({ canvasContext: context, viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] });
    slot.task = task;
    try {
      await task.promise;
    } catch (error) {
      canvas.width = 0;
      canvas.height = 0;
      if ((error as { name?: unknown } | null)?.name === "RenderingCancelledException") return;
      if (mine === generation && key === zoomGeneration) pageProblem(slot, error);
      return;
    } finally {
      if (slot.task === task) slot.task = null;
    }
    // Stale: another document, another zoom, or the page moved out of reach (or out of the layout) while it was drawn.
    if (mine !== generation || key !== zoomGeneration || !wanted.includes(slot.index) || slot.stopped || !v.slots.includes(slot)) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    releaseCanvas(slot);
    slot.sheet.prepend(canvas);
    slot.canvas = canvas;
    slot.drawn = key;
    slot.sheet.querySelector(".page-note:not(.text-note)")?.remove();
  } finally {
    stopBudget();
  }
}

/**
 * A page that took longer than PAGE_BUDGET_MS to draw: its drawing and text
 * are cancelled, it shows a note, and the document is opened again in a
 * fresh worker (the old one may be stuck on that page), at the same place,
 * without it.
 */
function overrun(slot: Slot, mine: number): void {
  if (mine !== generation || view === null) return;
  stoppedPages.add(slot.index);
  stopSlot(slot);
  const at = placeNow();
  teardown();
  const fresh = generation;
  show(el("div", "loading", `Page ${slot.index + 1} took too long; opening the paper again without it…`));
  void openDocument(fresh, at);
}

/** Marks a slot as stopped: no drawing, no text, a note saying why. */
function stopSlot(slot: Slot): void {
  slot.stopped = true;
  slot.task?.cancel();
  slot.textLayer?.cancel();
  releaseCanvas(slot);
  slot.textState = "done";
  slot.sheet.querySelector(".page-note")?.remove();
  slot.sheet.append(el("div", "page-note", overBudgetWords(slot.index + 1)));
}

/**
 * The page's text, selectable, from PDF.js's own TextLayer (text nodes only),
 * at most TEXT_RUNS_MAX runs and within PAGE_BUDGET_MS; scaled by CSS with the
 * zoom, and released with the page when it is far from the view.
 */
async function buildText(slot: Slot, page: PdfPage, lib: PdfJs, mine: number): Promise<void> {
  slot.textState = "building";
  let cut = false;
  const source = capTextRuns(page.streamTextContent() as ReadableStream<TextChunk>, TEXT_RUNS_MAX, () => (cut = true));
  const layer = new lib.TextLayer({ textContentSource: source, container: slot.text, viewport: page.getViewport({ scale: view!.scale }) });
  slot.textLayer = layer;
  const outcome = await withBudget(layer.render(), PAGE_BUDGET_MS);
  if (mine !== generation || slot.textLayer !== layer) return;
  if (outcome === "timeout") layer.cancel();
  slot.textState = "done";
  if (cut || outcome === "timeout") {
    slot.sheet.querySelector(".text-note")?.remove();
    slot.sheet.append(el("div", "page-note text-note", textCutWords(slot.index + 1, outcome === "timeout" ? "time" : "runs")));
  }
}

/** A page that could not be drawn says so on its sheet; the others still show. */
function pageProblem(slot: Slot, error: unknown): void {
  slot.drawn = zoomGeneration;
  if (slot.textState === "none") slot.textState = "done";
  slot.sheet.querySelector(".page-note:not(.text-note)")?.remove();
  const message = (error as { message?: unknown } | null)?.message;
  slot.sheet.append(el("div", "page-note", `Page ${slot.index + 1} could not be drawn${typeof message === "string" && message !== "" ? ` (${message.slice(0, 200)})` : ""}.`));
}

// ---- the outline: which heading a selection falls under -------------------------------

/** Reads the outline's headings in reading order, bounded (OUTLINE_MAX); any entry that does not resolve to a page is left out. */
async function readHeadings(doc: PdfDocument, mine: number): Promise<void> {
  let outline: OutlineItem[] | null;
  try {
    outline = await doc.getOutline();
  } catch {
    return;
  }
  const found: Heading[] = [];
  let seen = 0;
  const walk = async (items: readonly OutlineItem[], depth: number): Promise<void> => {
    for (const item of items) {
      if (seen++ >= OUTLINE_MAX.entries || mine !== generation) return;
      const title = headingTitle(item.title);
      const target = await resolve(doc, item.dest);
      if (title !== null && target !== null) found.push({ title, ...target });
      if (Array.isArray(item.items) && depth + 1 < OUTLINE_MAX.depth) await walk(item.items, depth + 1);
    }
  };
  await walk(outline ?? [], 0);
  if (mine === generation && view !== null) view.headings = readingOrder(found);
}

/** An outline entry's destination as a page (0-based) and a top, or null (a link, an action, or nothing). */
async function resolve(doc: PdfDocument, dest: unknown): Promise<{ page: number; top: number | null } | null> {
  try {
    const explicit = typeof dest === "string" ? await doc.getDestination(dest) : dest;
    if (!Array.isArray(explicit) || explicit.length === 0) return null;
    const ref = explicit[0] as unknown;
    const page =
      typeof ref === "number" && Number.isInteger(ref)
        ? ref
        : typeof ref === "object" && ref !== null && Number.isInteger((ref as { num?: unknown }).num)
          ? await doc.getPageIndex(ref as { num: number; gen: number })
          : null;
    return page === null || page < 0 || page >= doc.numPages ? null : { page, top: destTop(explicit) };
  } catch {
    return null;
  }
}

// ---- start ----------------------------------------------------------------------------

if (project === null) {
  show(screen(projectWords(location.search)));
} else {
  void load();
}
