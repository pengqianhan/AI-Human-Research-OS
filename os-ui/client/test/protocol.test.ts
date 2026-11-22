import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, symlinkSync, truncateSync, unlinkSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { basename, join } from "node:path";
import { describe, test } from "node:test";
import { BUNDLED_IDS } from "../../frontend/plugins/bundled.ts";
import { TRUNK_MOUNTS } from "../../frontend/server/api.ts";
import type { Mount } from "../../frontend/server/api.ts";
import type { PluginManifest } from "../../frontend/server/manifest.ts";
import { BUNDLED_HANDLERS } from "../../frontend/server/pluginHandlers.ts";
import { createRegistry, loadPlugins } from "../../frontend/server/registry.ts";
import type { HandlerFactory, LoadedPlugin, Registry } from "../../frontend/server/registry.ts";
import { context, fakeRunner } from "../../frontend/server/testkit.ts";
import {
  allowedNavigation,
  appCsp,
  createHandler,
  isInside,
  LIST_MAX_ENTRIES,
  PLUGIN_CSP,
  pluginSites,
  READ_CSP,
  READ_MAX_BYTES,
  route,
  safeRelative,
  workspaceRegistry,
  WORKSPACE_CSP,
} from "../src/main/protocol.ts";
import { tempTree } from "./helpers.ts";

/** The bundled plugins, from the real os-ui/frontend/plugins folder, as the client loads them at startup. */
const PLUGINS = join(import.meta.dirname, "..", "..", "frontend", "plugins");
const bundled = loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", { trunk: TRUNK_MOUNTS, plugins: [] });
const sites = pluginSites(bundled.plugins);
const CSP = appCsp(["paper-wiki"]);

/** A registry as createRegistry builds it, from mounts the tests make. */
function registryOf(app: Mount[], byPlugin: Record<string, Mount[]>): Registry {
  const map = new Map(Object.entries(byPlugin));
  return { plugins: [], app, byPlugin: map, all: [...app, ...[...map.values()].flat()] };
}

const renderer = tempTree({ "index.html": "<html>app</html>", "assets/app.js": "console.log(1)", "favicon.svg": "<svg/>" });
const workspace = tempTree({
  "os-ui/frontend/public/state.json": '{"meta":{}}',
  "paper-wiki/viz.html": "<html>viz</html>",
  "paper-wiki/figures/fig.svg": "<svg xmlns='http://www.w3.org/2000/svg'><script>fetch('https://x')</script></svg>",
  "paper-wiki/papers/a.md": "# a",
  ".env": "SECRET=1",
  "AGENTS.md": "agents",
});

describe("safeRelative", () => {
  test("plain paths", () => {
    assert.equal(safeRelative("/"), "");
    assert.equal(safeRelative("/assets/app.js"), "assets/app.js");
    assert.equal(safeRelative("/a%20b/c.md"), "a b/c.md");
    assert.equal(safeRelative("//a///b"), "a/b");
  });
  test("refuses everything that could leave the root or name a device", () => {
    for (const bad of [
      "/..%2f..%2fetc%2fpasswd",
      "/..%5c..%5cWindows",
      "/%2e%2e/x",
      "/a/%00x",
      "/C:/Windows/win.ini",
      "/file.txt:stream",
      "/papers/CON",
      "/papers/nul.txt",
      "/com1",
      "/%E0%A4%A",
      "/a\\b",
    ]) {
      assert.equal(safeRelative(bad), null, bad);
    }
    assert.equal(safeRelative("/%252e%252e/x"), "%2e%2e/x", "decoded once only");
    assert.equal(safeRelative("/console.md"), "console.md", "a name that merely starts like a device is fine");
  });
});

describe("isInside", () => {
  test("posix", () => {
    assert.equal(isInside("/r", "/r", path.posix), true);
    assert.equal(isInside("/r", "/r/a/b", path.posix), true);
    assert.equal(isInside("/r", "/r/..x/a", path.posix), true, "a folder named ..x is inside");
    assert.equal(isInside("/r", "/r-evil/a", path.posix), false);
    assert.equal(isInside("/r", "/", path.posix), false);
  });
  test("win32", () => {
    assert.equal(isInside("C:\\r", "C:\\r\\a", path.win32), true);
    assert.equal(isInside("C:\\r", "c:\\R\\a", path.win32), true, "case-insensitive");
    assert.equal(isInside("C:\\r", "C:\\r-evil\\a", path.win32), false);
    assert.equal(isInside("C:\\r", "D:\\r\\a", path.win32), false);
    assert.equal(isInside("C:\\r", "\\\\evil\\share\\x", path.win32), false);
  });
});

/**
 * A second bundled plugin, fake, whose site is the site/ folder beside its
 * plugin.json. The api/ and _os/ files exist so that refusing them is shown.
 */
const demoRoot = tempTree({
  "demo/plugin.json": JSON.stringify({
    contract: "^1.0",
    id: "demo",
    name: "Demo",
    version: "1",
    contributes: { projectViews: [{ id: "main", title: "Demo", entry: "index.html" }], handlers: ["echo"] },
  }),
  "demo/site/index.html": "<html>demo</html>",
  "demo/site/app.js": "console.log('demo')",
  "demo/site/img/logo.svg": "<svg xmlns='http://www.w3.org/2000/svg'><script>parent.postMessage(1, '*')</script></svg>",
  "demo/site/api/x.txt": "api",
  "demo/site/_os/x.txt": "os",
  "demo/secret.txt": "SECRET",
});
const demo = loadPlugins(demoRoot, ["demo"], "bundled", { trunk: TRUNK_MOUNTS, plugins: bundled.plugins });
const twoSites = pluginSites([...bundled.plugins, ...demo.plugins]);
const demoSite = join(demoRoot, "demo", "site");

describe("plugin sites", () => {
  test("the bundled plugins load, and Paper Wiki serves its workspace folder", () => {
    assert.deepEqual(bundled.problems, []);
    assert.deepEqual([...sites.keys()], [...BUNDLED_IDS]);
    assert.deepEqual(sites.get("paper-wiki"), { id: "paper-wiki", source: "bundled", reads: [], files: { kind: "workspace", rel: "paper-wiki" } });
  });

  test("any other plugin serves the site/ folder beside its plugin.json, in load order", () => {
    assert.deepEqual(demo.problems, []);
    assert.deepEqual([...twoSites.keys()], ["paper-wiki", "demo"]);
    assert.deepEqual(twoSites.get("demo"), { id: "demo", source: "bundled", reads: [], files: { kind: "plugin", dir: demoSite } });
  });

  test("reads are carried over; a workspace folder is for a bundled plugin only", () => {
    const manifest: PluginManifest = {
      contract: "^1.0",
      id: "viewer",
      name: "Viewer",
      version: "1",
      site: { workspace: "projects-folder" },
      reads: ["projects-folder/*/Code"],
      contributes: {},
    };
    const plugin = (source: LoadedPlugin["source"]): LoadedPlugin => ({ manifest, source, dir: join(demoRoot, "viewer") });
    assert.deepEqual(pluginSites([plugin("bundled")]).get("viewer"), {
      id: "viewer",
      source: "bundled",
      reads: ["projects-folder/*/Code"],
      files: { kind: "workspace", rel: "projects-folder" },
    });
    // The parser refuses `site` from a local plugin; a list built some other way still gets no workspace folder.
    const local = pluginSites([plugin("local")]).get("viewer");
    assert.deepEqual([local?.source, local?.files], ["local", { kind: "plugin", dir: join(demoRoot, "viewer", "site") }]);
  });
});

