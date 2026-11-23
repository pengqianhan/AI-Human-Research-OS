/**
 * The Assets view's page (os-ui/PLUGINS.md Part 3, §4), framed by the project
 * workspace on its own origin, app://assets-view, for the project in its
 * `?project=`. Through the read channel (./_os/list, ./_os/files) it walks
 * Figs/, Baselines/, Code/results/, and Code/Datasets/, reads
 * paper_skeleton.md and Code/README.md (for "Used in" and the datasets) and
 * each listed folder's README.md (for descriptions), and shows mockup
 * alternative B: figures as cards, other files as rows, the datasets
 * Code/README.md lists, and a preview of the open item beside them (above
 * them in a narrow window). It writes nothing and has no bridge.
 *
 * A card or row is reported to the workspace with `os.select` (posted to the
 * app's origin only): its label, no quote. The workspace shows "Ask the agent
 * about this" and may answer `os.select.clear`.
 *
 * Names and contents are untrusted: they go on screen as text only (site-kit's
 * el and inlineNodes), invisible characters marked. A picture is an <img>
 * whose src is the read channel's URL for a path the walk found, never one
 * taken from a file; at most four load at once (queue.ts). Every load carries
 * a generation number, so an answer that arrives after Reload, or after
 * another item was opened, is dropped.
 */
import { inline, parse } from "../../md-kit.ts";
import type { Block, Inline } from "../../md-kit.ts";
import { button, clear, el, filesUrl, icon, inlineNodes, isHostClear, listUrl, markInvisible, projectFrom, readStart, readText, visibleName } from "../../site-kit.ts";
import {
  buildModel,
  csvPreview,
  docFrom,
  GROUPS,
  HEADING,
  datasetNote,
  imageWords,
  labelNote,
  LIMITS,
  linesPreview,
  markdownPreview,
  noPreviewWords,
  previewCap,
  previewWords,
  placeWhere,
  projectWords,
  README,
  SKELETON,
  sizeLine,
  sizeWords,
  usedInWords,
  workspacePath,
} from "./logic.ts";
import type { Dataset, DocRead, FileItem, GroupView, Model, Selection, Words } from "./logic.ts";
import { ImageQueue } from "./queue.ts";
import type { JobState, Load, LoadOutcome } from "./queue.ts";
import { walk } from "./walk.ts";
import type { Entry, ListAnswer } from "./walk.ts";

/** The app's origin: the only window this page reports a selection to. */
const HOST = "app://research-os";

const project = projectFrom(location.search);
const app = document.getElementById("app")!;

// ---- selection: reported to the workspace -------------------------------------------

let picked: Element | null = null;
/** What the workspace holds: the selected item's key and the label posted for it (picked's, or a node a Reload replaced). */
let selected: { key: string; label: string } | null = null;

function post(message: { type: "os.select"; label: string | null }): void {
  if (window.parent !== window) window.parent.postMessage(message, HOST);
}

function select(node: Element, key: string, selection: Selection): void {
  unpick();
  node.classList.add("picked");
  picked = node;
  selected = { key, label: selection.label };
  post({ type: "os.select", label: selection.label });
}

function unpick(): void {
  picked?.classList.remove("picked");
  picked = null;
  selected = null;
}

/** Clears the selection; `report` false when the workspace asked for it. The open item stays open. */
function unselect(report = true): void {
  const had = picked !== null;
  unpick();
  if (report && had) post({ type: "os.select", label: null });
}

