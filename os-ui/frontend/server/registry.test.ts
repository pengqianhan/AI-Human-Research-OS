import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { BUNDLED_IDS } from "../plugins/bundled.ts";
import { TRUNK_MOUNTS } from "./api.ts";
import type { Mount } from "./api.ts";
import type { PluginManifest } from "./manifest.ts";
import { BUNDLED_HANDLERS, DESKTOP_ONLY_HANDLERS } from "./pluginHandlers.ts";
import { createRegistry, loadPlugins } from "./registry.ts";
import type { HandlerFactory, LoadedPlugin, TrunkMount } from "./registry.ts";
import { context, tempTree } from "./testkit.ts";
import type { ApiContext } from "./types.ts";

const PLUGINS = resolve(dirname(fileURLToPath(import.meta.url)), "../plugins");
const none = { trunk: TRUNK_MOUNTS, plugins: [] };

const manifest = (id: string, extra: Partial<PluginManifest> = {}): PluginManifest => ({
  contract: "^1.0",
  id,
  name: id,
  version: "1",
  contributes: {},
  ...extra,
});

/** A plugins folder holding `<id>/plugin.json` for each manifest. */
const folder = (...manifests: PluginManifest[]) =>
  tempTree(Object.fromEntries(manifests.map((m) => [`${m.id}/plugin.json`, JSON.stringify(m)])));

const loaded = (m: PluginManifest, source: LoadedPlugin["source"] = "bundled"): LoadedPlugin => ({ manifest: m, source, dir: `/plugins/${m.id}` });

/** A factory whose handler answers with its own name and the context's root. */
const fake = (name: string): HandlerFactory => (ctx) => async () => ({ status: 200, body: { name, root: ctx.repoRoot } });

const flags = (mounts: readonly Mount[]) => mounts.map((m) => [m.prefix, m.token] as const);

describe("loadPlugins", () => {
  test("the real plugins/ folder is BUNDLED_IDS, and every manifest in it parses", () => {
    const folders = readdirSync(PLUGINS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    // fixtures/ holds the md-kit, Skeleton view, Assets view, and Idea view tests' frozen files: no plugin.json, so the build skips it too.
    assert.deepEqual(folders.filter((f) => f !== "fixtures").sort(), [...BUNDLED_IDS].sort());
    assert.ok(!existsSync(join(PLUGINS, "fixtures", "plugin.json")), "fixtures/ is no plugin");
    const result = loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", none);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.plugins.map((p) => [p.manifest.id, p.source, p.dir]), BUNDLED_IDS.map((id) => [id, "bundled", join(PLUGINS, id)]));
  });

  test("in the given order, with the source the caller gives", () => {
    const root = folder(manifest("beta"), manifest("alpha"));
    const result = loadPlugins(root, ["beta", "alpha"], "local", none);
    assert.deepEqual(result.plugins.map((p) => [p.manifest.id, p.source]), [["beta", "local"], ["alpha", "local"]]);
  });

  test("a local plugin declaring a handler is reported and not loaded", () => {
    const root = folder(manifest("thief", { contributes: { handlers: ["status"] } }));
    const result = loadPlugins(root, ["thief"], "local", none);
    assert.deepEqual(result.plugins, []);
    assert.deepEqual(result.problems, ["thief: contributes.handlers is for bundled plugins only"]);
  });

  test("an /api/<id> that overlaps a trunk prefix is reported", () => {
    const root = folder(manifest("chat"), manifest("skill"), manifest("paper-sources"), manifest("paper"));
    const result = loadPlugins(root, ["chat", "skill", "paper-sources", "paper"], "bundled", none);
    assert.deepEqual(result.plugins.map((p) => p.manifest.id), ["paper"], "/api/paper is not a segment of /api/paper-sources");
    assert.deepEqual(result.problems, [
      "chat: /api/chat overlaps the app's endpoint /api/chat",
      "skill: /api/skill overlaps the app's endpoint /api/skill/toggle",
      "paper-sources: /api/paper-sources overlaps the app's endpoint /api/paper-sources",
    ]);
  });

  test("a repeated id, or a local plugin taking a bundled id, is reported", () => {
    const root = folder(manifest("demo"));
    const twice = loadPlugins(root, ["demo", "demo"], "bundled", none);
    assert.equal(twice.plugins.length, 1);
    assert.deepEqual(twice.problems, ["demo: a plugin with this id is loaded already"]);

    const bundled = loadPlugins(root, ["demo"], "bundled", none).plugins;
    const local = loadPlugins(root, ["demo"], "local", { trunk: TRUNK_MOUNTS, plugins: bundled });
    assert.deepEqual(local.plugins, []);
    assert.deepEqual(local.problems, ["demo: a local plugin cannot take the id of a bundled plugin"]);
  });

  test("a byte-order mark before the JSON is ignored", () => {
    const root = tempTree({ "bom/plugin.json": "\uFEFF" + JSON.stringify(manifest("bom")) });
    const result = loadPlugins(root, ["bom"], "local", none);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.plugins.map((p) => p.manifest.id), ["bom"]);
  });

  test("unreadable, unparsable, or misnamed manifests are reported, never thrown", () => {
    const root = tempTree({ "broken/plugin.json": "{", "renamed/plugin.json": JSON.stringify(manifest("other")), "bad/plugin.json": "[]" });
    const result = loadPlugins(root, ["missing", "broken", "renamed", "bad", "../escape", ".."], "local", none);
    assert.deepEqual(result.plugins, []);
    assert.equal(result.problems.length, 6, result.problems.join("\n"));
    assert.match(result.problems[0]!, /^missing: cannot read plugin\.json: /);
    assert.match(result.problems[1]!, /^broken: cannot read plugin\.json: /);
    assert.equal(result.problems[2], 'renamed: plugin.json names the id "other"; a plugin\'s folder is named after its id');
    assert.equal(result.problems[3], "bad: plugin.json must be a JSON object");
    assert.equal(result.problems[4], '"../escape" is not a plugin folder name');
    assert.equal(result.problems[5], '".." is not a plugin folder name');
  });
});

