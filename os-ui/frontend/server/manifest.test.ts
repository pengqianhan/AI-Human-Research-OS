import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { contractAccepts, matchRoot, parseManifest } from "./manifest.ts";
import type { PluginSource } from "./manifest.ts";

/** The smallest manifest contract 1.0 accepts, with `extra` merged over it. */
const minimal = (extra: Record<string, unknown> = {}) => ({
  contract: "^1.0",
  id: "demo",
  name: "Demo",
  version: "0.1.0",
  contributes: {},
  ...extra,
});

/** One page in a list, for the entry and page-id rules. */
const withView = (view: Record<string, unknown>) => minimal({ contributes: { projectViews: [{ id: "v", title: "V", entry: "v.html", ...view }] } });

function problems(raw: unknown, source: PluginSource = "bundled"): string[] {
  const parsed = parseManifest(raw, source);
  return parsed.ok ? [] : parsed.problems;
}

function refused(raw: unknown, pattern: RegExp, source: PluginSource = "bundled") {
  const found = problems(raw, source);
  assert.ok(found.some((p) => pattern.test(p)), `expected ${pattern} in ${JSON.stringify(found)}`);
}

describe("parseManifest", () => {
  test("a minimal manifest, from either source", () => {
    for (const source of ["bundled", "local"] as const) {
      assert.deepEqual(parseManifest(minimal(), source), { ok: true, manifest: minimal() });
    }
  });

  test("a bundled manifest with every 1.0 field", () => {
    const full = {
      contract: "^1.0",
      id: "paper-wiki",
      name: "Paper Wiki",
      version: "1.0.0",
      description: "The viewer.",
      site: { workspace: "paper-wiki" },
      reads: ["paper-wiki", "projects-folder/*/Code"],
      contributes: {
        homePanels: [{ id: "viewer", title: "Paper Wiki", entry: "viz.html", placement: "nav" }],
        projectViews: [{ id: "notes", title: "Notes", entry: "views/notes.html" }],
        handlers: ["status"],
      },
    };
    assert.deepEqual(parseManifest(full, "bundled"), { ok: true, manifest: full });
  });

  test("not an object", () => {
    for (const raw of [null, [], "plugin", 1]) assert.deepEqual(problems(raw), ["plugin.json must be a JSON object"]);
  });

  test("unknown keys are refused at every level, naming the key and the host contract", () => {
    refused(minimal({ extra: 1 }), /^plugin\.json: unknown key "extra" \(this host implements plugin contract 1\.0\)$/);
    refused(minimal({ site: { workspace: "w", serve: true } }), /^site: unknown key "serve"/);
    refused(minimal({ contributes: { skills: [] } }), /^contributes: unknown key "skills" \(this host implements plugin contract 1\.0\)$/);
    refused(minimal({ contributes: { homePanels: [{ id: "p", title: "P", entry: "p.html", icon: "x" }] } }), /^contributes\.homePanels\[0\]: unknown key "icon"/);
    refused(withView({ placement: "home" }), /^contributes\.projectViews\[0\]: unknown key "placement"/);
  });

  test("the source is never read from the manifest (lock 1)", () => {
    refused(minimal({ source: "bundled" }), /unknown key "source"/, "local");
  });

  test("the contract range: this major, no newer minor", () => {
    for (const contract of ["^1.1", "^2.0", "^0.9", "1.0", "^1", "^1.0.0", ">=1.0", "^01.0", "~1.0", ""]) {
      refused(minimal({ contract }), /^contract ".*" is not accepted by this host, which implements plugin contract 1\.0$/);
    }
    refused(minimal({ contract: 1 }), /^contract must be a string/);
    refused(minimal({ contract: undefined }), /^contract must be a string/);
  });

  test("id, name, version, and description", () => {
    for (const id of ["abc", "paper-wiki", "a1-b2", "a".repeat(32)]) assert.deepEqual(problems(minimal({ id })), [], id);
    for (const id of ["ab", "Abc", "1abc", "abc-", "-abc", "a_b", "a.b", "a".repeat(33), 7]) refused(minimal({ id }), /^id must match/);
    refused(minimal({ id: "research-os" }), /^id "research-os" is reserved$/);
    assert.deepEqual(problems(minimal({ name: "n".repeat(40) })), []);
    refused(minimal({ name: "" }), /^name must not be empty$/);
    refused(minimal({ name: "n".repeat(41) }), /^name must be at most 40 characters$/);
    refused(minimal({ name: undefined }), /^name must be a string$/);
    assert.deepEqual(problems(minimal({ version: "" })), [], "version is free text");
    refused(minimal({ version: 1 }), /^version must be a string$/);
    assert.deepEqual(problems(minimal({ description: "d".repeat(200) })), []);
    refused(minimal({ description: "d".repeat(201) }), /^description must be at most 200 characters$/);
  });

  test("site, handlers, and nav placement are for bundled plugins only (lock 2)", () => {
    const site = minimal({ site: { workspace: "paper-wiki" } });
    const handlers = minimal({ contributes: { handlers: ["status"] } });
    const nav = minimal({ contributes: { homePanels: [{ id: "p", title: "P", entry: "p.html", placement: "nav" }] } });
    for (const raw of [site, handlers, nav]) assert.deepEqual(problems(raw, "bundled"), []);
    refused(site, /^site is for bundled plugins only$/, "local");
    refused(handlers, /^contributes\.handlers is for bundled plugins only$/, "local");
    refused(nav, /^contributes\.homePanels\[0\]\.placement "nav" is for bundled plugins only$/, "local");
    const home = minimal({ contributes: { homePanels: [{ id: "p", title: "P", entry: "p.html", placement: "home" }] } });
    assert.deepEqual(problems(home, "local"), []);
    refused(minimal({ contributes: { homePanels: [{ id: "p", title: "P", entry: "p.html", placement: "side" }] } }), /placement must be "home" or "nav"$/);
  });

  test("every path is plain, relative, non-empty, and has no dot segment", () => {
    const bad = ["", "/x", "x/", "a//b", "../x", "a/../b", "./a", "a%20b", "%2e%2e/x", "100%", ".git", "a/.env", "C:/x", "a\\b", "a\0b", "con", "x/nul.txt"];
    for (const p of bad) {
      refused(minimal({ site: { workspace: p } }), /^site\.workspace /);
      refused(minimal({ reads: [p] }), /^reads\[0\] /);
      refused(withView({ entry: p }), /^contributes\.projectViews\[0\]\.entry /);
    }
    refused(minimal({ reads: "paper-wiki" }), /^reads must be a list$/);
    refused(minimal({ site: { workspace: 1 } }), /^site\.workspace must be a non-empty path$/);
    for (const p of ["paper-wiki", "a/b c/d.html", "x..y", "console.md"]) assert.deepEqual(problems(withView({ entry: p })), [], p);
  });

  test("entries stay clear of the host's api/ and _os/", () => {
    for (const entry of ["api", "api/x", "_os", "_os/a/b"]) refused(withView({ entry }), /which the host keeps$/);
    for (const entry of ["apis/x", "x/api/y", "_osx.html"]) assert.deepEqual(problems(withView({ entry })), [], entry);
  });

  test('"*" in reads is a whole segment', () => {
    assert.deepEqual(problems(minimal({ reads: ["projects-folder/*", "*/x"] })), []);
    refused(minimal({ reads: ["paper*"] }), /"\*" must be a whole segment$/);
  });

  test("page ids are unique across panels and views; handlers are names, listed once", () => {
    refused(withView({ id: "Bad" }), /^contributes\.projectViews\[0\]\.id must match/);
    refused(withView({ title: "" }), /^contributes\.projectViews\[0\]\.title must not be empty$/);
    const twice = minimal({
      contributes: {
        homePanels: [{ id: "main", title: "A", entry: "a.html" }],
        projectViews: [{ id: "main", title: "B", entry: "b.html" }],
      },
    });
    refused(twice, /^contributes\.projectViews\[0\]\.id "main" is used twice$/);
    refused(minimal({ contributes: { projectViews: ["v.html"] } }), /^contributes\.projectViews\[0\] must be an object$/);
    refused(minimal({ contributes: { handlers: ["status", "status"] } }), /"status" is listed twice$/);
    for (const h of ["a/b", "../x", "", "Status", 1]) refused(minimal({ contributes: { handlers: [h] } }), /^contributes\.handlers\[0\] must match/);
    refused(minimal({ contributes: [] }), /^contributes must be an object$/);
  });

  test("every problem is reported, not only the first", () => {
    const found = problems(
      { contract: "^2.0", id: "X", name: "", version: "1", site: { workspace: ".git" }, reads: ["/x"], contributes: { handlers: ["h"], more: 1 } },
      "local",
    );
    assert.equal(found.length, 8, found.join("\n"));
  });
});

