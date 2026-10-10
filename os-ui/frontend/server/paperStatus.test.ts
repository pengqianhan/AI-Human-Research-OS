import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, test } from "node:test";
import { paperStatusApi } from "./paperStatus.ts";
import { context, fail, fakeRunner, ok, request, tempTree } from "./testkit.ts";

function repo() {
  return tempTree({
    ".python-version": "3.13\n",
    "paper-wiki/papers/attention.md": "---\nstatus: read\n---\n",
    "paper-wiki/viz.html": "<html>viz</html>",
  });
}

const SET_OK = JSON.stringify({ id: "papers/attention", status: "read", changed: true });

describe("paper-wiki status route", () => {
  test("GET is the viewer's probe; other methods are 405", async () => {
    const api = paperStatusApi(context(repo()));
    assert.deepEqual((await api(request("GET", "/"))).body, { writable: true, values: ["unread", "skimmed", "read"] });
    assert.equal((await api(request("PUT", "/"))).status, 405);
  });

  test("bad ids and statuses never reach a script", async () => {
    const { run, calls } = fakeRunner();
    const api = paperStatusApi(context(repo(), { run }));
    for (const body of [
      { id: "papers/../secret", status: "read" },
      { id: "concepts/x", status: "read" },
      { id: "papers/x y", status: "read" },
      { id: "papers/attention", status: "summarized" },
    ]) {
      assert.equal((await api(request("POST", "/", body))).status, 400, JSON.stringify(body));
    }
    assert.equal(calls.length, 0);
  });

  test("a write sets the status, regenerates the viewer, and refreshes the cache copy", async () => {
    const root = repo();
    const publicWikiDir = join(root, "public-wiki");
    const { run, calls } = fakeRunner((call) => (call.command[1]!.endsWith("set_status.py") ? ok(SET_OK) : ok("")));
    const api = paperStatusApi(context(root, { run, publicWikiDir }));
    const res = await api(request("POST", "/", { id: "papers/attention", status: "read" }));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true, id: "papers/attention", status: "read", changed: true, vizError: null });
    const scripts = resolve(root, "research-skills-hub/open-paper-skills/paper-wiki-manager/scripts");
    const wiki = resolve(root, "paper-wiki");
    assert.deepEqual(calls.map((c) => c.command), [
      ["py", resolve(scripts, "set_status.py"), "papers/attention", "read", "--root", wiki],
      ["py", resolve(scripts, "generate_viz.py"), wiki],
    ]);
    assert.equal(readFileSync(join(publicWikiDir, "viz.html"), "utf8"), "<html>viz</html>");
    assert.ok(existsSync(join(publicWikiDir, "papers/attention.md")));
  });

  test("served in place (desktop client), nothing is copied", async () => {
    const root = repo();
    const { run } = fakeRunner((call) => (call.command[1]!.endsWith("set_status.py") ? ok(SET_OK) : ok("")));
    const res = await paperStatusApi(context(root, { run, publicWikiDir: null }))(
      request("POST", "/", { id: "papers/attention", status: "skimmed" }),
    );
    assert.equal(res.status, 200);
    assert.ok(!existsSync(join(root, "public-wiki")));
  });

  test("set_status failure is a 500; a viewer failure is reported beside success", async () => {
    const root = repo();
    const failing = paperStatusApi(context(root, { run: fakeRunner(() => fail(1, "no note papers/x")).run }));
    const res = await failing(request("POST", "/", { id: "papers/x", status: "read" }));
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: "no note papers/x (exit 1)" });

    const { run } = fakeRunner((call) => (call.command[1]!.endsWith("set_status.py") ? ok(SET_OK) : fail(1, "viz broke")));
    const res2 = await paperStatusApi(context(root, { run }))(request("POST", "/", { id: "papers/attention", status: "read" }));
    assert.equal(res2.status, 200);
    assert.equal((res2.body as { vizError: string }).vizError, "viz broke (exit 1)");
  });

  test("writes are serialized", async () => {
    const root = repo();
    let active = 0;
    let maxActive = 0;
    const { run } = fakeRunner(async (call) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((done) => setTimeout(done, 5));
      active -= 1;
      return call.command[1]!.endsWith("set_status.py") ? ok(SET_OK) : ok("");
    });
    const api = paperStatusApi(context(root, { run }));
    await Promise.all(["read", "skimmed", "unread"].map((status) => api(request("POST", "/", { id: "papers/attention", status }))));
    assert.equal(maxActive, 1);
  });
});