describe("workspaceRegistry", () => {
  const ctx = context(tempTree());
  const trunk = TRUNK_MOUNTS.map((t) => [t.prefix, t.token]);
  const flags = (mounts: readonly Mount[]) => mounts.map((m) => [m.prefix, m.token]);
  const build = (plugins: readonly LoadedPlugin[], factories: Record<string, HandlerFactory>) => {
    const problems: string[] = [];
    return { registry: workspaceRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins, factories }, (p) => problems.push(p)), problems };
  };

  test("no drift: every endpoint, nothing reported", () => {
    const { registry, problems } = build(bundled.plugins, BUNDLED_HANDLERS);
    assert.deepEqual(problems, []);
    assert.deepEqual(flags(registry.app), trunk);
    assert.deepEqual(flags(registry.byPlugin.get("paper-wiki")!), [["/api/paper-wiki/status", false]]);
  });

  test("drift either way is reported once and leaves the trunk's endpoints alone", () => {
    for (const [plugins, factories, message] of [
      [bundled.plugins, {}, /paper-wiki\/status is declared but has no factory/],
      [[], BUNDLED_HANDLERS, /paper-wiki\/status has a factory but no bundled plugin declares it/],
    ] as const) {
      const { registry, problems } = build(plugins, factories);
      assert.equal(problems.length, 1, problems.join("\n"));
      assert.match(problems[0]!, message);
      assert.deepEqual(flags(registry.app), trunk);
      assert.deepEqual(flags(registry.all), trunk);
      assert.equal(registry.byPlugin.size, 0);
    }
  });
});

describe("policies", () => {
  test("the app policy frames exactly the loaded plugins' origins", () => {
    assert.equal(
      appCsp(["paper-wiki"]),
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src app://paper-wiki; object-src 'none'; base-uri 'none'; form-action 'none'",
    );
    assert.match(appCsp(["paper-wiki", "demo"]), /; frame-src app:\/\/paper-wiki app:\/\/demo; /);
    assert.match(appCsp(["demo", "paper-wiki"]), /; frame-src app:\/\/demo app:\/\/paper-wiki; /);
    assert.match(appCsp([]), /; frame-src 'none'; /, "no plugin loaded: no frame at all");
  });

  test("app pages carry the policy for the sites the handler was given, in their order", () => {
    const index = route("app://research-os/", { renderer, workspace }, twoSites);
    assert.ok(index.kind === "file" && index.csp === appCsp(["paper-wiki", "demo"]));
  });

  test("a workspace site's policy, and a plugin-folder site's, which adds its own files", () => {
    assert.equal(
      WORKSPACE_CSP,
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'none'",
    );
    assert.equal(
      PLUGIN_CSP,
      "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'none'",
    );
  });
});

describe("allowedNavigation", () => {
  const hosts = ["paper-wiki"];
  test("the top frame stays on the app's origin", () => {
    assert.equal(allowedNavigation("app://research-os/", true, hosts), true);
    assert.equal(allowedNavigation("app://research-os/projects/x", true, hosts), true);
    for (const url of ["app://paper-wiki/viz.html", "app://research-os.evil/", "app://research-osx/", "about:blank", "https://example.com/"]) {
      assert.equal(allowedNavigation(url, true, hosts), false, url);
    }
  });

  test("a subframe loads a loaded plugin's origin or a blank document, nothing else", () => {
    for (const url of ["app://paper-wiki/viz.html", "app://paper-wiki/", "about:blank", "about:srcdoc"]) {
      assert.equal(allowedNavigation(url, false, hosts), true, url);
    }
    for (const url of [
      "app://research-os/",
      "app://demo/index.html",
      "app://evil/",
      "app://paper-wiki.evil/",
      "app://paper-wikix/",
      "app://paper-wiki",
      "https://example.com/",
      "about:blankx",
    ]) {
      assert.equal(allowedNavigation(url, false, hosts), false, url);
    }
    assert.equal(allowedNavigation("app://demo/index.html", false, ["paper-wiki", "demo"]), true, "once loaded");
    assert.equal(allowedNavigation("app://paper-wiki/viz.html", false, []), false, "no plugin loaded");
  });
});

describe("route", () => {
  const roots = { renderer, workspace };
  test("app origin", () => {
    assert.deepEqual(route("app://research-os/api/chat/sessions?cwd=", roots, sites), { kind: "api", pathname: "/api/chat/sessions", host: "research-os" });
    assert.equal(route("app://research-os/state.json", roots, sites).kind, "file");
    const index = route("app://research-os/", roots, sites);
    assert.ok(index.kind === "file" && index.rel === "index.html" && index.csp === CSP && !index.confined);
    const deep = route("app://research-os/projects/nanochat", roots, sites);
    assert.ok(deep.kind === "file" && deep.fallback === "index.html");
    const asset = route("app://research-os/assets/app.js", roots, sites);
    assert.ok(asset.kind === "file" && asset.fallback === null);
  });
  test("the app origin does not serve the wiki or workspace files", () => {
    const r = route("app://research-os/paper-wiki/viz.html", roots, sites);
    assert.ok(r.kind === "file" && r.root === renderer, "falls to the renderer, which has no such file");
    assert.equal(route("app://research-os/..%2f.env", roots, sites).kind, "not-found");
  });
  test("wiki origin", () => {
    const viz = route("app://paper-wiki/viz.html", roots, sites);
    assert.ok(viz.kind === "file" && viz.csp === WORKSPACE_CSP && viz.confined && viz.root === join(workspace, "paper-wiki"));
    const fig = route("app://paper-wiki/figures/fig.svg", roots, sites);
    assert.ok(fig.kind === "file" && fig.csp === WORKSPACE_CSP);
    assert.deepEqual(route("app://paper-wiki/api/paper-wiki/status", roots, sites), { kind: "api", pathname: "/api/paper-wiki/status", host: "paper-wiki" });
    assert.equal(route("app://paper-wiki/api/chat/send", roots, sites).kind, "not-found");
    assert.equal(route("app://paper-wiki/", roots, sites).kind, "not-found");
  });
  test("no workspace: no state, no wiki", () => {
    const none = { renderer, workspace: null };
    assert.equal(route("app://research-os/state.json", none, sites).kind, "not-found");
    assert.equal(route("app://paper-wiki/viz.html", none, sites).kind, "not-found");
  });
  test("other hosts and schemes", () => {
    assert.equal(route("app://evil/state.json", roots, sites).kind, "not-found");
    assert.equal(route("https://research-os/state.json", roots, sites).kind, "not-found");
    assert.equal(route("not a url", roots, sites).kind, "not-found");
  });
  test("a host with a port or in upper case is no loaded plugin's", () => {
    for (const url of [
      "app://paper-wiki:80/viz.html",
      "app://paper-wiki:80/api/paper-wiki/status",
      "app://PAPER-WIKI/viz.html",
      "app://Paper-Wiki/api/paper-wiki/status",
      "app://RESEARCH-OS/state.json",
      "app://research-os:443/state.json",
    ]) {
      assert.equal(route(url, roots, sites).kind, "not-found", url);
    }
  });
});

