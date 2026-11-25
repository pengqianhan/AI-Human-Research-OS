/**
 * Skills Hub's page (os-ui/PLUGINS.md Part 4), the app's Skills left-menu
 * page, framed on its own origin, app://skills-hub. It is the trunk's Skills
 * page (src/pages/StorePage.tsx, SkillCard, SkillDrawer, SkillInstalls) as it
 * worked, in plain DOM, under mockup C's band (the Human Owner's top C):
 *
 * - it reads the generator's snapshot through its read channel, again every
 *   5 s while the window shows and at once after a toggle, keeping the last
 *   good list when a read fails;
 * - its one write is the toggle, a JSON POST to its own handler
 *   (/api/skills-hub/toggle), which runs research-skill-installer;
 * - the details panel and its shading cover this page only (panel 1); the
 *   app keeps the frame while another page shows, so an open panel is still
 *   open on return.
 *
 * Today's three small faults are kept as they were (Q4; Part 4 §1.7): the open
 * panel shows the skill as it was when its card was clicked, so after a toggle
 * its row says the old word until the panel is opened again (F1, see
 * shownSkill); an orphan's row offers a toggle the handler refuses (F2); and
 * Escape closes the panel without returning the focus to the card (F3).
 *
 * Snapshot text (names, descriptions, licences, paths) goes on screen as text
 * only, through site-kit's el and button; a class comes from a fixed map.
 */
import { button, clear, el, filesUrl, icon } from "../../site-kit.ts";
import {
  ALL,
  ANSWER_MS,
  BAND_DESCRIPTION,
  BAND_NAME,
  cardIds,
  cardView,
  CLIPBOARD_UNAVAILABLE,
  CLOSE,
  COPIED,
  COPY_FAILED,
  DESCRIPTION,
  EYEBROW,
  FILTER_LABEL,
  filterPills,
  filterSkills,
  flattenStore,
  HAS_SCRIPTS_TAG,
  installAtTargetCommand,
  installCommand,
  INSTALL_TITLE,
  INSTALLS,
  installsView,
  LEDE,
  LICENSE,
  LIVE_NOTE,
  LOADING,
  NO_MATCH,
  NO_TARGETS,
  PANEL_LABEL,
  PANEL_NOTE,
  panelView,
  parseSnapshot,
  POLL_MS,
  problemWords,
  rowAction,
  SCRIPTS,
  SEARCH_LABEL,
  SEARCH_PLACEHOLDER,
  STATE,
  TITLE,
  toggleBody,
  toggleError,
  TRY_AGAIN,
} from "./logic.ts";
import type { DisplaySkill, Dot, InstallRow, Store, Tone } from "./logic.ts";

/** A badge's class by its tone, and a dot's by its state: fixed words, never snapshot text. */
const TONE_CLASS: Readonly<Record<Tone, string>> = { ok: "badge ok", warn: "badge warn", mute: "badge mute" };
const DOT_CLASS: Readonly<Record<Dot, string>> = { none: "idot none", ok: "idot ok", bad: "idot bad" };

const app = document.getElementById("app")!;

// ---- what the page holds -------------------------------------------------------------------

/** The last good skill list, and its text, so an unchanged snapshot draws nothing again. */
let store: Store | null = null;
let storeText = "";
let skills: DisplaySkill[] = [];
/**
 * Each card's skill as the list has it now, by the card's id (cardIds): a click opens the skill as it is
 * now (StorePage's onOpen). Two skills can share a collection and name, so a card is never found by them.
 */
let current = new Map<string, DisplaySkill>();
/** Each skill of the list's card id. */
let idOf = new Map<DisplaySkill, string>();
let activeFilter = ALL;
let query = "";

/** The panel: the skill captured when its card was clicked, and the card's id, to give it the focus back. */
let open: DisplaySkill | null = null;
let triggerId: string | null = null;
/** Bumped at each opening, so an answer for a panel since closed changes nothing on it. */
let openGen = 0;
let busy: string | null = null;
let error: string | null = null;
let copied: string | null = null;
let copyLabel: string | null = null;
let copyTimer: number | undefined;

/**
 * The skill the open panel shows. F1 is kept: the object captured at the
 * click, whatever the snapshot says since. The fix, if the Human Owner asks
 * for it, is this line alone:
 *   return open === null ? null : (current.get(triggerId!) ?? open);
 */
function shownSkill(): DisplaySkill | null {
  return open;
}

// ---- the top and the bar, drawn once ----------------------------------------------------------

