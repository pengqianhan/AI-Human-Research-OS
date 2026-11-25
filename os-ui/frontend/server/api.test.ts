import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BUNDLED_IDS } from "../plugins/bundled.ts";
import { matchMount, TRUNK_MOUNTS } from "./api.ts";
import { fromNodeRequest, serveNode } from "./node.ts";
import { BUNDLED_HANDLERS, DESKTOP_ONLY_HANDLERS } from "./pluginHandlers.ts";
import { createRegistry, loadPlugins } from "./registry.ts";
import { context, tempTree } from "./testkit.ts";

const PLUGINS = resolve(dirname(fileURLToPath(import.meta.url)), "../plugins");

describe("mounts", () => {
  const { plugins } = loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", { trunk: TRUNK_MOUNTS, plugins: [] });
  // As the dev server builds them (api-plugin.ts): desktop-only handlers declared, not mounted.
  const mounts = createRegistry({ ctx: context(tempTree()), trunk: TRUNK_MOUNTS, plugins, factories: BUNDLED_HANDLERS, skip: DESKTOP_ONLY_HANDLERS }).all;

  test("the dev server's three endpoints and which need its token; the Code view's Git history and Skills Hub's toggle are not among them", () => {
    assert.deepEqual(
      mounts.map((m) => [m.prefix, m.token]),
      [
        ["/api/paper-sources", true],
        ["/api/chat", true],
        ["/api/paper-wiki/status", false],
      ],
    );
  });

  test("prefix stripping follows Connect", () => {
    const at = (path: string) => {
      const hit = matchMount(mounts, path);
      return hit && [hit.mount.prefix, hit.path];
    };
    assert.deepEqual(at("/api/chat"), ["/api/chat", "/"]);
    assert.deepEqual(at("/api/chat/sessions"), ["/api/chat", "/sessions"]);
    assert.deepEqual(at("/api/paper-sources/read-order"), ["/api/paper-sources", "/read-order"]);
    assert.deepEqual(at("/api/paper-wiki/status"), ["/api/paper-wiki/status", "/"]);
    assert.equal(at("/api/chatty"), null);
    assert.equal(at("/api/paper-wiki/statuses"), null);
    assert.equal(at("/api"), null);
    assert.equal(at("/state.json"), null);
  });
});

function nodeRequest(url: string, method: string, body: string): IncomingMessage {
  return Object.assign(Readable.from(body === "" ? [] : [Buffer.from(body)]), { url, method, headers: {} }) as unknown as IncomingMessage;
}

describe("Node adapter", () => {
  test("reads path, query, and JSON body", async () => {
    const req = fromNodeRequest(nodeRequest("/sessions?cwd=projects-folder%2FAlpha", "GET", '{"a": "é"}'));
    assert.equal(req.method, "GET");
    assert.equal(req.path, "/sessions");
    assert.equal(req.query.get("cwd"), "projects-folder/Alpha");
    assert.deepEqual(await req.json(), { a: "é" });
  });

  test("an empty body is {}; a malformed one throws", async () => {
    assert.deepEqual(await fromNodeRequest(nodeRequest("/", "POST", "")).json(), {});
    await assert.rejects(fromNodeRequest(nodeRequest("/", "POST", "{")).json());
  });

  test("serveNode writes the handler's JSON answer", async () => {
    const written: { status?: number; headers: Record<string, string>; body?: string } = { headers: {} };
    const finished = new Promise<void>((done) => {
      const res = {
        set statusCode(value: number) {
          written.status = value;
        },
        setHeader(name: string, value: string) {
          written.headers[name] = value;
        },
        end(body: string) {
          written.body = body;
          done();
        },
      } as unknown as ServerResponse;
      serveNode(async (r) => ({ status: 201, body: { path: r.path } }), nodeRequest("/x", "GET", ""), res);
    });
    await finished;
    assert.equal(written.status, 201);
    assert.equal(written.headers["Content-Type"], "application/json");
    assert.equal(written.body, '{"path":"/x"}');
  });
});
