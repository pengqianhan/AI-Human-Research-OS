import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { BUNDLED_IDS } from "../../plugins/bundled.ts";
import { bundledManifests, pluginPages } from "../plugins/pages.ts";
import { DEFAULT_LAYOUT, readLayout, workspaceTabs } from "./layoutState.ts";

const PLUGINS = resolve(dirname(fileURLToPath(import.meta.url)), "../../plugins");

function rawManifests(): Record<string, unknown> {
  return Object.fromEntries(BUNDLED_IDS.map((id) => [id, JSON.parse(readFileSync(resolve(PLUGINS, id, "plugin.json"), "utf8")) as unknown]));
}

/** The keys of the real bundled plugins' pages in one slot, as the Shell passes them. */
function keys(slot: "nav" | "project"): string[] {
  return pluginPages(bundledManifests(rawManifests(), BUNDLED_IDS).plugins, { desktop: true })
    .filter((p) => p.slot === slot)
    .map((p) => p.key);
}
const navKeys = () => keys("nav");
const projectKeys = () => keys("project");

describe("the saved layout (localStorage osui.layout.v1)", () => {
  test('a screen saved as "wiki", before S4, opens the Paper wiki page', () => {
    const keys = navKeys();
    assert.ok(keys.includes("paper-wiki/viewer"), `the Paper wiki page is loaded: ${JSON.stringify(keys)}`);
    assert.equal(readLayout({ screen: "wiki" }, keys).screen, "paper-wiki/viewer");
    assert.equal(readLayout({ screen: "paper-wiki/viewer" }, keys).screen, "paper-wiki/viewer");
  });

  test("a saved plugin page whose plugin is not loaded opens Home", () => {
    assert.equal(readLayout({ screen: "gone/viewer" }, navKeys()).screen, "home");
    assert.equal(readLayout({ screen: "paper-wiki/viewer" }, []).screen, "home");
    assert.equal(readLayout({ screen: "wiki" }, []).screen, "home");
  });

  test("the app's own pages are kept; anything else opens Home", () => {
    for (const screen of ["home", "projects", "skills", "plugins", "settings", "workspace"]) {
      assert.equal(readLayout({ screen }, []).screen, screen);
    }
    for (const screen of ["dash", "", 1, null, "constructor", "paper-wiki"]) {
      assert.equal(readLayout({ screen }, navKeys()).screen, "home", JSON.stringify(screen));
    }
  });

  test("the other fields keep their valid values and drop the rest", () => {
    assert.deepEqual(
      readLayout({ screen: "workspace", project: "nanochat_cpu", sidebarCollapsed: true, homeConversationOpen: true, conversationCollapsed: true, tab: "code-view/code" }, [], projectKeys()),
      { screen: "workspace", project: "nanochat_cpu", sidebarCollapsed: true, homeConversationOpen: true, conversationCollapsed: true, tab: "code-view/code" },
    );
    assert.deepEqual(readLayout({ project: 3, sidebarCollapsed: "yes", tab: "idea" }, []), DEFAULT_LAYOUT);
    for (const raw of [null, [], "x", 1]) assert.deepEqual(readLayout(raw, []), DEFAULT_LAYOUT);
  });

  test('a tab saved as "code", before S6a-2, opens the Code view; without its plugin, Overview', () => {
    const tabs = projectKeys();
    assert.ok(tabs.includes("code-view/code"), JSON.stringify(tabs));
    assert.equal(readLayout({ tab: "code" }, [], tabs).tab, "code-view/code");
    assert.equal(readLayout({ tab: "code-view/code" }, [], tabs).tab, "code-view/code");
    assert.equal(readLayout({ tab: "code" }, [], []).tab, "overview");
    assert.equal(readLayout({ tab: "gone/view" }, [], tabs).tab, "overview");
    assert.equal(readLayout({ tab: "paper-wiki/viewer" }, [], tabs).tab, "overview", "a left-navigation page is no tab");
  });

  test('a tab saved as "paper", before S6b, opens the Paper view; without its plugin, Overview', () => {
    const tabs = projectKeys();
    assert.ok(tabs.includes("paper-view/paper"), JSON.stringify(tabs));
    assert.equal(readLayout({ tab: "paper" }, [], tabs).tab, "paper-view/paper");
    assert.equal(readLayout({ tab: "paper-view/paper" }, [], tabs).tab, "paper-view/paper");
    assert.equal(readLayout({ tab: "paper" }, [], []).tab, "overview");
    assert.equal(readLayout({ tab: "paper" }, [], ["code-view/code"]).tab, "overview", "the Code view alone does not make Paper a tab");
  });
});

describe("the workspace's tab row", () => {
  test("mockup C's order, with the Idea, Code, Skeleton, Assets, and Paper views' tabs from the plugin registry", () => {
    const views = pluginPages(bundledManifests(rawManifests(), BUNDLED_IDS).plugins, { desktop: true }).filter((p) => p.slot === "project");
    assert.deepEqual(
      workspaceTabs(views).map((t) => [t.id, t.label, t.later !== undefined]),
      [
        ["overview", "Overview", false],
        ["idea-view/idea", "Idea", false],
        ["code-view/code", "Code", false],
        ["skeleton-view/skeleton", "Skeleton", false],
        ["assets-view/assets", "Assets", false],
        ["paper-view/paper", "Paper", false],
      ],
    );
  });

  test("no Idea, Code, Skeleton, Assets, or Paper tab without its plugin; another project view goes before Paper", () => {
    assert.deepEqual(
      workspaceTabs([{ key: "other/view", title: "Other" }]).map((t) => t.label),
      ["Overview", "Other"],
    );
    assert.deepEqual(
      workspaceTabs([
        { key: "paper-view/paper", title: "Paper" },
        { key: "other/view", title: "Other" },
        { key: "assets-view/assets", title: "Assets" },
        { key: "skeleton-view/skeleton", title: "Skeleton" },
        { key: "idea-view/idea", title: "Idea" },
      ]).map((t) => t.label),
      ["Overview", "Idea", "Skeleton", "Assets", "Other", "Paper"],
    );
  });
});