const page = el("div", "page");
const band = el("div", "band");
const bandText = el("span", "txt");
bandText.title = BAND_DESCRIPTION;
bandText.append(el("b", "", BAND_NAME), ` — ${BAND_DESCRIPTION}`);
band.append(icon("puzzle", "sm"), bandText);
const head = el("div", "head");
const headText = el("div");
headText.append(el("div", "eyebrow", EYEBROW), el("h1", "page-title", TITLE), el("p", "lede", LEDE));
head.append(headText);

const body = el("section", "store");
const bar = el("div", "store-bar");
bar.setAttribute("role", "group");
bar.setAttribute("aria-label", FILTER_LABEL);
const pills = el("span", "pills");
const search = el("input", "search");
search.type = "search";
search.placeholder = SEARCH_PLACEHOLDER;
search.setAttribute("aria-label", SEARCH_LABEL);
bar.append(pills, search);
const grid = el("div", "cards");
const empty = el("p", "empty", NO_MATCH);
const status = el("div", "status");
page.append(band, head, body);

// ---- the panel, drawn once and filled per skill ------------------------------------------------

const scrim = el("div", "scrim");
scrim.setAttribute("aria-hidden", "true");
scrim.hidden = true;
const drawer = el("aside", "drawer");
drawer.setAttribute("role", "dialog");
drawer.setAttribute("aria-modal", "true");
drawer.setAttribute("aria-label", PANEL_LABEL);
drawer.setAttribute("aria-hidden", "true");
const closeButton = button("close btn btn-sm", CLOSE);
const dName = el("h3", "d-name");
const dSource = el("div", "d-src");
const dList = el("dl", "d-list");
const dDescription = el("dd", "d-desc");
const dInstalls = el("dd");
const dLicense = el("dd");
const dScripts = el("dd");
dList.append(el("dt", "label", DESCRIPTION), dDescription, el("dt", "label", INSTALLS), dInstalls, el("dt", "label", LICENSE), dLicense, el("dt", "label", SCRIPTS), dScripts);
const dCommand = el("div", "cmd cmd-block");
const copyButton = button("copy-btn btn btn-primary");
copyButton.setAttribute("aria-live", "polite");
drawer.append(closeButton, dName, dSource, dList, dCommand, copyButton, el("p", "note", PANEL_NOTE));
// The page scrolls in a box of its own, under the panel and its shading, as the mockup draws it: fixed to the
// frame, they then cover the scrollbar too, as the trunk's drawer covered the page's.
const scroller = el("div", "scroller");
scroller.append(page);
app.append(scroller, scrim, drawer);

// ---- the snapshot -------------------------------------------------------------------------------

/** Bumped by each read, so a read that answers after a later one changes nothing. */
let readGen = 0;

async function load(): Promise<void> {
  const gen = ++readGen;
  let res: Response;
  try {
    res = await fetch(filesUrl(STATE), { cache: "no-store" });
  } catch {
    if (gen === readGen) failed({ kind: "unreachable" });
    return;
  }
  if (!res.ok) {
    void res.body?.cancel().catch(() => {});
    if (gen === readGen) failed({ status: res.status });
    return;
  }
  let raw: string;
  try {
    raw = await res.text();
  } catch {
    if (gen === readGen) failed({ kind: "unreachable" });
    return;
  }
  if (gen !== readGen) return;
  const snapshot = parseSnapshot(raw);
  if (!snapshot.ok) {
    failed({ kind: snapshot.problem });
    return;
  }
  const next = JSON.stringify(snapshot.store);
  if (next === storeText) return;
  storeText = next;
  store = snapshot.store;
  showStore();
}

/** Before the first good snapshot, why there is none; after it, the last good list stays (src/useOsState.ts). */
function failed(problem: Parameters<typeof problemWords>[0]): void {
  if (store !== null) return;
  clear(status);
  const again = button("btn btn-sm", TRY_AGAIN);
  again.addEventListener("click", () => void load());
  status.append(el("p", "empty", problemWords(problem)), again);
  body.replaceChildren(status);
}

function poll(): void {
  window.setTimeout(async () => {
    if (!document.hidden) await load();
    poll();
  }, POLL_MS);
}

// ---- the list --------------------------------------------------------------------------------

function showStore(): void {
  skills = flattenStore(store!);
  const ids = cardIds(skills);
  idOf = new Map(skills.map((s, i) => [s, ids[i]!]));
  current = new Map(skills.map((s, i) => [ids[i]!, s]));
  if (bar.parentNode !== body) body.replaceChildren(bar, grid);
  renderPills();
  renderGrid();
  if (open !== null) renderInstalls();
}

