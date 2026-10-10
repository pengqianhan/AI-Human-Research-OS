import assert from "node:assert/strict";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { Mount } from "../../frontend/server/api.ts";
import { createHandler, CSP, isInside, route, safeRelative, splitMounts, WIKI_CSP } from "../src/main/protocol.ts";
import { tempTree } from "./helpers.ts";

const renderer = tempTree({ "index.html": "<html>app</html>", "assets/app.js": "console.log(1)", "favicon.svg": "<svg/>" });
const workspace = tempTree({
  "os-ui/frontend/public/state.json": '{"meta":{}}',
  "paper-wiki/viz.html": "<html>viz</html>",
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

describe("route", () => {
  const roots = { renderer, workspace };
  test("app origin", () => {
    assert.deepEqual(route("app://research-os/api/chat/sessions?cwd=", roots), { kind: "api", pathname: "/api/chat/sessions", mounts: "app" });
    assert.equal(route("app://research-os/state.json", roots).kind, "file");
    const index = route("app://research-os/", roots);
    assert.ok(index.kind === "file" && index.rel === "index.html" && index.csp === CSP && !index.confined);
    const deep = route("app://research-os/projects/nanochat", roots);
    assert.ok(deep.kind === "file" && deep.fallback === "index.html");
    const asset = route("app://research-os/assets/app.js", roots);
    assert.ok(asset.kind === "file" && asset.fallback === null);
  });
  test("the app origin does not serve the wiki or workspace files", () => {
    const r = route("app://research-os/paper-wiki/viz.html", roots);
    assert.ok(r.kind === "file" && r.root === renderer, "falls to the renderer, which has no such file");
    assert.equal(route("app://research-os/..%2f.env", roots).kind, "not-found");
  });
  test("wiki origin", () => {
    const viz = route("app://paper-wiki/viz.html", roots);
    assert.ok(viz.kind === "file" && viz.csp === WIKI_CSP && viz.confined && viz.root === join(workspace, "paper-wiki"));
    assert.deepEqual(route("app://paper-wiki/api/paper-wiki/status", roots), { kind: "api", pathname: "/api/paper-wiki/status", mounts: "wiki" });
    assert.equal(route("app://paper-wiki/api/chat/send", roots).kind, "not-found");
    assert.equal(route("app://paper-wiki/", roots).kind, "not-found");
  });
  test("no workspace: no state, no wiki", () => {
    const none = { renderer, workspace: null };
    assert.equal(route("app://research-os/state.json", none).kind, "not-found");
    assert.equal(route("app://paper-wiki/viz.html", none).kind, "not-found");
  });
  test("other hosts and schemes", () => {
    assert.equal(route("app://evil/state.json", roots).kind, "not-found");
    assert.equal(route("https://research-os/state.json", roots).kind, "not-found");
    assert.equal(route("not a url", roots).kind, "not-found");
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
  const mounts = splitMounts([
    mount("/api/skill/toggle", false),
    mount("/api/paper-wiki/status", false),
    mount("/api/paper-sources", true),
    mount("/api/chat", true),
  ]);
  const handler = createHandler(() => ({ renderer, workspace, mounts, token: "t0k" }));
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
    assert.equal(viz.headers.get("content-security-policy"), WIKI_CSP);
    const note = await fetchApp("app://paper-wiki/papers/a.md");
    assert.equal(note.headers.get("content-type"), "text/plain; charset=utf-8");
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
      "app://research-os/..%2f..%2fAGENTS.md",
      "app://research-os/%2e%2e/%2e%2e/AGENTS.md",
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
    const empty = createHandler(() => ({ renderer, workspace: null, mounts: null, token: "t" }));
    assert.equal((await empty(new Request("app://research-os/api/chat/sessions"))).status, 503);
    const throwing = createHandler(() => ({
      renderer,
      workspace,
      token: "t",
      mounts: splitMounts([{ prefix: "/api/skill/toggle", token: false, handler: async () => { throw new Error("boom"); } }]),
    }));
    const res = await throwing(new Request("app://research-os/api/skill/toggle", json({})));
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "boom" });
  });
});
