/**
 * The dev-server adapters (../*-plugin.ts) on a real Vite server: the token
 * gate runs before routing, the endpoints are mounted where the UI calls
 * them, and the shared context points at this checkout.
 */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = resolve(FRONTEND, "../..");
const TOKEN = "dev-server-test-token";

describe("Vite dev server adapters", () => {
  let close: () => Promise<void>;
  let base: string;

  before(async () => {
    process.env.OS_UI_TOKEN = TOKEN;
    process.env.OS_HARNESS_SESSIONS = mkdtempSync(join(tmpdir(), "os-ui-dev-sessions-"));
    const { createServer } = await import("vite");
    const server = await createServer({
      configFile: join(FRONTEND, "vite.config.ts"),
      root: FRONTEND,
      logLevel: "silent",
      server: { port: 0, host: "127.0.0.1" },
    });
    await server.listen();
    base = `http://127.0.0.1:${(server.httpServer!.address() as AddressInfo).port}`;
    close = () => server.close();
  });

  after(async () => {
    await close?.();
  });

  const call = (path: string, init: RequestInit = {}, token = true) =>
    fetch(base + path, { ...init, headers: { ...(token ? { "X-OS-UI-Token": TOKEN } : {}), ...(init.headers ?? {}) } });

  test("the agent endpoints need the token, before any routing", async () => {
    assert.equal((await call("/api/chat/sessions", {}, false)).status, 401);
    assert.equal((await call("/api/chat/nope", {}, false)).status, 401);
    assert.equal((await call("/api/paper-sources", {}, false)).status, 401);
  });

  test("with the token, conversations list for this checkout", async () => {
    const res = await call("/api/chat/sessions?cwd=");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/json");
    assert.deepEqual(await res.json(), { cwd: REPO, sessions: [] });
  });

  test("unknown routes and malformed bodies", async () => {
    assert.deepEqual(await (await call("/api/paper-sources/nope")).json(), { error: "no route GET /nope" });
    const bad = await call("/api/chat/send", { method: "POST", body: "{", headers: { "Content-Type": "application/json" } });
    assert.equal(bad.status, 500);
  });

  test("the viewer's status probe and the toggle's validation need no token", async () => {
    assert.deepEqual(await (await call("/api/paper-wiki/status", {}, false)).json(), { writable: true, values: ["unread", "skimmed", "read"] });
    const toggle = await call("/api/skill/toggle", { method: "POST", body: '{"skill":"a b"}' }, false);
    assert.equal(toggle.status, 400);
  });
});
