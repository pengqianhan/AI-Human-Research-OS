import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs, {
  appendFileSync,
  chmodSync,
  closeSync,
  constants,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  symlinkSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { open } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
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
  fileStream,
  isInside,
  LIST_MAX_ENTRIES,
  openRegular,
  PLUGIN_CSP,
  pluginSites,
  READ_CSP,
  READ_MAX_BYTES,
  READ_MAX_STREAMS,
  route,
  safeRelative,
  streamLimit,
  workspaceRegistry,
  WORKSPACE_CSP,
} from "../src/main/protocol.ts";
import { tempTree } from "./helpers.ts";

/** The bundled plugins, from the real os-ui/frontend/plugins folder, as the client loads them at startup. */
const PLUGINS = join(import.meta.dirname, "..", "..", "frontend", "plugins");
const bundled = loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", { trunk: TRUNK_MOUNTS, plugins: [] });
const sites = pluginSites(bundled.plugins);
const CSP = appCsp(["paper-wiki", "code-view", "paper-view", "skeleton-view", "assets-view", "idea-view", "skills-hub"]);

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
    assert.deepEqual([...twoSites.keys()], ["paper-wiki", "code-view", "paper-view", "skeleton-view", "assets-view", "idea-view", "skills-hub", "demo"]);
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
    // The bundled plugins: Paper Wiki, the Code view, the Paper view, the Skeleton view, the Assets view, the Idea view, and Skills Hub, each framed on its own origin.
    assert.deepEqual([...sites.keys()], ["paper-wiki", "code-view", "paper-view", "skeleton-view", "assets-view", "idea-view", "skills-hub"]);
    assert.equal(
      appCsp([...sites.keys()]),
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src app://paper-wiki app://code-view app://paper-view app://skeleton-view app://assets-view app://idea-view app://skills-hub; object-src 'none'; base-uri 'none'; form-action 'none'",
    );
    assert.match(appCsp(["paper-wiki", "demo"]), /; frame-src app:\/\/paper-wiki app:\/\/demo; /);
    assert.match(appCsp(["demo", "paper-wiki"]), /; frame-src app:\/\/demo app:\/\/paper-wiki; /);
    assert.match(appCsp([]), /; frame-src 'none'; /, "no plugin loaded: no frame at all");
  });

  test("app pages carry the policy for the sites the handler was given, in their order", () => {
    const index = route("app://research-os/", { renderer, workspace }, twoSites);
    assert.ok(index.kind === "file" && index.csp === appCsp(["paper-wiki", "code-view", "paper-view", "skeleton-view", "assets-view", "idea-view", "skills-hub", "demo"]));
  });

  test("a workspace site's policy, and a plugin-folder site's, which adds its own files", () => {
    assert.equal(
      WORKSPACE_CSP,
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'none'",
    );
    assert.equal(
      PLUGIN_CSP,
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'none'",
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

  test("with the bundled plugins, each view's origin is a subframe's only, and a look-alike host is none", () => {
    const bundledHosts = [...sites.keys()];
    for (const url of ["app://code-view/index.html?project=P", "app://paper-view/index.html?project=P", "app://skeleton-view/index.html?project=P", "app://assets-view/index.html?project=P", "app://idea-view/index.html?project=P", "app://skills-hub/index.html"]) {
      assert.equal(allowedNavigation(url, false, bundledHosts), true, url);
      assert.equal(allowedNavigation(url, true, bundledHosts), false, `top frame: ${url}`);
    }
    for (const url of ["app://paper-view.evil/", "app://paper-viewx/index.html", "app://paper-view", "app://paper/index.html"]) {
      assert.equal(allowedNavigation(url, false, bundledHosts), false, url);
    }
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

    test("_os/ is kept for the read channel: 404 on every plugin origin, even where such a file exists", async () => {
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
      assert.equal(route("app://paper-wiki/_os/files/papers/a.md", { renderer, workspace }, sites).kind, "not-found");
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
      for (const url of ["app://nope-view/index.html", "app://nope-view/api/nope-view/x", "app://demo/index.html"]) {
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

  test("the app's origin reaches the trunk, and not Paper Wiki's status nor a skill toggle", async () => {
    const here = await fetchReal("app://research-os/api/paper-wiki/status");
    assert.equal(here.status, 404);
    assert.deepEqual(await here.json(), { error: "no endpoint /api/paper-wiki/status" });
    // The trunk's toggle went with step 2.5: the app's origin, which holds the bridge, reaches no skill toggle.
    for (const path of ["/api/skill/toggle", "/api/skills-hub/toggle"]) {
      const toggle = await fetchReal(`app://research-os${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"skill":"s","target":"repo-claude"}' });
      assert.equal(toggle.status, 404, path);
      assert.deepEqual(await toggle.json(), { error: `no endpoint ${path}` });
    }
    assert.equal(runner.calls.length, 0);
    const sessions = await fetchReal("app://research-os/api/chat/sessions?cwd=", { headers: { "X-OS-UI-Token": "t0k" } });
    assert.equal(sessions.status, 200);
  });
});

/*
 * Skills Hub (os-ui/PLUGINS.md Part 4, §2 and §3): the trunk's skill toggle as
 * the bundled handler `toggle`, reached only from app://skills-hub, and the
 * generator's snapshot as its one read root (way R, a file root).
 */
describe("Skills Hub's toggle and snapshot, on its own origin", () => {
  const SNAPSHOT = "os-ui/frontend/public/state.json";
  const ws = tempTree({
    "AGENTS.md": "SECRET agents",
    [SNAPSHOT]: '{"store":{"collections":[],"orphans":[]}}',
    "os-ui/frontend/public/other.json": "SECRET other",
    "os-ui/frontend/index.html": "SECRET index",
  });
  const installer = join(ws, "research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py");
  const runner = fakeRunner(() => ({ code: 0, stdout: "disable:  repo-claude  SKILL.md -> SKILL.md.disabled\n", stderr: "" }));
  let regenerated = 0;
  const ctx = context(ws, { run: runner.run, regenerate: async () => (regenerated++, null) });
  const registry = createRegistry({ ctx, trunk: TRUNK_MOUNTS, plugins: bundled.plugins, factories: BUNDLED_HANDLERS });
  const handler = createHandler(() => ({ renderer, workspace: ws, sites, registry, token: "t0k" }));
  const fetchHub = (url: string, init?: RequestInit) => handler(new Request(url, init));
  const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  test("a JSON POST on app://skills-hub reaches the installer with today's argv, then regenerates the snapshot", async () => {
    const res = await fetchHub("app://skills-hub/api/skills-hub/toggle", json({ skill: "e2e-copied", collection: "e2e-copy", target: "repo-claude", enable: false }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, output: "disable:  repo-claude  SKILL.md -> SKILL.md.disabled", snapshotError: null });
    assert.deepEqual(runner.calls.map((c) => [c.command, c.cwd]), [[["py", installer, "disable", "e2e-copied", "--target", "repo-claude", "--collection", "e2e-copy"], ws]]);
    assert.equal(regenerated, 1);
  });

  test("text/plain is 415 and GET is 405, as JSON, and neither runs anything", async () => {
    const before = runner.calls.length;
    const plain = await fetchHub("app://skills-hub/api/skills-hub/toggle", { method: "POST", headers: { "Content-Type": "text/plain" }, body: '{"skill":"a","target":"repo-claude"}' });
    assert.equal(plain.status, 415);
    assert.deepEqual(await plain.json(), { error: "writes must be application/json" });
    const form = await fetchHub("app://skills-hub/api/skills-hub/toggle", { method: "POST", body: new URLSearchParams({ skill: "a", target: "repo-claude" }) });
    assert.equal(form.status, 415);
    const get = await fetchHub("app://skills-hub/api/skills-hub/toggle");
    assert.equal(get.status, 405);
    assert.deepEqual(await get.json(), { error: "POST only" });
    assert.equal(runner.calls.length, before);
  });

  test("no other origin reaches it, and Skills Hub's origin reaches nothing else", async () => {
    const before = runner.calls.length;
    const app = await fetchHub("app://research-os/api/skills-hub/toggle", json({ skill: "s", target: "repo-claude" }));
    assert.equal(app.status, 404);
    assert.deepEqual(await app.json(), { error: "no endpoint /api/skills-hub/toggle" });
    for (const [url, init] of [
      ["app://paper-wiki/api/skills-hub/toggle", json({ skill: "s", target: "repo-claude" })],
      ["app://code-view/api/skills-hub/toggle", json({ skill: "s", target: "repo-claude" })],
      ["app://skills-hub/api/skill/toggle", json({ skill: "s", target: "repo-claude" })],
      ["app://skills-hub/api/chat/sessions", { headers: { "X-OS-UI-Token": "t0k" } }],
      ["app://skills-hub/api/paper-wiki/status", {}],
      ["app://skills-hub/api/skills-hub", json({ skill: "s", target: "repo-claude" })],
    ] as const) {
      const res = await fetchHub(url, init);
      if (url === "app://skills-hub/api/skills-hub") {
        // Its own prefix with no handler below it: the registry's 404, as JSON.
        assert.equal(res.status, 404, url);
        assert.deepEqual(await res.json(), { error: "no endpoint /api/skills-hub" });
        continue;
      }
      assert.equal(res.status, 404, url);
      assert.equal(await res.text(), "Not found", `${url} reached no handler`);
    }
    assert.equal(runner.calls.length, before, "nothing ran");
  });

  test("its read channel serves the snapshot file and nothing beside, above, or below it", async () => {
    const files = (rel: string) => `app://skills-hub/_os/files?path=${encodeURIComponent(rel)}`;
    const list = (rel: string) => `app://skills-hub/_os/list?path=${encodeURIComponent(rel)}`;
    const ok = await fetchHub(files(SNAPSHOT));
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("content-security-policy"), READ_CSP);
    assert.equal(await ok.text(), '{"store":{"collections":[],"orphans":[]}}');
    assert.equal((await fetchHub(files(SNAPSHOT), { method: "HEAD" })).status, 200);
    for (const method of ["GET", "HEAD"]) {
      for (const url of [
        files("os-ui/frontend/public/other.json"),
        files("os-ui/frontend/index.html"),
        files(`${SNAPSHOT}/x`),
        files("AGENTS.md"),
        files("os-ui/frontend/public"),
        list("os-ui/frontend/public"),
        list(SNAPSHOT),
        list("os-ui/frontend"),
      ]) {
        const res = await fetchHub(url, { method });
        assert.equal(res.status, 404, `${method} ${url}`);
        assert.ok(!(await res.text()).includes("SECRET"), url);
      }
    }
    // Another plugin's origin does not read it.
    assert.equal((await fetchHub(`app://skeleton-view/_os/files?path=${encodeURIComponent(SNAPSHOT)}`)).status, 404);
  });

  test("a snapshot that is a link to another file of the workspace is 404", async (t) => {
    const linked = tempTree({ "AGENTS.md": "SECRET agents", "os-ui/frontend/public/.keep": "" });
    try {
      symlinkSync(join(linked, "AGENTS.md"), join(linked, SNAPSHOT), "file");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
      t.skip("Windows without the symlink privilege");
      return;
    }
    const linkedHandler = createHandler(() => ({ renderer, workspace: linked, sites, registry, token: "t0k" }));
    const res = await linkedHandler(new Request(`app://skills-hub/_os/files?path=${encodeURIComponent(SNAPSHOT)}`));
    assert.equal(res.status, 404);
    assert.ok(!(await res.text()).includes("SECRET"));
  });
});

describe("read channel", () => {
  const posix = process.platform !== "win32";
  /** A link at `at` to the folder `to`: a junction on Windows, which needs no privilege. */
  const dirLink = (to: string, at: string) => symlinkSync(to, at, posix ? "dir" : "junction");
  /** The same as a relative link, as a cloned repository holds one (a junction, which is absolute, on Windows). */
  const relLink = (to: string, at: string) => (posix ? symlinkSync(path.relative(path.dirname(at), to), at, "dir") : dirLink(to, at));
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
  /**
   * Counts, while `run` runs, the channel's path lookups (realpath), the folders it opens, the
   * names it reads from them, and the folders it closes by hand. protocol.ts imported these from
   * node:fs/promises before the patch; syncBuiltinESMExports carries the patch into that import.
   */
  const counting = async (run: () => Promise<void>) => {
    const promises = fs.promises as unknown as Record<"realpath" | "opendir", unknown>;
    const realpath = fs.promises.realpath;
    const opendir = fs.promises.opendir;
    const counts = { lookups: 0, names: 0, opened: 0, closed: 0 };
    promises.realpath = (...args: Parameters<typeof realpath>) => {
      counts.lookups++;
      return realpath(...args);
    };
    promises.opendir = async (...args: Parameters<typeof opendir>) => {
      const dir = await opendir(...args);
      counts.opened++;
      const entries = dir[Symbol.asyncIterator].bind(dir);
      dir[Symbol.asyncIterator] = async function* () {
        for await (const entry of entries()) {
          counts.names++;
          yield entry;
        }
      } as typeof dir[typeof Symbol.asyncIterator];
      const close = dir.close.bind(dir);
      dir.close = (() => {
        counts.closed++;
        return close();
      }) as typeof dir.close;
      return dir;
    };
    syncBuiltinESMExports();
    try {
      await run();
    } finally {
      promises.realpath = realpath;
      promises.opendir = opendir;
      syncBuiltinESMExports();
    }
    return counts;
  };
  /** `promise`, or "timeout" after `ms`: what a regression that blocks would otherwise hang the run on. */
  const within = <T,>(ms: number, promise: Promise<T>): Promise<T | "timeout"> => {
    let timer: NodeJS.Timeout | undefined;
    const late = new Promise<"timeout">((done) => (timer = setTimeout(() => done("timeout"), ms)));
    return Promise.race([promise, late]).finally(() => clearTimeout(timer));
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
    // U+1F600 and U+FF5E: code-unit order puts the first first; code-point and UTF-8 order (APFS's) the second.
    "\u{1F600}.txt": "smile",
    "～.txt": "tilde",
  };
  const ws = tempTree({
    "AGENTS.md": "agents",
    ".env": "SECRET=top",
    ".git/config": "SECRET top git",
    "human/private/secret.md": "SECRET private",
    "human/private/stash/Code/secret.md": "SECRET stash",
    "projects-folder/Alpha/PROJECT_MEMORY.md": "SECRET memory",
    ...Object.fromEntries(Object.entries(codeFiles).map(([name, text]) => [`${CODE}/${name}`, text])),
    [`${CODE}/sub/deep.txt`]: "deep",
    [`${CODE}/.env`]: "SECRET code env",
    [`${CODE}/.git/config`]: "SECRET code git",
    [`${CODE}/.venv/lib/x.py`]: "SECRET venv",
    "projects-folder/Alpha/paper/main.tex": "\\documentclass{article}",
    "projects-folder/Beta/Code/b.py": "b",
    "projects-folder/Beta/Code/lib/l.py": "l",
    // Spelled "code" on disk, where the plugin declares "Code".
    "projects-folder/Low/code/x.py": "SECRET low",
    // A file root (reads-file): each project's paper_skeleton.md, and files beside, above, and below where "*" would match.
    "projects-folder/Alpha/paper_skeleton.md": "# Alpha skeleton\n",
    "projects-folder/Beta/paper_skeleton.md": "# Beta skeleton\n",
    "projects-folder/paper_skeleton.md": "SECRET no project segment",
    "projects-folder/Deep/Nest/paper_skeleton.md": "SECRET two project segments",
    // Spelled otherwise on disk than declared.
    "projects-folder/LowS/Paper_Skeleton.md": "SECRET low skeleton",
  });
  const outside = tempTree({ "x.txt": "SECRET outside", "proj/y.txt": "SECRET outside root" });
  const code = join(ws, CODE);
  const project = (name: string) => join(ws, "projects-folder", name);

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
  // A FIFO, which blocks whoever opens it to read without O_NONBLOCK: neither a file nor a folder.
  const fifo = join(code, "fifo");
  if (posix) execFileSync("mkfifo", [fifo]);
  /** Lets a read blocked on the FIFO go on, so a regression fails its test instead of hanging the run. */
  const unblockFifo = () => {
    try {
      closeSync(openSync(fifo, constants.O_WRONLY | constants.O_NONBLOCK));
    } catch {
      // No reader is waiting on it.
    }
  };
  // Roots that are themselves links: out of the workspace, onto a dot folder, onto the workspace.
  for (const [name, to] of [
    ["Gamma", join(outside, "proj")],
    ["Eps", join(ws, ".git")],
    ["Zeta", ws],
  ] as const) {
    mkdirSync(project(name));
    dirLink(to, join(project(name), "Code"));
  }
  // Cloned projects whose links lead elsewhere in the workspace, as Git keeps them (relative):
  // Code to human/private, to a project folder, or below another root; a project folder into human/private.
  for (const [name, to] of [
    ["Evil", join(ws, "human", "private")],
    ["Evil2", project("Alpha")],
    ["Below", join(project("Beta"), "Code", "lib")],
    // A root linked to another root the plugin may read.
    ["Delta", join(project("Beta"), "Code")],
  ] as const) {
    mkdirSync(project(name));
    relLink(to, join(project(name), "Code"));
  }
  relLink(join(ws, "human", "private", "stash"), project("Evil3"));
  // A project folder linked to another project: its Code is that project's, a root too.
  relLink(project("Beta"), project("Mirror"));
  // A path in no root that is a link to one: still no root's path.
  relLink(join(project("Beta"), "Code"), join(ws, "human", "alias"));

  const manifest = (id: string, reads: string[]) =>
    JSON.stringify({ contract: "^1.0", id, name: id, version: "1", reads, contributes: { projectViews: [{ id: "main", title: id, entry: "index.html" }] } });
  const pluginRoot = tempTree({
    "reads-code/plugin.json": manifest("reads-code", ["projects-folder/*/Code"]),
    "reads-code/site/index.html": "<html>code</html>",
    // Site files under _os/, which a site route would serve: the channel's paths never do.
    "reads-code/site/_os/x": "SITE FILE",
    "reads-code/site/_os/files/x": "SITE FILE",
    "reads-code/site/_os/list/x": "SITE FILE",
    "reads-code/site/_os/other/x": "SITE FILE",
    "reads-paper/plugin.json": manifest("reads-paper", ["projects-folder/*/paper"]),
    "reads-local/plugin.json": manifest("reads-local", ["projects-folder/Beta/Code"]),
    // A root that is a file, as the Skeleton view declares it (os-ui/PLUGINS.md Part 3, §1 fact 1).
    "reads-file/plugin.json": manifest("reads-file", ["projects-folder/*/paper_skeleton.md"]),
  });
  const withReads = loadPlugins(pluginRoot, ["reads-code", "reads-paper", "reads-file"], "bundled", { trunk: TRUNK_MOUNTS, plugins: bundled.plugins });
  const local = loadPlugins(pluginRoot, ["reads-local"], "local", { trunk: TRUNK_MOUNTS, plugins: [...bundled.plugins, ...withReads.plugins] });
  const readSites = pluginSites([...bundled.plugins, ...withReads.plugins, ...local.plugins]);
  const roots = { renderer, workspace: ws };
  const handler = createHandler(() => ({ renderer, workspace: ws, sites: readSites, registry: registryOf([], {}), token: "t" }));
  const fetchRead = (url: string, init?: RequestInit) => handler(new Request(url, init));
  /** A channel URL; `raw` is the `path` value as written in the URL, %-escapes and all. */
  const files = (raw: string, host = "reads-code") => `app://${host}/_os/files?path=${raw}`;
  const list = (raw: string, host = "reads-code") => `app://${host}/_os/list?path=${raw}`;

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
        ["code-view", "bundled", ["projects-folder/*/Code"]],
        ["paper-view", "bundled", ["projects-folder/*/paper"]],
        ["skeleton-view", "bundled", ["projects-folder/*/paper_skeleton.md"]],
        [
          "assets-view",
          "bundled",
          [
            "projects-folder/*/Figs",
            "projects-folder/*/Baselines",
            "projects-folder/*/Code/results",
            "projects-folder/*/Code/Datasets",
            "projects-folder/*/Code/README.md",
            "projects-folder/*/paper_skeleton.md",
          ],
        ],
        ["idea-view", "bundled", ["projects-folder/*/idea_graph.md", "projects-folder/*/paper_skeleton.md"]],
        ["skills-hub", "bundled", ["os-ui/frontend/public/state.json"]],
        ["reads-code", "bundled", ["projects-folder/*/Code"]],
        ["reads-paper", "bundled", ["projects-folder/*/paper"]],
        ["reads-file", "bundled", ["projects-folder/*/paper_skeleton.md"]],
        ["reads-local", "local", ["projects-folder/Beta/Code"]],
      ],
    );
  });

  test("rule 1: only the exact, lower-case /_os/files and /_os/list are the channel, the path in the query; nothing under _os is a site file", async () => {
    const site = readSites.get("reads-code");
    assert.deepEqual(route(files(`${CODE}/run.py`), roots, readSites), { kind: "read", site, paths: [`${CODE}/run.py`], list: false });
    assert.deepEqual(route(list(CODE), roots, readSites), { kind: "read", site, paths: [CODE], list: true });
    assert.deepEqual(route(files("a%2Fb+c%2Bd"), roots, readSites), { kind: "read", site, paths: ["a/b c+d"], list: false }, "decoded once by the URL parser");
    assert.deepEqual(route("app://reads-code/_os/files", roots, readSites), { kind: "read", site, paths: [], list: false });
    assert.deepEqual(route("app://reads-code/_os/list?path=a&path=b", roots, readSites), { kind: "read", site, paths: ["a", "b"], list: true });
    for (const rel of [
      "_OS/files?path=x",
      "_Os/list?path=x",
      "_os./files?path=x",
      "_os%20/files?path=x",
      "_os/Files?path=x",
      "_os/FILES?path=x",
      "_os/List?path=x",
      "_os/files.?path=x",
      "_os/files%20?path=x",
      "_os/files/?path=x",
      "_os/list/?path=x",
      // The path in the URL path, as the channel once took it.
      "_os/files/x",
      "_os/list/x",
      `_os/files/${CODE}/run.py`,
      `_os/list/${CODE}`,
      "_os/other?path=x",
      "_os/x",
      "_os",
      "_os/",
      "%5Fos/files?path=x",
      "%5fos/list?path=x",
      "_os%2Ffiles?path=x",
      "_os/%66iles?path=x",
      "_os//files?path=x",
    ]) {
      const url = `app://reads-code/${rel}`;
      assert.equal(route(url, roots, readSites).kind, "not-found", url);
      const res = await fetchRead(url);
      assert.equal(res.status, 404, url);
      const text = await res.text();
      assert.ok(!text.includes("SITE FILE") && !text.includes("print(1)"), url);
    }
    // The channel's own answer for the site files' names: no root holds "x".
    for (const url of [files("x"), list("x")]) await assertRefused(url);
    assert.equal(await (await fetchRead("app://reads-code/index.html")).text(), "<html>code</html>", "the site itself is unchanged");
  });

  test("rule 2: the app's origin and hosts that are no loaded plugin have no channel", async () => {
    // As before the channel: renderer paths, with index.html for extension-less ones.
    for (const url of [`app://research-os/_os/files?path=${CODE}/run.py`, `app://research-os/_os/list?path=${CODE}`]) {
      const r = route(url, roots, readSites);
      assert.ok(r.kind === "file" && r.root === renderer && r.fallback === "index.html", url);
      const page = await fetchRead(url);
      assert.equal(page.status, 200, url);
      assert.equal(await page.text(), "<html>app</html>", `${url}: the app's page, not the file`);
      assert.equal(page.headers.get("content-security-policy"), appCsp([...readSites.keys()]), url);
    }
    assert.deepEqual(route(`app://research-os/_os/files/${CODE}/run.py`, roots, readSites), {
      kind: "file",
      root: renderer,
      rel: `_os/files/${CODE}/run.py`,
      fallback: null,
      csp: null,
      confined: false,
    });
    const file = await fetchRead(`app://research-os/_os/files/${CODE}/run.py`);
    assert.equal(file.status, 404);
    assert.equal(await file.text(), "Not found");
    for (const url of [files(`${CODE}/run.py`, "nope-view"), list(CODE, "nope-view")]) {
      assert.equal(route(url, roots, readSites).kind, "not-found", url);
      assert.equal((await fetchRead(url)).status, 404, url);
    }
  });

  test("rule 3: GET and HEAD only; HEAD has the headers and no body", async () => {
    for (const method of ["POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
      for (const url of [files(`${CODE}/run.py`), list(CODE), files(".env"), "app://reads-code/_os/files"]) {
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
    await assertRefused(list(`${CODE}/run.py`), { method: "HEAD" });
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

  test("rule 5: exactly one path, decoded once, with no segment starting with '.'", async () => {
    assert.equal(await okText(files(`${CODE}/sub/deep.txt`)), "deep");
    assert.equal(await okText(files(`${CODE}/a%20b.txt`)), "space");
    assert.equal(await okText(files(`${CODE}/a+b.txt`)), "space", "a + is a space, as in any query");
    assert.equal(await okText(files(`${CODE}/sub%2Fdeep.txt`)), "deep", "%2F decodes to a separator, once");
    assert.equal(await okText(`${files(`${CODE}/run.py`)}&v=2`), "print(1)", "other parameters are ignored");
    for (const raw of [
      ".env",
      ".git/config",
      `${CODE}/.env`,
      `${CODE}/%2Eenv`,
      `${CODE}/.git/config`,
      `${CODE}/.venv/lib/x.py`,
      // A dot-named link to a folder that is not: only the request path shows the dot.
      `${CODE}/.alias/deep.txt`,
      // A query is not a URL path: nothing removes ".." from it but this check.
      `${CODE}/../PROJECT_MEMORY.md`,
      `${CODE}/%2e%2e/PROJECT_MEMORY.md`,
      `${CODE}/sub/..%2f..%2fPROJECT_MEMORY.md`,
      `${CODE}/..%5c..%5c..%5c.env`,
      // Decoded twice, these would name deep.txt and ../run.py.
      `${CODE}/sub/%2564eep.txt`,
      `${CODE}/sub/%252e%252e/run.py`,
      `${CODE}/sub%252Fdeep.txt`,
      `${CODE}/run.py%00`,
      `${CODE}/run.py:stream`,
      "%E0%A4%A",
      "",
    ]) {
      await assertRefused(files(raw));
    }
    for (const url of [
      "app://reads-code/_os/files",
      "app://reads-code/_os/files?",
      `app://reads-code/_os/files?Path=${CODE}/run.py`,
      `${files(`${CODE}/run.py`)}&path=${CODE}/run.py`,
      `${files(`${CODE}/run.py`)}&path=`,
      "app://reads-code/_os/list",
      `${list(CODE)}&path=${CODE}`,
    ]) {
      await assertRefused(url);
    }
    for (const raw of ["", ".git", `${CODE}/.git`, `${CODE}/.alias`, `${CODE}/.venv`]) await assertRefused(list(raw));
  });

  test("rule 6: only paths in one of the plugin's reads roots, which a plugin without reads has none of", async () => {
    assert.equal(await okText(files(`${CODE}/run.py`)), "print(1)");
    assert.equal(await okText(files("projects-folder/Beta/Code/b.py")), "b", "'*' matches any project");
    for (const raw of [
      "AGENTS.md",
      "human/private/secret.md",
      "projects-folder/Alpha/PROJECT_MEMORY.md",
      "projects-folder/Alpha/paper/main.tex",
      "projects-folder/Alpha/Code-old/x",
      "projects-folder/Code/run.py",
    ]) {
      await assertRefused(files(raw));
    }
    for (const raw of ["projects-folder", "projects-folder/Alpha", "human", "human/alias"]) await assertRefused(list(raw));
    await assertRefused(files("human/alias/b.py"));
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

  test("rule 9: a root whose real path leaves the workspace, is the workspace, or is a dot folder of it, is refused", async () => {
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
  });

  test("a root that is a link, or below one, must resolve to one of the plugin's own roots: a planted link cannot move it", async () => {
    // Refused: a cloned project's Code linked to human/private, to a project folder, or below
    // another root, and a project folder linked into human/private (an earlier segment).
    for (const raw of [
      "projects-folder/Evil/Code/secret.md",
      "projects-folder/Evil/Code/stash/Code/secret.md",
      "projects-folder/Evil2/Code/PROJECT_MEMORY.md",
      "projects-folder/Evil2/Code/Code/run.py",
      "projects-folder/Below/Code/l.py",
      "projects-folder/Evil3/Code/secret.md",
    ]) {
      await assertRefused(files(raw));
    }
    for (const raw of ["projects-folder/Evil/Code", "projects-folder/Evil2/Code", "projects-folder/Below/Code", "projects-folder/Evil3/Code"]) {
      await assertRefused(list(raw));
    }
    // Followed: a root linked to another root, itself or through its project folder.
    const beta = [
      { name: "b.py", dir: false, size: 1 },
      { name: "lib", dir: true, size: 0 },
    ];
    for (const name of ["Delta", "Mirror"]) {
      assert.equal(await okText(files(`projects-folder/${name}/Code/b.py`)), "b", name);
      assert.equal(await okText(files(`projects-folder/${name}/Code/lib/l.py`)), "l", name);
      assert.deepEqual((await okList(list(`projects-folder/${name}/Code`))).entries, beta, name);
    }
  });

  test("a request spelled in another case than the disk: refused or the same file, never a way around the declared root", async () => {
    const caseless = existsSync(join(ws, "PROJECTS-FOLDER"));
    // The "*" segment matches any spelling, and the root's real path is the disk's: Beta/Code, a root.
    if (caseless) {
      assert.equal(await okText(files("projects-folder/beta/Code/b.py")), "b");
      assert.deepEqual((await okList(list("projects-folder/BETA/Code"))).entries.map((e) => e.name), ["b.py", "lib"]);
    } else {
      await assertRefused(files("projects-folder/beta/Code/b.py"));
    }
    // A literal segment in another case is no root, before the disk is asked.
    await assertRefused(files("projects-folder/Beta/code/b.py"));
    await assertRefused(files("Projects-Folder/Beta/Code/b.py"));
    // A folder spelled on disk otherwise than declared is readable by neither spelling.
    for (const url of [files("projects-folder/Low/Code/x.py"), files("projects-folder/Low/code/x.py"), list("projects-folder/Low/Code")]) {
      await assertRefused(url);
    }
  });

  test("rule 10: a listing shows names, folders, and sizes, sorted, without dot names, links leaving the root or onto dot paths, or anything else", async () => {
    const expected = [
      ...Object.entries(codeFiles).map(([name, text]) => ({ name, dir: false, size: Buffer.byteLength(text) })),
      ...(fileLinks.inside ? [{ name: "in-link.txt", dir: false, size: 4 }] : []),
      { name: "sub", dir: true, size: 0 },
      { name: "sub-link", dir: true, size: 0 },
    ];
    // Sorted by UTF-16 code unit, as JavaScript's default sort: "Zed.txt" comes first,
    // "page.htm" before "page.html", and U+1F600 before U+FF5E, whatever order the file system keeps.
    expected.sort((a, b) => (a.name < b.name ? -1 : 1));
    assert.deepEqual(expected.slice(0, 3).map((e) => e.name), ["Zed.txt", "a b.txt", "app.js"]);
    assert.deepEqual(expected.slice(-2).map((e) => e.name), ["\u{1F600}.txt", "～.txt"]);
    assert.deepEqual(await okList(list(CODE)), { entries: expected });
    assert.deepEqual(await okList(list(`${CODE}/sub`)), { entries: [{ name: "deep.txt", dir: false, size: 4 }] });
    // A listing of a file or of nothing, and a file that is a folder or nothing, are 404.
    const refused = [list(`${CODE}/run.py`), list(`${CODE}/missing`), files(`${CODE}/sub`), files(`${CODE}/missing.txt`), files(CODE)];
    if (posix) refused.push(list(`${CODE}/fifo`));
    if (fileLinks.dangling) refused.push(files(`${CODE}/dangling.txt`));
    for (const url of refused) await assertRefused(url);
  });

  test("rule 11: a file above the cap is 413 before a byte is read, readable or not", async () => {
    assert.equal(READ_MAX_BYTES, 32 * 1024 * 1024);
    const caps = join(ws, "projects-folder", "Caps", "Code");
    mkdirSync(caps, { recursive: true });
    // Sparse where the file system allows: a size, no 32 MiB written.
    for (const [name, size] of [
      ["big.bin", READ_MAX_BYTES + 1],
      ["edge.bin", READ_MAX_BYTES],
      ["locked.bin", READ_MAX_BYTES + 1],
      ["locked.txt", 5],
    ] as const) {
      writeFileSync(join(caps, name), "");
      truncateSync(join(caps, name), size);
    }
    for (const method of ["GET", "HEAD"]) {
      const big = await fetchRead(files("projects-folder/Caps/Code/big.bin"), { method });
      assert.equal(big.status, 413, method);
      assertReadHeaders(big, `${method} big.bin`);
      assert.equal(big.headers.get("content-type"), "text/plain; charset=utf-8");
      assert.equal(await big.text(), method === "HEAD" ? "" : "Too large for the read channel");
    }
    assert.equal((await fetchRead(files("projects-folder/Caps/Code/edge.bin"), { method: "HEAD" })).status, 200, "the cap itself is allowed");
    // Without read permission, the cap still answers from the size: nothing is opened for it.
    if (posix && process.getuid?.() !== 0) {
      chmodSync(join(caps, "locked.bin"), 0o000);
      chmodSync(join(caps, "locked.txt"), 0o000);
      try {
        for (const method of ["GET", "HEAD"]) {
          assert.equal((await fetchRead(files("projects-folder/Caps/Code/locked.bin"), { method })).status, 413, method);
          await assertRefused(files("projects-folder/Caps/Code/locked.txt"), { method });
        }
      } finally {
        chmodSync(join(caps, "locked.bin"), 0o644);
        chmodSync(join(caps, "locked.txt"), 0o644);
      }
    }
  });

  test("rule 11: a listing reads at most LIST_MAX_ENTRIES names and says so; HEAD does not list", async () => {
    assert.equal(LIST_MAX_ENTRIES, 5000);
    const caps = join(ws, "projects-folder", "Caps", "Code");
    const many = join(caps, "many");
    mkdirSync(many, { recursive: true });
    const name = (i: number) => `f${String(i).padStart(4, "0")}.txt`;
    for (let i = 0; i <= LIST_MAX_ENTRIES; i++) writeFileSync(join(many, name(i)), "");
    const full = await okList(list("projects-folder/Caps/Code/many"));
    assert.equal(full.entries.length, LIST_MAX_ENTRIES);
    assert.equal(full.truncated, true);
    unlinkSync(join(many, name(LIST_MAX_ENTRIES)));
    const exact = await okList(list("projects-folder/Caps/Code/many"));
    assert.equal(exact.entries.length, LIST_MAX_ENTRIES);
    assert.deepEqual([exact.entries[0]!.name, exact.entries.at(-1)!.name], [name(0), name(LIST_MAX_ENTRIES - 1)]);
    assert.ok(!("truncated" in exact), "exactly the cap is the whole folder");

    // Names count whether or not the listing keeps them: a folder of dangling links, more than the
    // cap, has LIST_MAX_ENTRIES + 1 names read (the last says there are more) and each kept one
    // looked up once; HEAD reads no names and closes the folder it opened.
    const dangling = join(caps, "dangling");
    mkdirSync(dangling);
    if (!fileLink(join(ws, "nowhere"), join(dangling, "l0"))) return; // Windows without the symlink privilege
    for (let i = 1; i < LIST_MAX_ENTRIES + 100; i++) symlinkSync(join(ws, "nowhere"), join(dangling, `l${i}`), "file");
    const get = await counting(async () => {
      assert.deepEqual(await okList(list("projects-folder/Caps/Code/dangling")), { entries: [], truncated: true });
    });
    // Three lookups resolve the workspace, the root, and the folder; one per name kept after that.
    assert.deepEqual([get.names, get.lookups], [LIST_MAX_ENTRIES + 1, 3 + LIST_MAX_ENTRIES]);
    const head = await counting(async () => {
      const res = await fetchRead(list("projects-folder/Caps/Code/dangling"), { method: "HEAD" });
      assert.equal(res.status, 200);
    });
    assert.deepEqual(head, { lookups: 3, names: 0, opened: 1, closed: 1 });
  });

  test("a file is opened without blocking and checked as opened: a FIFO is a fast 404", { skip: !posix }, async () => {
    try {
      assert.equal(await within(10_000, fetchRead(files(`${CODE}/fifo`)).then((r) => r.status)), 404, "through the handler");
      assert.equal(await within(10_000, openRegular(fifo)), 404, "openRegular alone, with no stat before it");
    } finally {
      unblockFifo();
    }
    // The checks apply to the file actually opened, a link in the last segment is never followed.
    assert.equal(await openRegular(code), 404, "a folder");
    const big = join(tempTree({ "big.bin": "" }), "big.bin");
    truncateSync(big, READ_MAX_BYTES + 1);
    assert.equal(await openRegular(big), 413);
    await assert.rejects(openRegular(join(code, "sub-link")), /ELOOP/, "a link is not followed");
    const opened = await openRegular(join(code, "run.py"));
    assert.ok(typeof opened === "object" && opened.size === 8);
    await opened.handle.close();
  });

  test("openRegular closes what it opened when it refuses it or cannot stat it", async () => {
    // Every handle protocol.ts opens is kept, to see that each is closed (fd -1).
    const promises = fs.promises as unknown as Record<"open", unknown>;
    const original = fs.promises.open;
    const handles: FileHandle[] = [];
    let failStat = false;
    promises.open = async (...args: Parameters<typeof original>) => {
      const handle = await original(...args);
      if (failStat) Object.defineProperty(handle, "stat", { value: () => Promise.reject(new Error("stat failed")) });
      handles.push(handle);
      return handle;
    };
    syncBuiltinESMExports();
    try {
      const big = join(tempTree({ "big.bin": "" }), "big.bin");
      truncateSync(big, READ_MAX_BYTES + 1);
      assert.equal(await openRegular(code), 404, "a folder");
      assert.equal(await openRegular(big), 413, "a file above the cap");
      failStat = true;
      await assert.rejects(openRegular(join(code, "run.py")), /stat failed/);
    } finally {
      promises.open = original;
      syncBuiltinESMExports();
    }
    assert.equal(handles.length, 3);
    assert.deepEqual(
      handles.map((h) => h.fd),
      [-1, -1, -1],
      "each closed",
    );
  });

  test("a body streams at most the size stat gave, ends at end of file, and closes its handle", async () => {
    const dir = tempTree();
    const text = (stream: ReadableStream<Uint8Array>) => within(10_000, new Response(stream).text());
    // Grown since its stat: only the stat'ed bytes.
    writeFileSync(join(dir, "grow"), "0123456789");
    let handle = await open(join(dir, "grow"), "r");
    appendFileSync(join(dir, "grow"), "MORE");
    assert.equal(await text(fileStream(handle, 10)), "0123456789");
    assert.equal(handle.fd, -1, "closed at the end");
    // Shrunk since its stat, across chunks: what is left, and no spinning at end of file.
    writeFileSync(join(dir, "shrink"), "x".repeat(200_000));
    handle = await open(join(dir, "shrink"), "r");
    truncateSync(join(dir, "shrink"), 70_000);
    const shrunk = await text(fileStream(handle, 200_000));
    assert.ok(typeof shrunk === "string" && shrunk.length === 70_000, `got ${typeof shrunk === "string" ? shrunk.length : shrunk}`);
    assert.equal(handle.fd, -1);
    // Empty.
    writeFileSync(join(dir, "empty"), "");
    handle = await open(join(dir, "empty"), "r");
    assert.equal(await text(fileStream(handle, 0)), "");
    assert.equal(handle.fd, -1);
    // Cancelled after one chunk.
    handle = await open(join(dir, "shrink"), "r");
    const reader = fileStream(handle, 70_000).getReader();
    assert.ok(((await reader.read()).value?.length ?? 0) > 0);
    await reader.cancel();
    assert.equal(handle.fd, -1, "closed on cancel");
    // A read that fails ends the stream with the error, and closes the handle.
    handle = await open(join(dir, "grow"), "r");
    await handle.close();
    await assert.rejects(new Response(fileStream(handle, 10)).text());
    handle = await open(join(dir, "grow"), "r");
    Object.defineProperty(handle, "read", { value: () => Promise.reject(new Error("read failed")) });
    let closed = 0;
    await assert.rejects(new Response(fileStream(handle, 10, () => closed++)).text(), /read failed/);
    assert.equal(handle.fd, -1, "closed on a failed read");
    assert.equal(closed, 1, "and its slot given back once");
    // The slot is given back once at the end and once on cancel, too.
    closed = 0;
    handle = await open(join(dir, "grow"), "r");
    assert.equal(await text(fileStream(handle, 10, () => closed++)), "0123456789");
    handle = await open(join(dir, "shrink"), "r");
    const cancelled = fileStream(handle, 70_000, () => closed++).getReader();
    await cancelled.read();
    await cancelled.cancel();
    await cancelled.cancel();
    assert.equal(closed, 2);
    // Through the handler, a file comes in chunks, not as one buffer of the whole file.
    const mib = join(ws, "projects-folder", "Beta", "Code", "mib.bin");
    writeFileSync(mib, "m".repeat(1024 * 1024));
    try {
      const reader = (await fetchRead(files("projects-folder/Beta/Code/mib.bin"))).body!.getReader();
      let total = 0;
      let largest = 0;
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        total += chunk.value.byteLength;
        largest = Math.max(largest, chunk.value.byteLength);
      }
      assert.equal(total, 1024 * 1024);
      assert.ok(largest <= 64 * 1024, `a chunk of ${largest} bytes`);
    } finally {
      unlinkSync(mib);
    }
  });

  test("no handle is left open by full, cancelled, or HEAD reads", { skip: !posix }, async () => {
    const openFds = () => readdirSync("/dev/fd").length;
    const before = openFds();
    for (let i = 0; i < 100; i++) assert.equal(await okText(files(`${CODE}/run.py`)), "print(1)");
    for (let i = 0; i < 100; i++) await (await fetchRead(files(`${CODE}/run.py`))).body!.cancel();
    for (let i = 0; i < 50; i++) await (await fetchRead(files(`${CODE}/run.py`), { method: "HEAD" })).text();
    for (let i = 0; i < 50; i++) await (await fetchRead(list(CODE), { method: "HEAD" })).text();
    assert.ok(openFds() <= before + 2, `${openFds()} descriptors open, ${before} before`);
  });

  test("streamLimit: at most `max` slots per id, each given back once, ids apart", () => {
    const limit = streamLimit(2);
    const a1 = limit.acquire("a");
    const a2 = limit.acquire("a");
    assert.ok(a1 && a2);
    assert.equal(limit.acquire("a"), null);
    assert.ok(limit.acquire("b"), "another id has its own slots");
    a1();
    a1();
    const a3 = limit.acquire("a");
    assert.ok(a3, "a slot given back");
    assert.equal(limit.acquire("a"), null, "a second release of the same slot gives nothing back");
  });

  test("each origin holds at most READ_MAX_STREAMS files open; 503 above it, without opening the file", async () => {
    assert.equal(READ_MAX_STREAMS, 16);
    // Larger than one chunk, so a held response keeps its file open.
    const streams = project("Streams");
    mkdirSync(join(streams, "Code"), { recursive: true });
    mkdirSync(join(streams, "paper"), { recursive: true });
    writeFileSync(join(streams, "Code", "big.txt"), "s".repeat(200_000));
    writeFileSync(join(streams, "Code", "small.txt"), "small");
    writeFileSync(join(streams, "paper", "big.txt"), "p".repeat(200_000));
    writeFileSync(join(streams, "Code", "locked.txt"), "locked");
    const fresh = createHandler(() => ({ renderer, workspace: ws, sites: readSites, registry: registryOf([], {}), token: "t" }));
    const get = (url: string, init?: RequestInit) => fresh(new Request(url, init));
    const big = files("projects-folder/Streams/Code/big.txt");
    const hold = async () => {
      const res = await get(big);
      assert.equal(res.status, 200);
      return res;
    };
    const assertBusy = async () => {
      for (const method of ["GET", "HEAD"]) {
        const res = await get(big, { method });
        assert.equal(res.status, 503, method);
        assertReadHeaders(res, `${method} at the cap`);
        assert.equal(await res.text(), method === "HEAD" ? "" : "Too many files open for reading; try again");
      }
    };
    // Refused, failed, HEAD, and small reads give their slot back at once.
    if (posix && process.getuid?.() !== 0) {
      chmodSync(join(streams, "Code", "locked.txt"), 0o000);
      try {
        for (let i = 0; i < 2 * READ_MAX_STREAMS; i++) assert.equal((await get(files("projects-folder/Streams/Code/locked.txt"))).status, 404);
      } finally {
        chmodSync(join(streams, "Code", "locked.txt"), 0o644);
      }
    }
    for (let i = 0; i < 2 * READ_MAX_STREAMS; i++) assert.equal((await get(big, { method: "HEAD" })).status, 200);
    const small = [];
    for (let i = 0; i < 2 * READ_MAX_STREAMS; i++) small.push(await get(files("projects-folder/Streams/Code/small.txt")));
    assert.deepEqual([...new Set(small.map((r) => r.status))], [200], "a file read in one chunk is closed at once, held or not");

    const held = [];
    for (let i = 0; i < READ_MAX_STREAMS; i++) held.push(await hold());
    await assertBusy();
    // What opens no file is not held back: listings, refusals, another origin's files.
    assert.equal((await get(list("projects-folder/Streams/Code"))).status, 200);
    assert.equal((await get(files("projects-folder/Streams/Code/missing.txt"))).status, 404);
    const other = await get(files("projects-folder/Streams/paper/big.txt", "reads-paper"));
    assert.equal(other.status, 200);
    assert.equal((await other.text()).length, 200_000);
    // A body read to its end gives its slot back, and so does a cancelled one.
    assert.equal((await held.pop()!.text()).length, 200_000);
    held.push(await hold());
    await assertBusy();
    await held.pop()!.body!.cancel();
    held.push(await hold());
    await assertBusy();
    // All given back: the whole cap again.
    for (const res of held.splice(0)) await res.body!.cancel();
    for (let i = 0; i < READ_MAX_STREAMS; i++) held.push(await hold());
    await assertBusy();
    for (const res of held) await res.body!.cancel();
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
    assert.deepEqual((await okList(list("projects-folder/Alpha/paper", "reads-paper"))).entries, [
      { name: "main.tex", dir: false, size: Buffer.byteLength("\\documentclass{article}") },
    ]);
  });

  test("rule 14: a local plugin reads its manifest's roots like a bundled one", async () => {
    assert.equal(await okText(files("projects-folder/Beta/Code/b.py", "reads-local")), "b");
    await assertRefused(files(`${CODE}/run.py`, "reads-local"));
  });

  /*
   * A root that names a file (os-ui/PLUGINS.md Part 3, §1 fact 1): the
   * Skeleton view's `projects-folder/*\/paper_skeleton.md`. The rules above
   * apply unchanged: a root names a path, not a kind of entry. When that
   * path is a file, nothing beside, above, or below it is read; when a
   * project holds a folder of that name, the folder's own contents are
   * readable as a folder root's are (the last test pins it and its limit).
   */
  describe("a file root", () => {
    const SKEL = "projects-folder/Alpha/paper_skeleton.md";
    const skel = (raw: string) => files(raw, "reads-file");
    const skelList = (raw: string) => list(raw, "reads-file");
    // Links at the file root: out of the workspace, into human/private, and to another project's file root.
    const skelLinks = {
      out: (mkdirSync(project("LinkOut")), fileLink(join(outside, "x.txt"), join(project("LinkOut"), "paper_skeleton.md"))),
      priv: (mkdirSync(project("LinkPriv")), fileLink(join(ws, "human", "private", "secret.md"), join(project("LinkPriv"), "paper_skeleton.md"))),
      peer: (mkdirSync(project("LinkPeer")), fileLink(join(project("Beta"), "paper_skeleton.md"), join(project("LinkPeer"), "paper_skeleton.md"))),
    };
    // Names Windows would read as the file itself (a trailing dot or space); elsewhere they are other files, so a
    // rule that compared names as Windows resolves them would serve these.
    if (posix) {
      writeFileSync(join(project("Alpha"), "paper_skeleton.md."), "SECRET trailing dot");
      writeFileSync(join(project("Alpha"), "paper_skeleton.md "), "SECRET trailing space");
    }

    test("the file itself is the root: GET and HEAD are 200; a path below it, a listing of it, a sibling, the project folder are 404", async () => {
      assert.equal(await okText(skel(SKEL)), "# Alpha skeleton\n");
      assert.equal(await okText(skel("projects-folder/Beta/paper_skeleton.md")), "# Beta skeleton\n", "'*' matches any project");
      const head = await fetchRead(skel(SKEL), { method: "HEAD" });
      assert.equal(head.status, 200);
      assertReadHeaders(head, "HEAD of the file root");
      assert.equal(head.headers.get("content-type"), "text/plain; charset=utf-8", ".md is sent as text");
      assert.equal(await head.text(), "");
      for (const method of ["GET", "HEAD"]) {
        for (const url of [
          skel(`${SKEL}/x`),
          skel(`${SKEL}/x/y.md`),
          skelList(SKEL),
          skelList(`${SKEL}/x`),
          skel("projects-folder/Alpha/PROJECT_MEMORY.md"),
          skel(`${CODE}/run.py`),
          skel("projects-folder/Alpha/paper/main.tex"),
          skel("projects-folder/Alpha"),
          skelList("projects-folder/Alpha"),
          skelList("projects-folder"),
          // A project folder without the file.
          skel("projects-folder/Low/paper_skeleton.md"),
        ]) {
          await assertRefused(url, { method });
        }
      }
      // Each origin keeps to its own roots: the folder-root plugin does not read the file, nor the file-root plugin Code/.
      await assertRefused(files(SKEL));
      assert.equal(await okText(files(`${CODE}/run.py`)), "print(1)");
    });

    test("a link at the file root is followed to another project's file root only, never to a file outside the root", async () => {
      if (skelLinks.out) await assertRefused(skel("projects-folder/LinkOut/paper_skeleton.md"));
      if (skelLinks.priv) await assertRefused(skel("projects-folder/LinkPriv/paper_skeleton.md"));
      if (skelLinks.peer) assert.equal(await okText(skel("projects-folder/LinkPeer/paper_skeleton.md")), "# Beta skeleton\n");
      // A project folder that is a link to another project: its file is that project's, a root too.
      assert.equal(await okText(skel("projects-folder/Mirror/paper_skeleton.md")), "# Beta skeleton\n");
      // A project folder linked into human/private holds no paper_skeleton.md the channel will give.
      await assertRefused(skel("projects-folder/Evil3/paper_skeleton.md"));
    });

    test("'*' matches exactly one segment: neither none nor two", async () => {
      await assertRefused(skel("projects-folder/paper_skeleton.md"));
      await assertRefused(skel("projects-folder/Deep/Nest/paper_skeleton.md"));
      await assertRefused(skelList("projects-folder/Deep"));
      // A "*" segment never matches a dot name.
      await assertRefused(skel("projects-folder/.Alpha/paper_skeleton.md"));
    });

    test("a folder named paper_skeleton.md is read as a folder root: its listing and files are 200, a link in it out of the root still 404 (review F6)", async () => {
      const folder = join(project("Folder"), "paper_skeleton.md");
      mkdirSync(join(folder, "sub"), { recursive: true });
      writeFileSync(join(folder, "inner.txt"), "inside a folder named paper_skeleton.md");
      writeFileSync(join(folder, "sub", "deeper.txt"), "deeper");
      dirLink(join(ws, "human", "private"), join(folder, "priv"));
      const linked = fileLink(join(ws, "human", "private", "secret.md"), join(folder, "secret.md"));
      const root = "projects-folder/Folder/paper_skeleton.md";
      assert.deepEqual((await okList(skelList(root))).entries.map((e) => e.name), ["inner.txt", "sub"], "links out of the root are left out of the listing");
      assert.equal(await okText(skel(`${root}/inner.txt`)), "inside a folder named paper_skeleton.md");
      assert.equal(await okText(skel(`${root}/sub/deeper.txt`)), "deeper");
      // The limit: the root's real path is the boundary, as for any folder root (rule 7).
      for (const url of [skel(`${root}/priv/secret.md`), skelList(`${root}/priv`), ...(linked ? [skel(`${root}/secret.md`)] : [])]) await assertRefused(url);
      // Beside it, nothing: the project folder and its other files stay unread.
      await assertRefused(skelList("projects-folder/Folder"));
    });

    test("Windows names: the same answers as for a folder root", async () => {
      // The literal last segment is compared as written, before the disk is asked: a trailing dot or space, an
      // NTFS stream, and another case are no root, as "Code." or "CODE" are none for a folder root.
      for (const [fileRoot, folderRoot] of [
        [`${SKEL}.`, "projects-folder/Alpha/Code./run.py"],
        [`${SKEL}%20`, "projects-folder/Alpha/Code%20/run.py"],
        [`${SKEL}.%20.`, "projects-folder/Alpha/Code.%20./run.py"],
        [`${SKEL}::$DATA`, `${CODE}::$DATA/run.py`],
        [`${SKEL}:stream`, `${CODE}:stream/run.py`],
        ["projects-folder/Alpha/PAPER_SKELETON.md", "projects-folder/Alpha/CODE/run.py"],
        ["projects-folder/Alpha/Paper_skeleton.md", "projects-folder/Alpha/code/run.py"],
        ["projects-folder/Alpha/paper_skeleton.MD", "projects-folder/Alpha/COde/run.py"],
      ]) {
        await assertRefused(skel(fileRoot!));
        // The folder root's counterpart: its own last segment spelled the same way.
        await assertRefused(files(folderRoot!));
      }
      // Below a folder root, a stream name is refused too (rule 5); a file root has nothing below it.
      await assertRefused(files(`${CODE}/run.py::$DATA`));
      // A file spelled on disk otherwise than declared is readable by neither spelling, as a folder is (Low/code).
      await assertRefused(skel("projects-folder/LowS/paper_skeleton.md"));
      await assertRefused(skel("projects-folder/LowS/Paper_Skeleton.md"));
      // In the "*" segment the disk decides, for both kinds of root alike: another case on a case-insensitive file
      // system, or a trailing dot or space on Windows, reads the same project; anywhere else it names none.
      for (const spelling of ["alpha", "ALPHA", "Alpha.", "Alpha%20"]) {
        const fileRes = await fetchRead(skel(`projects-folder/${spelling}/paper_skeleton.md`));
        const folderRes = await fetchRead(files(`projects-folder/${spelling}/Code/run.py`));
        assert.equal(fileRes.status, folderRes.status, `${spelling}: the file root answers as the folder root does`);
        assert.ok([200, 404].includes(fileRes.status), `${spelling}: ${fileRes.status}`);
        if (fileRes.status === 200) {
          assert.equal(await fileRes.text(), "# Alpha skeleton\n", `${spelling}: the same file, nothing else`);
          assert.equal(await folderRes.text(), "print(1)", spelling);
        }
      }
    });
  });

  /*
   * The Assets view's reads, as bundled (os-ui/PLUGINS.md Part 3, §1 fact 1 and
   * §4.1): four folder roots and two file roots per project, its narrowest
   * set. Everything else in the project stays unreadable from its origin, and a
   * link inside a declared folder is followed only while it stays in that
   * root, never out of the workspace or into human/private.
   */
  describe("the Assets view's reads", () => {
    const G = "projects-folder/Gallery";
    const gallery = (raw: string) => files(raw, "assets-view");
    const galleryList = (raw: string) => list(raw, "assets-view");
    const put = (rel: string, text: string) => {
      mkdirSync(path.dirname(join(ws, rel)), { recursive: true });
      writeFileSync(join(ws, rel), text);
    };
    for (const [rel, text] of Object.entries({
      "Figs/a.svg": "<svg xmlns='http://www.w3.org/2000/svg'/>",
      "Figs/sub/b.png": "png",
      "Figs/.env": "SECRET figs env",
      "Baselines/run/x.csv": "a,b\n1,2\n",
      "Code/results/r.json": "{}",
      "Code/Datasets/d.csv": "d",
      "Code/README.md": "# Gallery code\n",
      "Code/README_zh.md": "SECRET zh",
      "Code/run.py": "SECRET code",
      "Code/tools/t.py": "SECRET tool",
      "paper_skeleton.md": "# Gallery skeleton\n",
      "AGENTS.md": "SECRET agents",
      "PROJECT_MEMORY.md": "SECRET memory",
      "index.md": "SECRET index",
      "paper/main.tex": "SECRET tex",
    })) {
      put(`${G}/${rel}`, text);
    }
    // Links inside declared folders: out of the workspace, into human/private, and to the project's own unread files.
    const gl = (rel: string) => join(ws, G, rel);
    dirLink(outside, gl("Figs/out-dir"));
    dirLink(join(ws, "human", "private"), gl("Figs/private"));
    relLink(join(ws, G, "Code"), gl("Code/results/code"));
    mkdirSync(join(ws, "projects-folder", "GalleryLink", "Code"), { recursive: true });
    const galleryLinks = {
      outFile: fileLink(join(outside, "x.txt"), gl("Figs/outside.txt")),
      privFile: fileLink(join(ws, "human", "private", "secret.md"), gl("Baselines/secret.md")),
      agents: fileLink(gl("AGENTS.md"), gl("Baselines/agents.md")),
      readmeOut: fileLink(join(ws, "human", "private", "secret.md"), join(ws, "projects-folder", "GalleryLink", "Code", "README.md")),
    };
    // A project whose Figs is itself a link into human/private, and whose Code/results is a link to its Code.
    mkdirSync(join(ws, "projects-folder", "GalleryEvil", "Code"), { recursive: true });
    writeFileSync(join(ws, "projects-folder", "GalleryEvil", "Code", "run.py"), "SECRET evil code");
    relLink(join(ws, "human", "private"), join(ws, "projects-folder", "GalleryEvil", "Figs"));
    relLink(join(ws, "projects-folder", "GalleryEvil", "Code"), join(ws, "projects-folder", "GalleryEvil", "Code", "results"));

    test("its six roots per project are read: the four folders, listed and read, and the two files", async () => {
      assert.deepEqual(readSites.get("assets-view")?.reads, [
        "projects-folder/*/Figs",
        "projects-folder/*/Baselines",
        "projects-folder/*/Code/results",
        "projects-folder/*/Code/Datasets",
        "projects-folder/*/Code/README.md",
        "projects-folder/*/paper_skeleton.md",
      ]);
      assert.equal(await okText(gallery(`${G}/Figs/sub/b.png`)), "png");
      assert.equal(await okText(gallery(`${G}/Baselines/run/x.csv`)), "a,b\n1,2\n");
      assert.equal(await okText(gallery(`${G}/Code/results/r.json`)), "{}");
      assert.equal(await okText(gallery(`${G}/Code/Datasets/d.csv`)), "d");
      assert.equal(await okText(gallery(`${G}/Code/README.md`)), "# Gallery code\n");
      assert.equal(await okText(gallery(`${G}/paper_skeleton.md`)), "# Gallery skeleton\n");
      const svg = await fetchRead(gallery(`${G}/Figs/a.svg`));
      assert.equal(svg.status, 200);
      assert.equal(svg.headers.get("content-type"), "image/svg+xml", "an <img> needs the type");
      assert.equal(svg.headers.get("content-security-policy"), READ_CSP);
      for (const folder of ["Figs", "Figs/sub", "Baselines", "Baselines/run", "Code/results", "Code/Datasets"]) await okList(galleryList(`${G}/${folder}`));
    });

    test("a picture's URL may carry the page's Reload token beside its path: the channel reads only `path` (review M1)", async () => {
      for (const url of [gallery(`${G}/Figs/sub/b.png&v=3`), `app://assets-view/_os/files?v=7&path=${G}/Figs/sub/b.png`]) {
        assert.equal(await okText(url), "png", url);
        const head = await fetchRead(url, { method: "HEAD" });
        assert.equal(head.status, 200, `HEAD ${url}`);
      }
      // The token changes nothing else: a second path is still refused, and so is a path outside the roots.
      await assertRefused(gallery(`${G}/Figs/sub/b.png&v=3&path=${G}/Figs/a.svg`));
      await assertRefused(gallery(`${G}/AGENTS.md&v=3`));
    });

    test("anything else in the project is 404 from its origin: AGENTS.md, PROJECT_MEMORY.md, Code/ besides its two folders and README.md, paper/", async () => {
      for (const method of ["GET", "HEAD"]) {
        for (const url of [
          gallery(`${G}/AGENTS.md`),
          gallery(`${G}/PROJECT_MEMORY.md`),
          gallery(`${G}/index.md`),
          gallery(`${G}/Code/run.py`),
          gallery(`${G}/Code/tools/t.py`),
          gallery(`${G}/Code/README_zh.md`),
          gallery(`${G}/Code/README.md/x`),
          gallery(`${G}/paper/main.tex`),
          gallery(`${G}/Figs/.env`),
          gallery(`${G}/Code/Results/r.json`),
          galleryList(G),
          galleryList(`${G}/Code`),
          galleryList(`${G}/Code/tools`),
          galleryList(`${G}/paper`),
          galleryList(`${G}/Code/README.md`),
          galleryList(`${G}/paper_skeleton.md`),
          galleryList("projects-folder"),
          gallery("AGENTS.md"),
          gallery(".env"),
        ]) {
          await assertRefused(url, { method });
        }
      }
      // Another plugin's root is not one of these: Alpha's Code/run.py stays the Code view's.
      await assertRefused(gallery(`${CODE}/run.py`));
      assert.equal(await okText(files(`${CODE}/run.py`)), "print(1)");
    });

    test("a link inside a declared folder that leaves it, the workspace, or reaches human/private is 404, and the listing leaves it out", async () => {
      const refused = [
        gallery(`${G}/Figs/out-dir/x.txt`),
        galleryList(`${G}/Figs/out-dir`),
        gallery(`${G}/Figs/private/secret.md`),
        galleryList(`${G}/Figs/private`),
        gallery(`${G}/Code/results/code/run.py`),
        galleryList(`${G}/Code/results/code`),
        // A root that is a link out of its place: into human/private, or a declared folder linked to an undeclared one.
        gallery("projects-folder/GalleryEvil/Figs/secret.md"),
        galleryList("projects-folder/GalleryEvil/Figs"),
        gallery("projects-folder/GalleryEvil/Code/results/run.py"),
        galleryList("projects-folder/GalleryEvil/Code/results"),
      ];
      if (galleryLinks.outFile) refused.push(gallery(`${G}/Figs/outside.txt`));
      if (galleryLinks.privFile) refused.push(gallery(`${G}/Baselines/secret.md`));
      if (galleryLinks.agents) refused.push(gallery(`${G}/Baselines/agents.md`));
      if (galleryLinks.readmeOut) refused.push(gallery("projects-folder/GalleryLink/Code/README.md"));
      for (const url of refused) await assertRefused(url);
      assert.deepEqual((await okList(galleryList(`${G}/Figs`))).entries.map((e) => e.name), ["a.svg", "sub"], "the links out are left out, and so is .env");
      assert.deepEqual((await okList(galleryList(`${G}/Baselines`))).entries.map((e) => e.name), ["run"]);
      assert.deepEqual((await okList(galleryList(`${G}/Code/results`))).entries.map((e) => e.name), ["r.json"]);
    });
  });

  /*
   * The Idea view's reads, as bundled (os-ui/PLUGINS.md Part 3, §1 fact 1 and
   * §6 "2.3"): two file roots per project, idea_graph.md and paper_skeleton.md.
   * Nothing else in the project is readable from its origin, neither file can
   * be listed, and an idea_graph.md that is a link out of its place is 404.
   */
  describe("the Idea view's reads", () => {
    const I = "projects-folder/Ideas";
    const idea = (raw: string) => files(raw, "idea-view");
    const ideaList = (raw: string) => list(raw, "idea-view");
    for (const [rel, text] of Object.entries({
      "idea_graph.md": "# Idea graph\n",
      "paper_skeleton.md": "# Ideas skeleton\n",
      "AGENTS.md": "SECRET agents",
      "PROJECT_MEMORY.md": "SECRET memory",
      "Code/README.md": "SECRET code readme",
      "Figs/a.svg": "<svg/>",
      "idea_graph.md.bak": "SECRET backup",
    })) {
      mkdirSync(path.dirname(join(ws, I, rel)), { recursive: true });
      writeFileSync(join(ws, I, rel), text);
    }
    // A project whose idea_graph.md is a link into human/private, and one whose idea_graph.md is a link to its own AGENTS.md.
    mkdirSync(join(ws, "projects-folder", "IdeaEvil"), { recursive: true });
    mkdirSync(join(ws, "projects-folder", "IdeaSide"), { recursive: true });
    writeFileSync(join(ws, "projects-folder", "IdeaSide", "AGENTS.md"), "SECRET side agents");
    const ideaLinks = {
      priv: fileLink(join(ws, "human", "private", "secret.md"), join(ws, "projects-folder", "IdeaEvil", "idea_graph.md")),
      side: fileLink(join(ws, "projects-folder", "IdeaSide", "AGENTS.md"), join(ws, "projects-folder", "IdeaSide", "idea_graph.md")),
    };

    test("its two file roots per project are read", async () => {
      assert.deepEqual(readSites.get("idea-view")?.reads, ["projects-folder/*/idea_graph.md", "projects-folder/*/paper_skeleton.md"]);
      assert.equal(await okText(idea(`${I}/idea_graph.md`)), "# Idea graph\n");
      assert.equal(await okText(idea(`${I}/paper_skeleton.md`)), "# Ideas skeleton\n");
    });

    test("anything else in the project is 404 from its origin, and neither file nor the project can be listed", async () => {
      for (const method of ["GET", "HEAD"]) {
        for (const url of [
          idea(`${I}/AGENTS.md`),
          idea(`${I}/PROJECT_MEMORY.md`),
          idea(`${I}/Code/README.md`),
          idea(`${I}/Figs/a.svg`),
          idea(`${I}/idea_graph.md.bak`),
          idea(`${I}/idea_graph.md/x`),
          ideaList(I),
          ideaList(`${I}/idea_graph.md`),
          ideaList(`${I}/paper_skeleton.md`),
          ideaList("projects-folder"),
          idea("AGENTS.md"),
          idea(".env"),
        ]) {
          await assertRefused(url, { method });
        }
      }
      // Another plugin's root is not one of these.
      await assertRefused(idea(`${CODE}/run.py`));
    });

    test("an idea_graph.md that is a link into human/private, or to another file of its project, is 404", async () => {
      if (ideaLinks.priv) await assertRefused(idea("projects-folder/IdeaEvil/idea_graph.md"));
      if (ideaLinks.side) await assertRefused(idea("projects-folder/IdeaSide/idea_graph.md"));
    });
  });
});
