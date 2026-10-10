import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import { skillToggleApi } from "./skillToggle.ts";
import { context, fail, fakeRunner, ok, request, tempTree } from "./testkit.ts";

describe("skill toggle route", () => {
  const root = tempTree({ ".python-version": "3.13\n" });
  const installer = resolve(
    root,
    "research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py",
  );

  test("POST only", async () => {
    assert.equal((await skillToggleApi(context(root))(request("GET", "/"))).status, 405);
  });

  test("unsafe names never reach the installer", async () => {
    const { run, calls } = fakeRunner();
    const api = skillToggleApi(context(root, { run }));
    for (const body of [
      { skill: "a b", target: "repo-claude" },
      { skill: "ok", target: "--force" + " x" },
      { skill: "ok", target: "../x/y" },
      { skill: "ok", target: "repo", collection: "a/b" },
      { skill: "", target: "repo" },
    ]) {
      assert.equal((await api(request("POST", "/", body))).status, 400, JSON.stringify(body));
    }
    assert.equal(calls.length, 0);
  });

  test("disable, then regenerate the snapshot", async () => {
    const { run, calls } = fakeRunner(() => ok("disabled grilling at repo-claude\n"));
    let regenerated = 0;
    const api = skillToggleApi(context(root, { run, regenerate: async () => (regenerated++, null) }));
    const res = await api(request("POST", "/", { skill: "grilling", target: "repo-claude", collection: "open-paper-skills" }));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true, output: "disabled grilling at repo-claude", snapshotError: null });
    assert.deepEqual(calls[0]!.command, [
      "py", installer, "disable", "grilling", "--target", "repo-claude", "--collection", "open-paper-skills",
    ]);
    assert.equal(regenerated, 1);
  });

  test("enable without a collection", async () => {
    const { run, calls } = fakeRunner(() => ok(""));
    await skillToggleApi(context(root, { run }))(request("POST", "/", { skill: "grilling", target: "global-codex", enable: true }));
    assert.deepEqual(calls[0]!.command.slice(2), ["enable", "grilling", "--target", "global-codex"]);
  });

  test("a snapshot failure rides along with the successful toggle", async () => {
    const { run } = fakeRunner(() => ok("done"));
    const api = skillToggleApi(context(root, { run, regenerate: async () => "generator exploded" }));
    const res = await api(request("POST", "/", { skill: "grilling", target: "repo-claude" }));
    assert.equal(res.status, 200);
    assert.equal((res.body as { snapshotError: string }).snapshotError, "generator exploded");
  });

  test("an installer failure is a 500 and skips regeneration", async () => {
    let regenerated = 0;
    const { run } = fakeRunner(() => fail(1, "error: grilling is not installed at repo-claude\n"));
    const api = skillToggleApi(context(root, { run, regenerate: async () => (regenerated++, null) }));
    const res = await api(request("POST", "/", { skill: "grilling", target: "repo-claude" }));
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: "error: grilling is not installed at repo-claude" });
    assert.equal(regenerated, 0);
  });
});
