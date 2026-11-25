/**
 * Skills Hub's page logic against the trunk's Skills page it replaces
 * (os-ui/PLUGINS.md Part 4, §1 and §5 C2): the same list, filter, and
 * commands as src/lib/skills.ts and StorePage.tsx on a store with every case
 * the generator writes, and every word as a literal of the file it comes
 * from. Sources are read with whitespace collapsed, as JSX joins text lines.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import * as today from "../../../src/lib/skills.ts";
import type { Store as TodayStore } from "../../../src/types.ts";
import { skillToggleApi } from "../../../server/skillToggle.ts";
import { context, fakeRunner, request, tempTree } from "../../../server/testkit.ts";
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
  copyButtonLabel,
  DEFAULT_COPY,
  DESCRIPTION,
  DISABLE,
  ENABLE,
  EYEBROW,
  FILTER_LABEL,
  filterPills,
  filterSkills,
  flattenStore,
  FORM_UNKNOWN,
  HAS_SCRIPTS,
  HAS_SCRIPTS_TAG,
  installAtTargetCommand,
  installCommand,
  INSTALL_COPIED,
  INSTALL_COPY,
  INSTALL_TITLE,
  INSTALLS,
  installsView,
  keyOf,
  LEDE,
  LICENSE,
  LIVE_NOTE,
  LOADING,
  NO_MATCH,
  NO_SCRIPTS,
  NO_TARGETS,
  NONE,
  ORPHAN_COLLECTION_LABEL,
  PANEL_LABEL,
  PANEL_NOTE,
  panelView,
  parseSnapshot,
  POLL_MS,
  problemWords,
  rowAction,
  SCOPE_ORDER,
  SCRIPTS,
  SEARCH_LABEL,
  SEARCH_PLACEHOLDER,
  STATE,
  SYNC_LABELS,
  SYNC_TONES,
  TITLE,
  toggleBody,
  toggleError,
  TOGGLE_FAILED,
  UNKNOWN_LICENSE,
  WORKING,
} from "./logic.ts";
import type { DisplaySkill, Store } from "./logic.ts";

const SITE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(SITE, "../../..");
/** A source file of the frontend, whitespace collapsed (JSX joins a text's lines with one space). */
const source = (rel: string) => readFileSync(join(FRONTEND, rel), "utf8").replace(/\s+/g, " ");

/** A store as the generator writes it (generate.py build_store): every sync, a null description, a skill and an orphan without installs, a scope the page does not show. */
const RAW = {
  collections: [
    {
      name: "alpha-skills",
      skills: [
        {
          name: "paper-search",
          description: "Search papers across sources.",
          license: "MIT",
          has_scripts: true,
          installed: { ".claude/skills": true, ".agents/skills": true },
          sync: "synced",
          install_form: "symlink",
          installs: [
            { target: "repo-claude", scope: "repo", agent: "claude", path: "/w/.claude/skills/paper-search", form: "symlink", ok: true, disabled: false, detail: "" },
            { target: "repo-codex", scope: "repo", agent: "codex", path: "/w/.agents/skills/paper-search", form: "symlink", ok: true, disabled: true, detail: "" },
          ],
        },
        {
          name: "Drifted",
          description: null,
          license: "see LICENSE",
          has_scripts: false,
          installed: { ".claude/skills": true, ".agents/skills": false },
          sync: "drift",
          install_form: "symlink",
          installs: [{ target: "global-claude", scope: "global", agent: "claude", path: "/h/.claude/skills/Drifted", form: "copy", ok: false, disabled: false, detail: "should be a symlink" }],
        },
        { name: "unplaced", description: "Never installed; its SEARCH words.", license: "unknown", has_scripts: false, installed: {}, sync: "not_installed" },
      ],
    },
    {
      name: "beta-copy",
      skills: [
        {
          name: "e2e-copied",
          description: "A copy-form skill.",
          license: "Apache-2.0",
          has_scripts: true,
          installed: { ".claude/skills": true, ".agents/skills": false },
          sync: "drift",
          install_form: "copy",
          installs: [{ target: "repo-claude", scope: "repo", agent: "claude", path: "/w/.claude/skills/e2e-copied", form: "copy", ok: true, disabled: false, detail: "" }],
        },
      ],
    },
    { name: "empty-collection", skills: [] },
  ],
  orphans: [
    // Found in .claude/skills or .agents/skills: no installs (generate.py, the first orphan loop).
    { name: "repo-orphan", description: "An orphan in the repository's folders.", installed: { ".claude/skills": true }, sync: "installed_no_hub_source" },
    // Found by the installer's scan in another target: its installs, always "enabled".
    {
      name: "e2e-orphan",
      description: "",
      installed: {},
      sync: "installed_no_hub_source",
      installs: [{ target: "project-claude:demo", scope: "project", agent: "claude", path: "/w/projects-folder/demo/.claude/skills/e2e-orphan", form: "copy", ok: true, disabled: false, detail: "no hub source (orphan install)" }],
    },
  ],
  targets: [
    { name: "repo-claude", path: "/w/.claude/skills", display_path: ".claude/skills", scope: "repo", agent: "claude", default: true, exists: true },
    { name: "repo-codex", path: "/w/.agents/skills", display_path: ".agents/skills", scope: "repo", agent: "codex", default: true, exists: true },
    { name: "global-claude", path: "/h/.claude/skills", display_path: "~/.claude/skills", scope: "global", agent: "claude", default: false, exists: true },
    { name: "project-claude:demo", path: "/w/projects-folder/demo/.claude/skills", scope: "project", agent: "claude", default: false, exists: false },
    { name: "elsewhere", path: "/x", display_path: "/x", scope: "machine", agent: "other", default: false, exists: false },
  ],
};

