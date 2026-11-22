/**
 * The Code view's page (os-ui/PLUGINS.md, S6a-2), framed by the project
 * workspace on its own origin, app://code-view, for the project in its
 * `?project=`. Files lists the project's Code/ folder and shows one file,
 * through the read channel (./_os/list, ./_os/files); Changes lists the
 * commits that touch the project and shows one commit's files and one file's
 * diff, through /api/code-view/git. It reads nothing else and has no bridge.
 *
 * A file, a line, a commit, a line of a diff, or text selected in a file or a
 * diff is reported to the workspace with `os.select` (posted to the app's
 * origin only); the workspace shows the "Ask the agent about this" bar and
 * may answer `os.select.clear` when the user clears it there.
 *
 * Every name, line, message, and patch is untrusted and goes on screen as
 * text only (dom.ts). Each load carries a generation number, so an answer
 * that arrives after the user moved on is dropped, and a pane shows
 * "Loading…" rather than what the previous file or commit showed.
 */
import type { Commit, Diff, FileChange, Log, LogCommit, Source, Unavailable } from "../../../server/codeGit.ts";
import { button, clear, el, icon } from "./dom.ts";
import {
  answerWords,
  changeCount,
  commitSelection,
  commitStat,
  decodeText,
  diffSelection,
  diffTextSelection,
  fileSelection,
  fileWords,
  filesUrl,
  gitUrl,
  IMAGE,
  lineSelection,
  linesNote,
  listUrl,
  logCommand,
  n,
  NOT_OPENABLE,
  parsePatch,
  projectFrom,
  rangeSelection,
  splitLines,
  statLine,
  treeOrder,
  unavailableWords,
  VIEW,
} from "./logic.ts";
import type { DiffRow, Selection, Words } from "./logic.ts";

/** The app's origin: the only window this page reports a selection to. */
const HOST = "app://research-os";

interface Entry {
  name: string;
  dir: boolean;
  size: number;
}
type Listing = { state: "loading" } | { state: "ok"; entries: Entry[]; truncated: boolean } | { state: "error"; status: number };
type Answer<T> = { ok: true; body: T } | { ok: false; status: number; error: string | null };

const project = projectFrom(location.search);
const app = document.getElementById("app")!;

// ---- selection: reported to the workspace -------------------------------------------

let picked: Element | null = null;

function post(message: { type: "os.select"; label: string | null; quote?: string }): void {
  if (window.parent !== window) window.parent.postMessage(message, HOST);
}

/** Marks `node` as the selection (none for a text range) and reports it. */
function select(node: Element | null, selection: Selection): void {
  unpick();
  if (node !== null) {
    node.classList.add("picked");
    picked = node;
  }
  post({ type: "os.select", label: selection.label, ...(selection.quote === undefined ? {} : { quote: selection.quote }) });
}

function unpick(): void {
  picked?.classList.remove("picked");
  picked = null;
}

/** Clears the selection; `report` false when the workspace asked for it. */
function unselect(report = true): void {
  const had = picked !== null || hasRange();
  unpick();
  window.getSelection()?.removeAllRanges();
  if (report && had) post({ type: "os.select", label: null });
}

function hasRange(): boolean {
  const s = window.getSelection();
  return s !== null && !s.isCollapsed && s.toString() !== "";
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || event.origin !== HOST) return;
  const data = event.data as { type?: unknown } | null;
  if (typeof data === "object" && data !== null && data.type === "os.select.clear") unselect(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") unselect();
});

/** The text selected inside `box`, and the first and last `.row`/`.drow` it spans, or null. */
function rangeIn(box: Element, rowClass: string): { text: string; first: HTMLElement; last: HTMLElement } | null {
  const s = window.getSelection();
  if (s === null || s.isCollapsed || s.rangeCount === 0) return null;
  const text = s.toString();
  if (text.trim() === "") return null;
  const range = s.getRangeAt(0);
  const rowOf = (node: Node) => (node instanceof Element ? node : node.parentElement)?.closest(`.${rowClass}`) as HTMLElement | null;
  const first = rowOf(range.startContainer);
  const last = rowOf(range.endContainer);
  if (first === null || last === null || !box.contains(first) || !box.contains(last)) return null;
  return { text, first, last };
}

// ---- requests -------------------------------------------------------------------------

