/**
 * The Code view's page puts untrusted text on screen as text only, and reads
 * only through its own channel and handler. PLUGIN_CSP allows inline script,
 * so these source checks, with the end-to-end suite's markup file and commit,
 * are what stand between a file name and a running `onerror=`.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
/** The page's own code and markup, tests left out. */
const sources = readdirSync(SITE)
  .filter((f) => /\.(ts|html|css)$/.test(f) && !f.endsWith(".test.ts"))
  .map((f) => ({ file: f, text: readFileSync(join(SITE, f), "utf8") }));

const MARKUP = `<img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script>`;

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

describe("the page's DOM", () => {
  test("no HTML sink anywhere in the page's code or markup", () => {
    assert.ok(sources.some((s) => s.file === "main.ts") && sources.some((s) => s.file === "dom.ts"), "the scan sees the page's code");
    for (const { file, text } of sources) {
      for (const sink of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /DOMParser/, /createContextualFragment/, /srcdoc/, /\beval\(/, /new Function\b/, /\son[a-z]+=/i]) {
        assert.doesNotMatch(text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), sink, `${file}: ${sink}`);
      }
    }
  });

  test("el and icon put markup in as text, never as HTML", async () => {
    const fake = fakeDocument();
    (globalThis as { document?: unknown }).document = fake.document;
    try {
      const { el, icon } = await import("./dom.ts");
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

describe("what the page reads", () => {
  const main = sources.find((s) => s.file === "main.ts")!.text;

  test("only its own read channel and its own Git handler, on its own origin", () => {
    const fetches = [...main.matchAll(/fetch\(([^,)]+)/g)].map((m) => m[1]!.trim());
    assert.deepEqual(fetches.sort(), ["filesUrl(workspacePath(path", "filesUrl(workspacePath(path", "listUrl(workspacePath(path", "url"].sort());
    const json = [...main.matchAll(/getJson<[^>]+>\(([a-zA-Z]+)\(/g)].map((m) => m[1]);
    assert.ok(json.length >= 3 && json.every((f) => f === "gitUrl"), JSON.stringify(json));
    assert.deepEqual([...main.matchAll(/\.src = ([a-zA-Z]+)\(/g)].map((m) => m[1]), ["filesUrl"]);
    const logic = sources.find((s) => s.file === "logic.ts")!.text;
    assert.match(logic, /`\.\/_os\/files\?path=\$\{encodeURIComponent\(rel\)\}`/);
    assert.match(logic, /`\.\/_os\/list\?path=\$\{encodeURIComponent\(rel\)\}`/);
    assert.match(logic, /`\/api\/code-view\/git\/\$\{route\}\?\$\{params\}`/);
  });

  test("no bridge, no other window but the app's, which is named exactly", () => {
    for (const { file, text } of sources) assert.doesNotMatch(text, /osDesktop|localStorage|sessionStorage|indexedDB|window\.open|XMLHttpRequest|WebSocket|EventSource/, file);
    assert.match(main, /const HOST = "app:\/\/research-os";/);
    assert.deepEqual([...main.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]), ["message, HOST"]);
  });
});