const parsed = (raw: unknown = RAW): Store => {
  const result = parseSnapshot(JSON.stringify({ meta: {}, store: raw }));
  assert.ok(result.ok, JSON.stringify(result));
  return result.store;
};
/** The trunk's list for the same store, its installs cut to the four fields the page draws. */
const todayList = () =>
  today.flattenStore(RAW as unknown as TodayStore).map((s) => ({ ...s, installs: s.installs.map(({ target, ok, disabled, detail }) => ({ target, ok, disabled, detail })) }));
const skill = (name: string): DisplaySkill => flattenStore(parsed()).find((s) => s.name === name)!;

describe("the same list, filter, and commands as the trunk's page", () => {
  test("flattenStore: the collections' skills in snapshot order, then the orphans, field for field", () => {
    assert.deepEqual(flattenStore(parsed()), todayList());
    assert.deepEqual(flattenStore(parsed()).map(keyOf), ["alpha-skills/paper-search", "alpha-skills/Drifted", "alpha-skills/unplaced", "beta-copy/e2e-copied", "no hub source/repo-orphan", "no hub source/e2e-orphan"]);
    assert.equal(ORPHAN_COLLECTION_LABEL, today.ORPHAN_COLLECTION_LABEL);
  });

  test("two skills with one key are two cards: each card's id is its skill's place among the skills with that collection and name", () => {
    // A collection can hold two skills with one name: two folders at different depths (the end-to-end fixture e2e-twins),
    // or, on a copy that replaced links by what they point at, a collection's links to its own skills (Windows CI, step 2.5).
    const raw = {
      collections: [
        { name: "c", skills: [{ name: "x", description: "one" }, { name: "x", description: "one" }, { name: "y" }, { name: "x", description: "two" }, { name: "x/y" }] },
        { name: "c/x", skills: [{ name: "y" }] },
      ],
      orphans: [{ name: "x" }, { name: "x" }],
    };
    const list = flattenStore(parsed(raw));
    assert.deepEqual(list.map(keyOf), ["c/x", "c/x", "c/y", "c/x", "c/x/y", "c/x/y", "no hub source/x", "no hub source/x"], "the trunk's key repeats");
    const ids = cardIds(list);
    assert.equal(ids.length, list.length);
    assert.equal(new Set(ids).size, list.length, "one id per skill");
    assert.deepEqual(ids.map((id) => JSON.parse(id)), [["c", "x", 1], ["c", "x", 2], ["c", "y", 1], ["c", "x", 3], ["c", "x/y", 1], ["c/x", "y", 1], ["no hub source", "x", 1], ["no hub source", "x", 2]]);
    // The same snapshot gives the same ids, so a card is kept across the 5 s reads.
    assert.deepEqual(cardIds(flattenStore(parsed(raw))), ids);
    assert.deepEqual(cardIds([]), []);
  });

  test("filterSkills is StorePage's filter: a collection, then the trimmed, lower-cased query in the name or description", () => {
    // StorePage.tsx's filter, as it is written there (checked below), run on the trunk's list.
    const storePage = (all: ReturnType<typeof todayList>, activeFilter: string, query: string) =>
      all.filter((s) => {
        const matchesCollection = activeFilter === ALL || s.collection === activeFilter;
        if (!matchesCollection) return false;
        if (query.trim() === "") return true;
        const q = query.trim().toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
      });
    const page = source("src/pages/StorePage.tsx");
    for (const line of [
      "const matchesCollection = activeFilter === ALL || s.collection === activeFilter;",
      'if (query.trim() === "") return true;',
      "const q = query.trim().toLowerCase();",
      's.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q)',
      'const ALL = "all";',
    ]) {
      assert.ok(page.includes(line), `StorePage.tsx: ${line}`);
    }
    const list = flattenStore(parsed());
    for (const filter of [ALL, "alpha-skills", "beta-copy", ORPHAN_COLLECTION_LABEL, "empty-collection", "gone"]) {
      for (const query of ["", "   ", "paper", " PAPER ", "search", "drifted", "copy", "orphan", "zzz", "sources."]) {
        assert.deepEqual(filterSkills(list, filter, query).map(keyOf), storePage(todayList(), filter, query).map((s) => `${s.collection}/${s.name}`), `${filter} / "${query}"`);
      }
    }
    assert.deepEqual(filterSkills(list, ALL, "nonsense").length, 0);
  });

  test("the commands and the copy button's word, for every skill and target", () => {
    const list = flattenStore(parsed());
    const old = today.flattenStore(RAW as unknown as TodayStore);
    list.forEach((s, i) => {
      const t = old[i]!;
      assert.equal(installCommand(s), today.installCommand(t), s.name);
      assert.equal(copyButtonLabel(s), today.copyButtonLabel(t), s.name);
      for (const target of RAW.targets) assert.equal(installAtTargetCommand(s, target.name), today.installAtTargetCommand(t, target.name), `${s.name} at ${target.name}`);
    });
    assert.equal(installCommand(skill("e2e-orphan")), "python research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py status e2e-orphan");
    assert.equal(installCommand(skill("e2e-copied")), "python research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install e2e-copied --collection beta-copy");
  });

  test("the filter pills: All counts the orphans too, one per collection in snapshot order, then no hub source", () => {
    const store = parsed();
    assert.deepEqual(filterPills(store, flattenStore(store).length), [
      { value: ALL, label: "All · 6" },
      { value: "alpha-skills", label: "alpha-skills" },
      { value: "beta-copy", label: "beta-copy" },
      { value: "empty-collection", label: "empty-collection" },
      { value: ORPHAN_COLLECTION_LABEL, label: ORPHAN_COLLECTION_LABEL },
    ]);
    assert.ok(source("src/pages/StorePage.tsx").includes("All · {allSkills.length}"));
  });
});

