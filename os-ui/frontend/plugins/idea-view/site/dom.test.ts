/**
 * The Idea view's page puts the idea file on screen as text only, draws its
 * map with its own SVG and numbers from layout.ts, and reads only through its
 * read channel. These source checks, with the end-to-end suite's markup in a
 * statement, are what stand between a file and a running `onerror=`, a
 * followed link, or a request; PLUGIN_CSP's lack of inline script is the
 * second layer. md-kit.ts and site-kit.ts are scanned with the page's own
 * code, since its bundle holds them. Sources are read with LF line endings,
 * so the patterns hold on a Windows checkout (CRLF).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
/** A source file's text with LF line endings, whatever the checkout gave it. */
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
const code = () => sources.filter((s) => s.file.endsWith(".ts")).map((s) => ({ file: s.file, text: strip(s.text) }));
/** Every distinct first argument (or, with `second`, second argument) of `name(` calls in `text`. */
function args(text: string, name: string, second = false): string[] {
  const found = new Set<string>();
  const re = new RegExp(`(?<![\\w.])(?<!function )${name}\\(`, "g");
  for (const m of text.matchAll(re)) {
    // The call's arguments, up to its closing parenthesis, split at top-level commas.
    let depth = 0;
    let i = m.index! + m[0].length;
    let arg = "";
    const parts: string[] = [];
    for (; i < text.length; i++) {
      const c = text[i]!;
      if ("([{".includes(c)) depth++;
      if (")]}".includes(c)) {
        if (depth === 0) break;
        depth--;
      }
      if (c === "," && depth === 0) {
        parts.push(arg.trim());
        arg = "";
        continue;
      }
      arg += c;
    }
    parts.push(arg.trim());
    const want = second ? parts[1] : parts[0];
    if (want !== undefined && want !== "") found.add(want);
  }
  return [...found].sort();
}

