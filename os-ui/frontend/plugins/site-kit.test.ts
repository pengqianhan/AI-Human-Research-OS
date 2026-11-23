import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { visibleQuote } from "../src/plugins/select.ts";
import { inline } from "./md-kit.ts";
import { clip, clipLabel, filesUrl, isHostClear, LABEL_MAX, listUrl, markInvisible, projectFrom, readStart, readText, visibleName } from "./site-kit.ts";

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
    // Only these may be set: a link must never get an href, an image never a src.
    for (const banned of ["href", "src", "srcset", "style", "onclick", "onerror"]) {
      Object.defineProperty(node, banned, {
        set() {
          throw new Error(`${banned} was set`);
        },
      });
    }
    made.push(node);
    return node;
  };
  const text = (value: string) => ({ tag: "#text", textContent: value });
  return { made, document: { createElement: element, createElementNS: (_ns: string, tag: string) => element(tag), createTextNode: text } };
}

/** A node the fake document made, as a plain tree: tag, class, title, text, children. */
function shape(node: unknown): unknown {
  const n = node as Record<string, unknown>;
  if (n.tag === "#text") return n.textContent;
  const kids = (n.children as unknown[]).map(shape);
  return { tag: n.tag, ...(n.className ? { class: n.className } : {}), ...(n.title ? { title: n.title } : {}), ...(n.textContent !== undefined ? { text: n.textContent } : {}), ...(kids.length ? { kids } : {}) };
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

  test("inlineNodes draws md-kit's tokens as text: a link's target is a tooltip, an image its alt text; nothing gets an href or a src", async () => {
    const fake = fakeDocument();
    (globalThis as { document?: unknown }).document = fake.document;
    try {
      const { inlineNodes } = await import("./site-kit.ts");
      const nodes = inlineNodes(inline(`a \`${MARKUP}\` **b [c](javascript:alert(1)** ![pic](https://md-image.invalid/a.png) \u202Eevil`));
      assert.deepEqual(nodes.map(shape), [
        "a ",
        { tag: "code", text: MARKUP },
        " ",
        { tag: "b", kids: ["b ", { tag: "span", class: "mdlink", title: "javascript:alert(1", kids: ["c"] }] },
        " ",
        { tag: "span", class: "mdimg", title: "Image, not shown: https://md-image.invalid/a.png", text: "pic" },
        " ⟨U+202E⟩evil",
      ]);
      assert.deepEqual(inlineNodes(inline("![](x.png)")).map(shape), [{ tag: "span", class: "mdimg", title: "Image, not shown: x.png", text: "image" }]);
    } finally {
      delete (globalThis as { document?: unknown }).document;
    }
  });
});

describe("markInvisible", () => {
  test("marks exactly the characters the host marks in a quote (src/plugins/select.ts visibleQuote)", () => {
    // Every code point of the classes and their neighbours, one at a time, between letters.
    const points = [
      ...Array.from({ length: 0x40 }, (_, k) => k),
      ...Array.from({ length: 0x40 }, (_, k) => 0x7f + k),
      0xad, 0x34f, 0x61c, 0x115f, 0x1160, 0x17b4, 0x180b, 0x180e, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202e, 0x2060, 0x2066, 0x2069,
      0x2800, 0x3164, 0xfe00, 0xfe0f, 0xfeff, 0xffa0, 0xfff9, 0xfffb, 0x1d173, 0xe0001, 0xe0041, 0xe0100, 0x00a0, 0x3000, 0x2028, 0x2029, 0x4e2d,
    ];
    for (const p of points) {
      const text = `a${String.fromCodePoint(p)}b`;
      // The host also makes line breaks LF; a drawn line has none, so compare where it leaves them alone.
      if ([0x0a, 0x0b, 0x0c, 0x0d, 0x85, 0x2028, 0x2029].includes(p)) continue;
      assert.equal(markInvisible(text), visibleQuote(text), `U+${p.toString(16)}`);
    }
    assert.equal(markInvisible("tab\there"), "tab\there", "a tab stays");
    assert.equal(markInvisible("❤\uFE0F and x\uFE0F"), "❤\uFE0F and x⟨U+FE0F⟩", "U+FE0F stays after an emoji only");
    assert.equal(markInvisible(MARKUP), MARKUP, "markup stays text, drawn as text");
  });
});

describe("reading a response", () => {
  const response = (size: number, chunk = 64 * 1024) => {
    let sent = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const n = Math.min(chunk, size - sent);
        if (n <= 0) return controller.close();
        controller.enqueue(new Uint8Array(n).fill(0x61));
        sent += n;
      },
      cancel() {
        cancelled = true;
      },
    });
    return { res: new Response(body), cancelled: () => cancelled };
  };

  test("readStart reads at most maxBytes and says cut when the body reached it, a body of exactly maxBytes too", async () => {
    const MiB = 1024 * 1024;
    for (const [size, max, length, cut] of [
      [MiB - 1, MiB, MiB - 1, false],
      [MiB, MiB, MiB, true],
      [MiB + 1, MiB, MiB, true],
      [MiB, MiB + 1, MiB, false],
      [MiB + 1, MiB + 1, MiB + 1, true],
      [5 * MiB, MiB + 1, MiB + 1, true],
      [0, MiB, 0, false],
    ] as const) {
      const { res, cancelled } = response(size);
      const read = await readStart(res, max);
      assert.deepEqual([read.bytes.length, read.cut], [length, cut], `${size} bytes, at most ${max}`);
      if (size > max) assert.ok(cancelled(), "the rest of the stream is cancelled");
    }
  });

  test("readText: UTF-8 text, binary data, or another encoding; a character split by a cut is dropped", () => {
    const bytes = new TextEncoder().encode("ab说");
    assert.deepEqual(readText(bytes), { kind: "text", text: "ab说" });
    assert.deepEqual(readText(bytes.subarray(0, bytes.length - 1), true), { kind: "text", text: "ab" });
    assert.deepEqual(readText(bytes.subarray(0, bytes.length - 1)), { kind: "encoding" });
    assert.deepEqual(readText(new Uint8Array([0x61, 0x00])), { kind: "binary" });
    assert.deepEqual(readText(new TextEncoder().encode("\uFEFFbom")), { kind: "text", text: "bom" }, "a byte-order mark is dropped");
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
    // Spaces other than U+0020, which the host refuses in a label, are marked; plain spaces stay (a path's own).
    assert.equal(visibleName(`a  b${String.fromCodePoint(0x00a0)}c${String.fromCodePoint(0x3000)}d`), "a  b⟨U+00A0⟩c⟨U+3000⟩d");
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