async function getJson<T>(url: string): Promise<Answer<T>> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { ok: false, status: 0, error: null };
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: unknown }) | null;
  if (res.ok && body !== null) return { ok: true, body };
  return { ok: false, status: res.status, error: typeof body?.error === "string" ? body.error : null };
}

/** The first VIEW.bytes of a response's body; `cut` when the file goes on. */
async function readStart(res: Response): Promise<{ bytes: Uint8Array; cut: boolean }> {
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let cut = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    if (total >= VIEW.bytes) {
      cut = true;
      await reader.cancel().catch(() => {});
      break;
    }
  }
  const bytes = new Uint8Array(Math.min(total, VIEW.bytes));
  let at = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, bytes.length - at);
    bytes.set(part, at);
    at += part.length;
    if (at >= bytes.length) break;
  }
  return { bytes, cut };
}

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

const loading = () => el("div", "loading", "Loading…");

// ---- the page -------------------------------------------------------------------------

const seg = el("div", "seg");
const filesTab = button("active", "Files");
const changesTab = button("", "Changes");
seg.append(filesTab, changesTab);
const hint = el("span", "hint", "Select a file or a line to ask the agent about it.");
const subbar = el("div", "subbar");
subbar.append(seg, hint);

const filesPane = el("div", "files");
const tree = el("nav", "tree");
tree.setAttribute("aria-label", "Files in Code/");
const viewer = el("section", "viewer");
viewer.setAttribute("aria-label", "File");
const vhead = el("div", "vhead");
const vpath = el("span", "vpath");
const vnote = el("span", "vnote");
vhead.append(icon("file", "sm muted"), vpath, vnote);
const code = el("div", "code");
code.tabIndex = 0;
viewer.append(vhead, code);
filesPane.append(tree, viewer);

const changesPane = el("div", "changes");
changesPane.hidden = true;

function showSub(which: "files" | "changes"): void {
  unselect();
  filesTab.classList.toggle("active", which === "files");
  changesTab.classList.toggle("active", which === "changes");
  filesTab.setAttribute("aria-pressed", String(which === "files"));
  changesTab.setAttribute("aria-pressed", String(which === "changes"));
  filesPane.hidden = which !== "files";
  changesPane.hidden = which !== "changes";
  hint.textContent = which === "files" ? "Select a file or a line to ask the agent about it." : "Select a commit or a line of its diff to ask the agent about it.";
  if (which === "changes" && hist.state === "idle") void loadLog(0);
}
filesTab.addEventListener("click", () => showSub("files"));
changesTab.addEventListener("click", () => showSub("changes"));

// ---- Files ----------------------------------------------------------------------------

const files = {
  open: new Set<string>(),
  listings: new Map<string, Listing>(),
  file: null as string | null,
  gen: 0,
};

/** A project-relative path ("Code/a/b.py") as the workspace path the channel takes. */
const workspacePath = (path: string) => `projects-folder/${project}/${path}`;

async function loadListing(path: string): Promise<void> {
  files.listings.set(path, { state: "loading" });
  renderTree();
  let res: Response;
  try {
    res = await fetch(listUrl(workspacePath(path)), { cache: "no-store" });
  } catch {
    files.listings.set(path, { state: "error", status: 0 });
    renderTree();
    return;
  }
  if (!res.ok) {
    files.listings.set(path, { state: "error", status: res.status });
  } else {
    const body = (await res.json().catch(() => null)) as { entries?: Entry[]; truncated?: boolean } | null;
    files.listings.set(path, Array.isArray(body?.entries) ? { state: "ok", entries: treeOrder(body.entries), truncated: body.truncated === true } : { state: "error", status: 500 });
  }
  renderTree();
  if (path === "Code" && files.file === null) {
    const root = files.listings.get("Code");
    if (root?.state === "ok" && root.entries.some((e) => !e.dir && e.name === "README.md")) void openFile("Code/README.md", false);
    else renderViewer();
  }
}

function renderTree(): void {
  clear(tree);
  const head = el("div", "tree-root");
  const reload = button("link reload", "Reload");
  reload.title = "List the folders again, as they are on disk now";
  reload.addEventListener("click", () => {
    unselect();
    void loadListing("Code");
    for (const path of files.open) void loadListing(path);
  });
  head.append(el("span", "", `${project}/Code/`), reload);
  tree.append(head);
  const root = files.listings.get("Code");
  if (root === undefined || root.state === "loading") {
    tree.append(loading());
    return;
  }
  if (root.state === "error") {
    tree.append(el("div", "tree-note", root.status === 404 ? "No Code/ folder." : "Code/ could not be listed."));
    return;
  }
  if (root.entries.length === 0) tree.append(el("div", "tree-note", "Code/ is empty."));
  walk("Code", root, 0);
}

