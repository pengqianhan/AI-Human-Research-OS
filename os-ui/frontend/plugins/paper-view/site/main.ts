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
 * app's origin only): the label names the page and the outline heading it
 * falls under, the quote is the text, cut to the host's limits here. The
 * workspace shows the "Ask the agent about this" bar and may answer
 * `os.select.clear`.
 *
 * Pages are drawn lazily, near the view, and far pages' canvases released;
 * each document load and each zoom carries a number, so a page drawn for an
 * older document or zoom never replaces a newer one. Outline titles and the
 * PDF's text are untrusted and reach the DOM as text only (site-kit, and
 * PDF.js's TextLayer, which sets textContent).
 */
import { button, clear, el, filesUrl, icon, isHostClear, listUrl, projectFrom } from "../../site-kit.ts";
import {
  cssScale,
  destTop,
  fetchWords,
  headingAt,
  headingTitle,
  missingWords,
  OUTLINE_MAX,
  openWords,
  outputScale,
  pageLabel,
  pagePlan,
  pagesNote,
  projectWords,
  quoteOf,
  readerWords,
  readingOrder,
  selectionLabel,
  TEX,
  zeroPagesWords,
  zoomFactor,
  zoomLabel,
  zoomStep,
} from "./logic.ts";
import type { Box, Heading, Words, Zoom } from "./logic.ts";
import { DOCUMENT_OPTIONS, loadPdfJs } from "./pdfjs.ts";
import type { LoadingTask, OutlineItem, PdfDocument, PdfJs, PdfPage, RenderTask, TextLayerTask, Viewport } from "./pdfjs.ts";

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

/** Reports the text selected in the pages, or that none is. */
function reportSelection(): void {
  if (view === null) return;
  const s = window.getSelection();
  if (s === null || s.isCollapsed || s.rangeCount === 0) {
    unreport();
    return;
  }
  const range = s.getRangeAt(0);
  const touched = view.slots.filter((slot) => range.intersectsNode(slot.sheet));
  const quote = quoteOf(s.toString());
  if (touched.length === 0 || quote === null) {
    unreport();
    return;
  }
  const first = touched[0]!;
  const last = touched[touched.length - 1]!;
  report(selectionLabel(first.index + 1, last.index + 1, headingFor(first, range)?.title ?? null), quote);
}

