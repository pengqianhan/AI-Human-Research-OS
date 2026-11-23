/**
 * The Skeleton view's page (os-ui/PLUGINS.md Part 3, §3), framed by the
 * project workspace on its own origin, app://skeleton-view, for the project in
 * its `?project=`. It reads one file, the project's paper_skeleton.md, through
 * the read channel (./_os/files), and shows mockup alternative B: the
 * Snapshot card, the claims with each one's evidence beside them (under the
 * claim in a narrow window), and the rest of the file folded by section. It
 * writes nothing and has no bridge.
 *
 * A Snapshot line, a claim row, or a block of an open section is reported to
 * the workspace with `os.select` (posted to the app's origin only); the
 * workspace shows "Ask the agent about this" and may answer `os.select.clear`.
 *
 * The file is untrusted: md-kit turns it into tokens, and every token goes on
 * screen as text (site-kit's el and inlineNodes), with the host's invisible
 * characters marked. A link's target is a tooltip, never followed; an image
 * is its alt text, never loaded. Each load carries a generation number, so an
 * answer that arrives after Reload is dropped.
 */
import { cutText, inline, parse } from "../../md-kit.ts";
import type { Block, Code, Doc, List, Paragraph, Table } from "../../md-kit.ts";
import { button, clear, el, filesUrl, inlineNodes, isHostClear, markInvisible, projectFrom, readStart } from "../../site-kit.ts";
import {
  blockSelection,
  claimsView,
  contentWords,
  docNotes,
  evidenceOf,
  FILE,
  filePath,
  fileVerdict,
  fileWords,
  openRow,
  projectWords,
  READ_MAX,
  restSections,
  snapshotCard,
  tableNotes,
  topBar,
} from "./logic.ts";
import type { ClaimRow, ClaimsView, OpenClaim, RestSection, Selection, SnapLine, Words } from "./logic.ts";

/** The app's origin: the only window this page reports a selection to. */
const HOST = "app://research-os";

const project = projectFrom(location.search);
const app = document.getElementById("app")!;

// ---- selection: reported to the workspace -------------------------------------------

let picked: Element | null = null;

function post(message: { type: "os.select"; label: string | null; quote?: string }): void {
  if (window.parent !== window) window.parent.postMessage(message, HOST);
}

/** Marks `node` as the selection and reports it. */
function select(node: Element, selection: Selection): void {
  unpick();
  node.classList.add("picked");
  picked = node;
  post({ type: "os.select", label: selection.label, ...(selection.quote === undefined ? {} : { quote: selection.quote }) });
}

function unpick(): void {
  picked?.classList.remove("picked");
  picked = null;
}

/** Clears the selection; `report` false when the workspace asked for it. */
function unselect(report = true): void {
  const had = picked !== null;
  unpick();
  if (report && had) post({ type: "os.select", label: null });
}

/** Whether the user is selecting text with the pointer, which is not a click on a block. */
function hasRange(): boolean {
  const s = window.getSelection();
  return s !== null && !s.isCollapsed && s.toString() !== "";
}