/** The pills' words last drawn: a new list of collections draws them again; otherwise only which one is pressed changes. */
let pillWords = "";
const pillButtons = new Map<string, HTMLButtonElement>();

function renderPills(): void {
  const wanted = filterPills(store!, skills.length);
  const words = JSON.stringify(wanted);
  if (words !== pillWords) {
    pillWords = words;
    pillButtons.clear();
    clear(pills);
    for (const { value, label } of wanted) {
      const pill = button("fpill", label);
      pill.addEventListener("click", () => {
        activeFilter = value;
        renderPills();
        renderGrid();
      });
      pillButtons.set(value, pill);
      pills.append(pill);
    }
  }
  for (const [value, pill] of pillButtons) pill.setAttribute("aria-pressed", String(activeFilter === value));
}

/** Each card drawn, by id, with the words it shows: a card whose words did not change is kept, focus and all. */
const cards = new Map<string, { words: string; node: HTMLButtonElement }>();

function card(skill: DisplaySkill): HTMLButtonElement {
  const id = idOf.get(skill)!;
  const view = cardView(skill);
  const words = JSON.stringify(view);
  const kept = cards.get(id);
  if (kept !== undefined && kept.words === words) return kept.node;
  const node = button("skill card-flat");
  const top = el("span", "top");
  top.append(el("span", "nm", view.name), el("span", TONE_CLASS[view.tone], view.badge));
  const foot = el("span", "foot");
  foot.append(el("span", "tag", view.collection), el("span", "tag m", view.license));
  if (view.scripts) foot.append(el("span", "tag w", HAS_SCRIPTS_TAG));
  node.append(top, el("span", "desc", view.description), foot);
  node.addEventListener("click", () => {
    const now = current.get(id);
    if (now !== undefined) openPanel(now, id);
  });
  cards.set(id, { words, node });
  return node;
}

function renderGrid(): void {
  const shown = filterSkills(skills, activeFilter, query);
  if (shown.length === 0) {
    if (empty.parentNode !== body) grid.replaceWith(empty);
    return;
  }
  if (grid.parentNode !== body) empty.replaceWith(grid);
  const nodes = shown.map(card);
  // Only cards out of place move, so the focused card stays where it is unless it changed.
  nodes.forEach((node, i) => {
    if (grid.children[i] !== node) grid.insertBefore(node, grid.children[i] ?? null);
  });
  while (grid.children.length > nodes.length) grid.lastElementChild!.remove();
  const ids = new Set(shown.map((s) => idOf.get(s)));
  for (const id of [...cards.keys()]) if (!ids.has(id) && !current.has(id)) cards.delete(id);
}

search.addEventListener("input", () => {
  query = search.value;
  renderGrid();
});

// ---- the panel --------------------------------------------------------------------------------

function openPanel(skill: DisplaySkill, id: string): void {
  const wasOpen = open !== null;
  open = skill;
  triggerId = id;
  if (!wasOpen) {
    openGen++;
    busy = null;
    error = null;
    copied = null;
    copyLabel = null;
  }
  renderPanel();
  scrim.hidden = false;
  drawer.className = "drawer open";
  drawer.setAttribute("aria-hidden", "false");
  if (!wasOpen) closeButton.focus();
}

/** Close and the shading give the focus back to the card; Escape does not (F3, as the trunk's drawer). */
function closePanel(returnFocus: boolean): void {
  if (open === null) return;
  open = null;
  renderPanel();
  scrim.hidden = true;
  drawer.className = "drawer";
  drawer.setAttribute("aria-hidden", "true");
  if (returnFocus && triggerId !== null) cards.get(triggerId)?.node.focus();
}

closeButton.addEventListener("click", () => closePanel(true));
scrim.addEventListener("click", () => closePanel(true));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && open !== null) closePanel(false);
});

function renderPanel(): void {
  const skill = shownSkill();
  const view = panelView(skill, copyLabel);
  dName.textContent = view.name;
  dSource.textContent = view.source;
  dDescription.textContent = view.description;
  dLicense.textContent = view.license;
  dScripts.textContent = view.scripts;
  dCommand.textContent = view.command;
  copyButton.textContent = view.copy;
  renderInstalls();
}

copyButton.addEventListener("click", async () => {
  const skill = shownSkill();
  if (skill === null) return;
  try {
    await navigator.clipboard.writeText(installCommand(skill));
    copyLabel = COPIED;
  } catch {
    copyLabel = COPY_FAILED;
  }
  copyButton.textContent = panelView(shownSkill(), copyLabel).copy;
  window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    copyLabel = null;
    copyButton.textContent = panelView(shownSkill(), copyLabel).copy;
  }, ANSWER_MS);
});

