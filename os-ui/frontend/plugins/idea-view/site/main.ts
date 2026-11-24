/**
 * The Idea view's page (os-ui/PLUGINS.md Part 3, §5), framed by the project
 * workspace on its own origin, app://idea-view, for the project in its
 * `?project=`. It reads the project's idea_graph.md, and paper_skeleton.md
 * for its claims, through the read channel (./_os/files), and shows mockup
 * alternative A: the detail panel above a map of the nodes in columns by
 * kind, joined by lines coloured by their word. It writes nothing and has no
 * bridge.
 *
 * A node is reported to the workspace with `os.select` (posted to the app's
 * origin only): `idea_graph.md · E2 (experiment)` and the row as written. The
 * workspace shows "Ask the agent about this" and may answer `os.select.clear`.
 * What the workspace holds and what the page marks agree after every Reload:
 * a selected node that is still in the file stays selected and is posted
 * again (its row may have changed); otherwise `null` is posted.
 *
 * The files are untrusted. The map is drawn by this page's own code: SVG
 * elements whose geometry is numbers from layout.ts, and HTML inside them
 * built with site-kit's el() and textContent, every statement through md-kit's
 * tokens with invisible characters marked. Nothing from a file becomes markup,
 * an attribute other than a tooltip, or a URL. Each load carries a generation
 * number, so an answer that arrives after another Reload is dropped.
 */
import { inline, parse } from "../../md-kit.ts";
import { button, clear, el, filesUrl, inlineNodes, isHostClear, markInvisible, projectFrom, readStart } from "../../site-kit.ts";
import { edgesOf, fitScale, labelPoint, layout } from "./layout.ts";
import type { Layout, Rect } from "./layout.ts";
import {
  barWords,
  buildGraph,
  contentWords,
  details,
  emptyWords,
  FILE,
  filePath,
  fileWords,
  KINDS,
  moreWords,
  nodeWords,
  noTableWords,
  problemLine,
  problemsTitle,
  projectWords,
  READ_MAX,
  selectionOf,
  SKELETON_MAX,
  skeletonFrom,
  skeletonInput,
  skeletonPath,
  STILL_OPEN,
  summary,
  verdict,
  WORDS,
} from "./logic.ts";
import type { Built, Graph, IdeaNode, Kind, Read, Words } from "./logic.ts";

/** The app's origin: the only window this page reports a selection to. */
const HOST = "app://research-os";

const project = projectFrom(location.search);
const app = document.getElementById("app")!;

// ---- fixed names: classes and words come from these maps, never from a file -----------

const KIND_CLASS: Record<Kind, string> = { question: "k-q", hypothesis: "k-h", experiment: "k-e", result: "k-r", claim: "k-c" };
const KIND_LETTER: Record<Kind, string> = { question: "Q", hypothesis: "H", experiment: "E", result: "R", claim: "C" };
const KIND_TITLE: Record<Kind, string> = { question: "Questions", hypothesis: "Hypotheses", experiment: "Experiments", result: "Results", claim: "Claims" };
/** Statuses drawn with their own dot; any other is the plain one. */
const STATUS_CLASS = new Map([
  ["open", "open"],
  ["planned", "planned"],
  ["refuted", "refuted"],
  ["failed", "failed"],
]);
const WORD_CLASS = new Map([
  ["motivates", "motivates"],
  ["tests", "tests"],
  ["supports", "supports"],
  ["refutes", "refutes"],
  ["from", "from"],
]);
const statusClass = (status: string) => `st ${STATUS_CLASS.get(status) ?? ""}`;
const n = (value: number) => value.toLocaleString("en-US");

// ---- selection: reported to the workspace -------------------------------------------

/** The node the workspace holds as this page's selection, by key; null when none is (and null was posted last). */
let selected: string | null = null;

function post(message: { type: "os.select"; label: string | null; quote?: string }): void {
  if (window.parent !== window) window.parent.postMessage(message, HOST);
}

/** Selects `node`: it is reported, and it is the open node. */
function select(node: IdeaNode): void {
  const s = selectionOf(node);
  selected = node.key;
  state.open = node.key;
  post({ type: "os.select", label: s.label, quote: s.quote });
}