describe("handler", () => {
  const calls: { mount: string; path: string; body: unknown }[] = [];
  const mount = (prefix: string, token: boolean): Mount => ({
    prefix,
    token,
    handler: async (req) => {
      const body = req.method === "POST" ? await req.json() : null;
      calls.push({ mount: prefix, path: req.path, body });
      return { status: 200, body: { prefix, path: req.path, q: req.query.get("q") } };
    },
  });
  const registry = registryOf([mount("/api/skill/toggle", false), mount("/api/paper-sources", true), mount("/api/chat", true)], {
    "paper-wiki": [mount("/api/paper-wiki/status", false)],
  });
  const handler = createHandler(() => ({ renderer, workspace, sites, registry, token: "t0k" }));
  const fetchApp = (url: string, init?: RequestInit) => handler(new Request(url, init));
  const json = (body: unknown, token?: string): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "X-OS-UI-Token": token } : {}) },
    body: JSON.stringify(body),
  });

  test("renderer files with the app CSP; fallback for routes", async () => {
    const res = await fetchApp("app://research-os/");
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "<html>app</html>");
    assert.equal(res.headers.get("content-security-policy"), CSP);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    const js = await fetchApp("app://research-os/assets/app.js");
    assert.equal(js.headers.get("content-type"), "text/javascript; charset=utf-8");
    assert.equal(js.headers.get("content-security-policy"), null);
    assert.equal(await (await fetchApp("app://research-os/dashboard")).text(), "<html>app</html>");
    assert.equal((await fetchApp("app://research-os/missing.js")).status, 404);
  });

  test("state.json and the wiki come from the workspace", async () => {
    assert.equal(await (await fetchApp("app://research-os/state.json")).text(), '{"meta":{}}');
    const viz = await fetchApp("app://paper-wiki/viz.html");
    assert.equal(await viz.text(), "<html>viz</html>");
    assert.equal(viz.headers.get("content-security-policy"), WORKSPACE_CSP);
    const note = await fetchApp("app://paper-wiki/papers/a.md");
    assert.equal(note.headers.get("content-type"), "text/plain; charset=utf-8");
    const svg = await fetchApp("app://paper-wiki/figures/fig.svg");
    assert.equal(svg.headers.get("content-type"), "image/svg+xml");
    assert.equal(svg.headers.get("content-security-policy"), WORKSPACE_CSP, "an SVG is a document too");
  });

  test("nothing outside the served folders, through traversal or symlinks", async () => {
    mkdirSync(join(workspace, "outside"));
    writeFileSync(join(workspace, "outside", "x.txt"), "x");
    symlinkSync(join(workspace, "outside"), join(workspace, "paper-wiki", "dirlink"), process.platform === "win32" ? "junction" : "dir");
    try {
      symlinkSync(join(workspace, ".env"), join(workspace, "paper-wiki", "leak.txt"));
    } catch (error) {
      // Windows without the symlink privilege: the junction above still covers escapes.
      if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    }
    for (const url of [
      "app://paper-wiki/leak.txt",
      "app://paper-wiki/dirlink/x.txt",
      "app://paper-wiki/..%2f.env",
      "app://paper-wiki/papers",
      // The renderer and the workspace are sibling temp folders, so these name real files.
      `app://research-os/..%2f${basename(workspace)}%2fAGENTS.md`,
      `app://research-os/%2e%2e/${basename(workspace)}/AGENTS.md`,
    ]) {
      assert.equal((await fetchApp(url)).status, 404, url);
    }
  });

  test("files are read-only", async () => {
    assert.equal((await fetchApp("app://research-os/state.json", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } })).status, 405);
  });

  test("API: JSON writes only; token mounts need this launch's token", async () => {
    calls.length = 0;
    const plain = await fetchApp("app://research-os/api/chat/send", { method: "POST", headers: { "Content-Type": "text/plain" }, body: '{"text":"x"}' });
    assert.equal(plain.status, 415);
    const form = await fetchApp("app://research-os/api/skill/toggle", { method: "POST", body: new URLSearchParams({ skill: "x" }) });
    assert.equal(form.status, 415);
    assert.equal((await fetchApp("app://research-os/api/chat/send", json({ text: "x" }))).status, 401);
    assert.equal((await fetchApp("app://research-os/api/chat/send", json({ text: "x" }, "wrong"))).status, 401);
    assert.equal(calls.length, 0, "nothing reached a handler");

    const ok = await fetchApp("app://research-os/api/chat/send", json({ text: "x" }, "t0k"));
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { prefix: "/api/chat", path: "/send", q: null });
    assert.deepEqual(calls.at(-1), { mount: "/api/chat", path: "/send", body: { text: "x" } });

    const toggle = await fetchApp("app://research-os/api/skill/toggle", json({ skill: "s" }));
    assert.equal(toggle.status, 200, "an untokened mount needs only JSON");
    const get = await fetchApp("app://research-os/api/chat/sessions?q=1", { headers: { "X-OS-UI-Token": "t0k" } });
    assert.deepEqual(await get.json(), { prefix: "/api/chat", path: "/sessions", q: "1" });
    assert.equal((await fetchApp("app://research-os/api/nothing")).status, 404);
  });

  test("API: each origin reaches only its own endpoints", async () => {
    assert.equal((await fetchApp("app://research-os/api/paper-wiki/status")).status, 404);
    const status = await fetchApp("app://paper-wiki/api/paper-wiki/status");
    assert.deepEqual(await status.json(), { prefix: "/api/paper-wiki/status", path: "/", q: null });
    assert.equal((await fetchApp("app://paper-wiki/api/chat/sessions", { headers: { "X-OS-UI-Token": "t0k" } })).status, 404);
  });

  test("API: no workspace is a 503; a throwing handler is a 500", async () => {
    const empty = createHandler(() => ({ renderer, workspace: null, sites, registry: null, token: "t" }));
    assert.equal((await empty(new Request("app://research-os/api/chat/sessions"))).status, 503);
    const throwing = createHandler(() => ({
      renderer,
      workspace,
      sites,
      token: "t",
      registry: registryOf([{ prefix: "/api/skill/toggle", token: false, handler: async () => { throw new Error("boom"); } }], {}),
    }));
    const res = await throwing(new Request("app://research-os/api/skill/toggle", json({})));
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "boom" });
  });

  describe("plugin origins", () => {
    const both = registryOf([mount("/api/skill/toggle", false), mount("/api/paper-sources", true), mount("/api/chat", true)], {
      "paper-wiki": [mount("/api/paper-wiki/status", false)],
      demo: [mount("/api/demo/echo", false)],
    });
    const two = createHandler(() => ({ renderer, workspace, sites: twoSites, registry: both, token: "t0k" }));
    const fetchTwo = (url: string, init?: RequestInit) => two(new Request(url, init));

    test("a second plugin reaches its own endpoints, not the first plugin's or the app's", async () => {
      calls.length = 0;
      const echo = await fetchTwo("app://demo/api/demo/echo?q=2");
      assert.deepEqual(await echo.json(), { prefix: "/api/demo/echo", path: "/", q: "2" });
      for (const [url, init] of [
        ["app://demo/api/paper-wiki/status", undefined],
        ["app://demo/api/chat/sessions", { headers: { "X-OS-UI-Token": "t0k" } }],
        ["app://demo/api/skill/toggle", json({ skill: "s" })],
        ["app://paper-wiki/api/demo/echo", undefined],
        ["app://research-os/api/demo/echo", undefined],
      ] as const) {
        assert.equal((await fetchTwo(url, init)).status, 404, url);
      }
      assert.deepEqual(calls.map((c) => c.mount), ["/api/demo/echo"], "only the plugin's own handler ran");
    });

    test("a plugin origin is given its own entry only, never the app's list or the whole registry", async () => {
      calls.length = 0;
      // A mount below /api/demo/ that the app's list, and so `all`, holds but demo's own entry does not.
      const stray = registryOf([mount("/api/demo/secret", false)], { demo: [mount("/api/demo/echo", false)] });
      const handler = createHandler(() => ({ renderer, workspace, sites: twoSites, registry: stray, token: "t0k" }));
      assert.equal((await handler(new Request("app://demo/api/demo/secret"))).status, 404);
      assert.equal((await handler(new Request("app://demo/api/demo/echo"))).status, 200);
      assert.deepEqual(calls.map((c) => c.mount), ["/api/demo/echo"]);
    });

    test("a plugin with no entry in the registry has no endpoints, not the app's", async () => {
      calls.length = 0;
      const none = registryOf([mount("/api/demo/secret", false), mount("/api/chat", false)], {});
      const handler = createHandler(() => ({ renderer, workspace, sites: twoSites, registry: none, token: "t0k" }));
      for (const url of ["app://demo/api/demo/secret", "app://demo/api/demo/echo"]) {
        assert.equal((await handler(new Request(url))).status, 404, url);
      }
      assert.equal(calls.length, 0);
    });

    test("/api/<id> is matched at a segment boundary, so demo and demo-x stay apart", () => {
      const demoX: LoadedPlugin = {
        manifest: { contract: "^1.0", id: "demo-x", name: "Demo X", version: "1", contributes: { handlers: ["h"] } },
        source: "bundled",
        dir: join(demoRoot, "demo-x"),
      };
      const three = pluginSites([...bundled.plugins, ...demo.plugins, demoX]);
      const roots = { renderer, workspace };
      assert.equal(route("app://demo/api/demo-x/h", roots, three).kind, "not-found");
      assert.equal(route("app://demo-x/api/demo/h", roots, three).kind, "not-found");
      assert.equal(route("app://demo/api/demox", roots, three).kind, "not-found");
      assert.deepEqual(route("app://demo-x/api/demo-x/h", roots, three), { kind: "api", pathname: "/api/demo-x/h", host: "demo-x" });
      assert.deepEqual(route("app://demo/api/demo/h", roots, three), { kind: "api", pathname: "/api/demo/h", host: "demo" });
    });

    test("a plugin's own /api/<id>/ is the API; any other api/ path is no file and no endpoint", async () => {
      // Under its own prefix, a path no handler serves gets the API's answer.
      const other = await fetchTwo("app://paper-wiki/api/paper-wiki/other");
      assert.equal(other.status, 404);
      assert.deepEqual(await other.json(), { error: "no endpoint /api/paper-wiki/other" });
      assert.equal(route("app://paper-wiki/api/paper-wiki", { renderer, workspace }, sites).kind, "api");
      // Anywhere else below api/, the plain not-found of a missing file, whatever the workspace holds.
      mkdirSync(join(workspace, "paper-wiki", "api"), { recursive: true });
      writeFileSync(join(workspace, "paper-wiki", "api", "x.txt"), "api");
      for (const url of ["app://paper-wiki/api", "app://paper-wiki/api/", "app://paper-wiki/api/x.txt", "app://demo/api/x.txt", "app://demo/api//demo/echo"]) {
        const res = await fetchTwo(url);
        assert.equal(res.status, 404, url);
        assert.equal(await res.text(), "Not found", url);
      }
    });

    test("_os/ is never a site file: 404 on every plugin origin, even where such a file exists, for plugins with no reads", async () => {
      mkdirSync(join(workspace, "paper-wiki", "_os", "files"), { recursive: true });
      writeFileSync(join(workspace, "paper-wiki", "_os", "x.txt"), "os");
      writeFileSync(join(workspace, "paper-wiki", "_os", "files", "a.md"), "os");
      for (const url of [
        "app://paper-wiki/_os",
        "app://paper-wiki/_os/",
        "app://paper-wiki/_os/x.txt",
        "app://paper-wiki/_os/files/a.md",
        "app://paper-wiki/_os/files/papers/a.md",
        "app://paper-wiki/_os/list/papers",
        "app://demo/_os/x.txt",
        "app://demo/_os/files/index.html",
      ]) {
        assert.equal((await fetchTwo(url)).status, 404, url);
      }
      // The read channel's, not a file: it serves Paper Wiki, which has no reads, nothing.
      assert.equal(route("app://paper-wiki/_os/files/papers/a.md", { renderer, workspace }, sites).kind, "read");
    });

    test("reserved paths are reserved in any case, and with a trailing dot or space, on both kinds of site", async () => {
      // Real files under api/ and _os/, which a case-insensitive file system would find by any spelling.
      for (const dir of [join(workspace, "paper-wiki"), demoSite]) {
        for (const sub of ["api", "_os"]) {
          mkdirSync(join(dir, sub), { recursive: true });
          writeFileSync(join(dir, sub, "x.txt"), sub);
        }
      }
      writeFileSync(join(workspace, "paper-wiki", "apiary.md"), "a note");
      for (const host of ["paper-wiki", "demo"]) {
        for (const rel of ["API/x.txt", "Api", "Api/x.txt", "_OS/x.txt", "_Os", "_oS/x.txt", "api./x.txt", "api%20/x.txt", "_os./x.txt", "API%2E/x.txt"]) {
          const url = `app://${host}/${rel}`;
          assert.equal(route(url, { renderer, workspace }, twoSites).kind, "not-found", url);
          assert.equal((await fetchTwo(url)).status, 404, url);
        }
      }
      assert.equal((await fetchTwo("app://paper-wiki/apiary.md")).status, 200, "a name that merely starts with api is a file");
    });

    test("a host that is not a loaded plugin is not found, files and endpoints alike", async () => {
      for (const url of ["app://code-view/index.html", "app://code-view/api/code-view/x", "app://demo/index.html"]) {
        assert.equal(route(url, { renderer, workspace }, sites).kind, "not-found", url);
        assert.equal((await fetchApp(url)).status, 404, url);
      }
    });

    test("no workspace: a plugin's endpoints are a 503, other api/ paths stay not found", async () => {
      const closed = createHandler(() => ({ renderer, workspace: null, sites: twoSites, registry: null, token: "t" }));
      const statusOf = async (url: string) => (await closed(new Request(url))).status;
      assert.equal(await statusOf("app://paper-wiki/api/paper-wiki/status"), 503);
      assert.equal(await statusOf("app://paper-wiki/api/paper-wiki/other"), 503);
      assert.equal(await statusOf("app://demo/api/demo/echo"), 503);
      assert.equal(await statusOf("app://paper-wiki/api/chat/sessions"), 404);
      assert.equal(await statusOf("app://paper-wiki/viz.html"), 404);
    });

    describe("a site in its plugin folder", () => {
      test("a bundled plugin's is confined lexically to site/ (it may sit in the asar), with the plugin policy", () => {
        const page = route("app://demo/index.html", { renderer, workspace }, twoSites);
        assert.deepEqual(page, { kind: "file", root: demoSite, rel: "index.html", fallback: null, csp: PLUGIN_CSP, confined: false });
        assert.equal(route("app://demo/", { renderer, workspace }, twoSites).kind, "not-found", "no index fallback");
      });

      test("carries the policy on every response, not only HTML", async () => {
        for (const [url, type] of [
          ["app://demo/index.html", "text/html; charset=utf-8"],
          ["app://demo/app.js", "text/javascript; charset=utf-8"],
          ["app://demo/img/logo.svg", "image/svg+xml"],
        ] as const) {
          const res = await fetchTwo(url);
          assert.equal(res.status, 200, url);
          assert.equal(res.headers.get("content-type"), type, url);
          assert.equal(res.headers.get("content-security-policy"), PLUGIN_CSP, url);
          assert.equal(res.headers.get("x-content-type-options"), "nosniff", url);
        }
        assert.equal(await (await fetchTwo("app://demo/index.html")).text(), "<html>demo</html>");
      });

      test("refuses traversal out of site/ and serves no folder", async () => {
        for (const url of [
          "app://demo/..%2fplugin.json",
          "app://demo/..%2fsecret.txt",
          "app://demo/%2e%2e/secret.txt",
          "app://demo/%2e%2e%2fsecret.txt",
          "app://demo/..%5csecret.txt",
          "app://demo/img/..%2f..%2fsecret.txt",
          "app://demo/../secret.txt",
          "app://demo/secret.txt",
          "app://demo/plugin.json",
          "app://demo/img",
        ]) {
          const res = await fetchTwo(url);
          assert.equal(res.status, 404, url);
          assert.ok(!(await res.text()).includes("SECRET"), url);
        }
      });

      test("is the app's own files, so it needs no workspace; files are read-only", async () => {
        const closed = createHandler(() => ({ renderer, workspace: null, sites: twoSites, registry: null, token: "t" }));
        const res = await closed(new Request("app://demo/index.html"));
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("content-security-policy"), PLUGIN_CSP);
        assert.equal((await fetchTwo("app://demo/index.html", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } })).status, 405);
      });

      test("any other plugin's is confined by real path: a link out of site/ is not followed", async () => {
        const root = tempTree({
          "loc/plugin.json": JSON.stringify({
            contract: "^1.0",
            id: "loc",
            name: "Local",
            version: "1",
            contributes: { projectViews: [{ id: "main", title: "Local", entry: "index.html" }] },
          }),
          "loc/site/index.html": "<html>local</html>",
          "outside/secret.txt": "SECRET",
        });
        const site = join(root, "loc", "site");
        symlinkSync(join(root, "outside"), join(site, "dirlink"), process.platform === "win32" ? "junction" : "dir");
        const links = ["app://loc/dirlink/secret.txt"];
        try {
          symlinkSync(join(root, "outside", "secret.txt"), join(site, "leak.txt"));
          links.push("app://loc/leak.txt");
        } catch (error) {
          // Windows without the symlink privilege: the junction above still covers escapes.
          if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
        }
        const local = loadPlugins(root, ["loc"], "local", { trunk: TRUNK_MOUNTS, plugins: bundled.plugins });
        assert.deepEqual(local.problems, []);
        const withLocal = pluginSites([...bundled.plugins, ...local.plugins]);
        const page = route("app://loc/index.html", { renderer, workspace }, withLocal);
        assert.deepEqual(page, { kind: "file", root: site, rel: "index.html", fallback: null, csp: PLUGIN_CSP, confined: true });

        const handler = createHandler(() => ({ renderer, workspace, sites: withLocal, registry: null, token: "t" }));
        const ok = await handler(new Request("app://loc/index.html"));
        assert.equal(ok.status, 200);
        assert.equal(await ok.text(), "<html>local</html>");
        assert.equal(ok.headers.get("content-security-policy"), PLUGIN_CSP);
        for (const url of links) {
          const res = await handler(new Request(url));
          assert.equal(res.status, 404, url);
          assert.ok(!(await res.text()).includes("SECRET"), url);
        }
      });
    });
  });
});