function walk(base: string, listing: Extract<Listing, { state: "ok" }>, depth: number): void {
  const pad = `${8 + depth * 14}px`;
  for (const entry of listing.entries) {
    const path = `${base}/${entry.name}`;
    const node = button(`tnode${entry.dir ? " dir" : ""}${!entry.dir && path === files.file ? " on" : ""}`);
    node.style.paddingLeft = pad;
    node.title = path;
    if (entry.dir) {
      const open = files.open.has(path);
      node.setAttribute("aria-expanded", String(open));
      node.append(icon(open ? "chev-down" : "chev-right", "caret"), icon("folder"));
      node.addEventListener("click", () => toggleDir(path));
    } else {
      node.append(el("span", "caret-sp"), icon("file"));
      node.addEventListener("click", () => {
        if (picked === node) unselect();
        else void openFile(path, true);
      });
      node.dataset.path = path;
    }
    node.append(el("span", "tname", entry.name));
    tree.append(node);
    if (entry.dir && files.open.has(path)) {
      const sub = files.listings.get(path);
      if (sub === undefined || sub.state === "loading") tree.append(indented(loading(), depth + 1));
      else if (sub.state === "error") tree.append(indented(listError(path, sub.status), depth + 1));
      else {
        if (sub.entries.length === 0) tree.append(indented(el("div", "tree-note", "empty"), depth + 1));
        walk(path, sub, depth + 1);
        if (sub.truncated) tree.append(indented(el("div", "tree-note", "More than 5,000 entries: only the first are listed."), depth + 1));
      }
    }
  }
  if (depth === 0 && listing.truncated) tree.append(el("div", "tree-note", "More than 5,000 entries: only the first are listed."));
}

function indented(node: HTMLElement, depth: number): HTMLElement {
  node.style.paddingLeft = `${8 + depth * 14 + 17}px`;
  return node;
}

function listError(path: string, status: number): HTMLElement {
  const box = el("div", "tree-note");
  box.append(el("span", "", status === 503 ? "Busy reading other files. " : status === 404 ? "No longer there. " : "Could not be listed. "));
  const again = button("link", "Try again");
  again.addEventListener("click", () => void loadListing(path));
  box.append(again);
  return box;
}

function toggleDir(path: string): void {
  unselect();
  if (files.open.has(path)) files.open.delete(path);
  else {
    // Listed again on every opening, so a folder shows what is on disk now.
    files.open.add(path);
    void loadListing(path);
    return;
  }
  renderTree();
}

/** The viewer with no file open: the folder's own state, or a prompt to choose a file. */
function renderViewer(): void {
  if (files.file !== null) return;
  vpath.textContent = "";
  vnote.textContent = "read-only";
  clear(code);
  const root = files.listings.get("Code");
  if (root?.state === "error") {
    code.append(
      root.status === 404
        ? screen({ title: "This project has no Code/ folder", text: `projects-folder/${project}/Code/ does not exist, so there are no files to show.`, retry: true }, () => void loadListing("Code"))
        : screen(fileWords(root.status, "Code/"), () => void loadListing("Code")),
    );
  } else if (root?.state === "ok" && root.entries.length === 0) {
    code.append(screen({ title: "Code/ is empty", text: `projects-folder/${project}/Code/ holds no files yet.`, retry: false }));
  } else if (root?.state === "ok") {
    code.append(screen({ title: "Choose a file", text: "Pick a file on the left to read it here, read-only.", retry: false }));
  }
}