/** Clears the selection; `report` false when the workspace asked for it. The open node stays open. */
function unselect(report = true): void {
  const had = selected !== null;
  selected = null;
  if (report && had) post({ type: "os.select", label: null });
}

window.addEventListener("message", (event) => {
  if (!isHostClear(event, window.parent, HOST)) return;
  unselect(false);
  paint();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || selected === null) return;
  unselect();
  paint();
});

/** A click on a node: it opens and is selected; a second click clears the selection and leaves it open. */
function clickNode(key: string): void {
  const node = state.graph?.byKey.get(key);
  if (node === undefined) return;
  if (selected === key) unselect();
  else select(node);
  paint();
}

/** A link chip in the panel opens and selects the node it names, and brings it into view. */
function openNode(key: string): void {
  const node = state.graph?.byKey.get(key);
  if (node === undefined) return;
  if (selected !== key) select(node);
  paint();
  nodeEls.get(key)?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

// ---- reading through the channel ------------------------------------------------------

/** A file of the project, at most `max` bytes (one more, so the caller can tell a larger one). */
async function read(path: string, max: number): Promise<Read> {
  try {
    const res = await fetch(filesUrl(path), { cache: "no-store" });
    if (!res.ok) {
      void res.body?.cancel().catch(() => {});
      return { ok: false, status: res.status };
    }
    const { bytes, cut } = await readStart(res, max + 1);
    return { ok: true, bytes, cut };
  } catch {
    return { ok: false, status: 0 };
  }
}

// ---- the page -------------------------------------------------------------------------

const state = {
  gen: 0,
  graph: null as Graph | null,
  map: null as Layout | null,
  /** The node whose details show, by key; kept across a Reload while its ID is in the file. */
  open: null as string | null,
};

const bar = el("div", "subbar");
const count = el("span", "count");
const problemsBox = el("details", "problems");
const main = el("div", "idea-main");
const panel = el("section", "ndetail");
panel.setAttribute("aria-label", "Details");
panel.setAttribute("aria-live", "polite");
const canvas = el("div", "canvas");
canvas.setAttribute("aria-label", "Idea graph");
canvas.setAttribute("role", "region");
main.append(panel, canvas);

if (project !== null) {
  const reload = button("link reload", "Reload");
  reload.title = `Read ${FILE} and paper_skeleton.md again, as they are on disk now`;
  reload.addEventListener("click", () => void load());
  bar.append(el("span", "vt", FILE), el("span", "vpath", filePath(project)), count, el("span", "hint", "Select a node to see its links and ask the agent about it."), reload);
}

/** Puts `content` below the bar (and the problems, when there are any), moving nothing already in place. */
function show(content: HTMLElement, problems: HTMLElement | null): void {
  const want = [bar, ...(problems === null ? [] : [problems]), content];
  for (const child of [...app.children]) if (!want.includes(child as HTMLElement)) child.remove();
  want.forEach((node, i) => {
    if (app.children[i] !== node) app.insertBefore(node, app.children[i] ?? null);
  });
}

/** A screen in place of the map: no node is drawn, so none stays open or selected (null is posted if one was). */
function leave(content: HTMLElement): void {
  state.graph = null;
  state.map = null;
  state.open = null;
  unselect();
  count.textContent = "";
  show(content, null);
}

async function load(): Promise<void> {
  const gen = ++state.gen;
  // A Reload over the map keeps it on screen, and clickable, until both files are read again.
  if (main.parentNode !== app) show(el("div", "loading", "Loading…"), null);
  const [idea, skeleton] = await Promise.all([read(filePath(project!), READ_MAX), read(skeletonPath(project!), SKELETON_MAX)]);
  if (gen !== state.gen) return;
  if (!idea.ok) {
    const words = fileWords(idea.status, project!);
    leave(words === null ? emptyScreen() : screen(words, () => void load()));
    return;
  }
  const text = verdict(idea.bytes, idea.cut);
  if (text.kind !== "text") {
    leave(screen(contentWords(text.kind), () => void load()));
    return;
  }
  const built = buildGraph(parse(text.text), skeletonFrom(skeletonInput(skeleton)));
  if (built.kind === "no-table") {
    leave(noTableScreen(built));
    return;
  }
  render(built.graph);
}

function render(graph: Graph): void {
  const [left, top] = [canvas.scrollLeft, canvas.scrollTop];
  state.graph = graph;
  state.map = layout(
    graph.nodes.map((node) => node.kind),
    edgesOf(graph),
    legendRows(graph),
  );
  // The selection, clicked before or during this Reload: kept, and posted again, while its node is in the file.
  if (selected !== null) {
    const node = graph.byKey.get(selected);
    if (node !== undefined) select(node);
    else unselect();
  }
  if (state.open !== null && !graph.byKey.has(state.open)) state.open = null;
  count.textContent = barWords(graph);
  drawProblems(graph);
  drawMap(graph, state.map);
  paint();
  show(main, graph.problemCount > 0 ? problemsBox : null);
  fit();
  canvas.scrollLeft = left;
  canvas.scrollTop = top;
}

// ---- screens --------------------------------------------------------------------------

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

/** idea_graph.md answers 404: what the view draws, and the header line an agent writes. */
function emptyScreen(): HTMLElement {
  const words = emptyWords();
  const box = el("div", "placeholder");
  box.append(el("h4", "", words.title), el("p", "", words.text), el("pre", "header", words.header));
  return box;
}

/** No table with the expected header: what was searched, the expected header, the first one found. */
function noTableScreen(b: Extract<Built, { kind: "no-table" }>): HTMLElement {
  const words = noTableWords(b);
  const box = el("div", "placeholder");
  box.append(el("h4", "", words.title), el("p", "", words.text), el("p", "note", "The expected header:"), el("pre", "expected", words.expected), el("p", "found", words.found));
  for (const note of words.notes) box.append(el("p", "note", note));
  const again = button("btn", "Try again");
  again.addEventListener("click", () => void load());
  box.append(again);
  return box;
}

function drawProblems(graph: Graph): void {
  clear(problemsBox);
  const list = el("ul");
  for (const p of graph.problems) list.append(el("li", "", problemLine(p)));
  const more = moreWords(graph);
  if (more !== null) list.append(el("li", "more", more));
  problemsBox.append(el("summary", "", problemsTitle(graph.problemCount)), list);
}

// ---- the map: SVG drawn by the page, geometry from layout.ts --------------------------

const SVG_NS = "http://www.w3.org/2000/svg";
type SvgTag = "svg" | "g" | "path" | "foreignObject";
/** An SVG element of one of a few tags; its attributes are set by name below, never from a file. */
function svgEl<K extends SvgTag>(tag: K, cls = ""): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  if (cls !== "") node.setAttribute("class", cls);
  return node;
}
/** A foreignObject over `r`, which holds the page's own HTML. */
function box(r: Rect, child: HTMLElement): SVGForeignObjectElement {
  const fo = svgEl("foreignObject");
  fo.setAttribute("x", String(r.x));
  fo.setAttribute("y", String(r.y));
  fo.setAttribute("width", String(r.w));
  fo.setAttribute("height", String(r.h));
  fo.append(child);
  return fo;
}

