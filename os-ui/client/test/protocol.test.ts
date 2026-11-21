import assert from "node:assert/strict";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { basename, join } from "node:path";
import { describe, test } from "node:test";
import { BUNDLED_IDS } from "../../frontend/plugins/bundled.ts";
import { TRUNK_MOUNTS } from "../../frontend/server/api.ts";
import type { Mount } from "../../frontend/server/api.ts";
import type { PluginManifest } from "../../frontend/server/manifest.ts";
import { loadPlugins } from "../../frontend/server/registry.ts";
import type { LoadedPlugin, Registry } from "../../frontend/server/registry.ts";
import {
  allowedNavigation,
  appCsp,
  createHandler,
  isInside,
  PLUGIN_CSP,
  pluginSites,
  route,
  safeRelative,
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
    assert.deepEqual(sites.get("paper-wiki"), { id: "paper-wiki", reads: [], files: { kind: "workspace", rel: "paper-wiki" } });
  });

  test("any other plugin serves the site/ folder beside its plugin.json, in load order", () => {
    assert.deepEqual(demo.problems, []);
    assert.deepEqual([...twoSites.keys()], ["paper-wiki", "demo"]);
    assert.deepEqual(twoSites.get("demo"), { id: "demo", reads: [], files: { kind: "plugin", dir: demoSite } });
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
      reads: ["projects-folder/*/Code"],
      files: { kind: "workspace", rel: "projects-folder" },
    });
    // The parser refuses `site` from a local plugin; a list built some other way still gets no workspace folder.
    assert.deepEqual(pluginSites([plugin("local")]).get("viewer")?.files, { kind: "plugin", dir: join(demoRoot, "viewer", "site") });
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
      test("is confined lexically to site/, with the plugin policy", () => {
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
    });
  });
});
