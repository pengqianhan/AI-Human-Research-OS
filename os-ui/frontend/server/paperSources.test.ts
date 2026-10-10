import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import { paperSourcesApi } from "./paperSources.ts";
import { context, fail, fakeRunner, ok, request, tempTree } from "./testkit.ts";

const SOURCES = JSON.stringify({ sources: [{ id: "alphaxiv", enabled: true }], keys: {} });

describe("paper-sources routes", () => {
  const root = tempTree({ ".python-version": "3.13\n" });
  const script = resolve(root, "research-skills-hub/open-paper-skills/paper-search/scripts/paper_search.py");

  test("only the four routes exist", async () => {
    const { run, calls } = fakeRunner();
    const api = paperSourcesApi(context(root, { run }));
    for (const [method, path] of [["GET", "/key"], ["DELETE", "/"], ["POST", "/keys"], ["GET", "/read-order"]]) {
      const res = await api(request(method!, path!));
      assert.equal(res.status, 404);
      assert.deepEqual(res.body, { error: `no route ${method} ${path}` });
    }
    assert.equal(calls.length, 0);
  });

  test("GET / reads the switches", async () => {
    const { run, calls } = fakeRunner(() => ok(SOURCES));
    const res = await paperSourcesApi(context(root, { run }))(request("GET", "/"));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, JSON.parse(SOURCES));
    assert.deepEqual(calls[0]!.command, ["py", script, "sources", "--json"]);
  });

  test("POST / flips one switch", async () => {
    const { run, calls } = fakeRunner(() => ok(SOURCES));
    const api = paperSourcesApi(context(root, { run }));
    assert.equal((await api(request("POST", "/", { source: "Bad-Id", enabled: true }))).status, 400);
    assert.equal((await api(request("POST", "/", { source: "pubmed", enabled: "yes" }))).status, 400);
    assert.equal(calls.length, 0);
    assert.equal((await api(request("POST", "/", { source: "pubmed", enabled: false }))).status, 200);
    assert.deepEqual(calls[0]!.command.slice(2), ["sources", "--json", "--disable", "pubmed"]);
  });

  test("POST /read-order", async () => {
    const { run, calls } = fakeRunner(() => ok(SOURCES));
    const api = paperSourcesApi(context(root, { run }));
    for (const order of [[], "hf", ["hf", "Bad"], [1]]) {
      assert.equal((await api(request("POST", "/read-order", { order }))).status, 400, JSON.stringify(order));
    }
    assert.equal((await api(request("POST", "/read-order", { order: ["hf", "alphaxiv"] }))).status, 200);
    assert.deepEqual(calls[0]!.command.slice(2), ["sources", "--json", "--read-order", "hf,alphaxiv"]);
  });

  test("POST /key sends the value on stdin only", async () => {
    const { run, calls } = fakeRunner(() => ok(SOURCES));
    const api = paperSourcesApi(context(root, { run }));
    assert.equal((await api(request("POST", "/key", { name: "lower", value: "abcdefgh" }))).status, 400);
    assert.equal((await api(request("POST", "/key", { name: "HF_TOKEN", value: "short" }))).status, 400);
    assert.equal((await api(request("POST", "/key", { name: "HF_TOKEN", value: "has space inside" }))).status, 400);
    assert.equal(calls.length, 0);

    assert.equal((await api(request("POST", "/key", { name: "HF_TOKEN", value: "  hf_abcdefgh123  " }))).status, 200);
    assert.deepEqual(calls[0]!.command.slice(2), ["keys", "--set", "HF_TOKEN", "--json"]);
    assert.equal(calls[0]!.input, "hf_abcdefgh123");
    assert.ok(!calls[0]!.command.join(" ").includes("hf_abcdefgh123"));

    assert.equal((await api(request("POST", "/key", { name: "HF_TOKEN", value: "" }))).status, 200);
    assert.deepEqual(calls[1]!.command.slice(2), ["keys", "--clear", "HF_TOKEN", "--json"]);
    assert.equal(calls[1]!.input, "");
  });

  test("a refusal (exit 2) is a 400 with the script's last line; other failures are 500", async () => {
    const refusing = paperSourcesApi(context(root, { run: fakeRunner(() => fail(2, "usage: ...\nerror: unknown source zzz\n")).run }));
    const res = await refusing(request("POST", "/", { source: "zzz", enabled: true }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: "error: unknown source zzz" });

    const broken = paperSourcesApi(context(root, { run: fakeRunner(() => fail(1, "")).run }));
    const res2 = await broken(request("GET", "/"));
    assert.equal(res2.status, 500);
    assert.deepEqual(res2.body, { error: "exit 1" });
  });

  test("writes are serialized", async () => {
    const order: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((done) => (release = done));
    const { run } = fakeRunner(async (call) => {
      const label = call.command[call.command.length - 1]!;
      order.push(`start ${label}`);
      if (label === "first") await gate;
      order.push(`end ${label}`);
      return ok(SOURCES);
    });
    const api = paperSourcesApi(context(root, { run }));
    const a = api(request("POST", "/", { source: "first", enabled: true }));
    const b = api(request("POST", "/", { source: "second", enabled: true }));
    await new Promise((done) => setTimeout(done, 20));
    assert.deepEqual(order, ["start first"]);
    release();
    await Promise.all([a, b]);
    assert.deepEqual(order, ["start first", "end first", "start second", "end second"]);
  });

  test("a failed job does not block the queue", async () => {
    let n = 0;
    const { run } = fakeRunner(() => (n++ === 0 ? Promise.reject(new Error("spawn failed")) : ok(SOURCES)));
    const api = paperSourcesApi(context(root, { run }));
    assert.equal((await api(request("GET", "/"))).status, 500);
    assert.equal((await api(request("GET", "/"))).status, 200);
  });
});