let svgRoot: SVGSVGElement | null = null;
let labels: SVGGElement | null = null;
let nodeEls = new Map<string, HTMLButtonElement>();
let lineEls: SVGPathElement[] = [];

const absentKinds = (graph: Graph) => KINDS.filter((k) => !graph.nodes.some((node) => node.kind === k));
/** The legend's rows: the four words, the result's experiment (three short lines, a fourth when there is none), and each kind with no node. */
const legendRows = (graph: Graph) => WORDS.length + 3 + (graph.came.length === 0 ? 1 : 0) + absentKinds(graph).length;

function drawMap(graph: Graph, map: Layout): void {
  clear(canvas);
  nodeEls = new Map();
  lineEls = [];
  const svg = svgEl("svg", "gmap");
  svg.setAttribute("viewBox", `0 0 ${map.width} ${map.height}`);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Nodes and links");
  const lines = svgEl("g", "glines");
  for (const line of map.lines) {
    const path = svgEl("path", `ln ${WORD_CLASS.get(line.word)!}`);
    path.setAttribute("d", line.d);
    lines.append(path);
    lineEls.push(path);
  }
  svg.append(lines);
  for (const column of map.columns) {
    const head = el("div", "ghead");
    head.append(el("span", `kb ${KIND_CLASS[column.kind]}`, KIND_LETTER[column.kind]), document.createTextNode(`${KIND_TITLE[column.kind]} · ${n(column.count)}`));
    svg.append(box(column.head, head));
  }
  svg.append(box(map.legend, legend(graph)));
  for (const node of graph.nodes) {
    const b = button(`gnode ${KIND_CLASS[node.kind]}`);
    const top = el("span", "gn-top");
    top.append(el("span", `kb ${KIND_CLASS[node.kind]}`, node.id), el("span", statusClass(node.status), node.status));
    // One line of the statement's words; the box cuts it, and the panel shows it whole.
    const words = nodeWords(node.statement);
    b.append(top, el("span", "gn-tx", words));
    b.title = words;
    b.addEventListener("click", () => clickNode(node.key));
    nodeEls.set(node.key, b);
    svg.append(box(map.boxes[node.index]!, b));
  }
  labels = svgEl("g", "labels");
  svg.append(labels);
  svgRoot = svg;
  canvas.append(svg);
}