window.addEventListener("message", (event) => {
  if (isHostClear(event, window.parent, HOST)) unselect(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") unselect();
});

// ---- reading through the channel ------------------------------------------------------

/** A project path's listing, as the walk takes it. */
async function listAt(path: string): Promise<ListAnswer> {
  let res: Response;
  try {
    res = await fetch(listUrl(workspacePath(project!, path)), { cache: "no-store" });
  } catch {
    return { ok: false, status: 0 };
  }
  if (!res.ok) return { ok: false, status: res.status };
  const body = (await res.json().catch(() => null)) as { entries?: unknown; truncated?: unknown } | null;
  if (body === null || !Array.isArray(body.entries)) return { ok: false, status: 500 };
  const entries = body.entries.filter(
    (e): e is Entry => typeof e === "object" && e !== null && typeof e.name === "string" && e.name !== "" && !e.name.includes("/") && typeof e.dir === "boolean" && typeof e.size === "number",
  );
  return { ok: true, entries, truncated: body.truncated === true };
}

/** A Markdown file the rules need (paper_skeleton.md, Code/README.md, a folder's README.md), read up to LIMITS.docBytes. */
async function readDoc(path: string): Promise<DocRead> {
  let res: Response;
  try {
    res = await fetch(filesUrl(workspacePath(project!, path)), { cache: "no-store" });
  } catch {
    return { ok: false, status: 0 };
  }
  if (!res.ok) {
    void res.body?.cancel().catch(() => {});
    return { ok: false, status: res.status };
  }
  const { bytes, cut } = await readStart(res, LIMITS.docBytes + 1);
  return docFrom(bytes, cut, parse);
}

/** `fn` over `items`, at most `limit` at once, the results in order. */
async function limited<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next++;
      out[k] = await fn(items[k]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * A picture's URL: the read channel's URL for the file, and the Reload's
 * generation as `v`, which the channel ignores. Chromium reuses a picture it
 * already drew for the same URL, `no-store` or not, so without it a Reload
 * would show a file as it was before (os-ui/PLUGINS.md, the Assets view's
 * review, M1). Within one Reload the card and the panel share the picture.
 */
const pictureUrl = (path: string) => `${filesUrl(workspacePath(project!, path))}&v=${state.gen}`;

/**
 * Loads `path` as an <img>, the read channel's URL being its only source; on
 * an error the channel is asked for the status with a HEAD, within the same
 * slot of the queue. `place` puts the drawn image on screen, or says it could not.
 */
function imageLoad(path: string, place: (img: HTMLImageElement) => boolean): Load {
  const url = pictureUrl(path);
  const img = el("img");
  img.alt = "";
  let live = true;
  let settle!: (outcome: LoadOutcome) => void;
  const done = new Promise<LoadOutcome>((resolve) => (settle = resolve));
  img.addEventListener("load", () => {
    if (!live) return;
    live = false;
    // Not placed (its card was replaced by a Reload meanwhile): the queue forgets the job.
    settle(place(img) ? { kind: "ok" } : { kind: "dropped" });
  });
  img.addEventListener("error", () => {
    if (!live) return;
    void fetch(url, { method: "HEAD", cache: "no-store" })
      .then((r) => r.status, () => 0)
      .then((status) => {
        if (!live) return;
        live = false;
        settle({ kind: "error", status });
      });
  });
  img.src = url;
  return {
    done,
    cancel() {
      live = false;
      img.removeAttribute("src");
    },
  };
}

// ---- pieces ---------------------------------------------------------------------------

/** A placeholder screen: a title, a sentence, and "Try again" when it can help. */
function screen(words: Words, retry?: () => void): HTMLElement {
  const box = el("div", "placeholder");
  box.append(el("h4", "", words.title), el("p", "", words.text));
  if (words.retry && retry !== undefined) {
    const again = button("btn", "Try again");
    again.addEventListener("click", retry);
    box.append(again);
  }
  return box;
}

/** Markdown inline text as DOM nodes (text only). */
const md = (text: string) => inlineNodes(inline(text));

/** Inline tokens with each link's address after its text, as text: "climbmix (https://…)". */
function withAddresses(tokens: readonly Inline[]): Node[] {
  return tokens.flatMap((t): Node[] => {
    if (t.kind === "link") return [...inlineNodes([t]), el("span", "addr", ` (${markInvisible(t.target)})`)];
    if (t.kind === "bold") {
      const b = el("b");
      b.append(...withAddresses(t.children));
      return [b];
    }
    return inlineNodes([t]);
  });
}

/** md-kit blocks drawn as text: a group's note, a Markdown preview. Nothing is selectable inside. */
function blockNodes(block: Block): HTMLElement[] {
  if (block.kind === "heading") {
    const h = el("p", "mdh");
    h.append(...md(block.text));
    return [h];
  }
  if (block.kind === "paragraph") {
    const p = el("p");
    p.append(...md(block.text));
    return [p];
  }
  if (block.kind === "list") {
    const list = el(block.ordered ? "ol" : "ul");
    for (const item of block.items) {
      const li = el("li");
      li.append(...md(item.text));
      if (item.children.length > 0) {
        const sub = el(item.children[0]!.ordered ? "ol" : "ul");
        for (const child of item.children) {
          const cli = el("li");
          cli.append(...md(child.text));
          sub.append(cli);
        }
        li.append(sub);
      }
      list.append(li);
    }
    return [list];
  }
  if (block.kind === "code") return [el("pre", "", markInvisible([...(block.info === "" ? [] : [block.info]), ...block.body].join("\n")))];
  const table = el("table");
  const head = el("tr");
  for (const cell of block.header) {
    const th = el("th");
    th.append(...md(cell));
    head.append(th);
  }
  table.append(head);
  for (const row of block.rows) {
    const tr = el("tr");
    for (const cell of row.cells) {
      const td = el("td");
      td.append(...md(cell));
      tr.append(td);
    }
    table.append(tr);
  }
  return [table];
}

// ---- the page -------------------------------------------------------------------------

const state = {
  gen: 0,
  model: null as Model | null,
  /** The open item, by key ("file:Figs/a.svg", "dataset:208"), and a dataset's name, to find it again after a Reload. */
  open: null as string | null,
  openName: null as string | null,
  /** Each open of the preview: an answer for an earlier one is dropped. */
  previewGen: 0,
  /** Each render of the list: a card's picture goes only into the render it was asked for. */
  renderGen: 0,
  /** The preview's image job, dropped when another item opens. */
  previewJob: null as string | null,
};

const bar = el("div", "subbar");
const count = el("span", "vpath");
const body = el("div", "as-body");
const listBox = el("div", "as-list");
const side = el("aside", "as-prev");
side.setAttribute("aria-label", "Preview");
side.setAttribute("aria-live", "polite");
body.append(listBox, side);

/** Each card's and row's element, and each card's picture box, by the item's key. */
let nodes = new Map<string, HTMLElement>();
let thumbs = new Map<string, HTMLElement>();
let observer: IntersectionObserver | null = null;

const queue = new ImageQueue({
  later: (fn, ms) => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
  onChange: (key, job) => {
    if (key.startsWith("preview:")) previewImageState(key, job);
    else thumbState(key, job);
  },
});

if (project !== null) {
  const reload = button("link reload", "Reload");
  reload.title = "List the folders and read the files again, as they are on disk now";
  reload.addEventListener("click", () => void load());
  bar.append(el("span", "vt", "Assets"), count, el("span", "hint", "Select a file to preview it and ask the agent about it."), reload);
}

/** Shows `node` in place of the page's content, below the bar. */
function show(node: HTMLElement): void {
  for (const child of [...app.children]) if (child !== bar && child !== node) child.remove();
  if (node.parentNode !== app) app.append(node);
}

async function load(): Promise<void> {
  const gen = ++state.gen;
  unselect();
  queue.reset();
  state.previewJob = null;
  observer?.disconnect();
  // A Reload over the page keeps it on screen until everything is read again.
  if (body.parentNode !== app) show(el("div", "loading", "Loading…"));
  const [skeleton, readme, walks] = await Promise.all([readDoc(SKELETON), readDoc(README), Promise.all(GROUPS.map((g) => walk(g.folder, listAt)))]);
  if (gen !== state.gen) return;
  // Each listed folder's README.md, at most four at once.
  const paths = walks.flatMap((w) => w.readmes);
  const reads = await limited(paths, 4, readDoc);
  if (gen !== state.gen) return;
  state.model = buildModel({ walks, skeleton, readme, readmes: new Map(paths.map((p, k) => [p, reads[k]!])) });
  render(state.model);
}

function render(model: Model): void {
  // Loads asked for on the list this render replaces (a Show, the panel's picture, while Reload read) end here.
  state.renderGen++;
  queue.reset();
  state.previewJob = null;
  const scroll = listBox.scrollTop;
  clear(listBox);
  nodes = new Map();
  thumbs = new Map();
  count.textContent = model.count;
  observer = new IntersectionObserver(near, { root: listBox, rootMargin: "100% 0px 100% 0px" });
  let order = 0;
  for (const view of model.groups) listBox.append(groupNode(view, () => order++));
  // An item selected while the Reload read (on the list it replaced): still here with the same label, it is
  // open and marked on the new list; otherwise the workspace is told there is no selection (review S3).
  if (selected !== null) {
    const keep = model.items.get(selected.key)?.selection.label === selected.label ? nodes.get(selected.key) : undefined;
    if (keep !== undefined) {
      const item = model.items.get(selected.key)!;
      state.open = selected.key;
      state.openName = "line" in item ? item.name : null;
      picked = keep;
      keep.classList.add("picked");
    } else unselect();
  }
  // Reload keeps the open item if it is still there (a dataset by its line and name), else the panel empties.
  if (state.open !== null) {
    const item = model.items.get(state.open);
    if (item === undefined || ("line" in item && item.name !== state.openName)) state.open = null;
  }
  for (const [key, node] of nodes) node.classList.toggle("on", key === state.open);
  renderPanel();
  show(body);
  listBox.scrollTop = scroll;
}

/** Cards that came within a screen of the view: their pictures are wanted, nearest in list order first. */
function near(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const card = entry.target as HTMLElement;
    const key = card.dataset.key!;
    const item = state.model?.items.get(key);
    if (item === undefined || !("path" in item)) continue;
    wantThumb(item, Number(card.dataset.order));
  }
}

function wantThumb(item: FileItem, order: number): void {
  // Only into the cards it was asked for: a Show clicked while Reload read is for a card the Reload replaces (review S4).
  const rendered = state.renderGen;
  queue.want(item.key, order, () =>
    imageLoad(item.path, (img) => {
      const box = thumbs.get(item.key);
      if (rendered !== state.renderGen || box === undefined) return false;
      clear(box);
      box.append(img);
      return true;
    }),
  );
}

// ---- groups, cards, rows ------------------------------------------------------------

function groupNode(view: GroupView, nextOrder: () => number): HTMLElement {
  const box = el("section", "as-group");
  box.setAttribute("aria-label", view.group.title);
  const h = el("h3", "", view.group.title);
  h.append(el("small", "", view.where));
  box.append(h);
  if (view.datasets !== null) {
    const data = view.datasets;
    // Code/README.md's own words before its table (or the whole section when it has none): the group's note.
    const note = data.view !== null && data.view.state !== "no-section" ? data.view.note : [];
    if (note.length > 0) {
      const gnote = el("div", "gnote");
      for (const block of note) gnote.append(...blockNodes(block));
      box.append(gnote);
    }
    if (data.message !== null) box.append(el("p", "gstate", data.message));
    if (data.view?.state === "table") {
      const rows = el("div", "rows");
      for (const d of data.view.rows) rows.append(datasetRow(d));
      if (data.view.rows.length > 0) box.append(rows);
      for (const text of data.view.notes) box.append(el("p", "gstate", text));
    }
  }
  for (const text of view.notes) box.append(el("p", text.endsWith("is empty") || text.startsWith("No ") ? "gstate empty" : "gstate", text));
  if (view.cards.length > 0) {
    const figs = el("div", "figs");
    view.cards.forEach((item, k) => figs.append(card(item, nextOrder(), k < LIMITS.thumbs)));
    box.append(figs);
  }
  if (view.rows.length > 0) {
    const rows = el("div", "rows");
    for (const item of view.rows) rows.append(fileRow(item));
    box.append(rows);
  }
  return box;
}

/** Makes `node` the item `key`'s: a click opens it and selects it; a second click clears the selection. */
function clickable(node: HTMLElement, key: string, selection: Selection): HTMLElement {
  node.dataset.key = key;
  nodes.set(key, node);
  node.addEventListener("click", () => {
    if (picked === node) {
      unselect();
      return;
    }
    open(key);
    select(node, key, selection);
  });
  return node;
}

function card(item: FileItem, order: number, auto: boolean): HTMLElement {
  // Not a <button>: its picture box may hold "Show" or "Try again", and a button holds no other.
  const node = el("div", "fcard");
  node.setAttribute("role", "button");
  node.tabIndex = 0;
  node.addEventListener("keydown", (event) => {
    if (event.target !== node || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    node.click();
  });
  node.dataset.order = String(order);
  const thumb = el("span", "thumb");
  thumbs.set(item.key, thumb);
  const nm = el("span", "nm", visibleName(item.rel));
  nm.title = visibleName(item.rel);
  node.append(thumb, nm, el("span", "mt", sizeWords(item.size)));
  if (auto) {
    thumbState(item.key, { state: "waiting" });
    observer!.observe(node);
  } else {
    // Past the first LIMITS.thumbs figures, a picture is drawn on request.
    const draw = button("link", "Show");
    draw.addEventListener("click", (event) => {
      event.stopPropagation();
      wantThumb(item, order);
    });
    const note = el("span", "thumb-note", "Not drawn yet. ");
    note.append(draw);
    thumb.append(note);
  }
  return clickable(node, item.key, item.selection);
}

/** A card's picture box as its job's state says. */
function thumbState(key: string, job: JobState): void {
  const box = thumbs.get(key);
  const item = state.model?.items.get(key);
  if (box === undefined || item === undefined || !("path" in item)) return;
  if (job.state === "loaded") return; // the image put itself in place
  clear(box);
  if (job.state === "waiting" || job.state === "loading") box.append(el("span", "thumb-note", job.state === "loading" ? "Loading…" : ""));
  else if (job.state === "retrying") box.append(el("span", "thumb-note", "Busy; trying again in a moment…"));
  else {
    const words = imageWords(job.status, visibleName(item.name));
    const note = el("span", "thumb-note");
    note.append(el("b", "", words.title), document.createTextNode(words.text));
    if (words.retry) {
      const again = button("link", "Try again");
      again.addEventListener("click", (event) => {
        event.stopPropagation();
        queue.retry(key);
      });
      note.append(el("br"), again);
    }
    box.append(note);
  }
}

function fileRow(item: FileItem): HTMLElement {
  const node = button("frow");
  const nm = el("span", "nm", visibleName(item.rel));
  nm.title = visibleName(item.rel);
  node.append(icon(item.kind === "csv" ? "table" : "file"), nm, el("span", "sz", sizeWords(item.size)));
  // A description from the folder's README.md is the second line; without one there is none.
  if (item.description !== null && item.description.text !== "") node.append(el("span", "mt", markInvisible(item.description.text)));
  return clickable(node, item.key, item.selection);
}

function datasetRow(d: Dataset): HTMLElement {
  const node = button("frow");
  node.append(icon("db"), el("span", "nm", d.name === "" ? "(no name)" : markInvisible(d.name)), el("span", "sz", "listed"));
  if (d.meta !== "") node.append(el("span", "mt", markInvisible(d.meta)));
  return clickable(node, d.key, d.selection);
}

// ---- the preview ----------------------------------------------------------------------

function open(key: string): void {
  const item = state.model?.items.get(key);
  if (item === undefined) return;
  if (state.open === key) return;
  state.open = key;
  state.openName = "line" in item ? item.name : null;
  for (const [k, node] of nodes) node.classList.toggle("on", k === key);
  renderPanel();
}

function renderPanel(): void {
  const gen = ++state.previewGen;
  if (state.previewJob !== null) queue.drop(state.previewJob);
  state.previewJob = null;
  clear(side);
  const item = state.open === null ? null : (state.model?.items.get(state.open) ?? null);
  if (item === null) {
    side.append(el("h4", "", "Preview"), el("p", "empty", "Select a figure or a file to preview it here."));
    return;
  }
  if ("path" in item) filePanel(item, gen);
  else datasetPanel(item);
  side.scrollTop = 0;
}

function filePanel(item: FileItem, gen: number): void {
  const name = visibleName(item.name);
  side.append(el("h4", "", HEADING[item.kind]), el("p", "pn", visibleName(item.path)));
  // When the label is not the real path, what the agent gets, and why (review S1).
  const note = labelNote(item.path, item.selection.label);
  if (note !== null) side.append(el("p", "label-note", note));
  const preview = el("div", "pv");
  side.append(preview);
  const dl = el("dl");
  const what = el("dd");
  if (item.description !== null && item.description.text !== "") {
    what.append(document.createTextNode(markInvisible(item.description.text)), el("span", "from", `from ${visibleName(item.description.readme)}:${item.description.line}`));
  } else what.textContent = "—";
  if (item.readmeNote !== null) what.append(el("span", "from", item.readmeNote));
  const size = el("dd", "", sizeLine(item.size, null));
  const used = el("dd");
  const words = usedInWords(item, state.model?.usedInNotes ?? []);
  if (words.none !== null) used.textContent = words.none;
  else if (words.places.length > 0) {
    const list = el("ul");
    for (const place of item.usedIn.slice(0, LIMITS.usedIn)) {
      // The file and line in monospace; a table row's first cell, from the file, as text after it.
      const li = el("li", "", placeWhere(place));
      if (place.cell !== null && place.cell !== "") li.append(el("span", "cell", ` · ${markInvisible(place.cell)}`));
      list.append(li);
    }
    used.append(list);
    if (words.more > 0) used.append(el("span", "from", `and ${words.more} more`));
  }
  // Beside the places found: a file that could not be read, or not all of it.
  for (const note of words.notes) used.append(el("span", "from", note));
  dl.append(el("dt", "", "What"), what, el("dt", "", "Size"), size, el("dt", "", "Used in"), used);
  side.append(dl);
  void fillPreview(item, preview, size, name, gen);
}

/** The open file's preview, by its kind; drops itself if another item opened meanwhile. */
async function fillPreview(item: FileItem, box: HTMLElement, size: HTMLElement, name: string, gen: number): Promise<void> {
  const current = () => gen === state.previewGen;
  const retry = () => {
    if (!current()) return;
    clear(box);
    void fillPreview(item, box, size, name, gen);
  };
  if (item.kind === "pdf") {
    box.append(screen(noPreviewWords("pdf", name)));
    return;
  }
  if (item.kind === "figure" || item.kind === "image") {
    const big = el("div", "big");
    big.append(el("span", "thumb-note", "Loading…"));
    box.append(big);
    const key = `preview:${gen}:${item.path}`;
    state.previewJob = key;
    queue.want(key, -1, () =>
      imageLoad(item.path, (img) => {
        if (!current()) return false;
        clear(big);
        big.append(img);
        return true;
      }),
    );
    return;
  }
  box.append(el("div", "loading", "Loading…"));
  let res: Response;
  try {
    res = await fetch(filesUrl(workspacePath(project!, item.path)), { cache: "no-store" });
  } catch {
    if (current()) {
      clear(box);
      box.append(screen(previewWords(0, name), retry));
    }
    return;
  }
  if (!current()) {
    void res.body?.cancel().catch(() => {});
    return;
  }
  if (!res.ok) {
    void res.body?.cancel().catch(() => {});
    clear(box);
    box.append(screen(previewWords(res.status, name), retry));
    return;
  }
  const cap = previewCap(item.kind);
  const got = await readStart(res, cap);
  if (!current()) return;
  // One byte past the cap was asked for: reaching it means the file goes on past what the preview reads.
  const cut = got.cut;
  const bytes = cut ? got.bytes.subarray(0, cap - 1) : got.bytes;
  const read = readText(bytes, cut);
  clear(box);
  if (read.kind !== "text") {
    box.append(screen(noPreviewWords(read.kind, name)));
    return;
  }
  if (item.kind === "csv") {
    const csv = csvPreview(read.text, cut);
    const wrap = el("div", "minibox");
    const table = el("table", "mini");
    const head = el("tr");
    for (const cell of csv.header) head.append(el("th", "", markInvisible(cell)));
    const thead = el("thead");
    thead.append(head);
    const tbody = el("tbody");
    for (const row of csv.rows) {
      const tr = el("tr");
      for (const cell of row) tr.append(el("td", "", markInvisible(cell)));
      tbody.append(tr);
    }
    table.append(thead, tbody);
    wrap.append(table);
    box.append(wrap, el("p", "src-note", `${csv.words}.`));
    for (const note of csv.notes) box.append(el("p", "src-note", note));
    if (csv.total !== null) size.textContent = sizeLine(item.size, { rows: csv.total });
    return;
  }
  if (item.kind === "markdown") {
    const doc = markdownPreview(parse(read.text), cut);
    const mdBox = el("div", "md");
    for (const block of doc.blocks) mdBox.append(...blockNodes(block));
    box.append(mdBox, el("p", "src-note", "Drawn as text: links are not followed and images are not loaded; a link's address is its tooltip."));
    for (const note of doc.notes) box.append(el("p", "src-note", note));
    return;
  }
  const lines = linesPreview(read.text, cut);
  box.append(el("pre", "", markInvisible(lines.lines.join("\n"))), el("p", "src-note", `${lines.words}.`));
  if (lines.total !== null) size.textContent = sizeLine(item.size, { lines: lines.total });
}

/** The panel's picture as its job's state says. */
function previewImageState(key: string, job: JobState): void {
  if (key !== state.previewJob || job.state === "loaded") return;
  const big = side.querySelector(".big");
  const item = state.open === null ? null : state.model?.items.get(state.open);
  if (big === null || item === undefined || item === null || !("path" in item)) return;
  clear(big);
  if (job.state === "failed") {
    big.append(
      screen(imageWords(job.status, visibleName(item.name)), () => {
        queue.retry(key);
      }),
    );
  } else big.append(el("span", "thumb-note", job.state === "retrying" ? "Busy; trying again in a moment…" : "Loading…"));
}

function datasetPanel(d: Dataset): void {
  side.append(el("h4", "", `Dataset · listed in ${README}`), el("p", "pn", d.name === "" ? "(no name)" : markInvisible(d.name)));
  const note = datasetNote(d.name, d.selection.label);
  if (note !== null) side.append(el("p", "label-note", note));
  const dl = el("dl");
  for (const cell of d.cells) {
    const dd = el("dd");
    if (cell.text === "") dd.textContent = "—";
    else dd.append(...withAddresses(inline(cell.text)));
    dl.append(el("dt", "", cell.header), dd);
  }
  const listed = el("dd");
  listed.append(el("code", "", `${README}:${d.line}`));
  dl.append(el("dt", "", "Listed in"), listed);
  side.append(dl);
}

// ---- start ----------------------------------------------------------------------------

if (project === null) {
  app.append(screen(projectWords(location.search)));
} else {
  app.append(bar);
  void load();
}
