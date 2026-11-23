/**
 * The Assets view's page puts names and contents on screen as text only,
 * loads pictures only from its own read channel, and reads only through it.
 * These source checks, with the end-to-end suite's hostile names, files, and
 * SVG, are what stand between a file and a running `onerror=`, a followed
 * link, or a picture fetched from elsewhere; PLUGIN_CSP's lack of inline
 * script and its `img-src 'self' data:` are the second layer. md-kit.ts and
 * site-kit.ts are scanned with the page's own code, since its bundle holds
 * them.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
/** A source file's text with LF line endings, whatever the checkout gave it (Windows: CRLF), so the patterns below hold on every platform. */
const readSource = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
/** The page's own code and markup, tests left out, and the shared kits it bundles. */
const sources = [
  ...readdirSync(SITE)
    .filter((f) => /\.(ts|html|css)$/.test(f) && !f.endsWith(".test.ts"))
    .map((f) => ({ file: f, text: readSource(join(SITE, f)) })),
  { file: "../../site-kit.ts", text: readSource(join(SITE, "../../site-kit.ts")) },
  { file: "../../md-kit.ts", text: readSource(join(SITE, "../../md-kit.ts")) },
];
const source = (file: string) => strip(sources.find((s) => s.file === file)!.text);

describe("the page's DOM", () => {
  test("no HTML sink anywhere in the page's code, markup, or the kits it bundles", () => {
    assert.deepEqual(sources.map((s) => s.file).sort(), ["../../md-kit.ts", "../../site-kit.ts", "index.html", "logic.ts", "main.ts", "queue.ts", "style.css", "svg.ts", "walk.ts"]);
    for (const { file, text } of sources) {
      for (const sink of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /DOMParser/, /createContextualFragment/, /srcdoc/, /\beval\(/, /new Function\b/, /\son[a-z]+=/i, /\.cssText\b/]) {
        assert.doesNotMatch(strip(text), sink, `${file}: ${sink}`);
      }
    }
  });

  test("a picture's only source is the read channel's URL for a path the walk found; nothing else reaches a src, an href, or a style", () => {
    const main = source("main.ts");
    // Exactly one <img> is made, in imageLoad, and its src is set in exactly one place, to the channel's URL for the item's project path
    // with the Reload's generation beside it (M1), which the HEAD after an error asks for too.
    assert.deepEqual([...main.matchAll(/el\("img"/g)].length, 1);
    assert.deepEqual([...main.matchAll(/\.src\s*=\s*([^;]+);/g)].map((m) => m[1]!.trim()), ["url"]);
    assert.match(main, /const pictureUrl = \(path: string\) => `\$\{filesUrl\(workspacePath\(project!, path\)\)\}&v=\$\{state\.gen\}`;/);
    assert.match(main, /function imageLoad\(path: string, place: \(img: HTMLImageElement\) => boolean, check = true\): Load \{\n {2}const url = pictureUrl\(path\);\n {2}const img = el\("img"\);\n {2}img\.alt = "";/);
    assert.deepEqual([...main.matchAll(/pictureUrl\(([^)]*)\)/g)].map((m) => m[1]), ["path"], "used in one place, imageLoad");
    assert.match(main, /void fetch\(url, \{ method: "HEAD", cache: "no-store" \}\)/);
    // The SVG check (review M2): the same URL read as text, which goes to svgVerdict and nowhere else; the src is set only in draw().
    assert.deepEqual([...main.matchAll(/fetch\(url, ([^)]*)\)/g)].map((m) => m[1]), ['{ method: "HEAD", cache: "no-store" }', '{ cache: "no-store" }']);
    assert.match(main, /const verdict = svgVerdict\(read\.kind === "text" \? read\.text : null, got\.cut\);/);
    const loader = /function imageLoad\([\s\S]*?\n\}\n/.exec(main)![0];
    assert.equal([...loader.matchAll(/read\.text/g)].length, 1, "in imageLoad, the SVG's text goes to svgVerdict and nowhere else");
    assert.match(main, /const draw = \(\) => \{\n {4}if \(live\) img\.src = url;\n {2}\};/);
    // svg.ts is a scanner over text: no document, no parser that builds one, nothing it reads is put on the page.
    assert.doesNotMatch(source("svg.ts"), /\bdocument\.|\bwindow\.|DOMParser|createElement|innerHTML|adoptNode|importNode|appendChild|\.append\(|fetch\(/);
    // imageLoad is given only a FileItem's path, which the walk found in a listing (never a link or text from a file).
    assert.deepEqual([...main.matchAll(/(?<!function )imageLoad\(([^,]+),/g)].map((m) => m[1]!.trim()), ["item.path", "item.path"]);
    assert.doesNotMatch(main, /setAttribute\("src"|\.srcset\b|\.currentSrc\s*=/);
    assert.deepEqual([...main.matchAll(/removeAttribute\(([^)]+)\)/g)].map((m) => m[1]), ['"src"']);
    for (const { file, text } of sources.filter((s) => s.file.endsWith(".ts"))) {
      const code = strip(text);
      for (const sink of [/\.href\b/, /\.style\b/, /\.action\b/, /\.formAction\b/, /\.data\s*=/, /setAttributeNS/, /\.location\b/, /window\.open/, /\.poster\b/, /new Image\b/]) {
        assert.doesNotMatch(code, sink, `${file}: ${sink}`);
      }
      const attributes = [...code.matchAll(/setAttribute\(([^,]+),/g)].map((m) => m[1]!.trim());
      assert.ok(attributes.every((a) => ['"class"', '"aria-hidden"', '"href"', '"aria-label"', '"aria-live"', '"role"'].includes(a)), `${file}: ${attributes.join(", ")}`);
      if (attributes.includes('"href"')) {
        assert.equal(file, "../../site-kit.ts");
        assert.deepEqual([...code.matchAll(/setAttribute\("href", ([^)]+)\)/g)].map((m) => m[1]), ["`#i-${name}`"], "only the sprite's own symbol, by a name in the code");
      }
    }
    // No other element that loads or navigates is made: no iframe, object, embed, a, link, script, form, svg from the file.
    for (const file of ["main.ts", "../../site-kit.ts"]) {
      assert.doesNotMatch(source(file), /el\("(iframe|object|embed|a|link|script|form|input|svg|video|audio|source)"|createElement\("(img|iframe|object|embed|a|link|script)"/, file);
    }
    // Markdown is drawn by inlineNodes: a link's target is a tooltip, an image its alt text.
    assert.match(source("../../site-kit.ts"), /if \(t\.kind === "link"\) node\.title = markInvisible\(t\.target\);/);
    assert.match(source("main.ts"), /const md = \(text: string\) => inlineNodes\(inline\(text\)\);/);
  });

  test("the page's markup loads its own script and style only, and nothing inline", () => {
    const html = sources.find((s) => s.file === "index.html")!.text;
    assert.deepEqual([...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]), ['<script src="./main.js" defer>']);
    assert.deepEqual([...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]), ['<link rel="stylesheet" href="./style.css">']);
    assert.doesNotMatch(html, /<style|style=|<img|<image|href="(?!\.\/style\.css")/);
    assert.doesNotMatch(sources.find((s) => s.file === "style.css")!.text, /url\(|@import/, "the style loads nothing");
  });
});

describe("what the page reads", () => {
  test("only its read channel: listings of the groups' folders, and files the walk or the design names", () => {
    const main = source("main.ts");
    assert.deepEqual(
      [...main.matchAll(/fetch\((\w+\(workspacePath\(project!, [\w.]+\)\))/g)].map((m) => m[1]!),
      ["listUrl(workspacePath(project!, path))", "filesUrl(workspacePath(project!, path))", "filesUrl(workspacePath(project!, item.path))"],
    );
    assert.doesNotMatch(main, /\/api\/|XMLHttpRequest/);
    assert.match(source("logic.ts"), /export const workspacePath = \(project: string, path: string\) => `projects-folder\/\$\{project\}\/\$\{path\}`;/);
    // The files read: the walk's listings (groups' folders), the two the design names, the README.md files the walk found, and a file the walk found.
    assert.match(main, /readDoc\(SKELETON\), readDoc\(README\), Promise\.all\(GROUPS\.map\(\(g\) => walk\(g\.folder, listAt\)\)\)/);
    assert.match(main, /const paths = walks\.flatMap\(\(w\) => w\.readmes\);/);
    assert.match(source("logic.ts"), /export const SKELETON = "paper_skeleton\.md";\nexport const README = "Code\/README\.md";/);
    // No kit fetches or imports anything.
    for (const file of ["../../md-kit.ts", "logic.ts", "walk.ts", "queue.ts", "svg.ts"]) assert.doesNotMatch(source(file), /fetch\(|XMLHttpRequest|import\(/, file);
    const kit = source("../../site-kit.ts");
    assert.match(kit, /`\.\/_os\/files\?path=\$\{encodeURIComponent\(rel\)\}`/);
    assert.match(kit, /`\.\/_os\/list\?path=\$\{encodeURIComponent\(rel\)\}`/);
  });

  test("no bridge, no storage, no other window but the app's, which is named exactly; a selection has no quote", () => {
    for (const { file, text } of sources) assert.doesNotMatch(text, /osDesktop|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource|sendBeacon/, file);
    // Unstripped: the comment pattern would take "//research-os" for a comment.
    const main = sources.find((s) => s.file === "main.ts")!.text;
    assert.match(main, /const HOST = "app:\/\/research-os";/);
    assert.deepEqual([...main.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]), ["message, HOST"]);
    assert.match(main, /function post\(message: \{ type: "os\.select"; label: string \| null \}\): void/);
    assert.doesNotMatch(source("main.ts"), /quote/);
  });
});