async function openFile(path: string, pick: boolean): Promise<void> {
  const gen = ++files.gen;
  files.file = path;
  const name = path.split("/").pop()!;
  vpath.textContent = path;
  vpath.title = workspacePath(path);
  vnote.textContent = "read-only";
  clear(code);
  code.scrollTop = 0;
  code.scrollLeft = 0;
  code.append(loading());
  renderTree();
  if (pick) select(tree.querySelector(`.tnode[data-path="${CSS.escape(path)}"]`), fileSelection(path));
  else unselect();

  if (IMAGE.test(name)) {
    const img = el("img", "image");
    img.alt = name;
    img.addEventListener("load", () => {
      if (gen !== files.gen) return;
      clear(code);
      code.append(img);
      vnote.textContent = `${img.naturalWidth} × ${img.naturalHeight} · read-only`;
    });
    img.addEventListener("error", () => {
      if (gen !== files.gen) return;
      clear(code);
      code.append(screen(fileWords(404, name), () => void openFile(path, false)));
    });
    img.src = filesUrl(workspacePath(path));
    return;
  }

  let res: Response;
  try {
    res = await fetch(filesUrl(workspacePath(path)), { cache: "no-store" });
  } catch {
    if (gen === files.gen) showFileProblem(0, name, path);
    return;
  }
  if (gen !== files.gen) {
    void res.body?.cancel().catch(() => {});
    return;
  }
  if (!res.ok) {
    showFileProblem(res.status, name, path);
    return;
  }
  const { bytes, cut } = await readStart(res);
  if (gen !== files.gen) return;
  const text = decodeText(bytes, cut);
  clear(code);
  if (text === null) {
    const size = Number(res.headers.get("content-length") ?? NaN);
    code.append(screen({ title: "Not a text file", text: `${name} holds binary data${Number.isFinite(size) ? ` (${n(size)} bytes)` : ""}, so it is not shown here.`, retry: false }));
    vnote.textContent = "read-only";
    return;
  }
  const { lines, total } = splitLines(text);
  vnote.textContent = linesNote(lines.length, total, cut);
  code.append(codeRows(path, lines));
  if (lines.length < total || cut) {
    code.append(el("div", "cut-note", `The view stops here: it shows at most ${n(VIEW.lines)} lines and the first ${VIEW.bytes / 1024 / 1024} MiB of a file.`));
  }
}

function showFileProblem(status: number, name: string, path: string): void {
  clear(code);
  code.append(screen(fileWords(status, name), () => void openFile(path, false)));
  vnote.textContent = "read-only";
}