describe("contractAccepts", () => {
  test("against this host (1.0)", () => {
    assert.equal(contractAccepts("^1.0"), true);
    assert.equal(contractAccepts("^1.1"), false);
    assert.equal(contractAccepts("^2.0"), false);
  });
  test("against a later host", () => {
    const host = { major: 1, minor: 2 };
    for (const range of ["^1.0", "^1.1", "^1.2"]) assert.equal(contractAccepts(range, host), true, range);
    for (const range of ["^1.3", "^0.2", "^2.0", "^1.10", "1.2"]) assert.equal(contractAccepts(range, host), false, range);
    assert.equal(contractAccepts("^1.10", { major: 1, minor: 10 }), true, "minors compare as numbers");
  });
});

describe("matchRoot", () => {
  const roots = ["paper-wiki", "projects-folder/*/Code", "memory/MEMORY.md"];
  test("a root and anything below it, as the concrete root", () => {
    assert.equal(matchRoot("paper-wiki", roots), "paper-wiki");
    assert.equal(matchRoot("paper-wiki/papers/a.md", roots), "paper-wiki");
    assert.equal(matchRoot("memory/MEMORY.md", roots), "memory/MEMORY.md");
  });
  test("whole segments only", () => {
    assert.equal(matchRoot("paper-wiki-old/x", roots), null);
    assert.equal(matchRoot("paper", ["paper-wiki"]), null);
    assert.equal(matchRoot("paper-wiki/x", ["paper"]), null);
    assert.equal(matchRoot("memory", roots), null, "a parent of a root is not inside it");
  });
  test('"*" matches exactly one segment', () => {
    assert.equal(matchRoot("projects-folder/Alpha/Code/run.py", roots), "projects-folder/Alpha/Code");
    assert.equal(matchRoot("projects-folder/Alpha/Code", roots), "projects-folder/Alpha/Code");
    assert.equal(matchRoot("projects-folder/Code", roots), null, "not zero segments");
    assert.equal(matchRoot("projects-folder/a/b/Code", roots), null, "not two segments");
    assert.equal(matchRoot("projects-folder/Alpha", ["projects-folder/*"]), "projects-folder/Alpha");
    assert.equal(matchRoot("projects-folder", ["projects-folder/*"]), null);
  });
  test("the first matching root wins; nothing matches nothing", () => {
    assert.equal(matchRoot("a/b/c", ["a/*", "a"]), "a/b");
    assert.equal(matchRoot("a/b/c", ["a", "a/*"]), "a");
    assert.equal(matchRoot("", roots), null);
    assert.equal(matchRoot("x", []), null);
  });
});