describe("createRegistry", () => {
  const ctx: ApiContext = context(tempTree());
  const real = () =>
    createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins: loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", none).plugins, factories: BUNDLED_HANDLERS });

  test("all has the app's three endpoints, then Paper Wiki's status, the Code view's Git history, and Skills Hub's toggle, with their token flags", () => {
    assert.deepEqual(flags(real().all), [
      ["/api/skill/toggle", false],
      ["/api/paper-sources", true],
      ["/api/chat", true],
      ["/api/paper-wiki/status", false],
      ["/api/code-view/git", false],
      ["/api/skills-hub/toggle", false],
    ]);
  });

  test("with the dev server's skip set, the Code view's Git history and Skills Hub's toggle are declared but mounted nowhere", () => {
    assert.deepEqual([...DESKTOP_ONLY_HANDLERS], ["code-view/git", "skills-hub/toggle"]);
    const dev = createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins: loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", none).plugins, factories: BUNDLED_HANDLERS, skip: DESKTOP_ONLY_HANDLERS });
    assert.deepEqual(flags(dev.byPlugin.get("code-view")!), []);
    assert.deepEqual(flags(dev.byPlugin.get("skills-hub")!), []);
    assert.ok(!dev.all.some((m) => m.prefix.startsWith("/api/code-view")));
    assert.ok(!dev.all.some((m) => m.prefix.startsWith("/api/skills-hub")));
  });

  test("the trunk on the app origin, each plugin's handlers on its own, never with the token", () => {
    const registry = real();
    assert.deepEqual(flags(registry.app), TRUNK_MOUNTS.map((t) => [t.prefix, t.token]));
    assert.deepEqual([...registry.byPlugin.keys()], [...BUNDLED_IDS]);
    assert.deepEqual(flags(registry.byPlugin.get("paper-wiki")!), [["/api/paper-wiki/status", false]]);
    assert.deepEqual(flags(registry.byPlugin.get("code-view")!), [["/api/code-view/git", false]]);
    assert.deepEqual(flags(registry.byPlugin.get("skills-hub")!), [["/api/skills-hub/toggle", false]]);
    const app = new Set(registry.app.map((m) => m.prefix));
    for (const [id, mounts] of registry.byPlugin) {
      for (const mount of mounts) {
        assert.equal(mount.token, false, mount.prefix);
        assert.ok(!app.has(mount.prefix), `${mount.prefix} is on the app origin`);
        assert.ok(mount.prefix.startsWith(`/api/${id}/`), mount.prefix);
      }
    }
    assert.deepEqual(flags(registry.all), [...flags(registry.app), ...[...registry.byPlugin.values()].flatMap(flags)]);
  });

  test("handlers are built for this workspace and mounted at /api/<id>/<handler>", async () => {
    const trunk: TrunkMount[] = [{ prefix: "/api/core", factory: fake("core"), token: true }];
    const plugins = [loaded(manifest("demo", { contributes: { handlers: ["one", "two"] } }))];
    const registry = createRegistry({ ctx, trunk, plugins, factories: { "demo/one": fake("one"), "demo/two": fake("two") } });
    assert.deepEqual(flags(registry.all), [["/api/core", true], ["/api/demo/one", false], ["/api/demo/two", false]]);
    const answer = await registry.byPlugin.get("demo")![1]!.handler({ method: "GET", path: "/", query: new URLSearchParams(), json: async () => ({}) });
    assert.deepEqual(answer.body, { name: "two", root: ctx.repoRoot });
  });

  test("factory drift throws, in both directions", () => {
    const declared = [loaded(manifest("demo", { contributes: { handlers: ["status"] } }))];
    assert.throws(() => createRegistry({ ctx, trunk: [], plugins: declared, factories: {} }), /demo\/status is declared but has no factory/);
    assert.throws(
      () => createRegistry({ ctx, trunk: [], plugins: [], factories: { "demo/status": fake("s") } }),
      /demo\/status has a factory but no bundled plugin declares it/,
    );
    assert.throws(
      () => createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins: [], factories: BUNDLED_HANDLERS }),
      /paper-wiki\/status has a factory/,
      "a bundled plugin that did not load leaves its factory undeclared",
    );
  });

  test("a skipped handler is neither required nor mounted, and its factory is never built", () => {
    let built = 0;
    const counting: HandlerFactory = (c) => (built++, fake("git")(c));
    const demo = loaded(manifest("demo", { contributes: { handlers: ["git", "status"] } }));
    const skip = new Set(["demo/git"]);
    const without = createRegistry({ ctx, trunk: [], plugins: [demo], factories: { "demo/status": fake("s") }, skip });
    assert.deepEqual(flags(without.all), [["/api/demo/status", false]], "no factory for the skipped key: no drift error");
    const withFactory = createRegistry({ ctx, trunk: [], plugins: [demo], factories: { "demo/git": counting, "demo/status": fake("s") }, skip });
    assert.deepEqual(flags(withFactory.all), [["/api/demo/status", false]], "a factory for a skipped key is no orphan");
    assert.equal(built, 0);
  });

  test("skip excuses only the keys it lists", () => {
    const demo = loaded(manifest("demo", { contributes: { handlers: ["git", "status"] } }));
    assert.throws(
      () => createRegistry({ ctx, trunk: [], plugins: [demo], factories: {}, skip: new Set(["demo/git"]) }),
      /^Error: plugin handler drift: demo\/status is declared but has no factory$/,
    );
    assert.throws(
      () => createRegistry({ ctx, trunk: [], plugins: [], factories: { "demo/git": fake("g") }, skip: new Set(["demo/git"]) }),
      /demo\/git has a factory but no bundled plugin declares it/,
      "a factory nobody declares is drift even when its key is skipped",
    );
  });

  test("a skipped key no bundled plugin declares is drift, as after a rename", () => {
    const demo = loaded(manifest("demo", { contributes: { handlers: ["git"] } }));
    assert.throws(
      () => createRegistry({ ctx, trunk: [], plugins: [demo], factories: { "demo/git": fake("g") }, skip: new Set(["demo/old-git"]) }),
      /^Error: plugin handler drift: demo\/old-git is skipped but no bundled plugin declares it$/,
    );
    const local = loaded(manifest("demo", { contributes: { handlers: ["git"] } }), "local");
    assert.throws(
      () => createRegistry({ ctx, trunk: [], plugins: [local], factories: {}, skip: new Set(["demo/git"]) }),
      /demo\/git is skipped but no bundled plugin declares it/,
      "a local plugin's declaration does not count",
    );
  });

  test("a repeated id throws, whatever the sources", () => {
    const bundled = loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", none).plugins;
    const local = loaded(manifest("paper-wiki"), "local");
    for (const plugins of [[...bundled, local], [local, ...bundled], [...bundled, ...bundled]]) {
      assert.throws(
        () => createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins, factories: BUNDLED_HANDLERS }),
        /^Error: plugin registry: the id "paper-wiki" is listed twice$/,
      );
    }
  });

  test("an /api/<id> overlapping a trunk prefix throws", () => {
    const chat = loaded(manifest("chat", { contributes: { handlers: ["sessions"] } }));
    assert.throws(
      () => createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins: [chat], factories: { "chat/sessions": fake("p") } }),
      /^Error: plugin registry: \/api\/chat overlaps the app's endpoint \/api\/chat$/,
    );
    assert.throws(
      () => createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins: [loaded(manifest("skill"), "local")], factories: {} }),
      /\/api\/skill overlaps the app's endpoint \/api\/skill\/toggle$/,
    );
    const paper = createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins: [loaded(manifest("paper"))], factories: {} });
    assert.deepEqual(flags(paper.all), flags(paper.app), "/api/paper is not a segment of /api/paper-sources");
  });

  test("a local plugin never gets a mount, even when a factory key for its id exists (lock 3)", () => {
    let built = 0;
    const counting: HandlerFactory = (c) => (built++, fake("s")(c));
    const local = loaded(manifest("demo", { contributes: { handlers: ["status"] } }), "local");
    const registry = createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins: [local], factories: {} });
    assert.deepEqual(registry.byPlugin.get("demo"), []);
    assert.deepEqual(flags(registry.all), flags(registry.app));
    assert.throws(
      () => createRegistry({ ctx, trunk: [], plugins: [local], factories: { "demo/status": counting } }),
      /has a factory but no bundled plugin declares it/,
      "a local declaration does not claim a factory",
    );
    const bundled = loaded(manifest("demo", { contributes: { handlers: ["status"] } }));
    for (const plugins of [[bundled, local], [local, bundled]]) {
      assert.throws(
        () => createRegistry({ ctx, trunk: [], plugins, factories: { "demo/status": counting } }),
        /the id "demo" is listed twice/,
        "nor does a local plugin sharing a bundled plugin's id",
      );
    }
    assert.equal(built, 0, "the factory never ran");
  });
});