describe("the real bundled plugins, registry, and handler together", () => {
  // The same join the client makes: loadPlugins at start, createRegistry per workspace, one handler.
  const ws = tempTree({ "AGENTS.md": "agents", "paper-wiki/viz.html": "<html>viz</html>" });
  const runner = fakeRunner();
  const registry = createRegistry({ ctx: context(ws, { run: runner.run }), trunk: TRUNK_MOUNTS, plugins: bundled.plugins, factories: BUNDLED_HANDLERS });
  const handler = createHandler(() => ({ renderer, workspace: ws, sites, registry, token: "t0k" }));
  const fetchReal = (url: string, init?: RequestInit) => handler(new Request(url, init));

  test("Paper Wiki's origin reaches its status endpoint and nothing of the trunk's", async () => {
    const status = await fetchReal("app://paper-wiki/api/paper-wiki/status");
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { writable: true, values: ["unread", "skimmed", "read"] });
    for (const [url, init] of [
      ["app://paper-wiki/api/chat/sessions", { headers: { "X-OS-UI-Token": "t0k" } }],
      ["app://paper-wiki/api/skill/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"skill":"s"}' }],
    ] as const) {
      const res = await fetchReal(url, init);
      assert.equal(res.status, 404, url);
      assert.equal(await res.text(), "Not found", `${url} reached no handler`);
    }
    assert.equal(runner.calls.length, 0, "no handler ran a command");
  });

  test("the app's origin reaches the trunk, and not Paper Wiki's status", async () => {
    const here = await fetchReal("app://research-os/api/paper-wiki/status");
    assert.equal(here.status, 404);
    assert.deepEqual(await here.json(), { error: "no endpoint /api/paper-wiki/status" });
    const sessions = await fetchReal("app://research-os/api/chat/sessions?cwd=", { headers: { "X-OS-UI-Token": "t0k" } });
    assert.equal(sessions.status, 200);
  });
});