/** The legend: the four words (faint when no line has one), the result's experiment, and each kind with no node. */
function legend(graph: Graph): HTMLElement {
  const div = el("div", "glegend");
  div.append(el("b", "", "Lines"));
  const row = (word: string, text: string, none: boolean) => {
    const r = el("div", none ? "none" : "");
    const sample = svgEl("svg");
    sample.setAttribute("viewBox", "0 0 26 8");
    const path = svgEl("path", `lg ${WORD_CLASS.get(word)!}`);
    path.setAttribute("d", "M1 4H25");
    sample.append(path);
    r.append(sample, document.createTextNode(text));
    div.append(r);
  };
  for (const word of WORDS) {
    const none = !graph.links.some((l) => l.word === word);
    // "· none", as the kinds' rows say it: the mockup's "· none here" does not fit one column's width for "motivates".
    row(word, none ? `${word} · none` : word, none);
  }
  // §5.3 5: not a fifth link word, and named so, on short rows: the legend is one column wide.
  const noFrom = graph.came.length === 0;
  row("from", "the result's", noFrom);
  for (const text of ["experiment", "(from Points to)", ...(noFrom ? ["· none"] : [])]) div.append(el("div", noFrom ? "cont none" : "cont", text));
  for (const kind of absentKinds(graph)) {
    const r = el("div", "none");
    r.append(el("span", `kb ${KIND_CLASS[kind]}`, KIND_LETTER[kind]), document.createTextNode(`${KIND_TITLE[kind].toLowerCase()} · none`));
    div.append(r);
  }
  return div;
}

/** The map's size for the view's width: the scale between 0.8 and 1 (§5.3 6); taller maps scroll. */
function fit(): void {
  const map = state.map;
  if (map === null || svgRoot === null) return;
  const s = fitScale(canvas.clientWidth, map.width);
  svgRoot.setAttribute("width", String(Math.floor(map.width * s)));
  svgRoot.setAttribute("height", String(Math.floor(map.height * s)));
}
new ResizeObserver(() => fit()).observe(canvas);

/** Marks the open node, its neighbours, and its lines with their words; the selected node; and fills the panel. */
function paint(): void {
  const graph = state.graph;
  const map = state.map;
  if (graph === null || map === null || svgRoot === null || labels === null) return;
  const open = state.open === null ? null : (graph.byKey.get(state.open) ?? null);
  const near = new Set<number>();
  if (open !== null) {
    for (const line of map.lines) {
      if (line.a === open.index) near.add(line.b);
      if (line.b === open.index) near.add(line.a);
    }
  }
  svgRoot.classList.toggle("has-open", open !== null);
  for (const node of graph.nodes) {
    const b = nodeEls.get(node.key)!;
    b.classList.toggle("on", node === open);
    b.classList.toggle("near", near.has(node.index));
    b.classList.toggle("picked", node.key === selected);
  }
  clear(labels);
  map.lines.forEach((line, k) => {
    const hot = open !== null && (line.a === open.index || line.b === open.index);
    lineEls[k]!.classList.toggle("hot", hot);
    if (!hot) return;
    const at = labelPoint(line, open.index);
    const holder = el("div", "elabel-box");
    holder.append(el("span", `elabel ${WORD_CLASS.get(line.word)!}`, line.word === "from" ? "came from" : line.word));
    labels!.append(box({ x: at.x - 60, y: at.y - 10, w: 120, h: 20 }, holder));
  });
  renderPanel(graph, open);
}