window.addEventListener("message", (event) => {
  if (isHostClear(event, window.parent, HOST)) unselect(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") unselect();
});

/** Makes `node` a selectable block: a click selects it, a second click clears it. */
function selectable<T extends HTMLElement>(node: T, selection: () => Selection): T {
  node.classList.add("blk");
  node.addEventListener("click", (event) => {
    if (hasRange()) return;
    event.stopPropagation();
    if (picked === node) unselect();
    else select(node, selection());
  });
  return node;
}

// ---- pieces ---------------------------------------------------------------------------

/** Markdown inline text as DOM nodes (text only). */
const md = (text: string) => inlineNodes(inline(text));

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

/** A status pill: "verified" styled as done, any other word neutral. */
function pill(text: string, done: boolean): HTMLElement {
  return el("span", done ? "stp" : "stp draft", markInvisible(text));
}

// ---- the page -------------------------------------------------------------------------

const state = {
  gen: 0,
  doc: null as Doc | null,
  /** The claim whose evidence shows, by its line; across a Reload found again by openRow (its ID when one row has it). */
  claim: null as OpenClaim | null,
  /** Open sections of the rest of the file, by RestSection.key; kept while the page lives. */
  open: new Set<string>(),
};

const words = project === null ? null : topBar(project);
const bar = el("div", "subbar");
const body = el("div", "sk2");
const claimsBox = el("section", "sk-claims");
const side = el("aside", "card sk-side");
side.setAttribute("aria-label", "Evidence");
side.setAttribute("aria-live", "polite");

if (words !== null) {
  const reload = button("link reload", words.reload);
  reload.title = `Read ${FILE} again, as it is on disk now`;
  reload.addEventListener("click", () => void load());
  bar.append(el("span", "vt", words.title), el("span", "vpath", words.path), el("span", "hint", words.hint), reload);
}

/** Shows `node` in place of the page's content, below the bar; the page itself stays put, so its scroll is kept. */
function show(node: HTMLElement): void {
  for (const child of [...app.children]) if (child !== bar && child !== node) child.remove();
  if (node.parentNode !== app) app.append(node);
}

async function load(): Promise<void> {
  const gen = ++state.gen;
  unselect();
  // A Reload over the page keeps it on screen until the file is read again.
  if (body.parentNode !== app) show(el("div", "loading", "Loading…"));
  let res: Response;
  try {
    res = await fetch(filesUrl(filePath(project!)), { cache: "no-store" });
  } catch {
    if (gen === state.gen) show(screen(fileWords(0, project!), () => void load()));
    return;
  }
  if (gen !== state.gen) {
    void res.body?.cancel().catch(() => {});
    return;
  }
  if (!res.ok) {
    show(screen(fileWords(res.status, project!), () => void load()));
    return;
  }
  // One byte past the cap, so a file of exactly 1 MiB is read and one byte more is too large.
  const { bytes, cut } = await readStart(res, READ_MAX + 1);
  if (gen !== state.gen) return;
  const verdict = fileVerdict(bytes, cut);
  if (verdict.kind !== "text") {
    show(screen(contentWords(verdict.kind), () => void load()));
    return;
  }
  state.doc = parse(verdict.text);
  render(state.doc);
}

function render(doc: Doc): void {
  clear(body);
  const notes = el("div", "sk-notes");
  for (const text of docNotes(doc)) notes.append(el("div", "note-box", text));
  body.append(notes);
  const card = snapshotCard(doc);
  if (card !== null) body.append(snapshotSection(card.status, card.title, card.lines));
  const view = claimsView(doc);
  const rows = view.state === "claims" ? view.rows : [];
  // Reload keeps the open claim if the file still has it.
  state.claim = openClaimOf(openRow(rows, state.claim));
  renderClaims(doc, view);
  body.append(claimsBox, side, restSection(doc));
  show(body);
}

// ---- the Snapshot card ----------------------------------------------------------------

function snapshotSection(status: string | null, title: SnapLine | null, lines: readonly SnapLine[]): HTMLElement {
  const box = el("section", "card sk-snap");
  box.setAttribute("aria-label", "Snapshot");
  const eyebrow = el("div", "eyebrow", "Snapshot");
  if (status !== null) eyebrow.append(pill(status, false));
  box.append(eyebrow);
  const value = (line: SnapLine): Node[] => (line.value === null ? [el("span", "unfilled", "not filled in")] : md(line.value));
  if (title !== null) {
    const h = el("h2");
    h.append(...value(title));
    box.append(selectable(h, () => title.selection));
  }
  for (const line of lines) {
    const p = el("p");
    p.append(el("b", "", line.label), ...value(line));
    box.append(selectable(p, () => line.selection));
  }
  return box;
}

// ---- the claims and their evidence ----------------------------------------------------

/** A row as the open claim: its line, and its ID to find it again after a Reload. */
const openClaimOf = (row: ClaimRow | null): OpenClaim | null => (row === null ? null : { line: row.line, id: row.id === "—" ? null : row.id });

function renderClaims(doc: Doc, view: ClaimsView): void {
  clear(claimsBox);
  const head = el("div", "sk-h", "Claims and evidence");
  claimsBox.append(head);
  if (view.state !== "claims") {
    claimsBox.append(el("div", "note-box", view.message));
    if (view.state === "no-claims") for (const text of view.notes) claimsBox.append(el("p", "table-note", text));
    renderSide(doc, null);
    return;
  }
  head.append(el("small", "", view.summary));
  const table = el("table", "ctable");
  const cols = el("colgroup");
  cols.append(el("col", "c-id"), el("col", "c-text"), el("col"));
  const thead = el("thead");
  const hrow = el("tr");
  hrow.append(el("th", "", "Claim"), el("th"), el("th", "", "Evidence and source"));
  thead.append(hrow);
  const tbody = el("tbody");
  // By line: two rows may share an ID.
  const open = view.rows.find((r) => r.line === state.claim?.line) ?? null;
  for (const row of view.rows) {
    const tr = el("tr");
    tr.dataset.line = String(row.line);
    if (row === open) tr.classList.add("on");
    const id = el("td", "id", row.id);
    if (row.status !== null && row.status !== "") {
      const status = el("div");
      status.append(pill(row.status, row.verified));
      id.append(status);
    }
    const text = el("td", "cl");
    text.append(...md(row.text));
    const ev = el("td");
    const parts: Node[] = [];
    if (row.evidence !== null) parts.push(...md(row.evidence));
    if (row.result !== null) {
      if (parts.length > 0) parts.push(document.createTextNode(" · "));
      const result = el("span", "muted");
      result.append(...md(row.result));
      parts.push(result);
    }
    ev.append(...parts);
    if (row.source !== null) {
      const source = el("div");
      source.append(...md(row.source));
      ev.append(source);
    }
    tr.append(id, text, ev);
    tr.classList.add("blk");
    tr.addEventListener("click", () => {
      if (hasRange()) return;
      if (picked === tr) {
        unselect();
        return;
      }
      openClaim(doc, view, row);
      // The table is drawn again when another claim opens: select the row as it is now.
      select(claimsBox.querySelector(`tr.blk[data-line="${row.line}"]`) ?? tr, row.selection);
    });
    tbody.append(tr);
    if (row === open) {
      // In a narrow window the evidence opens under its row instead of beside the table.
      const evrow = el("tr", "evrow nar");
      const cell = el("td");
      cell.colSpan = 3;
      cell.append(evidenceBox(doc, row, false));
      evrow.append(cell);
      tbody.append(evrow);
    }
  }
  table.append(cols, thead, tbody);
  claimsBox.append(table);
  for (const text of view.notes) claimsBox.append(el("p", "table-note", text));
  renderSide(doc, open);
}

/** A claim row was clicked: its evidence opens, beside the table or under the row. */
function openClaim(doc: Doc, view: ClaimsView, row: ClaimRow): void {
  if (state.claim?.line === row.line) return;
  state.claim = openClaimOf(row);
  renderClaims(doc, view);
}

function renderSide(doc: Doc, row: ClaimRow | null): void {
  clear(side);
  if (row === null) {
    side.append(el("h4", "", "Evidence"), el("p", "nd-empty", "Select a claim to see its evidence: what the skeleton states, the files it names, and the studies that use it."));
    return;
  }
  side.append(el("h4", "", evidenceOf(doc, row).heading), evidenceBox(doc, row, true));
}

/** A claim's evidence: as the skeleton states it, the files it names, and the studies that use it. */
function evidenceBox(doc: Doc, row: ClaimRow, withClaim: boolean): HTMLElement {
  const ev = evidenceOf(doc, row);
  const box = el("div", "evbox");
  if (withClaim) {
    const top = el("div", "row2");
    if (row.id !== "—") top.append(el("span", "kb", row.id));
    if (row.status !== null && row.status !== "") top.append(pill(row.status, row.verified));
    const claim = el("p", "cl");
    claim.append(...md(row.text));
    box.append(top, claim);
  }
  const stated = el("div");
  ev.stated.forEach((cell, k) => {
    if (k > 0) stated.append(document.createTextNode(" · "));
    stated.append(...md(cell));
  });
  box.append(el("h5", "", "Evidence, as the skeleton states it"), stated);
  box.append(el("h5", "", "Files it names"));
  if (ev.filesNote !== null) box.append(el("div", "", ev.filesNote));
  else {
    const list = el("ul", "files");
    for (const file of ev.files) {
      const li = el("li", file.kind, markInvisible(file.text));
      if (file.kind === "address") li.append(el("span", "why", " (an address, not a file of the project)"));
      if (file.kind === "outside") li.append(el("span", "why", " (outside the project)"));
      list.append(li);
    }
    box.append(list);
  }
  if (ev.usedBy !== null || ev.usedByNote !== null) {
    box.append(el("h5", "", "Used by"), el("div", "", ev.usedByNote ?? ev.usedBy!.map(markInvisible).join("; ")));
  }
  return box;
}

// ---- the rest of the file, folded -----------------------------------------------------

function restSection(doc: Doc): HTMLElement {
  const box = el("section", "sk-rest");
  const head = el("div", "sk-h", `The rest of ${FILE}`);
  head.append(el("small", "", "folded; open a section to read it"));
  box.append(head);
  const rest = restSections(doc);
  // Only when it is true: the card and the claims table drew the whole file.
  if (rest.nothingElse) box.append(el("div", "note-box", `Nothing else in ${FILE}.`));
  for (const s of rest.sections) box.append(folded(s));
  if (rest.note !== null) box.append(el("p", "table-note", rest.note));
  // What is left out, said in one muted line each (section titles from the file, so marked).
  for (const text of rest.notShown) box.append(el("p", "table-note", markInvisible(text)));
  return box;
}

/** One entry: its name, line, and entries; its blocks drawn when it is first opened. */
function folded(s: RestSection): HTMLElement {
  const details = el("details");
  const summary = el("summary");
  const title = el("span");
  title.append(...md(s.title));
  summary.append(title, el("small", "", s.summary));
  const inner = el("div", "inner mddoc");
  details.append(summary, inner);
  const fill = () => {
    if (inner.childElementCount === 0) for (const block of s.blocks) inner.append(...blockNodes(block, s.labelTitle));
  };
  if (state.open.has(s.key)) {
    details.open = true;
    fill();
  }
  details.addEventListener("toggle", () => {
    if (details.open) {
      state.open.add(s.key);
      fill();
    } else {
      state.open.delete(s.key);
      if (picked !== null && details.contains(picked)) unselect();
    }
  });
  return details;
}

/** A block of a section as DOM: each paragraph, list item, table row, and code block selectable. */
function blockNodes(block: Block, title: string | null): HTMLElement[] {
  if (block.kind === "paragraph") return [paragraph(block, title)];
  if (block.kind === "list") return [list(block, title)];
  if (block.kind === "table") return table(block, title);
  if (block.kind === "code") return [code(block, title)];
  return [];
}

function paragraph(block: Paragraph, title: string | null): HTMLElement {
  const p = el("p");
  p.append(...md(block.text));
  return selectable(p, () => blockSelection(block.first, block.last, title, block.lines));
}

function list(block: List, title: string | null): HTMLElement {
  const box = el(block.ordered ? "ol" : "ul");
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
    box.append(selectable(li, () => blockSelection(item.first, item.last, title, item.lines)));
  }
  return box;
}

function table(block: Table, title: string | null): HTMLElement[] {
  const t = el("table", "mdtable");
  const head = el("tr");
  for (const cell of block.header) {
    const th = el("th");
    th.append(...md(cell));
    head.append(th);
  }
  const thead = el("thead");
  thead.append(head);
  const tbody = el("tbody");
  for (const row of block.rows) {
    const tr = el("tr", row.uneven ? "uneven" : "");
    for (const cell of row.cells) {
      const td = el("td");
      td.append(...md(cell));
      tr.append(td);
    }
    tbody.append(selectable(tr, () => blockSelection(row.line, row.line, title, [row.source])));
  }
  t.append(thead, tbody);
  return [t, ...tableNotes(block).map((text) => el("p", "table-note", text))];
}

function code(block: Code, title: string | null): HTMLElement {
  const pre = el("pre", "", markInvisible(block.body.map((line) => cutText(line)).join("\n")));
  return selectable(pre, () => blockSelection(block.first, block.last, title, block.lines));
}

// ---- start ----------------------------------------------------------------------------

if (project === null) {
  app.append(screen(projectWords(location.search)));
} else {
  app.append(bar);
  void load();
}