describe("read channel", () => {
  /** A link at `at` to the folder `to`: a junction on Windows, which needs no privilege. */
  const dirLink = (to: string, at: string) => symlinkSync(to, at, process.platform === "win32" ? "junction" : "dir");
  /** A link at `at` to the file `to`; false on Windows without the symlink privilege. */
  const fileLink = (to: string, at: string): boolean => {
    try {
      symlinkSync(to, at, "file");
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
      return false;
    }
  };

  const CODE = "projects-folder/Alpha/Code";
  /** The files of CODE that the listing shows, with their contents. */
  const codeFiles: Record<string, string> = {
    "Zed.txt": "zed",
    "a b.txt": "space",
    "app.js": "alert(1)",
    "data.json": "{}",
    "doc.xhtml": "<html xmlns='http://www.w3.org/1999/xhtml'><script>alert(1)</script></html>",
    "fig.svg": "<svg xmlns='http://www.w3.org/2000/svg'/>",
    "lib.cjs": "module.exports = 1",
    "mod.mjs": "export {}",
    "notes.md": "# notes",
    "page.htm": "<script>alert(1)</script>",
    "page.html": "<script>alert(2)</script>",
    "run.py": "print(1)",
  };
  const ws = tempTree({
    "AGENTS.md": "agents",
    ".env": "SECRET=top",
    ".git/config": "SECRET top git",
    "human/private/secret.md": "SECRET private",
    "projects-folder/Alpha/PROJECT_MEMORY.md": "SECRET memory",
    ...Object.fromEntries(Object.entries(codeFiles).map(([name, text]) => [`${CODE}/${name}`, text])),
    [`${CODE}/sub/deep.txt`]: "deep",
    [`${CODE}/.env`]: "SECRET code env",
    [`${CODE}/.git/config`]: "SECRET code git",
    [`${CODE}/.venv/lib/x.py`]: "SECRET venv",
    "projects-folder/Alpha/paper/main.tex": "\\documentclass{article}",
    "projects-folder/Beta/Code/b.py": "b",
    "projects-folder/Caps/Code/many/.hidden": "",
  });
  const outside = tempTree({ "x.txt": "SECRET outside", "proj/y.txt": "SECRET outside root" });
  const code = join(ws, CODE);

  // Links inside the root: out of it, out of the workspace, onto dot paths, and to places inside it.
  dirLink(outside, join(code, "out-dir"));
  dirLink(join(ws, "human", "private"), join(code, "to-private"));
  dirLink(join(code, ".git"), join(code, "git-link"));
  dirLink(join(code, "sub"), join(code, ".alias"));
  dirLink(join(code, "sub"), join(code, "sub-link"));
  const fileLinks = {
    outFile: fileLink(join(outside, "x.txt"), join(code, "out-file.txt")),
    env: fileLink(join(code, ".env"), join(code, "env-link")),
    inside: fileLink(join(code, "sub", "deep.txt"), join(code, "in-link.txt")),
    dangling: fileLink(join(ws, "nowhere.txt"), join(code, "dangling.txt")),
  };
  // A FIFO, which blocks whoever opens it to read: neither a file nor a folder.
  const fifo = process.platform !== "win32";
  if (fifo) execFileSync("mkfifo", [join(code, "fifo")]);
  // Roots that are themselves links: out of the workspace, inside it, onto a dot folder, onto the workspace.
  for (const [project, to] of [
    ["Gamma", join(outside, "proj")],
    ["Delta", join(ws, "projects-folder", "Beta", "Code")],
    ["Eps", join(ws, ".git")],
    ["Zeta", ws],
  ] as const) {
    mkdirSync(join(ws, "projects-folder", project));
    dirLink(to, join(ws, "projects-folder", project, "Code"));
  }

  const manifest = (id: string, reads: string[]) =>
    JSON.stringify({ contract: "^1.0", id, name: id, version: "1", reads, contributes: { projectViews: [{ id: "main", title: id, entry: "index.html" }] } });
  const pluginRoot = tempTree({
    "reads-code/plugin.json": manifest("reads-code", ["projects-folder/*/Code"]),
    "reads-code/site/index.html": "<html>code</html>",
    // Site files under _os/, which a site route would serve: the channel's prefixes never do.
    "reads-code/site/_os/x": "SITE FILE",
    "reads-code/site/_os/files/x": "SITE FILE",
    "reads-code/site/_os/list/x": "SITE FILE",
    "reads-code/site/_os/other/x": "SITE FILE",
    "reads-paper/plugin.json": manifest("reads-paper", ["projects-folder/*/paper"]),
    "reads-local/plugin.json": manifest("reads-local", ["projects-folder/Beta/Code"]),
  });
  const withReads = loadPlugins(pluginRoot, ["reads-code", "reads-paper"], "bundled", { trunk: TRUNK_MOUNTS, plugins: bundled.plugins });
  const local = loadPlugins(pluginRoot, ["reads-local"], "local", { trunk: TRUNK_MOUNTS, plugins: [...bundled.plugins, ...withReads.plugins] });
  const readSites = pluginSites([...bundled.plugins, ...withReads.plugins, ...local.plugins]);
  const roots = { renderer, workspace: ws };
  const handler = createHandler(() => ({ renderer, workspace: ws, sites: readSites, registry: registryOf([], {}), token: "t" }));
  const fetchRead = (url: string, init?: RequestInit) => handler(new Request(url, init));
  const files = (rel: string, host = "reads-code") => `app://${host}/_os/files/${rel}`;
  const list = (rel: string, host = "reads-code") => `app://${host}/_os/list/${rel}`;

  /** The headers every channel response carries, refusals included. */
  const assertReadHeaders = (res: Response, url: string) => {
    assert.equal(res.headers.get("x-content-type-options"), "nosniff", url);
    assert.equal(res.headers.get("cache-control"), "no-store", url);
    assert.equal(res.headers.get("content-security-policy"), READ_CSP, url);
  };
  /** A 404 from the channel, which gives away nothing of the file. */
  const assertRefused = async (url: string, init?: RequestInit) => {
    const res = await fetchRead(url, init);
    assert.equal(res.status, 404, url);
    assertReadHeaders(res, url);
    const text = await res.text();
    assert.equal(text, init?.method === "HEAD" ? "" : "Not found", url);
  };
  const okText = async (url: string) => {
    const res = await fetchRead(url);
    assert.equal(res.status, 200, url);
    assertReadHeaders(res, url);
    return res.text();
  };
  const okList = async (url: string) => {
    const res = await fetchRead(url);
    assert.equal(res.status, 200, url);
    assertReadHeaders(res, url);
    assert.equal(res.headers.get("content-type"), "application/json", url);
    return (await res.json()) as { entries: { name: string; dir: boolean; size: number }[]; truncated?: boolean };
  };

  test("the fixture plugins load, each with its own reads, a local one included", () => {
    assert.deepEqual([...withReads.problems, ...local.problems], []);
    assert.deepEqual(
      [...readSites.values()].map((s) => [s.id, s.source, s.reads]),
      [
        ["paper-wiki", "bundled", []],
        ["reads-code", "bundled", ["projects-folder/*/Code"]],
        ["reads-paper", "bundled", ["projects-folder/*/paper"]],
        ["reads-local", "local", ["projects-folder/Beta/Code"]],
      ],
    );
  });

  test("rule 1: only the exact, lower-case _os/files/ and _os/list/ are the channel; nothing under _os is ever a site file", async () => {
    assert.deepEqual(route(files(`${CODE}/run.py`), roots, readSites), {
      kind: "read",
      site: readSites.get("reads-code"),
      encoded: `${CODE}/run.py`,
      list: false,
    });
    assert.deepEqual(route(list(CODE), roots, readSites), { kind: "read", site: readSites.get("reads-code"), encoded: CODE, list: true });
    assert.deepEqual(route(files("a%2Fb"), roots, readSites), { kind: "read", site: readSites.get("reads-code"), encoded: "a%2Fb", list: false }, "not decoded yet");
    for (const rel of [
      "_OS/files/x",
      "_Os/list/x",
      "_os./files/x",
      "_os%20/files/x",
      "_os/Files/x",
      "_os/FILES/x",
      "_os/List/x",
      "_os/files./x",
      "_os/other/x",
      "_os/x",
      "_os",
      "_os/",
      "_os/files",
      "_os/list",
      "%5Fos/files/x",
      "%5fos/list/x",
      "_os%2Ffiles/x",
      "_os/files%2Fx",
      "_os/%66iles/x",
      "_os//files/x",
    ]) {
      const url = `app://reads-code/${rel}`;
      assert.equal(route(url, roots, readSites).kind, "not-found", url);
      const res = await fetchRead(url);
      assert.equal(res.status, 404, url);
      assert.ok(!(await res.text()).includes("SITE FILE"), url);
    }
    // The channel's own answer for the site files' paths: no root holds "x".
    for (const url of [files("x"), list("x")]) await assertRefused(url);
    assert.equal(await (await fetchRead("app://reads-code/index.html")).text(), "<html>code</html>", "the site itself is unchanged");
  });

  test("rule 2: the app's origin and hosts that are no loaded plugin have no channel", async () => {
    // As before the channel: the renderer's files, with index.html for extension-less paths.
    assert.deepEqual(route(`app://research-os/_os/files/${CODE}/run.py`, roots, readSites), {
      kind: "file",
      root: renderer,
      rel: `_os/files/${CODE}/run.py`,
      fallback: null,
      csp: null,
      confined: false,
    });
    const deep = route(`app://research-os/_os/list/${CODE}`, roots, readSites);
    assert.ok(deep.kind === "file" && deep.root === renderer && deep.fallback === "index.html");
    const file = await fetchRead(`app://research-os/_os/files/${CODE}/run.py`);
    assert.equal(file.status, 404);
    assert.equal(await file.text(), "Not found");
    const page = await fetchRead(`app://research-os/_os/list/${CODE}`);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), "<html>app</html>", "the app's page, not a listing");
    assert.equal(page.headers.get("content-security-policy"), appCsp([...readSites.keys()]));
    for (const url of [files(`${CODE}/run.py`, "code-view"), list(CODE, "code-view")]) {
      assert.equal(route(url, roots, readSites).kind, "not-found", url);
      assert.equal((await fetchRead(url)).status, 404, url);
    }
  });

  test("rule 3: GET and HEAD only; HEAD has the headers and no body", async () => {
    for (const method of ["POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
      for (const url of [files(`${CODE}/run.py`), list(CODE), files(".env")]) {
        const res = await fetchRead(url, { method, ...(method === "OPTIONS" ? {} : { body: "{}", headers: { "Content-Type": "application/json" } }) });
        assert.equal(res.status, 405, `${method} ${url}`);
        assert.equal(res.headers.get("allow"), "GET, HEAD", `${method} ${url}`);
        assertReadHeaders(res, url);
        assert.equal(await res.text(), "Method not allowed", `${method} ${url}`);
      }
    }
    const head = await fetchRead(files(`${CODE}/run.py`), { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-type"), "application/octet-stream");
    assertReadHeaders(head, "HEAD file");
    assert.equal(await head.text(), "");
    const headList = await fetchRead(list(CODE), { method: "HEAD" });
    assert.equal(headList.status, 200);
    assert.equal(headList.headers.get("content-type"), "application/json");
    assert.equal(await headList.text(), "");
    await assertRefused(files(`${CODE}/missing.txt`), { method: "HEAD" });
  });

  test("rule 4: no folder open is a 404 (after the method check)", async () => {
    const closed = createHandler(() => ({ renderer, workspace: null, sites: readSites, registry: null, token: "t" }));
    for (const url of [files(`${CODE}/run.py`), list(CODE)]) {
      const res = await closed(new Request(url));
      assert.equal(res.status, 404, url);
      assertReadHeaders(res, url);
    }
    assert.equal((await closed(new Request(files(`${CODE}/run.py`), { method: "POST", body: "{}" }))).status, 405);
  });

  test("rule 5: the path is decoded once, and no segment of it may start with '.'", async () => {
    assert.equal(await okText(files(`${CODE}/sub/deep.txt`)), "deep");
    assert.equal(await okText(files(`${CODE}/a%20b.txt`)), "space");
    assert.equal(await okText(files(`${CODE}/sub%2Fdeep.txt`)), "deep", "%2F decodes to a separator, once");
    for (const rel of [
      ".env",
      ".git/config",
      `${CODE}/.env`,
      `${CODE}/%2Eenv`,
      `${CODE}/.git/config`,
      `${CODE}/.venv/lib/x.py`,
      // A dot-named link to a folder that is not: only the request path shows the dot.
      `${CODE}/.alias/deep.txt`,
      `${CODE}/..%2f..%2f..%2f.env`,
      `${CODE}/..%5c..%5c..%5c.env`,
      `${CODE}/%2e%2e/PROJECT_MEMORY.md`,
      `${CODE}/sub/..%2f..%2fPROJECT_MEMORY.md`,
      // Decoded twice, these would name deep.txt and ../run.py.
      `${CODE}/sub/%2564eep.txt`,
      `${CODE}/sub/%252e%252e/run.py`,
      `${CODE}/sub%252Fdeep.txt`,
      `${CODE}/run.py%00`,
      `${CODE}/run.py:stream`,
      "",
    ]) {
      await assertRefused(files(rel));
    }
    for (const rel of ["", ".git", `${CODE}/.git`, `${CODE}/.alias`, `${CODE}/.venv`]) await assertRefused(list(rel));
  });

  test("rule 6: only paths in one of the plugin's reads roots, which a plugin without reads has none of", async () => {
    assert.equal(await okText(files(`${CODE}/run.py`)), "print(1)");
    assert.equal(await okText(files("projects-folder/Beta/Code/b.py")), "b", "'*' matches any project");
    for (const rel of [
      "AGENTS.md",
      "human/private/secret.md",
      "projects-folder/Alpha/PROJECT_MEMORY.md",
      "projects-folder/Alpha/paper/main.tex",
      "projects-folder/Alpha/Code-old/x",
      "projects-folder/Code/run.py",
    ]) {
      await assertRefused(files(rel));
    }
    for (const rel of ["projects-folder", "projects-folder/Alpha", "human"]) await assertRefused(list(rel));
    for (const url of [files(`${CODE}/run.py`, "paper-wiki"), list(CODE, "paper-wiki"), files("paper-wiki/viz.html", "paper-wiki")]) {
      await assertRefused(url);
    }
  });

  test("rule 7: the target's real path stays inside the root's: links out of it are not followed", async () => {
    const refused = [files(`${CODE}/out-dir/x.txt`), files(`${CODE}/to-private/secret.md`), list(`${CODE}/out-dir`), list(`${CODE}/to-private`)];
    if (fileLinks.outFile) refused.push(files(`${CODE}/out-file.txt`));
    for (const url of refused) await assertRefused(url);
    // Links that stay inside the root are followed.
    assert.equal(await okText(files(`${CODE}/sub-link/deep.txt`)), "deep");
    assert.deepEqual((await okList(list(`${CODE}/sub-link`))).entries, [{ name: "deep.txt", dir: false, size: 4 }]);
    if (fileLinks.inside) assert.equal(await okText(files(`${CODE}/in-link.txt`)), "deep");
  });

  test("rule 8: a link inside the root onto one of its dot paths is refused, as a file and as a listing", async () => {
    const refused = [files(`${CODE}/git-link/config`), list(`${CODE}/git-link`)];
    if (fileLinks.env) refused.push(files(`${CODE}/env-link`));
    for (const url of refused) await assertRefused(url);
  });

  test("rule 9: a root that resolves out of the workspace, onto a dot folder of it, or onto the workspace itself is refused", async () => {
    for (const url of [
      files("projects-folder/Gamma/Code/y.txt"),
      list("projects-folder/Gamma/Code"),
      files("projects-folder/Eps/Code/config"),
      list("projects-folder/Eps/Code"),
      files("projects-folder/Zeta/Code/AGENTS.md"),
      list("projects-folder/Zeta/Code"),
    ]) {
      await assertRefused(url);
    }
    // A root that is a link to another folder inside the workspace is followed.
    assert.equal(await okText(files("projects-folder/Delta/Code/b.py")), "b");
    assert.deepEqual((await okList(list("projects-folder/Delta/Code"))).entries, [{ name: "b.py", dir: false, size: 1 }]);
  });

  test("rule 10: a listing shows names, folders, and sizes, sorted, without dot names, links leaving the root or onto dot paths, or anything else", { timeout: 10_000 }, async () => {
    const expected = [
      ...Object.entries(codeFiles).map(([name, text]) => ({ name, dir: false, size: Buffer.byteLength(text) })),
      ...(fileLinks.inside ? [{ name: "in-link.txt", dir: false, size: 4 }] : []),
      { name: "sub", dir: true, size: 0 },
      { name: "sub-link", dir: true, size: 0 },
    ];
    // Sorted by UTF-16 code unit, so "Zed.txt" comes first and "page.htm" before "page.html".
    expected.sort((a, b) => (a.name < b.name ? -1 : 1));
    assert.deepEqual(expected.slice(0, 3).map((e) => e.name), ["Zed.txt", "a b.txt", "app.js"]);
    assert.deepEqual(await okList(list(CODE)), { entries: expected });
    assert.deepEqual(await okList(list(`${CODE}/sub`)), { entries: [{ name: "deep.txt", dir: false, size: 4 }] });
    // A listing of a file or of nothing, and a file that is a folder, nothing, or a FIFO, are 404.
    const refused = [list(`${CODE}/run.py`), list(`${CODE}/missing`), files(`${CODE}/sub`), files(`${CODE}/missing.txt`), files(CODE)];
    if (fifo) refused.push(files(`${CODE}/fifo`), list(`${CODE}/fifo`));
    if (fileLinks.dangling) refused.push(files(`${CODE}/dangling.txt`));
    for (const url of refused) await assertRefused(url);
  });

  test("rule 11: a file above the cap is 413 without being read; a listing stops at its cap and says so", async () => {
    assert.equal(READ_MAX_BYTES, 32 * 1024 * 1024);
    assert.equal(LIST_MAX_ENTRIES, 5000);
    const caps = join(ws, "projects-folder", "Caps", "Code");
    // Sparse where the file system allows: a size, no 32 MiB written.
    writeFileSync(join(caps, "big.bin"), "");
    truncateSync(join(caps, "big.bin"), READ_MAX_BYTES + 1);
    writeFileSync(join(caps, "edge.bin"), "");
    truncateSync(join(caps, "edge.bin"), READ_MAX_BYTES);
    const big = await fetchRead(files("projects-folder/Caps/Code/big.bin"));
    assert.equal(big.status, 413);
    assertReadHeaders(big, "big.bin");
    assert.equal(big.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(await big.text(), "Too large for the read channel");
    const bigHead = await fetchRead(files("projects-folder/Caps/Code/big.bin"), { method: "HEAD" });
    assert.equal(bigHead.status, 413);
    assert.equal(await bigHead.text(), "");
    assert.equal((await fetchRead(files("projects-folder/Caps/Code/edge.bin"), { method: "HEAD" })).status, 200, "the cap itself is allowed");

    const many = join(caps, "many");
    const name = (i: number) => `f${String(i).padStart(4, "0")}.txt`;
    for (let i = 0; i <= LIST_MAX_ENTRIES; i++) writeFileSync(join(many, name(i)), "");
    const full = await okList(list("projects-folder/Caps/Code/many"));
    assert.equal(full.entries.length, LIST_MAX_ENTRIES);
    assert.equal(full.truncated, true);
    assert.deepEqual([full.entries[0]!.name, full.entries.at(-1)!.name], [name(0), name(LIST_MAX_ENTRIES - 1)]);
    unlinkSync(join(many, name(LIST_MAX_ENTRIES)));
    const exact = await okList(list("projects-folder/Caps/Code/many"));
    assert.equal(exact.entries.length, LIST_MAX_ENTRIES);
    assert.ok(!("truncated" in exact), "exactly the cap is the whole folder");
  });

  test("rule 12: every response carries nosniff, no-store and the sandbox policy; scripts and HTML go as plain text", async () => {
    assert.equal(READ_CSP, "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'");
    for (const [file, type] of [
      ["app.js", "text/plain; charset=utf-8"],
      ["mod.mjs", "text/plain; charset=utf-8"],
      ["lib.cjs", "text/plain; charset=utf-8"],
      ["page.html", "text/plain; charset=utf-8"],
      ["page.htm", "text/plain; charset=utf-8"],
      ["doc.xhtml", "text/plain; charset=utf-8"],
      ["notes.md", "text/plain; charset=utf-8"],
      ["fig.svg", "image/svg+xml"],
      ["data.json", "application/json; charset=utf-8"],
      ["run.py", "application/octet-stream"],
    ] as const) {
      const url = files(`${CODE}/${file}`);
      const res = await fetchRead(url);
      assert.equal(res.status, 200, url);
      assert.equal(res.headers.get("content-type"), type, url);
      assertReadHeaders(res, url);
      assert.equal(await res.text(), codeFiles[file], `${url}: the bytes as they are`);
    }
    // Refusals carry them too (asserted in assertRefused for 404; 405 and 413 above).
    await assertRefused(files(`${CODE}/missing.txt`));
  });

  test("rule 13: each origin reads only inside its own roots", async () => {
    assert.equal(await okText(files("projects-folder/Alpha/paper/main.tex", "reads-paper")), "\\documentclass{article}");
    await assertRefused(files("projects-folder/Alpha/paper/main.tex", "reads-code"));
    await assertRefused(files(`${CODE}/run.py`, "reads-paper"));
    await assertRefused(list(CODE, "reads-paper"));
    assert.deepEqual((await okList(list("projects-folder/Alpha/paper", "reads-paper"))).entries, [{ name: "main.tex", dir: false, size: 23 }]);
  });

  test("rule 14: a local plugin reads its manifest's roots like a bundled one", async () => {
    assert.equal(await okText(files("projects-folder/Beta/Code/b.py", "reads-local")), "b");
    await assertRefused(files(`${CODE}/run.py`, "reads-local"));
  });
});