describe("a card", () => {
  test("the badge's words and tones are SyncBadge.tsx's", () => {
    const badge = readFileSync(join(FRONTEND, "src/components/SyncBadge.tsx"), "utf8");
    const map = (name: string) =>
      Object.fromEntries([...badge.slice(badge.indexOf(`const ${name}`), badge.indexOf("};", badge.indexOf(`const ${name}`))).matchAll(/(\w+): "([^"]*)"/g)].map((m) => [m[1]!, m[2]!]));
    assert.deepEqual(Object.fromEntries(SYNC_LABELS), map("LABELS"));
    assert.deepEqual(Object.fromEntries(SYNC_TONES), map("TONES"));
    assert.equal(Object.keys(map("LABELS")).length, 4);
  });

  test("what a card shows: a null description is empty, a missing licence is SkillCard's words, a sync never written is an empty grey badge", () => {
    assert.deepEqual(cardView(skill("paper-search")), { name: "paper-search", badge: "installed · synced", tone: "ok", description: "Search papers across sources.", collection: "alpha-skills", license: "MIT", scripts: true });
    assert.deepEqual(cardView(skill("Drifted")), { name: "Drifted", badge: "installed · drift ⚠", tone: "warn", description: "", collection: "alpha-skills", license: "see LICENSE", scripts: false });
    assert.deepEqual(cardView(skill("e2e-orphan")), { name: "e2e-orphan", badge: "installed · no hub source ⚠", tone: "warn", description: "", collection: "no hub source", license: UNKNOWN_LICENSE, scripts: false });
    assert.deepEqual(cardView({ ...skill("unplaced"), sync: "constructor" }).badge, "");
    assert.equal(cardView({ ...skill("unplaced"), sync: "constructor" }).tone, "mute");
  });
});

describe("the panel and its installs", () => {
  test("closed, every field is a dash, as the trunk's drawer drew it while it slid away", () => {
    assert.deepEqual(panelView(null, null), { name: NONE, source: NONE, description: NONE, license: UNKNOWN_LICENSE, scripts: NO_SCRIPTS, command: NONE, copy: DEFAULT_COPY });
    assert.deepEqual(panelView(skill("Drifted"), null), {
      name: "Drifted",
      source: "Research-skills-hub / alpha-skills",
      description: NONE,
      license: "see LICENSE",
      scripts: NO_SCRIPTS,
      command: installCommand(skill("Drifted")),
      copy: "Copy install command",
    });
    assert.equal(panelView(skill("paper-search"), COPIED).copy, COPIED);
    assert.equal(panelView(skill("paper-search"), null).scripts, HAS_SCRIPTS);
    assert.equal(panelView(skill("e2e-orphan"), null).copy, "Copy status command");
  });

  test("installs: repo, global, project in that order (another scope is not shown), a dot, the shown path, and the detail of each install not ok", () => {
    const view = installsView(skill("Drifted"), parsed().targets)!;
    assert.equal(view.form, "symlink → hub");
    assert.equal(view.count, "1 of 5 installed");
    assert.deepEqual(view.groups.map((g) => g.scope), ["repo", "global", "project"]);
    assert.deepEqual(view.groups.flatMap((g) => g.rows.map((r) => [r.target, r.path, r.dot])), [
      ["repo-claude", ".claude/skills", "none"],
      ["repo-codex", ".agents/skills", "none"],
      ["global-claude", "~/.claude/skills", "bad"],
      // No display_path: the path itself.
      ["project-claude:demo", "/w/projects-folder/demo/.claude/skills", "none"],
    ]);
    assert.deepEqual(view.groups.map((g) => g.details), [[], ["global-claude: should be a symlink"], []]);
    assert.equal(installsView(skill("e2e-orphan"), parsed().targets)!.form, FORM_UNKNOWN);
    assert.equal(installsView(skill("e2e-copied"), parsed().targets)!.form, "copy → hub");
    assert.equal(installsView(skill("paper-search"), []), null, "no targets: NO_TARGETS");
    assert.deepEqual(SCOPE_ORDER, ["repo", "global", "project"]);
  });

  test("a row's button: disable where enabled, enable where disabled, working... while it waits, install ⧉ where nothing is installed", () => {
    const rows = installsView(skill("paper-search"), parsed().targets)!.groups[0]!.rows;
    assert.deepEqual(rowAction(rows[0]!.install, false, false), { kind: "toggle", label: DISABLE, pressed: true, enable: false });
    assert.deepEqual(rowAction(rows[1]!.install, false, false), { kind: "toggle", label: ENABLE, pressed: false, enable: true });
    assert.deepEqual(rowAction(rows[1]!.install, true, false), { kind: "toggle", label: WORKING, pressed: false, enable: true });
    assert.deepEqual(rowAction(null, false, false), { kind: "copy", label: INSTALL_COPY });
    assert.deepEqual(rowAction(null, false, true), { kind: "copy", label: INSTALL_COPIED });
  });

  test("the toggle sends today's four fields; a refusal shows its error or 'toggle failed'", () => {
    assert.deepEqual(JSON.parse(toggleBody(skill("e2e-copied"), "repo-claude", false)), { skill: "e2e-copied", collection: "beta-copy", target: "repo-claude", enable: false });
    assert.equal(toggleError({ error: "bad collection name: no hub source" }), "bad collection name: no hub source");
    for (const body of [{}, null, "x", [], { error: null }]) assert.equal(toggleError(body), TOGGLE_FAILED, JSON.stringify(body));
    assert.equal(toggleError({ error: 3 }), "3");
  });

  test("an orphan's row offers the toggle, which the handler refuses before running anything (F2, kept as it is)", async () => {
    const orphanRow = installsView(skill("e2e-orphan"), parsed().targets)!.groups.find((g) => g.scope === "project")!.rows[0]!;
    assert.deepEqual(rowAction(orphanRow.install, false, false), { kind: "toggle", label: DISABLE, pressed: true, enable: false });
    // The orphan found in the repository's own folders has no installs: no toggle anywhere (generate.py's first orphan loop).
    assert.deepEqual(installsView(skill("repo-orphan"), parsed().targets)!.groups.flatMap((g) => g.rows.map((r) => rowAction(r.install, false, false).kind)), ["copy", "copy", "copy", "copy"]);
    const { run, calls } = fakeRunner();
    const answer = await skillToggleApi(context(tempTree(), { run }))(request("POST", "/", JSON.parse(toggleBody(skill("e2e-orphan"), orphanRow.target, false))));
    assert.equal(answer.status, 400);
    assert.deepEqual(answer.body, { error: "bad collection name: no hub source" });
    assert.equal(toggleError(answer.body), "bad collection name: no hub source");
    assert.equal(calls.length, 0);
  });
});

describe("the snapshot", () => {
  test("unreadable JSON, or JSON with no skill list, is said, not drawn", () => {
    assert.deepEqual(parseSnapshot("{"), { ok: false, problem: "json" });
    assert.deepEqual(parseSnapshot(""), { ok: false, problem: "json" });
    for (const raw of ["null", "[]", "{}", '{"store":null}', '{"store":[]}', '{"store":{"collections":[]}}', '{"store":{"orphans":[]}}', '{"store":{"collections":{},"orphans":[]}}']) {
      assert.deepEqual(parseSnapshot(raw), { ok: false, problem: "store" }, raw);
    }
  });

  test("only the fields the page draws, each of its type: an entry without a name is left out, a missing list is empty", () => {
    const store = parsed({
      collections: [
        { name: "c", skills: [{ name: "ok" }, { description: "no name" }, null, "x", { name: 3 }] },
        { skills: [] },
        { name: "d" },
      ],
      orphans: [{ name: "o", description: 7, installs: [{ target: "t", ok: "yes", disabled: 1 }, { ok: true }] }, {}],
    });
    assert.deepEqual(store, {
      collections: [
        { name: "c", skills: [{ name: "ok", description: null, license: null, has_scripts: false, sync: "", install_form: null, installs: [] }] },
        { name: "d", skills: [] },
      ],
      orphans: [{ name: "o", description: null, sync: "", installs: [{ target: "t", ok: false, disabled: false, detail: "" }] }],
      targets: [],
    });
    assert.deepEqual(parsed().targets[3], { name: "project-claude:demo", path: "/w/projects-folder/demo/.claude/skills", scope: "project" });
  });

  test("the words for no list yet", () => {
    assert.equal(problemWords({ status: 404 }), "No snapshot to show yet.");
    assert.equal(problemWords({ status: 503 }), "No snapshot to show yet.");
    assert.equal(problemWords({ kind: "unreachable" }), "No snapshot to show yet.");
    assert.equal(problemWords({ status: 413 }), "The snapshot is too large to read here.");
    assert.equal(problemWords({ kind: "json" }), "The snapshot is not readable JSON.");
    assert.equal(problemWords({ kind: "store" }), "The snapshot has no skill list.");
  });

  test("it reads the file the manifest declares, as often as the app does", () => {
    const manifest = JSON.parse(readFileSync(join(SITE, "../plugin.json"), "utf8")) as { reads: string[] };
    assert.deepEqual(manifest.reads, [STATE]);
    assert.equal(POLL_MS, 5000);
    assert.ok(source("src/useOsState.ts").includes("const POLL_INTERVAL_MS = 5000;"));
  });
});

describe("every word on the page, from the file it comes from", () => {
  test("the top: mockup C's band in the host's words for this plugin, then the trunk's Skills header", () => {
    const manifest = JSON.parse(readFileSync(join(SITE, "../plugin.json"), "utf8")) as { name: string; description: string };
    assert.equal(BAND_NAME, `${manifest.name} · bundled plugin`);
    assert.equal(BAND_DESCRIPTION, manifest.description);
    const screen = source("src/pages/PluginScreen.tsx");
    assert.ok(screen.includes("{plugin.name} · {plugin.source} plugin"));
    assert.ok(screen.includes("<> — {plugin.description}</>"));
    // The header was Shell.tsx's SkillsScreen (removed with this page's move); the mockup the Human Owner chose
    // from copies it, and the band, word for word (os-ui/mockups/step2/skills.html, top C).
    const mockup = source("../mockups/step2/skills.html");
    for (const markup of [
      `<div class="eyebrow">${EYEBROW}</div>`,
      `<h1 class="page-title">${TITLE}</h1>`,
      `<p class="lede">${LEDE}</p>`,
      `<span class="txt" title="${BAND_DESCRIPTION}"><b>${BAND_NAME}</b> — ${BAND_DESCRIPTION}</span>`,
    ]) {
      assert.ok(mockup.includes(markup), markup);
    }
  });

  test("StorePage.tsx, SkillCard.tsx, SkillDrawer.tsx, SkillInstalls.tsx, skills.ts, App.tsx", () => {
    const words: Record<string, (string | number)[]> = {
      "src/pages/StorePage.tsx": [FILTER_LABEL, SEARCH_PLACEHOLDER, SEARCH_LABEL, NO_MATCH],
      "src/components/SkillCard.tsx": [UNKNOWN_LICENSE, HAS_SCRIPTS_TAG],
      "src/components/SkillDrawer.tsx": [PANEL_LABEL, `> ${CLOSE} </button>`, "Research-skills-hub / ${skill.collection}", DESCRIPTION, INSTALLS, LICENSE, SCRIPTS, HAS_SCRIPTS, NO_SCRIPTS, COPIED, COPY_FAILED, DEFAULT_COPY, PANEL_NOTE, `"${NONE}"`, ANSWER_MS],
      "src/components/SkillInstalls.tsx": [
        NO_TARGETS,
        FORM_UNKNOWN,
        "→ hub",
        "{installedCount} of {targets.length} installed",
        WORKING,
        `"${ENABLE}"`,
        `"${DISABLE}"`,
        INSTALL_COPY,
        INSTALL_COPIED,
        INSTALL_TITLE,
        TOGGLE_FAILED,
        CLIPBOARD_UNAVAILABLE,
        `${LIVE_NOTE[0]}<code>${LIVE_NOTE[1]}</code>${LIVE_NOTE[2]}`,
        'const SCOPE_ORDER = ["repo", "global", "project"] as const;',
        "{target.name}: {install.detail}",
      ],
      "src/lib/skills.ts": ['"Copy status command"', '"Copy install command"', `"${ORPHAN_COLLECTION_LABEL}"`],
      "src/App.tsx": [LOADING],
    };
    for (const [file, list] of Object.entries(words)) {
      const text = source(file);
      for (const word of list) assert.ok(text.includes(String(word)), `${file}: ${word}`);
    }
  });
});
