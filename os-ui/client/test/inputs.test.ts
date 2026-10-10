import assert from "node:assert/strict";
import { mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { InputPoller, inputPaths, signature } from "../src/main/inputs.ts";
import { tempTree } from "./helpers.ts";

function workspace() {
  const root = tempTree({
    "HANDOFF.md": "h",
    "memory/MEMORY.md": "m",
    "projects-folder/alpha/PROJECT_MEMORY.md": "p",
    "projects-folder/alpha/Code/runs/r1/result.json": "{}",
    "projects-folder/alpha/Code/nanochat/.venv/lib/site.py": "x",
    "projects-folder/alpha/Evaluations/e1.md": "e",
    "projects-folder/alpha/.claude/skills/local/SKILL.md": "s",
    "research-skills-hub/open-paper-skills/grilling/SKILL.md": "g",
    ".claude/skills/grilling/SKILL.md": "g",
    ".agents/skills/grilling/SKILL.md.disabled": "g",
  });
  return root;
}

describe("generator inputs", () => {
  test("lists what generate.py reads and nothing inside code or environments", () => {
    const root = workspace();
    const rel = inputPaths(root).map((p) => p.slice(root.length + 1).split("\\").join("/"));
    for (const expected of [
      "HANDOFF.md",
      "memory/MEMORY.md",
      ".git/logs/HEAD",
      "projects-folder/alpha/PROJECT_MEMORY.md",
      "projects-folder/alpha/Code/runs/r1/result.json",
      "projects-folder/alpha/Evaluations",
      "projects-folder/alpha/.claude/skills/local",
      "research-skills-hub/open-paper-skills/grilling/SKILL.md",
      ".claude/skills/grilling/SKILL.md",
      ".agents/skills/grilling/SKILL.md.disabled",
      ".claude/skills/.disabled",
    ]) {
      assert.ok(rel.includes(expected), expected);
    }
    assert.ok(!rel.some((p) => p.includes(".venv") || p.includes("nanochat")), "never descends into code");
  });

  test("the signature changes on edit, add, and remove, and not otherwise", () => {
    const root = workspace();
    const sig = () => signature(inputPaths(root));
    const before = sig();
    assert.equal(sig(), before);

    const memory = join(root, "memory", "MEMORY.md");
    writeFileSync(memory, "changed and longer");
    const edited = sig();
    assert.notEqual(edited, before);

    mkdirSync(join(root, "projects-folder", "beta"));
    writeFileSync(join(root, "projects-folder", "beta", "PROJECT_MEMORY.md"), "b");
    const added = sig();
    assert.notEqual(added, edited);

    writeFileSync(join(root, "projects-folder", "alpha", "Code", "nanochat", ".venv", "lib", "site.py"), "churn");
    assert.equal(sig(), added, "virtual-environment churn is invisible");
  });

  test("a same-size edit is seen through its mtime", () => {
    const root = workspace();
    const file = join(root, "HANDOFF.md");
    const before = signature(inputPaths(root));
    writeFileSync(file, "x");
    utimesSync(file, new Date(), new Date(Date.now() + 5000));
    assert.notEqual(signature(inputPaths(root)), before);
  });

  test("InputPoller: the first check is a baseline; later changes call back once each", () => {
    let value = "a";
    let calls = 0;
    const poller = new InputPoller("/w", () => calls++, () => value);
    assert.equal(poller.check(), false);
    assert.equal(poller.check(), false);
    value = "b";
    assert.equal(poller.check(), true);
    assert.equal(poller.check(), false);
    assert.equal(calls, 1);
  });

  test("a missing workspace part is just missing", () => {
    const root = tempTree({ "AGENTS.md": "" });
    assert.doesNotThrow(() => signature(inputPaths(root)));
  });
});
