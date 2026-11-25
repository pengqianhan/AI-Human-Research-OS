/**
 * Skills Hub's page, the pure part (os-ui/PLUGINS.md Part 4): the app's
 * Skills page as it was in the trunk (src/pages/StorePage.tsx and the
 * components it used), ported word for word to a framed page that reads the
 * generator's snapshot through its own read channel. Every word on the page
 * is a constant here; logic.test.ts checks each against the file it comes
 * from, and the flattening, filter, and commands against src/lib/skills.ts.
 *
 * Pure: no DOM, no window, no network, so `npm test` runs it in Node. The
 * snapshot is untrusted text: parseSnapshot keeps only the fields the page
 * draws, each of the type it draws, and main.ts puts them on screen as text.
 */

// ---- what the page reads and calls -------------------------------------------------------

/** The generator's snapshot, the page's one read root (plugin.json `reads`; way R of Part 4 §2.2). */
export const STATE = "os-ui/frontend/public/state.json";
/** How often the page reads the snapshot again while the window shows, as the app does (src/useOsState.ts). */
export const POLL_MS = 5000;

// ---- the snapshot's skill list (src/types.ts, as the generator writes it) ------------------

export type SyncStatus = "synced" | "drift" | "not_installed" | "installed_no_hub_source";

/** One install location for one skill: the fields the page draws. */
export interface SkillInstall {
  target: string;
  ok: boolean;
  disabled: boolean;
  detail: string;
}

/** A registered install target (the installer's assets/targets.toml). */
export interface StoreTarget {
  name: string;
  path: string;
  display_path?: string;
  scope: string;
}

export interface StoreSkill {
  name: string;
  /** null when the SKILL.md has no description (generate.py writes None). */
  description: string | null;
  license: string | null;
  has_scripts: boolean;
  sync: string;
  install_form: string | null;
  installs: SkillInstall[];
}

export interface OrphanSkill {
  name: string;
  description: string | null;
  sync: string;
  installs: SkillInstall[];
}