/** A file's lines, numbered, as the mockup's rows; Markdown headings and # comments shaded. */
function codeRows(path: string, lines: readonly string[]): HTMLElement {
  const inner = el("div", "code-in");
  const markdown = /\.md$/i.test(path);
  const hashComments = /\.(py|sh|toml|ya?ml|cfg|ini|r)$/i.test(path);
  lines.forEach((line, i) => {
    const row = el("div", "row");
    row.dataset.line = String(i + 1);
    if (markdown && /^#{1,6} /.test(line)) row.classList.add("hd");
    else if (hashComments && line.trim().startsWith("#")) row.classList.add("cm");
    row.append(el("span", "no", String(i + 1)), el("span", "tx", line === "" ? " " : line));
    inner.append(row);
  });
  inner.addEventListener("click", (event) => {
    if (hasRange()) return;
    const row = (event.target as Element).closest(".row") as HTMLElement | null;
    if (row === null) return;
    if (picked === row) unselect();
    else select(row, lineSelection(path, Number(row.dataset.line), row.querySelector(".tx")?.textContent ?? ""));
  });
  inner.addEventListener("mouseup", () => {
    const range = rangeIn(inner, "row");
    if (range !== null) {
      unpick();
      select(null, rangeSelection(path, Number(range.first.dataset.line), Number(range.last.dataset.line), range.text));
    }
  });
  return inner;
}

// ---- Changes --------------------------------------------------------------------------

const hist = {
  state: "idle" as "idle" | "loading" | "ready" | "failed",
  gen: 0,
  source: null as Source | null,
  commits: [] as LogCommit[],
  more: false,
  /** The failure of the last request, for the list's screen or under "Load more". */
  problem: null as { words: Words; retry: () => void } | null,
  moreProblem: null as Words | null,
  loadingMore: false,
  open: null as string | null,
  detail: el("div", "cdetail"),
  detailGen: 0,
  diffGen: 0,
};

async function loadLog(skip: number): Promise<void> {
  const gen = skip === 0 ? ++hist.gen : hist.gen;
  if (skip === 0) {
    hist.state = "loading";
    hist.commits = [];
    hist.open = null;
    hist.problem = null;
    clear(hist.detail);
  } else {
    hist.loadingMore = true;
    hist.moreProblem = null;
  }
  renderChanges();
  const answer = await getJson<Log | Unavailable>(gitUrl("log", { project: project!, skip: String(skip) }));
  if (gen !== hist.gen) return;
  hist.loadingMore = false;
  if (!answer.ok) {
    const words = answerWords("history", answer.status, answer.error);
    if (skip === 0) {
      hist.state = "failed";
      hist.problem = { words, retry: () => void loadLog(0) };
    } else hist.moreProblem = words;
  } else if (answer.body.repo === null) {
    hist.state = "failed";
    hist.problem = { words: unavailableWords(answer.body.problem, project!), retry: () => void loadLog(0) };
  } else {
    const log = answer.body;
    hist.state = "ready";
    hist.source = log;
    hist.commits = skip === 0 ? log.commits : [...hist.commits, ...log.commits];
    hist.more = log.more;
  }
  renderChanges();
}

function renderChanges(): void {
  clear(changesPane);
  changesPane.append(el("h3", "", "Changes to this project"));
  if (hist.state === "loading" || hist.state === "idle") {
    changesPane.append(loading());
    return;
  }
  if (hist.state === "failed" && hist.problem !== null) {
    changesPane.append(screen(hist.problem.words, hist.problem.retry));
    return;
  }
  const cmdRow = el("div", "cmdrow");
  const reload = button("link reload", "Reload");
  reload.title = "Ask Git for the history again, as it is now";
  reload.addEventListener("click", () => {
    unselect();
    void loadLog(0);
  });
  cmdRow.append(el("div", "cmd", logCommand(hist.source!, project!)), reload);
  changesPane.append(cmdRow);
  if (hist.commits.length === 0) {
    changesPane.append(el("div", "note-box", "No commit changes this project yet."));
    return;
  }
  const list = el("div", "commits");
  for (const c of hist.commits) {
    const row = button(`commit${c.hash === hist.open ? " on" : ""}`);
    row.dataset.hash = c.hash;
    row.setAttribute("aria-pressed", String(c.hash === hist.open));
    row.append(el("span", "h", c.short), el("span", "s", c.subject), el("span", "d", c.date), el("span", "st", commitStat(c)));
    row.addEventListener("click", () => {
      if (hist.open === c.hash) {
        if (picked === row) unselect();
        else select(row, commitSelection(c));
        return;
      }
      void openCommit(c);
    });
    list.append(row);
    if (c.hash === hist.open) {
      list.append(hist.detail);
      if (picked?.classList.contains("commit")) {
        row.classList.add("picked");
        picked = row;
      }
    }
  }
  changesPane.append(list);
  if (hist.more || hist.loadingMore || hist.moreProblem !== null) {
    const foot = el("div", "more");
    if (hist.moreProblem !== null) foot.append(screen(hist.moreProblem));
    const more = button("btn", hist.loadingMore ? "Loading…" : hist.moreProblem !== null ? "Try again" : "Load more");
    more.disabled = hist.loadingMore;
    more.addEventListener("click", () => void loadLog(hist.commits.length));
    foot.append(more);
    changesPane.append(foot);
  }
}

async function openCommit(c: LogCommit): Promise<void> {
  const gen = ++hist.detailGen;
  hist.diffGen++;
  hist.open = c.hash;
  clear(hist.detail);
  hist.detail.append(loading());
  renderChanges();
  const row = changesPane.querySelector(`.commit[data-hash="${c.hash}"]`);
  select(row, commitSelection(c));
  const answer = await getJson<Commit | Unavailable>(gitUrl("commit", { project: project!, hash: c.hash }));
  if (gen !== hist.detailGen) return;
  clear(hist.detail);
  if (!answer.ok) {
    hist.detail.append(screen(answerWords("commit", answer.status, answer.error), () => void openCommit(c)));
    if (answer.status === 404) hist.detail.append(reloadButton());
    return;
  }
  if (answer.body.repo === null) {
    hist.detail.append(screen(unavailableWords(answer.body.problem, project!), () => void openCommit(c)));
    return;
  }
  renderCommit(answer.body);
}

function reloadButton(): HTMLButtonElement {
  const reload = button("btn", "Reload the list");
  reload.addEventListener("click", () => void loadLog(0));
  return reload;
}

function renderCommit(commit: Commit): void {
  const box = hist.detail;
  const meta = el("div", "cmeta");
  meta.append(el("span", "", commit.author), el("span", "", commit.date), el("span", "mono", commit.hash));
  box.append(meta);
  if (commit.body !== "") box.append(el("pre", "cbody", commit.body));
  box.append(el("h4", "", `Files changed in projects-folder/${project}`));
  const fstat = el("div", "fstat");
  const firstText = commit.files.find((f) => f.openable && f.added !== null);
  for (const f of commit.files) {
    const count = el("span", "", changeCount(f));
    if (f.openable) {
      const open = button("fpath", f.path);
      open.dataset.path = f.path;
      open.title = `Show the diff of ${f.path}`;
      open.addEventListener("click", () => void openDiff(commit, f));
      fstat.append(open, count);
    } else {
      const name = el("span", "fpath closed", f.path);
      name.title = NOT_OPENABLE;
      fstat.append(name, count);
      fstat.append(el("span", "why", NOT_OPENABLE));
    }
  }
  fstat.append(el("span", "tot", statLine(commit.stat)));
  box.append(fstat);
  if (commit.truncated) {
    box.append(
      el(
        "div",
        "note-box",
        commit.files.length < commit.stat.files
          ? `This commit changes ${n(commit.stat.files)} files; the list shows the first ${n(commit.files.length)}.`
          : "This commit's message is longer than the Code view reads; it is cut.",
      ),
    );
  }
  const diffBox = el("div", "diffbox");
  box.append(diffBox);
  if (firstText !== undefined) void openDiff(commit, firstText);
  else if (commit.files.length > 0) diffBox.append(el("div", "note-box", "No file of this commit has a text diff to show."));
}

async function openDiff(commit: Commit, f: FileChange): Promise<void> {
  const gen = ++hist.diffGen;
  const box = hist.detail.querySelector(".diffbox");
  if (box === null) return;
  if (picked !== null && box.contains(picked)) unselect();
  for (const b of hist.detail.querySelectorAll(".fpath.on")) b.classList.remove("on");
  hist.detail.querySelector(`.fpath[data-path="${CSS.escape(f.path)}"]`)?.classList.add("on");
  clear(box);
  box.append(el("h4", "", `Diff · ${f.path}`), loading());
  const answer = await getJson<Diff | Unavailable>(gitUrl("diff", { project: project!, hash: commit.hash, path: f.path }));
  if (gen !== hist.diffGen) return;
  clear(box);
  box.append(el("h4", "", `Diff · ${f.path}`));
  if (!answer.ok) {
    box.append(screen(answerWords("diff", answer.status, answer.error), () => void openDiff(commit, f)));
    if (answer.status === 404) box.append(reloadButton());
    return;
  }
  if (answer.body.repo === null) {
    box.append(screen(unavailableWords(answer.body.problem, project!), () => void openDiff(commit, f)));
    return;
  }
  const rows = parsePatch(answer.body.diff);
  box.append(diffRows(commit.short, f.path, rows.slice(0, VIEW.lines)));
  if (rows.length > VIEW.lines) box.append(el("div", "note-box", `This diff has ${n(rows.length)} lines; the first ${n(VIEW.lines)} are shown.`));
  if (answer.body.truncated) box.append(el("div", "note-box", "This diff is longer than 1 MiB; only its beginning is shown."));
}

function diffRows(short: string, path: string, rows: readonly DiffRow[]): HTMLElement {
  const diff = el("div", "diff");
  const inner = el("div", "code-in");
  inner.append(el("div", "dfile", path));
  rows.forEach((r, i) => {
    const row = el("div", `drow ${r.kind}`);
    row.dataset.index = String(i);
    row.append(el("span", "g", r.old === undefined ? "" : String(r.old)), el("span", "g", r.new === undefined ? "" : String(r.new)), el("span", "tx", r.text === "" ? " " : r.text));
    inner.append(row);
  });
  inner.addEventListener("click", (event) => {
    if (hasRange()) return;
    const row = (event.target as Element).closest(".drow") as HTMLElement | null;
    if (row === null) return;
    const selection = diffSelection(short, path, rows[Number(row.dataset.index)]!);
    if (selection === null) return;
    if (picked === row) unselect();
    else select(row, selection);
  });
  inner.addEventListener("mouseup", () => {
    const range = rangeIn(inner, "drow");
    if (range !== null) select(null, diffTextSelection(short, path, range.text));
  });
  diff.append(inner);
  return diff;
}

// ---- start ----------------------------------------------------------------------------

if (project === null) {
  app.append(screen({ title: "No project given", text: "The Code view opens from a project's workspace, which names the project it shows.", retry: false }));
} else {
  app.append(subbar, filesPane, changesPane);
  renderTree();
  void loadListing("Code");
}
