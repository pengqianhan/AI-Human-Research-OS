import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { BUNDLED_IDS } from "../../plugins/bundled.ts";
import type { PluginManifest } from "../../server/manifest.ts";
import { bundledManifests, pluginInfo, pluginPages, viewSrc } from "./pages.ts";

const PLUGINS = resolve(dirname(fileURLToPath(import.meta.url)), "../../plugins");

/** The real plugins/ folder, read as the renderer's glob sees it: raw plugin.json by folder name. */
function realRaw(): Record<string, unknown> {
  return Object.fromEntries(BUNDLED_IDS.map((id) => [id, JSON.parse(readFileSync(resolve(PLUGINS, id, "plugin.json"), "utf8")) as unknown]));
}

/** A manifest that parses, with `extra` merged over it. */
const manifest = (id: string, extra: Partial<PluginManifest> = {}): PluginManifest => ({
  contract: "^1.0",
  id,
  name: id,
  version: "0.1.0",
  contributes: {},
  ...extra,
});

const desktop = { desktop: true };
const browser = { desktop: false };

describe("the bundled plugins in the renderer", () => {
  test("every manifest in the real plugins/ folder loads, in BUNDLED_IDS order", () => {
    const { plugins, problems } = bundledManifests(realRaw(), BUNDLED_IDS);
    assert.deepEqual(problems, []);
    assert.deepEqual(
      plugins.map((p) => p.id),
      [...BUNDLED_IDS],
    );
  });

  test("Paper wiki's left-navigation page and its frame URL in the desktop client and in a browser", () => {
    const { plugins } = bundledManifests(realRaw(), BUNDLED_IDS);
    const nav = (env: { desktop: boolean }) => pluginPages(plugins, env).filter((p) => p.plugin === "paper-wiki" && p.slot === "nav");
    // The end-to-end suite clicks the navigation button by this exact name.
    assert.deepEqual(
      nav(desktop).map((p) => [p.key, p.title, p.src, p.origin]),
      [["paper-wiki/viewer", "Paper wiki", "app://paper-wiki/viz.html", "app://paper-wiki"]],
    );
    // The dev server and the published build serve a cache copy of paper-wiki/ beside the app.
    assert.deepEqual(
      nav(browser).map((p) => [p.key, p.title, p.src, p.origin]),
      [["paper-wiki/viewer", "Paper wiki", "./paper-wiki/viz.html", null]],
    );
  });

  test("the Code view's project tab: on app://code-view in the desktop client, no frame URL in a browser", () => {
    const { plugins } = bundledManifests(realRaw(), BUNDLED_IDS);
    const code = (env: { desktop: boolean }) => pluginPages(plugins, env).filter((p) => p.plugin === "code-view");
    assert.deepEqual(
      code(desktop).map((p) => [p.key, p.slot, p.title, p.src, p.origin]),
      [["code-view/code", "project", "Code", "app://code-view/index.html", "app://code-view"]],
    );
    assert.deepEqual(
      code(browser).map((p) => [p.key, p.src, p.origin]),
      [["code-view/code", null, null]],
    );
    assert.deepEqual(plugins.find((p) => p.id === "code-view")!.reads, ["projects-folder/*/Code"]);
    assert.deepEqual(plugins.find((p) => p.id === "code-view")!.contributes.handlers, ["git"]);
  });

  test("Paper Wiki's card: its name and description", () => {
    const { plugins } = bundledManifests(realRaw(), BUNDLED_IDS);
    const wiki = plugins.find((p) => p.id === "paper-wiki")!;
    assert.deepEqual(pluginInfo(wiki, "bundled"), {
      id: "paper-wiki",
      name: "Paper Wiki",
      version: "1.0.0",
      description: "Shared paper notes, topics, concepts, and sources from paper-wiki/, in the graph and timeline viewer, on its own origin.",
      source: "bundled",
    });
  });

  test("a plugin that cannot load is reported by name and skipped; the others load", () => {
    const raw = {
      good: manifest("good"),
      broken: { contract: "^9.0", id: "broken", name: "", version: "1", contributes: {} },
      renamed: manifest("other"),
      ignored: manifest("ignored"),
    };
    const { plugins, problems } = bundledManifests(raw, ["broken", "missing", "good", "renamed"]);
    assert.deepEqual(
      plugins.map((p) => p.id),
      ["good"],
    );
    assert.equal(problems.length, 3);
    assert.match(problems[0]!, /^broken: contract "\^9\.0" is not accepted by this host.*; name must not be empty$/);
    assert.equal(problems[1], "missing: no plugin.json");
    assert.equal(problems[2], 'renamed: plugin.json names the id "other"; a plugin\'s folder is named after its id');
  });

  test("bundled-only fields are accepted: the renderer parses as a bundled source", () => {
    const raw = { wiki: manifest("wiki", { site: { workspace: "w" }, contributes: { homePanels: [{ id: "v", title: "V", entry: "v.html", placement: "nav" }], handlers: ["h"] } }) };
    assert.deepEqual(bundledManifests(raw, ["wiki"]).problems, []);
  });

  test("a description is optional", () => {
    assert.equal(pluginInfo(manifest("plain"), "bundled").description, "");
  });
});

