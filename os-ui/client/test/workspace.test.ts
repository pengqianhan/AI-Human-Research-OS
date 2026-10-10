import assert from "node:assert/strict";
import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { canonical, describeProblem, findEnclosingWorkspace, initialWorkspace, missingMarkers, workspaceArgument } from "../src/main/workspace.ts";
import { tempTree, WORKSPACE_FILES } from "./helpers.ts";

describe("workspace detection", () => {
  test("markers", () => {
    const ws = tempTree(WORKSPACE_FILES);
    assert.deepEqual(missingMarkers(ws), []);
    const partial = tempTree({ "AGENTS.md": "" });
    assert.deepEqual(missingMarkers(partial), ["os-harness/harness.py", "os-ui/generator/generate.py"]);
    assert.deepEqual(missingMarkers(join(ws, "nope")), ["the folder itself"]);
    assert.deepEqual(missingMarkers(join(ws, "AGENTS.md")), ["the folder itself"], "a file is not a folder");
  });

  test("problem text names what is missing", () => {
    assert.equal(describeProblem("/w", []), null);
    assert.match(describeProblem("/w", ["AGENTS.md"])!, /not a Research OS folder: missing AGENTS\.md/);
    assert.match(describeProblem("/w", ["the folder itself"])!, /does not exist/);
  });

  test("finds the checkout around the running client", () => {
    const ws = tempTree({ ...WORKSPACE_FILES, "os-ui/client/package.json": "{}" });
    assert.equal(findEnclosingWorkspace(join(ws, "os-ui", "client")), ws);
    assert.equal(findEnclosingWorkspace(tempTree()), null);
  });

  test("--workspace argument forms", () => {
    assert.equal(workspaceArgument(["electron", ".", "--workspace", "/w"]), "/w");
    assert.equal(workspaceArgument(["app", "--workspace=/w x"]), "/w x");
    assert.equal(workspaceArgument(["app", "--workspace"]), null);
    assert.equal(workspaceArgument(["app"]), null);
  });

  test("canonical resolves symlinks, so traces recorded by os-harness match", () => {
    const ws = tempTree(WORKSPACE_FILES);
    const outer = tempTree();
    const link = join(outer, "link");
    symlinkSync(ws, link, process.platform === "win32" ? "junction" : "dir");
    assert.equal(canonical(link), ws);
    assert.equal(canonical(join(outer, "missing", "..", "x")), join(outer, "x"), "a missing path is still resolved");
  });
});

describe("initial workspace", () => {
  const ws = tempTree(WORKSPACE_FILES);
  const other = tempTree(WORKSPACE_FILES);
  const notWs = tempTree({ "readme.md": "" });
  const base = { argv: ["app"], env: {}, saved: null, appPath: tempTree(), cwd: "/" };

  test("argument, then environment, then settings, then the checkout", () => {
    assert.deepEqual(initialWorkspace({ ...base, argv: ["app", `--workspace=${ws}`], env: { OS_CLIENT_WORKSPACE: other }, saved: other }), {
      dir: ws,
      source: "argument",
      problem: null,
    });
    assert.equal(initialWorkspace({ ...base, env: { OS_CLIENT_WORKSPACE: other }, saved: ws }).dir, other);
    assert.equal(initialWorkspace({ ...base, saved: ws }).source, "settings");
    const checkoutApp = join(ws, "os-ui", "client");
    mkdirSync(checkoutApp, { recursive: true });
    assert.deepEqual(initialWorkspace({ ...base, appPath: checkoutApp }), { dir: ws, source: "checkout", problem: null });
    assert.deepEqual(initialWorkspace(base), { dir: null, source: null, problem: null });
  });

  test("an explicit folder that is not a workspace is reported, not replaced", () => {
    const r = initialWorkspace({ ...base, env: { OS_CLIENT_WORKSPACE: notWs }, saved: ws });
    assert.equal(r.dir, null);
    assert.equal(r.source, "environment");
    assert.match(r.problem!, /not a Research OS folder/);
  });

  test("a relative argument resolves against the launch directory", () => {
    const r = initialWorkspace({ ...base, argv: ["app", "--workspace", "."], cwd: ws });
    assert.equal(r.dir, ws);
  });
});