// ---- the installs: drawn per skill and per list of targets, their buttons updated in place --------

/** What the installs block was drawn for: a new skill or new targets draw it again. */
let installsFor: { skill: DisplaySkill | null; targets: string } = { skill: null, targets: "" };
const rowButtons = new Map<string, { row: InstallRow; node: HTMLButtonElement }>();
const errorLine = el("p", "ierr");

function renderInstalls(): void {
  const skill = shownSkill();
  const targets = store?.targets ?? [];
  const targetWords = JSON.stringify(targets);
  if (skill !== installsFor.skill || targetWords !== installsFor.targets) {
    installsFor = { skill, targets: targetWords };
    drawInstalls(skill);
  }
  updateInstalls();
}

function drawInstalls(skill: DisplaySkill | null): void {
  rowButtons.clear();
  clear(dInstalls);
  if (skill === null) {
    dInstalls.textContent = "—";
    return;
  }
  const view = installsView(skill, store?.targets ?? []);
  if (view === null) {
    dInstalls.append(el("p", "inone", NO_TARGETS));
    return;
  }
  const box = el("div", "inst");
  const headRow = el("div", "inst-head");
  headRow.append(el("span", "", view.form), el("span", "", view.count));
  box.append(headRow);
  for (const group of view.groups) {
    const scope = el("div", "scope");
    scope.append(el("div", "label", group.scope));
    for (const row of group.rows) {
      const line = el("div", "irow");
      const dot = el("span", DOT_CLASS[row.dot]);
      dot.setAttribute("aria-hidden", "true");
      const name = el("span", "iname", row.target);
      name.append(el("span", "ipath", row.path));
      const action = button(row.install === null ? "btn btn-sm btn-ghost" : "btn btn-sm");
      if (row.install === null) action.title = INSTALL_TITLE;
      action.addEventListener("click", () => (row.install === null ? void copyAt(skill, row.target) : void toggle(skill, row.target, row.install.disabled)));
      rowButtons.set(row.target, { row, node: action });
      line.append(dot, name, action);
      scope.append(line);
    }
    for (const detail of group.details) scope.append(el("p", "idetail", detail));
    box.append(scope);
  }
  const live = el("p", "ilive", LIVE_NOTE[0]);
  live.append(el("code", "", LIVE_NOTE[1]), LIVE_NOTE[2]);
  box.append(errorLine, live);
  dInstalls.append(box);
}

/** Each row's word and state, and the error line, from busy, copied, and error. */
function updateInstalls(): void {
  for (const { row, node } of rowButtons.values()) {
    const action = rowAction(row.install, busy === row.target, copied === row.target);
    if (node.textContent !== action.label) node.textContent = action.label;
    if (action.kind === "toggle") {
      node.disabled = busy === row.target;
      node.setAttribute("aria-pressed", String(action.pressed));
    }
  }
  errorLine.textContent = error ?? "";
  errorLine.hidden = error === null;
}

/** Disable or enable one install. On success the snapshot is read again at once; the open panel keeps its word (F1). */
async function toggle(skill: DisplaySkill, target: string, enable: boolean): Promise<void> {
  const gen = openGen;
  busy = target;
  error = null;
  updateInstalls();
  let failure: string | null = null;
  try {
    const res = await fetch("/api/skills-hub/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: toggleBody(skill, target, enable) });
    const answer: unknown = await res.json();
    if (!res.ok) failure = toggleError(answer);
    else void load();
  } catch (e) {
    failure = String(e);
  }
  // A panel opened since starts afresh, as the trunk's did: this answer is not its own.
  if (gen !== openGen) return;
  busy = null;
  error = failure;
  if (open !== null) updateInstalls();
}

async function copyAt(skill: DisplaySkill, target: string): Promise<void> {
  const gen = openGen;
  let ok = true;
  try {
    await navigator.clipboard.writeText(installAtTargetCommand(skill, target));
  } catch {
    ok = false;
  }
  if (gen !== openGen) return;
  if (ok) {
    copied = target;
    window.setTimeout(() => {
      if (gen !== openGen) return;
      copied = null;
      if (open !== null) updateInstalls();
    }, ANSWER_MS);
  } else {
    error = CLIPBOARD_UNAVAILABLE;
  }
  if (open !== null) updateInstalls();
}

// ---- start ------------------------------------------------------------------------------------

status.append(el("p", "empty", LOADING));
body.append(status);
renderPanel();
void load();
poll();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void load();
});