describe("the page's DOM", () => {
  test("no HTML sink anywhere in the page's code, markup, or the kits it bundles", () => {
    assert.deepEqual(sources.map((s) => s.file).sort(), ["../../md-kit.ts", "../../site-kit.ts", "index.html", "layout.ts", "logic.ts", "main.ts", "style.css"]);
    for (const { file, text } of sources) {
      for (const sink of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /DOMParser/, /createContextualFragment/, /srcdoc/, /\beval\(/, /new Function\b/, /\son[a-z]+=/i, /\.cssText\b/]) {
        assert.doesNotMatch(strip(text), sink, `${file}: ${sink}`);
      }
    }
  });

  test("the map is the page's own SVG: four tags, and attributes it names, whose values are numbers from the layout or fixed words", () => {
    const main = source("main.ts");
    // One createElementNS, in svgEl, for four SVG tags; every other element is site-kit's el() or button().
    assert.match(main, /type SvgTag = "svg" \| "g" \| "path" \| "foreignObject";/);
    assert.deepEqual(args(main, "svgEl"), ['"foreignObject"', '"g"', '"path"', '"svg"']);
    assert.match(main, /const node = document\.createElementNS\(SVG_NS, tag\);/);
    // Unstripped: the comment pattern would take "//www.w3.org" for a comment.
    assert.match(sources.find((s) => s.file === "main.ts")!.text, /const SVG_NS = "http:\/\/www\.w3\.org\/2000\/svg";/);
    // Every attribute the page sets, by name and value: classes from fixed maps, geometry from layout.ts.
    assert.deepEqual(
      [...main.matchAll(/(\w+)\.setAttribute\(("[\w-]+"), ([^;]+)\);/g)].map((m) => `${m[1]}.${m[2]} = ${m[3]}`).sort(),
      [
        'canvas."aria-label" = "Idea graph"',
        'canvas."role" = "region"',
        'fo."height" = String(r.h)',
        'fo."width" = String(r.w)',
        'fo."x" = String(r.x)',
        'fo."y" = String(r.y)',
        'node."class" = cls',
        'panel."aria-label" = "Details"',
        'panel."aria-live" = "polite"',
        'path."d" = "M1 4H25"',
        'path."d" = line.d',
        'sample."viewBox" = "0 0 26 8"',
        'svg."aria-label" = "Nodes and links"',
        'svg."role" = "group"',
        'svg."viewBox" = `0 0 ${map.width} ${map.height}`',
        'svgRoot."height" = String(Math.floor(map.height * s))',
        'svgRoot."width" = String(Math.floor(map.width * s))',
      ],
    );
    assert.equal([...main.matchAll(/setAttribute\(/g)].length, 17, "no other setAttribute");
    // layout.ts builds a path's `d` from numbers only.
    assert.match(source("layout.ts"), /line\.d = `M\$\{r1\(line\.x1\)\} \$\{line\.y1\} C\$\{r1\(line\.c1x\)\} \$\{line\.c1y\} \$\{r1\(line\.c2x\)\} \$\{line\.c2y\} \$\{r1\(line\.x2\)\} \$\{line\.y2\}`;/);
    // A class is a literal, a fixed map's value, or statusClass, which looks a validated word up in a fixed map.
    assert.deepEqual(args(main, "svgEl", true), ['"gmap"', '"glines"', '"labels"', "`lg ${WORD_CLASS.get(word)!}`", "`ln ${WORD_CLASS.get(line.word)!}`"].sort());
    const classes = [...args(main, "el", true), ...args(main, "button")];
    for (const c of classes) {
      assert.ok(/^"[\w -]*"$/.test(c) || /^`(kb|gnode|elabel) \$\{(KIND_CLASS\[[\w.]+\]|WORD_CLASS\.get\(line\.word\)!)\}`$/.test(c) || c === "statusClass(node.status)" || c === "statusClass(open.status)" || c === 'none ? "none" : ""', `a class: ${c}`);
    }
    assert.match(main, /const statusClass = \(status: string\) => `st \$\{STATUS_CLASS\.get\(status\) \?\? ""\}`;/);
    // File text reaches an attribute only as a tooltip (title), as marked plain text or the node's validated ID and kind.
    assert.deepEqual([...main.matchAll(/\.title = ([^;]+);/g)].map((m) => m[1]).sort(), ["`${node.id} (${node.kind})`", "`Read ${FILE} and paper_skeleton.md again, as they are on disk now`", "words"]);
    assert.match(main, /const words = markInvisible\(plain\(inline\(cutText\(node\.statement\)\)\)\);/);
  });

  test("no roundabout way to a sink: bracket or object-key forms, a src, a new element, or a cast, in any site file", () => {
    // A sink's name, or a piece of one, as a whole quoted string, in any quotes. main.ts marks the open node with the class "on".
    const SINK_WORD = /(["'`])(inner|outer|html|innerhtml|outerhtml|insertadjacenthtml|srcdoc|srcset|src|href|style|action|formaction|iframe|embed|script|on[a-z]*)\1/gi;
    const allowed: Record<string, Record<string, number>> = { "main.ts": { on: 1 }, "../../site-kit.ts": { href: 1 } };
    for (const { file, text } of code()) {
      const counts = new Map<string, number>();
      for (const m of text.matchAll(SINK_WORD)) counts.set(m[2]!.toLowerCase(), (counts.get(m[2]!.toLowerCase()) ?? 0) + 1);
      assert.deepEqual(Object.fromEntries(counts), allowed[file] ?? {}, `${file}: a sink's name as a string`);
      assert.doesNotMatch(text, /\[[^\]\n]*["'`][^\]\n]*\]\s*=(?!=)/, `${file}: a write through a string-indexed bracket`);
      assert.doesNotMatch(text, /[{,]\s*["'`]?(innerHTML|outerHTML|srcdoc|srcset|src|href|style|action|formAction)["'`]?\s*:/, `${file}: a sink as an object key`);
      assert.doesNotMatch(text, /Object\.assign\(|Reflect\.set\(|defineProperty\(|\bas any\b|\bas unknown as\b|\bas [^;,)]*Record</, `${file}: a way around the types or a computed write`);
      for (const sink of [/\.src\b/, /\.href\b/, /\.style\b/, /\.action\b/, /\.formAction\b/, /\.data\s*=/, /setAttributeNS/, /\.location\b/, /window\.open/, /\.poster\b/, /new Image\b/, /\.srcset\b/]) {
        assert.doesNotMatch(text, sink, `${file}: ${sink}`);
      }
      assert.equal([...text.matchAll(/createElement(NS)?\(/g)].length, file === "../../site-kit.ts" ? 3 : file === "main.ts" ? 1 : 0, `${file}: createElement`);
    }
    // The HTML tags the page makes, each named in its code: no img, a, iframe, object, embed, form, input, link, or script.
    const TAGS = new Set(["b", "dd", "details", "div", "dl", "dt", "h4", "li", "p", "pre", "section", "span", "summary", "ul"]);
    for (const { file, text } of code()) {
      for (const tag of args(text, "el")) assert.ok((/^"[a-z0-9]+"$/.test(tag) && TAGS.has(tag.slice(1, -1))) || (file === "../../site-kit.ts" && ["tag", '"button"', '"code"', '"b"', '"span"'].includes(tag)), `${file}: el(${tag})`);
    }
  });

  test("the page's markup loads its own script and style only, and nothing inline; the style loads nothing", () => {
    const html = sources.find((s) => s.file === "index.html")!.text;
    assert.deepEqual([...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]), ['<script src="./main.js" defer>']);
    assert.deepEqual([...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]), ['<link rel="stylesheet" href="./style.css">']);
    assert.doesNotMatch(html, /<style|style=|<img|<image|<svg|href="(?!\.\/style\.css")/);
    assert.doesNotMatch(sources.find((s) => s.file === "style.css")!.text, /url\(|@import/, "the style loads nothing");
  });
});

describe("what the page reads", () => {
  test("only its read channel: the project's idea_graph.md and paper_skeleton.md", () => {
    const main = source("main.ts");
    assert.deepEqual([...main.matchAll(/fetch\(([^)]*\))/g)].map((m) => m[1]), ["filesUrl(path)"]);
    assert.match(main, /const res = await fetch\(filesUrl\(path\), \{ cache: "no-store" \}\);/);
    assert.deepEqual(args(main, "read"), ["filePath(project!)", "skeletonPath(project!)"]);
    assert.doesNotMatch(main, /\/api\/|XMLHttpRequest|listUrl/);
    const logic = source("logic.ts");
    assert.match(logic, /export const FILE = "idea_graph\.md";/);
    assert.match(logic, /export const SKELETON = "paper_skeleton\.md";/);
    assert.match(logic, /export const filePath = \(project: string\) => `projects-folder\/\$\{project\}\/\$\{FILE\}`;/);
    assert.match(logic, /export const skeletonPath = \(project: string\) => `projects-folder\/\$\{project\}\/\$\{SKELETON\}`;/);
    for (const file of ["../../md-kit.ts", "logic.ts", "layout.ts"]) assert.doesNotMatch(source(file), /fetch\(|XMLHttpRequest|import\(/, file);
    assert.match(source("../../site-kit.ts"), /`\.\/_os\/files\?path=\$\{encodeURIComponent\(rel\)\}`/);
  });

  test("no bridge, no storage, no other window but the app's, named exactly; the selection is selectionOf's label and quote", () => {
    for (const { file, text } of sources) assert.doesNotMatch(text, /osDesktop|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource|sendBeacon/, file);
    // Unstripped: the comment pattern would take "//research-os" for a comment.
    const main = sources.find((s) => s.file === "main.ts")!.text;
    assert.match(main, /const HOST = "app:\/\/research-os";/);
    assert.deepEqual([...main.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]), ["message, HOST"]);
    assert.deepEqual([...main.matchAll(/post\((\{[^}]*\})\)/g)].map((m) => m[1]).sort(), ['{ type: "os.select", label: null }', '{ type: "os.select", label: s.label, quote: s.quote }']);
    assert.match(main, /const s = selectionOf\(node\);/);
  });
});