describe("pluginPages", () => {
  const views = manifest("views", {
    contributes: {
      homePanels: [
        { id: "side", title: "Side", entry: "side.html", placement: "nav" },
        { id: "panel", title: "Panel", entry: "panel/index.html" },
        { id: "card", title: "Card", entry: "card.html", placement: "home" },
      ],
      projectViews: [{ id: "code", title: "Code", entry: "code.html" }],
      handlers: ["status"],
    },
  });

  test("slots: placement nav is nav, other home panels are home, project views are project; handlers are no page", () => {
    assert.deepEqual(
      pluginPages([views], desktop).map((p) => [p.key, p.slot, p.title]),
      [
        ["views/side", "nav", "Side"],
        ["views/panel", "home", "Panel"],
        ["views/card", "home", "Card"],
        ["views/code", "project", "Code"],
      ],
    );
  });

  test("in the desktop client every page loads from the plugin's own origin", () => {
    assert.deepEqual(
      pluginPages([views], desktop).map((p) => [p.src, p.origin]),
      [
        ["app://views/side.html", "app://views"],
        ["app://views/panel/index.html", "app://views"],
        ["app://views/card.html", "app://views"],
        ["app://views/code.html", "app://views"],
      ],
    );
  });

  test("in a browser a plugin without site.workspace has no frame URL", () => {
    assert.deepEqual(
      pluginPages([views], browser).map((p) => [p.key, p.src, p.origin]),
      [
        ["views/side", null, null],
        ["views/panel", null, null],
        ["views/card", null, null],
        ["views/code", null, null],
      ],
    );
  });

  test("in a browser a site.workspace plugin loads from the copy of that folder", () => {
    const site = manifest("site", { site: { workspace: "data/site" }, contributes: { homePanels: [{ id: "v", title: "V", entry: "a/b.html" }] } });
    assert.deepEqual(
      pluginPages([site], browser).map((p) => p.src),
      ["./data/site/a/b.html"],
    );
  });

  test("the order follows the input, and keys are <plugin>/<page>", () => {
    const a = manifest("alpha", { contributes: { projectViews: [{ id: "x", title: "X", entry: "x.html" }] } });
    const b = manifest("beta", { contributes: { homePanels: [{ id: "x", title: "X", entry: "x.html", placement: "nav" }] } });
    assert.deepEqual(
      pluginPages([b, a], desktop).map((p) => [p.key, p.plugin]),
      [
        ["beta/x", "beta"],
        ["alpha/x", "alpha"],
      ],
    );
    assert.deepEqual(
      pluginPages([a, b], desktop).map((p) => p.key),
      ["alpha/x", "beta/x"],
    );
  });

  test("viewSrc names the project in the query, encoded; no frame URL stays none", () => {
    const [code] = pluginPages([views], desktop).filter((p) => p.slot === "project");
    assert.equal(viewSrc(code!, "nanochat_cpu"), "app://views/code.html?project=nanochat_cpu");
    // The read channel's URL parser reads "+" as a space; "&", "#", "%", and "?" would end or change the value.
    assert.equal(viewSrc(code!, "a+b &c#d%e?f/g"), "app://views/code.html?project=a%2Bb%20%26c%23d%25e%3Ff%2Fg");
    assert.equal(new URL(viewSrc(code!, "a+b &c#d%e")!).searchParams.get("project"), "a+b &c#d%e");
    assert.equal(viewSrc({ ...code!, src: "app://views/code.html?mode=x" }, "p"), "app://views/code.html?mode=x&project=p");
    assert.equal(viewSrc({ ...code!, src: null }, "p"), null);
  });

  test("no plugins, no pages", () => {
    assert.deepEqual(pluginPages([], desktop), []);
    assert.deepEqual(pluginPages([manifest("empty")], browser), []);
  });
});