/** The outline heading the selection starts under: by the top of its first line on its first page. */
function headingFor(slot: Slot, range: Range): Heading | null {
  if (view === null || view.headings.length === 0) return null;
  let y: number | null = null;
  const rect = [...range.getClientRects()].find((r) => r.width > 0 || r.height > 0);
  if (rect !== undefined && slot.page !== null && slot.sheet.contains(range.startContainer)) {
    const box = slot.sheet.getBoundingClientRect();
    const point = slot.page.getViewport({ scale: view.scale }).convertToPdfPoint(rect.left - box.left, rect.top - box.top);
    y = typeof point[1] === "number" && Number.isFinite(point[1]) ? point[1] : null;
  }
  return headingAt(view.headings, slot.index, y);
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

/** The document load in progress or shown: each load and each teardown takes the next number. */
let generation = 0;
/** The zoom number: each zoom change and each load takes the next, and a canvas drawn for another is stale. */
let zoomGeneration = 0;
let loadingTask: LoadingTask | null = null;
let zoom: Zoom = "fit";
let current = 0;

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

/** Drops the document on screen: cancels every drawing and the loading task, and tells the workspace the selection went with it. */
async function teardown(): Promise<void> {
  generation++;
  unselect();
  const old = view;
  view = null;
  if (old !== null) {
    for (const slot of old.slots) {
      slot.task?.cancel();
      slot.textLayer?.cancel();
      releaseCanvas(slot);
    }
  }
  clear(pages);
  const task = loadingTask;
  loadingTask = null;
  if (task !== null) await task.destroy().catch(() => {});
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
  await teardown();
  const mine = generation;
  const loading = el("div", "loading", "Loading the paper…");
  show(loading);
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
  let lib: PdfJs;
  try {
    data = new Uint8Array(await res.arrayBuffer());
  } catch {
    if (mine === generation) show(screen(fetchWords(0), () => void load()));
    return;
  }
  try {
    lib = await loadPdfJs();
  } catch (error) {
    if (mine === generation) show(screen(readerWords(error instanceof Error ? error.message : String(error)), () => void load()));
    return;
  }
  if (mine !== generation) return;
  const task = lib.getDocument({ ...DOCUMENT_OPTIONS, data });
  loadingTask = task;
  let doc: PdfDocument;
  try {
    doc = await task.promise;
  } catch (error) {
    if (mine !== generation) return;
    show(screen(openWords((error ?? {}) as object), () => void load()));
    return;
  }
  if (mine !== generation) return;
  if (doc.numPages === 0) {
    show(screen(zeroPagesWords, () => void load()));
    return;
  }
  let first: PdfPage;
  try {
    first = await doc.getPage(1);
  } catch (error) {
    if (mine === generation) show(screen(openWords((error ?? {}) as object), () => void load()));
    return;
  }
  if (mine !== generation) return;
  open(lib, doc, first, Math.min(keepPage, doc.numPages - 1));
  void readHeadings(doc, mine);
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

/** Lays out every page at the first page's size (corrected as each is read), and shows the bar. */
function open(lib: PdfJs, doc: PdfDocument, first: PdfPage, startAt: number): void {
  const base = first.getViewport({ scale: 1 });
  const slots: Slot[] = [];
  for (let i = 0; i < doc.numPages; i++) {
    const sheet = el("div", "sheet");
    sheet.dataset.page = String(i + 1);
    sheet.setAttribute("aria-label", `Page ${i + 1}`);
    const text = el("div", "textLayer");
    sheet.append(text);
    pages.append(sheet);
    slots.push({
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
    });
  }
  view = { lib, doc, slots, scale: 1, headings: [] };
  hint.textContent = pagesNote(doc.numPages);
  hint.title = hint.textContent;
  showPages();
  current = startAt;
  relayout({ page: startAt, down: null, gap: PAGE_GAP });
}

/** The reader's place: a page and how far down it (a fraction of its height), or the gap above it when the view starts above the page. */
interface Place {
  page: number;
  down: number | null;
  gap: number;
}

/** The place last shown, kept while the frame is hidden. */
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
  zoomGeneration++;
  view.scale = cssScale(z, view.slots[0]!.width);
  pages.style.setProperty("--total-scale-factor", String(view.scale));
  for (const slot of view.slots) sizeSheet(slot);
  const sheet = view.slots[at.page]?.sheet;
  if (sheet !== undefined) scroller.scrollTop = sheet.offsetTop + (at.down === null ? -at.gap : at.down * sheet.offsetHeight);
  current = at.page;
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

/** Names the current page, releases far canvases, and draws the pages near the view, nearest first, one at a time. */
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
  }
  wanted = plan.draw;
  void pump();
}

/** The pages to draw, nearest first, from the last update. */
let wanted: number[] = [];
let pumping = false;

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    for (;;) {
      if (view === null) return;
      const v = view;
      const slot = wanted.map((i) => v.slots[i]!).find((s) => s.drawn !== zoomGeneration || s.textState === "none");
      if (slot === undefined) return;
      await drawSlot(slot);
    }
  } finally {
    pumping = false;
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
      schedule();
    }
  }
  return page;
}

async function drawSlot(slot: Slot): Promise<void> {
  const mine = generation;
  const v = view!;
  let page: PdfPage;
  try {
    page = await pageOf(slot);
  } catch (error) {
    if (mine === generation) pageProblem(slot, error);
    return;
  }
  if (mine !== generation) return;
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
  // Stale: another document, another zoom, or the page moved out of reach while it was drawn.
  if (mine !== generation || key !== zoomGeneration || !wanted.includes(slot.index)) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }
  releaseCanvas(slot);
  slot.sheet.prepend(canvas);
  slot.canvas = canvas;
  slot.drawn = key;
  slot.sheet.querySelector(".page-note")?.remove();
}

/** The page's text, selectable, from PDF.js's own TextLayer (text nodes only); built once per page and scaled by CSS with the zoom. */
async function buildText(slot: Slot, page: PdfPage, lib: PdfJs, mine: number): Promise<void> {
  slot.textState = "building";
  const layer = new lib.TextLayer({ textContentSource: page.streamTextContent(), container: slot.text, viewport: page.getViewport({ scale: view!.scale }) });
  slot.textLayer = layer;
  try {
    await layer.render();
  } catch {
    // Cancelled with its document, or the text could not be read: the page still shows, without selectable text.
  }
  if (mine === generation) slot.textState = "done";
}

/** A page that could not be drawn says so on its sheet; the others still show. */
function pageProblem(slot: Slot, error: unknown): void {
  slot.drawn = zoomGeneration;
  if (slot.textState === "none") slot.textState = "done";
  slot.sheet.querySelector(".page-note")?.remove();
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