// ---- the detail panel (§5.4) ----------------------------------------------------------

/** A node as a chip: its ID in its kind's colour, and `extra`; a click opens and selects it. */
function chip(node: IdeaNode, extra = ""): HTMLButtonElement {
  const b = button("lchip");
  b.append(el("span", `kb ${KIND_CLASS[node.kind]}`, node.id));
  if (extra !== "") b.append(document.createTextNode(extra));
  b.title = `${node.id} (${node.kind})`;
  b.addEventListener("click", () => openNode(node.key));
  return b;
}

function renderPanel(graph: Graph, open: IdeaNode | null): void {
  clear(panel);
  if (open === null) {
    panel.className = "ndetail";
    const s = summary(graph);
    const head = el("div", "nd-head");
    head.append(el("span", "nd-kind", "This project's graph"));
    const still = el("dd");
    if (s.open.length === 0) still.textContent = "—";
    for (const node of s.open) still.append(chip(node, ` ${node.status}`));
    const dl = el("dl", "nd-grid");
    dl.append(el("dt", "", STILL_OPEN), still, el("dt", "", "Claims"), el("dd", "", s.claims));
    panel.append(head, el("p", "nd-text", s.counts), dl, el("p", "nd-note nd-hint", "Select a node to read it in full, see its links and where it comes from, and ask the agent about it."));
    return;
  }
  panel.className = "ndetail has";
  const d = details(graph, open);
  const left = el("div", "nd-l");
  const head = el("div", "nd-head");
  head.append(el("span", `kb ${KIND_CLASS[open.kind]}`, open.id), el("span", "nd-kind", open.kind), el("span", statusClass(open.status), open.status));
  const text = el("p", "nd-text");
  text.append(...inlineNodes(inline(d.statement)));
  left.append(head, text);
  for (const note of d.notes) left.append(el("p", "nd-note", note));

  const links = el("dd");
  if (d.links.length === 0) links.textContent = "—";
  for (const group of d.links) {
    const g = el("span", "lgroup");
    g.append(el("span", "lw", group.label));
    for (const node of group.nodes) g.append(chip(node));
    links.append(g);
  }

  const points = el("dd");
  const p = d.points;
  if (p.chip !== null) {
    const line = el("div", "", "from: ");
    line.append(chip(p.chip));
    points.append(line);
  } else for (const line of p.lines) points.append(el("div", "", line));
  if (p.files.length > 0) {
    const list = el("ul", "files");
    for (const file of p.files) list.append(el("li", "", file));
    points.append(el("span", "lw", "Result files, not opened here"), list);
  }
  if (p.claim !== null) {
    const claim = el("p", "nd-claim");
    claim.append(...inlineNodes(inline(p.claim.text)));
    if (p.claim.status !== "") claim.append(document.createTextNode(" "), el("span", "st", markInvisible(p.claim.status)));
    points.append(claim);
  }
  if (p.problem !== null) points.append(el("p", "nd-problem", p.problem));
  if (points.childNodes.length === 0) points.textContent = "—";

  const source = el("dd");
  if (d.source === null) source.textContent = "—";
  else source.append(...inlineNodes(inline(d.source)));

  const dl = el("dl", "nd-grid");
  dl.append(el("dt", "", "Links"), links, el("dt", "", "Points to"), points, el("dt", "", "From the files"), source);
  panel.append(left, dl);
}

// ---- start ----------------------------------------------------------------------------

if (project === null) {
  app.append(screen(projectWords(location.search)));
} else {
  app.append(bar);
  void load();
}
