import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { clip, clipLabel, filesUrl, isHostClear, LABEL_MAX, listUrl, projectFrom, visibleName } from "./site-kit.ts";

const MARKUP = `<img src=x onerror="window.top.__pwned=1"><script>window.__pwned=2</script>`;

/** A document that records what each element is given, and fails on any HTML sink. */
function fakeDocument() {
  const made: Record<string, unknown>[] = [];
  const element = (tag: string) => {
    const node: Record<string, unknown> = { tag, children: [] as unknown[], attributes: {} as Record<string, string> };
    for (const sink of ["innerHTML", "outerHTML"]) {
      Object.defineProperty(node, sink, {
        set() {
          throw new Error(`${sink} was set`);
        },
      });
    }
    node.insertAdjacentHTML = () => {
      throw new Error("insertAdjacentHTML was called");
    };
    node.setAttribute = (k: string, v: string) => ((node.attributes as Record<string, string>)[k] = v);
    node.append = (...kids: unknown[]) => (node.children as unknown[]).push(...kids);
    made.push(node);
    return node;
  };
  return { made, document: { createElement: element, createElementNS: (_ns: string, tag: string) => element(tag) } };
}

describe("the DOM helpers", () => {
  test("el and icon put markup in as text, never as HTML", async () => {
    const fake = fakeDocument();
    (globalThis as { document?: unknown }).document = fake.document;
    try {
      const { el, icon } = await import("./site-kit.ts");
      const node = el("span", "tname", MARKUP) as unknown as Record<string, unknown>;
      assert.equal(node.textContent, MARKUP);
      assert.equal(node.className, "tname");
      const svg = icon("file") as unknown as { children: Record<string, unknown>[] };
      assert.deepEqual((svg.children[0]!.attributes as Record<string, string>).href, "#i-file");
    } finally {
      delete (globalThis as { document?: unknown }).document;
    }
  });
});

describe("the read channel's URLs and the project", () => {
  test("a path survives +, #, %, a space, and Chinese as the URL parser reads it", () => {
    for (const rel of ["projects-folder/P/Code/a+b.txt", "projects-folder/P/Code/has#hash.md", "projects-folder/P/Code/50%.txt", "projects-folder/P/Code/with space.txt", "projects-folder/P/Code/README_zh.md", "projects-folder/P/Code/说明.md", `projects-folder/P/Code/${MARKUP}`]) {
      for (const url of [filesUrl(rel), listUrl(rel)]) {
        const parsed = new URL(url, "app://code-view/index.html");
        assert.equal(parsed.searchParams.getAll("path").length, 1, url);
        assert.equal(parsed.searchParams.get("path"), rel, url);
        assert.equal(parsed.hash, "", url);
      }
    }
    assert.equal(filesUrl("projects-folder/P/Code/a+b.txt"), "./_os/files?path=projects-folder%2FP%2FCode%2Fa%2Bb.txt");
    assert.equal(listUrl("projects-folder/P/Code"), "./_os/list?path=projects-folder%2FP%2FCode");
    assert.equal(filesUrl("projects-folder/P/paper/main.pdf"), "./_os/files?path=projects-folder%2FP%2Fpaper%2Fmain.pdf");
  });

  test("the project comes from ?project= and must be a folder name", () => {
    assert.equal(projectFrom("?project=nanochat_cpu"), "nanochat_cpu");
    for (const bad of ["", "?project=", "?project=..%2Fx", "?project=a%2Bb", "?project=%3Cimg%3E", "?project=1abc", "?other=x"]) assert.equal(projectFrom(bad), null, bad);
  });
});

describe("the selection's limits", () => {
  test("clip ends in …, clipLabel keeps the end, visibleName marks what does not show", () => {
    assert.equal(clip("abcdef", 4), "abc…");
    assert.equal(clip("abc", 4), "abc");
    const long = `Code/${"d/".repeat(300)}file.py`;
    assert.equal(clipLabel(long).length, LABEL_MAX);
    assert.ok(clipLabel(long).startsWith("…") && clipLabel(long).endsWith("d/file.py"));
    assert.equal(visibleName("a\nb\u200bc\u202ed"), "a⟨U+000A⟩b⟨U+200B⟩c⟨U+202E⟩d");
    assert.equal(visibleName(MARKUP), MARKUP, "markup stays text for the host to show as text");
  });

  test("only the parent window, at the app's origin, clears the selection", () => {
    const parent = { name: "the workspace" };
    const clear = { type: "os.select.clear" };
    const HOST = "app://research-os";
    assert.equal(isHostClear({ source: parent, origin: HOST, data: clear }, parent, HOST), true);
    assert.equal(isHostClear({ source: {}, origin: HOST, data: clear }, parent, HOST), false, "another window");
    assert.equal(isHostClear({ source: parent, origin: "app://paper-wiki", data: clear }, parent, HOST), false, "another origin");
    assert.equal(isHostClear({ source: parent, origin: HOST, data: { type: "os.select" } }, parent, HOST), false);
    assert.equal(isHostClear({ source: parent, origin: HOST, data: null }, parent, HOST), false);
  });
});
