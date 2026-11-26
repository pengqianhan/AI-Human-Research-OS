/**
 * The Skeleton view's page puts the file on screen as text only, and reads
 * only paper_skeleton.md through its own channel. These source checks, with
 * the end-to-end suite's hostile skeleton, are what stand between the file and
 * a running `onerror=`, a followed link, or a loaded image; PLUGIN_CSP's lack
 * of inline script is the second layer. md-kit.ts and site-kit.ts are scanned
 * with the page's own code, since its bundle holds them.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
/** The page's own code and markup, tests left out, and the shared kits it bundles. */
const sources = [
  ...readdirSync(SITE)
    .filter((f) => /\.(ts|html|css)$/.test(f) && !f.endsWith(".test.ts"))
    .map((f) => ({ file: f, text: readFileSync(join(SITE, f), "utf8") })),
  { file: "../../site-kit.ts", text: readFileSync(join(SITE, "../../site-kit.ts"), "utf8") },
  { file: "../../md-kit.ts", text: readFileSync(join(SITE, "../../md-kit.ts"), "utf8") },
];
const source = (file: string) => strip(sources.find((s) => s.file === file)!.text);

describe("the page's DOM", () => {
  test("no HTML sink anywhere in the page's code, markup, or the kits it bundles", () => {
    assert.deepEqual(sources.map((s) => s.file).sort(), ["../../md-kit.ts", "../../site-kit.ts", "index.html", "logic.ts", "main.ts", "style.css"]);
    for (const { file, text } of sources) {
      for (const sink of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /DOMParser/, /createContextualFragment/, /srcdoc/, /\beval\(/, /new Function\b/, /\son[a-z]+=/i, /\.cssText\b/]) {
        assert.doesNotMatch(strip(text), sink, `${file}: ${sink}`);
      }
    }
  });

  test("nothing from the file reaches an href, a src, or a style: the code sets none (but icon()'s own sprite reference)", () => {
    for (const { file, text } of sources.filter((s) => s.file.endsWith(".ts"))) {
      const code = strip(text);
      for (const sink of [/\.href\b/, /\.src\b/, /\.srcset\b/, /\.style\b/, /\.action\b/, /\.formAction\b/, /\.data\s*=/, /setAttributeNS/, /\.location\b/, /window\.open/]) {
        assert.doesNotMatch(code, sink, `${file}: ${sink}`);
      }
      const attributes = [...code.matchAll(/setAttribute\(([^,]+),/g)].map((m) => m[1]!.trim());
      assert.ok(attributes.every((a) => ['"class"', '"aria-hidden"', '"href"', '"aria-label"', '"aria-live"'].includes(a)), `${file}: ${attributes.join(", ")}`);
      if (attributes.includes('"href"')) {
        assert.equal(file, "../../site-kit.ts");
        assert.deepEqual([...code.matchAll(/setAttribute\("href", ([^)]+)\)/g)].map((m) => m[1]), ["`#i-${name}`"], "only the sprite's own symbol, by a name in the code");
      }
    }
    // The page draws no picture from the file: no <img>, <iframe>, <object>, <embed>, <a>, <link>, or <script> is made.
    for (const file of ["main.ts", "../../site-kit.ts"]) {
      assert.doesNotMatch(source(file), /el\("(img|iframe|object|embed|a|link|script|form|input|svg)"|createElement\("(img|iframe|object|embed|a|link|script)"/, file);
    }
    // A link's target is a tooltip and an image is its alt text, as site-kit's inlineNodes draws them.
    assert.match(source("../../site-kit.ts"), /if \(t\.kind === "link"\) node\.title = markInvisible\(t\.target\);/);
    assert.match(source("main.ts"), /const md = \(text: string\) => inlineNodes\(inline\(text\)\);/);
  });

  test("the page's markup loads its own script and style only, and nothing inline", () => {
    const html = sources.find((s) => s.file === "index.html")!.text;
    assert.deepEqual([...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]), ['<script src="./main.js" defer>']);
    assert.deepEqual([...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]), ['<link rel="stylesheet" href="./style.css">']);
    assert.doesNotMatch(html, /<style|style=/);
    assert.doesNotMatch(sources.find((s) => s.file === "style.css")!.text, /url\(|@import/, "the style loads nothing");
  });
});

describe("what the page reads", () => {
  test("only the project's paper_skeleton.md, through its own read channel", () => {
    const main = source("main.ts");
    assert.deepEqual([...main.matchAll(/fetch\(([^,]+),/g)].map((m) => m[1]!.trim()), ["filesUrl(filePath(project!))"]);
    assert.doesNotMatch(main, /listUrl|\/api\//);
    assert.match(source("logic.ts"), /export const filePath = \(project: string\) => `projects-folder\/\$\{project\}\/\$\{FILE\}`;/);
    assert.match(source("logic.ts"), /export const FILE = "paper_skeleton\.md";/);
    // Reading the file needs no other kit: md-kit fetches nothing.
    assert.doesNotMatch(source("../../md-kit.ts"), /fetch\(|XMLHttpRequest|import\(/);
  });

  test("no bridge, no storage, no other window but the app's, which is named exactly", () => {
    for (const { file, text } of sources) assert.doesNotMatch(text, /osDesktop|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource|sendBeacon/, file);
    // Unstripped: the comment pattern would take "//superresearch-os" for a comment.
    const main = sources.find((s) => s.file === "main.ts")!.text;
    assert.match(main, /const HOST = "app:\/\/superresearch-os";/);
    assert.deepEqual([...main.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]), ["message, HOST"]);
  });
});