export interface Store {
  collections: { name: string; skills: StoreSkill[] }[];
  orphans: OrphanSkill[];
  targets: StoreTarget[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string | null => (typeof v === "string" ? v : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function install(v: unknown): SkillInstall | null {
  if (!isObject(v) || typeof v.target !== "string") return null;
  return { target: v.target, ok: v.ok === true, disabled: v.disabled === true, detail: text(v.detail) ?? "" };
}

const installs = (v: unknown): SkillInstall[] => list(v).flatMap((i) => install(i) ?? []);

function target(v: unknown): StoreTarget | null {
  if (!isObject(v) || typeof v.name !== "string" || typeof v.scope !== "string") return null;
  const t: StoreTarget = { name: v.name, path: text(v.path) ?? "", scope: v.scope };
  if (typeof v.display_path === "string") t.display_path = v.display_path;
  return t;
}

function storeSkill(v: unknown): StoreSkill | null {
  if (!isObject(v) || typeof v.name !== "string") return null;
  return {
    name: v.name,
    description: text(v.description),
    license: text(v.license),
    has_scripts: v.has_scripts === true,
    sync: text(v.sync) ?? "",
    install_form: text(v.install_form),
    installs: installs(v.installs),
  };
}

function orphan(v: unknown): OrphanSkill | null {
  if (!isObject(v) || typeof v.name !== "string") return null;
  return { name: v.name, description: text(v.description), sync: text(v.sync) ?? "", installs: installs(v.installs) };
}

/** What reading the snapshot came to: the skill list, or why there is none. */
export type Snapshot = { ok: true; store: Store } | { ok: false; problem: "json" | "store" };

/**
 * The snapshot's `store`, with only the fields the page draws: an entry
 * without a name is left out, a missing list is empty, and a description
 * that is not text is null, as the trunk's page treated it (`?? ""`, `?? "—"`).
 */
export function parseSnapshot(raw: string): Snapshot {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, problem: "json" };
  }
  if (!isObject(data) || !isObject(data.store) || !Array.isArray(data.store.collections) || !Array.isArray(data.store.orphans)) {
    return { ok: false, problem: "store" };
  }
  const store = data.store;
  return {
    ok: true,
    store: {
      collections: list(store.collections).flatMap((c) =>
        isObject(c) && typeof c.name === "string" ? [{ name: c.name, skills: list(c.skills).flatMap((s) => storeSkill(s) ?? []) }] : [],
      ),
      orphans: list(store.orphans).flatMap((o) => orphan(o) ?? []),
      targets: list(store.targets).flatMap((t) => target(t) ?? []),
    },
  };
}

// ---- the list: src/lib/skills.ts ------------------------------------------------------------

/** Both hub skills and orphans, in one shape (src/lib/skills.ts DisplaySkill). */
export interface DisplaySkill {
  name: string;
  description: string | null;
  /** Collection name, or "no hub source" for orphans. */
  collection: string;
  license: string | null;
  hasScripts: boolean;
  sync: string;
  installForm: string | null;
  installs: SkillInstall[];
}

export const ORPHAN_COLLECTION_LABEL = "no hub source";

/** Every skill, the collections' in snapshot order, then the orphans (src/lib/skills.ts flattenStore). */
export function flattenStore(store: Store): DisplaySkill[] {
  const fromCollections = store.collections.flatMap((c) =>
    c.skills.map((s) => ({
      name: s.name,
      description: s.description,
      collection: c.name,
      license: s.license,
      hasScripts: s.has_scripts,
      sync: s.sync,
      installForm: s.install_form ?? null,
      installs: s.installs ?? [],
    })),
  );
  const fromOrphans = store.orphans.map((s) => ({
    name: s.name,
    description: s.description,
    collection: ORPHAN_COLLECTION_LABEL,
    license: null,
    hasScripts: false,
    sync: s.sync,
    installForm: null,
    installs: s.installs ?? [],
  }));
  return [...fromCollections, ...fromOrphans];
}

/**
 * The trunk's card key (StorePage.tsx), which is not unique: a collection can hold two skills with one
 * name (two folders at different depths, or, on a copy that replaced links by what they point at, a
 * collection's links to its own skills). The page finds a card by cardIds instead.
 */
export const keyOf = (skill: DisplaySkill) => `${skill.collection}/${skill.name}`;

/**
 * Each skill's card id, in the list's order: its collection, its name, and which of the skills with that
 * collection and name it is (1, 2, ...), as JSON, so no two skills share one and no name can spell
 * another's. Taken over the whole list, so a filter or a search never renumbers a card.
 */
export function cardIds(skills: readonly DisplaySkill[]): string[] {
  const seen = new Map<string, number>();
  return skills.map((s) => {
    const key = JSON.stringify([s.collection, s.name]);
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return JSON.stringify([s.collection, s.name, n]);
  });
}

export const ALL = "all";

/** The cards shown: one collection (or all), then the trimmed, lower-cased query in the name or description (StorePage.tsx). */
export function filterSkills(skills: readonly DisplaySkill[], activeFilter: string, query: string): DisplaySkill[] {
  return skills.filter((s) => {
    const matchesCollection = activeFilter === ALL || s.collection === activeFilter;
    if (!matchesCollection) return false;
    if (query.trim() === "") return true;
    const q = query.trim().toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
  });
}

/** The filter pills: All with every skill counted (orphans too), each collection in snapshot order, then the orphans' label. */
export function filterPills(store: Store, total: number): { value: string; label: string }[] {
  return [
    { value: ALL, label: `All · ${total}` },
    ...store.collections.map((c) => ({ value: c.name, label: c.name })),
    { value: ORPHAN_COLLECTION_LABEL, label: ORPHAN_COLLECTION_LABEL },
  ];
}

const INSTALLER_PATH = "research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py";

/** The command the panel shows and copies (src/lib/skills.ts installCommand). */
export function installCommand(skill: DisplaySkill): string {
  if (skill.sync === "installed_no_hub_source") return `python ${INSTALLER_PATH} status ${skill.name}`;
  return `python ${INSTALLER_PATH} install ${skill.name} --collection ${skill.collection}`;
}

export function copyButtonLabel(skill: DisplaySkill): string {
  return skill.sync === "installed_no_hub_source" ? "Copy status command" : "Copy install command";
}

/** The command that installs a skill at one target (src/lib/skills.ts installAtTargetCommand). */
export function installAtTargetCommand(skill: DisplaySkill, target: string): string {
  return `python ${INSTALLER_PATH} install ${skill.name} ` + `--collection ${skill.collection} --target ${target}`;
}

/** The toggle endpoint's pattern for a skill, target, or collection name (server/skillToggle.ts SAFE). */
export const SAFE_NAME = /^[A-Za-z0-9._:-]+$/;
/** Where the page offers no command: the page's own words (review of step 2.5, note 4). */
export const UNSAFE_COMMAND = "No command: a name here has characters a command cannot carry safely.";

/**
 * The panel's command as the page offers it: installCommand, or null when a name it carries (the name for
 * an orphan's status command; the name and the collection for an install command) is outside SAFE_NAME, so
 * no name goes unquoted into a command a user pastes into a terminal. Here the page leaves the trunk's,
 * which showed and copied any name.
 */
export function offeredCommand(skill: DisplaySkill): string | null {
  const carried = skill.sync === "installed_no_hub_source" ? [skill.name] : [skill.name, skill.collection];
  return carried.every((name) => SAFE_NAME.test(name)) ? installCommand(skill) : null;
}

/** A row's install command as the page offers it: installAtTargetCommand, or null when the name, the collection (an orphan's is "no hub source"), or the target is outside SAFE_NAME. */
export function offeredCommandAt(skill: DisplaySkill, target: string): string | null {
  return [skill.name, skill.collection, target].every((name) => SAFE_NAME.test(name)) ? installAtTargetCommand(skill, target) : null;
}

// ---- a card (src/components/SkillCard.tsx, SyncBadge.tsx, Badge.tsx) -----------------------

export type Tone = "ok" | "warn" | "mute";

/** SyncBadge.tsx LABELS and TONES. A sync the generator never writes shows an empty grey badge. */
export const SYNC_LABELS: ReadonlyMap<string, string> = new Map([
  ["synced", "installed · synced"],
  ["drift", "installed · drift ⚠"],
  ["not_installed", "not installed"],
  ["installed_no_hub_source", "installed · no hub source ⚠"],
]);
export const SYNC_TONES: ReadonlyMap<string, Tone> = new Map<string, Tone>([
  ["synced", "ok"],
  ["drift", "warn"],
  ["not_installed", "mute"],
  ["installed_no_hub_source", "warn"],
]);

export const UNKNOWN_LICENSE = "unknown (see upstream)";
export const HAS_SCRIPTS_TAG = "has scripts/ · inspect first";

/** What a card draws, as text. */
export function cardView(skill: DisplaySkill): { name: string; badge: string; tone: Tone; description: string; collection: string; license: string; scripts: boolean } {
  return {
    name: skill.name,
    badge: SYNC_LABELS.get(skill.sync) ?? "",
    tone: SYNC_TONES.get(skill.sync) ?? "mute",
    description: skill.description ?? "",
    collection: skill.collection,
    license: skill.license ?? UNKNOWN_LICENSE,
    scripts: skill.hasScripts,
  };
}

// ---- the panel (src/components/SkillDrawer.tsx) --------------------------------------------

export const PANEL_LABEL = "Skill details";
export const CLOSE = "Close";
export const NONE = "—";
export const DESCRIPTION = "Description";
export const INSTALLS = "Installs";
export const LICENSE = "license / upstream";
export const SCRIPTS = "Scripts";
export const HAS_SCRIPTS = "Has scripts/ - inspect them before installation";
export const NO_SCRIPTS = "No scripts; documentation-only skill";
export const COPIED = "Copied ✓";
export const COPY_FAILED = "Copy failed - select the command manually";
export const DEFAULT_COPY = "Copy install command";
/** The note under the copy button, as SkillDrawer.tsx renders its four lines. */
export const PANEL_NOTE =
  "This app does not install or delete skills; paste the command into a terminal. Its only write action is the per-location disable/enable above. AGENTS.md requires script review before installing third-party collected skills; this UI applies that warning to every skill with scripts/.";
/** How long a copy button's answer shows (SkillDrawer.tsx, SkillInstalls.tsx). */
export const ANSWER_MS = 1600;

/** What the panel draws for a skill, or for none (closed: every field a dash, as the trunk's drawer did); a command of null is one the page does not offer (offeredCommand). */
export function panelView(skill: DisplaySkill | null, copyLabel: string | null) {
  return {
    name: skill?.name ?? NONE,
    source: skill ? `Research-skills-hub / ${skill.collection}` : NONE,
    description: skill?.description ?? NONE,
    license: skill?.license ?? UNKNOWN_LICENSE,
    scripts: skill?.hasScripts ? HAS_SCRIPTS : NO_SCRIPTS,
    command: skill ? offeredCommand(skill) : NONE,
    copy: copyLabel ?? (skill ? copyButtonLabel(skill) : DEFAULT_COPY),
  };
}

// ---- the installs (src/components/SkillInstalls.tsx) ---------------------------------------

export const SCOPE_ORDER = ["repo", "global", "project"] as const;
export const NO_TARGETS = "Install locations are unavailable: the generator could not load research-skill-installer.";
export const FORM_UNKNOWN = "form unknown";
export const WORKING = "working...";
export const ENABLE = "enable";
export const DISABLE = "disable";
export const INSTALL_COPY = "install ⧉";
export const INSTALL_COPIED = "copied ✓";
export const INSTALL_TITLE = "Copy the install command for this target";
export const TOGGLE_FAILED = "toggle failed";
export const CLIPBOARD_UNAVAILABLE = "clipboard unavailable - copy the command manually";
/** The live note, around its <code>.disabled/</code>. */
export const LIVE_NOTE = ["Disable never deletes skill content: a linked install moves into the target's ", ".disabled/", ", a copied one renames its SKILL.md. Installing somewhere new is still a copied command."] as const;

export type Dot = "none" | "ok" | "bad";

/** One target's row: its dot, name, shown path, and the install there, if any. */
export interface InstallRow {
  target: string;
  path: string;
  dot: Dot;
  install: SkillInstall | null;
}

/** The Installs block for a skill over the snapshot's targets; null when there are none (NO_TARGETS). */
export function installsView(skill: DisplaySkill, targets: readonly StoreTarget[]): { form: string; count: string; groups: { scope: string; rows: InstallRow[]; details: string[] }[] } | null {
  if (targets.length === 0) return null;
  const byTarget = new Map<string, SkillInstall>(skill.installs.map((i) => [i.target, i]));
  return {
    form: skill.installForm ? `${skill.installForm} → hub` : FORM_UNKNOWN,
    count: `${skill.installs.length} of ${targets.length} installed`,
    groups: SCOPE_ORDER.flatMap((scope) => {
      const rows = targets.filter((t) => t.scope === scope);
      if (rows.length === 0) return [];
      return [
        {
          scope,
          rows: rows.map((t) => {
            const found = byTarget.get(t.name) ?? null;
            return { target: t.name, path: t.display_path ?? t.path, dot: found === null ? "none" : found.ok ? "ok" : "bad", install: found };
          }),
          details: rows.flatMap((t) => {
            const found = byTarget.get(t.name);
            return found && !found.ok ? [`${t.name}: ${found.detail}`] : [];
          }),
        },
      ];
    }),
  };
}

/** A row's button: the toggle where installed (its word, and aria-pressed = enabled), else the copy of an install command when the page offers one (`offered`), else none. */
export function rowAction(install: SkillInstall | null, working: boolean, copied: boolean, offered: boolean): { kind: "toggle"; label: string; pressed: boolean; enable: boolean } | { kind: "copy"; label: string } | { kind: "none" } {
  if (install === null) return offered ? { kind: "copy", label: copied ? INSTALL_COPIED : INSTALL_COPY } : { kind: "none" };
  return { kind: "toggle", label: working ? WORKING : install.disabled ? ENABLE : DISABLE, pressed: !install.disabled, enable: install.disabled };
}

/**
 * The toggle's request body, as the trunk's page sent it. An orphan sends its
 * collection, "no hub source", which the handler refuses ("bad collection
 * name: no hub source"): the second fault of Part 4 §1.7, kept as it is.
 */
export const toggleBody = (skill: DisplaySkill, target: string, enable: boolean) => JSON.stringify({ skill: skill.name, collection: skill.collection, target, enable });

/** The words a refused toggle shows: the answer's `error`, or "toggle failed". */
export function toggleError(body: unknown): string {
  const error = isObject(body) ? body.error : undefined;
  return error === undefined || error === null ? TOGGLE_FAILED : String(error);
}

// ---- the top: today's (Shell.tsx SkillsScreen) under mockup C's band (Q1, top C) ---------------

/** The band: the host's words for a plugin page (PluginScreen.tsx), from this plugin's plugin.json. */
export const BAND_NAME = "Skills Hub · bundled plugin";
export const BAND_DESCRIPTION = "The research skills hub and where each skill is installed; disable or enable one install.";
export const EYEBROW = "research-skills-hub/";
export const TITLE = "Skills";
export const LEDE =
  "The research skills hub and where each skill is installed. Installing copies a command for a terminal; the one change made here is disabling or enabling a single install.";

// ---- the bar (StorePage.tsx) -----------------------------------------------------------------

export const FILTER_LABEL = "Filter by collection";
export const SEARCH_PLACEHOLDER = "Search skills...";
export const SEARCH_LABEL = "Search skills";
export const NO_MATCH = "No matching skills.";

// ---- before the first snapshot (the page's own; the app shows its own screens first) -------------

export const LOADING = "Loading…";
export const TRY_AGAIN = "Try again";

/** Why there is no list yet: an answer of the read channel, a fetch that failed, or a snapshot without one. */
export function problemWords(problem: { status: number } | { kind: "json" | "store" | "unreachable" }): string {
  if ("status" in problem) return problem.status === 413 ? "The snapshot is too large to read here." : "No snapshot to show yet.";
  if (problem.kind === "json") return "The snapshot is not readable JSON.";
  if (problem.kind === "store") return "The snapshot has no skill list.";
  return "No snapshot to show yet.";
}
