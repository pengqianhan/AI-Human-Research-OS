/**
 * Skills Hub's page puts the snapshot on screen as text only, reads only the
 * snapshot through its own channel, and writes only through its own toggle
 * handler. These source checks, with the end-to-end suite's markup in a skill's
 * description, are what stand between a SKILL.md (third-party collected skills
 * included) and a running `onerror=`, a followed link, or a request;
 * PLUGIN_CSP's lack of inline script is the second layer. site-kit.ts is
 * scanned with the page's own code, since its bundle holds it. Sources are
 * read with LF line endings, so the patterns hold on a Windows checkout.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
const readSource = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
/** The page's own code and markup, tests left out, and the shared kit it bundles. */
const sources = [
  ...readdirSync(SITE)
    .filter((f) => /\.(ts|html|css)$/.test(f) && !f.endsWith(".test.ts"))
    .map((f) => ({ file: f, text: readSource(join(SITE, f)) })),
  { file: "../../site-kit.ts", text: readSource(join(SITE, "../../site-kit.ts")) },
];
const source = (file: string) => strip(sources.find((s) => s.file === file)!.text);
const raw = (file: string) => sources.find((s) => s.file === file)!.text;
const code = () => sources.filter((s) => s.file.endsWith(".ts")).map((s) => ({ file: s.file, text: strip(s.text) }));
/** Every distinct first argument (or, with `second`, second argument) of `name(` calls in `text`. */
function args(text: string, name: string, second = false): string[] {
  const found = new Set<string>();
  const re = new RegExp(`(?<![\\w.])(?<!function )${name}\\(`, "g");
  for (const m of text.matchAll(re)) {
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
  test("no HTML sink anywhere in the page's code, markup, or the kit it bundles", () => {
    assert.deepEqual(sources.map((s) => s.file).sort(), ["../../site-kit.ts", "index.html", "logic.ts", "main.ts", "style.css"]);
    for (const { file, text } of sources) {
      for (const sink of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /DOMParser/, /createContextualFragment/, /srcdoc/, /\beval\(/, /new Function\b/, /\son[a-z]+=/i, /\.cssText\b/]) {
        assert.doesNotMatch(strip(text), sink, `${file}: ${sink}`);
      }
    }
  });

  test("every attribute the page sets, by name and value: roles, ARIA words, and states from its own logic", () => {
    const main = source("main.ts");
    assert.deepEqual(
      [...main.matchAll(/(\w+)\.setAttribute\(("[\w-]+"), ([^;]+)\);/g)].map((m) => `${m[1]}.${m[2]} = ${m[3]}`).sort(),
      [
        'bar."aria-label" = FILTER_LABEL',
        'bar."role" = "group"',
        'copyButton."aria-live" = "polite"',
        'dot."aria-hidden" = "true"',
        'drawer."aria-hidden" = "false"',
        'drawer."aria-hidden" = "true"',
        'drawer."aria-hidden" = "true"',
        'drawer."aria-label" = PANEL_LABEL',
        'drawer."aria-modal" = "true"',
        'drawer."role" = "dialog"',
        'node."aria-pressed" = String(action.pressed)',
        'pill."aria-pressed" = String(activeFilter === value)',
        'scrim."aria-hidden" = "true"',
        'search."aria-label" = SEARCH_LABEL',
      ],
    );
    assert.equal([...main.matchAll(/setAttribute\(/g)].length, 14, "no other setAttribute");
    // Snapshot text reaches an attribute nowhere: the two tooltips are fixed words.
    assert.deepEqual([...main.matchAll(/\.title = ([^;]+);/g)].map((m) => m[1]).sort(), ["BAND_DESCRIPTION", "INSTALL_TITLE"]);
    assert.deepEqual([...main.matchAll(/\.placeholder = ([^;]+);/g)].map((m) => m[1]), ["SEARCH_PLACEHOLDER"]);
    assert.deepEqual([...main.matchAll(/\.type = ([^;]+);/g)].map((m) => m[1]), ['"search"']);
  });

  test("a class is a literal or a fixed map's value, never snapshot text", () => {
    const main = source("main.ts");
    const classes = [...args(main, "el", true), ...args(main, "button")];
    for (const c of classes) {
      assert.ok(/^"[\w -]*"$/.test(c) || c === "TONE_CLASS[view.tone]" || c === "DOT_CLASS[row.dot]" || c === 'row.install === null ? "btn btn-sm btn-ghost" : "btn btn-sm"', `a class: ${c}`);
    }
    assert.match(main, /const TONE_CLASS: Readonly<Record<Tone, string>> = \{ ok: "badge ok", warn: "badge warn", mute: "badge mute" \};/);
    assert.match(main, /const DOT_CLASS: Readonly<Record<Dot, string>> = \{ none: "idot none", ok: "idot ok", bad: "idot bad" \};/);
    // The tone and the dot are the logic's own words: a sync the generator never writes is "mute".
    assert.match(source("logic.ts"), /tone: SYNC_TONES\.get\(skill\.sync\) \?\? "mute",/);
    assert.match(source("logic.ts"), /dot: found === null \? "none" : found\.ok \? "ok" : "bad"/);
    assert.deepEqual([...main.matchAll(/\.className = ([^;]+);/g)].map((m) => m[1]).sort(), ['"drawer open"', '"drawer"']);
    assert.deepEqual([...source("../../site-kit.ts").matchAll(/\.className = ([^;]+);/g)].map((m) => m[1]), ["cls"]);
    assert.doesNotMatch(main, /classList/, "no class is added from code");
  });

  test("no roundabout way to a sink: bracket or object-key forms, a src, a new element, or a cast, in any site file", () => {
    const SINK_WORD = /(["'`])(inner|outer|html|innerhtml|outerhtml|insertadjacenthtml|srcdoc|srcset|src|href|style|action|formaction|iframe|embed|script|on[a-z]*)\1/gi;
    const allowed: Record<string, Record<string, number>> = { "../../site-kit.ts": { href: 1 } };
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
      assert.equal([...text.matchAll(/createElement(NS)?\(/g)].length, file === "../../site-kit.ts" ? 3 : 0, `${file}: createElement`);
    }
    // The HTML tags the page makes, each named in its code: one <input>, the search; no img, a, iframe, object, embed, form, link, or script.
    const TAGS = new Set(["aside", "b", "code", "dd", "div", "dl", "dt", "h1", "h3", "input", "p", "section", "span"]);
    for (const { file, text } of code()) {
      for (const tag of args(text, "el")) assert.ok((/^"[a-z0-9]+"$/.test(tag) && TAGS.has(tag.slice(1, -1))) || (file === "../../site-kit.ts" && ["tag", '"button"', '"code"', '"b"', '"span"'].includes(tag)), `${file}: el(${tag})`);
    }
    assert.equal([...source("main.ts").matchAll(/el\("input"/g)].length, 1);
  });

  test("every method the page's DOM code calls and every property it sets is on a pinned list", () => {
    const members = (text: string) => ({
      calls: [...new Set([...text.matchAll(/\.\s*([A-Za-z_$][\w$]*)\s*(?:<[^>()]*>)?\s*\(/g)].map((m) => m[1]!))].sort(),
      sets: [...new Set([...text.matchAll(/\.([A-Za-z_$][\w$]*)\s*(?:\+|-|\*|\/|\?\?|\|\||&&)?=(?!=)/g)].map((m) => m[1]!))].sort(),
    });
    // A new call or property here (setHTMLUnsafe, insertRule, toggleAttribute, dataset, id, …) fails this test until it is reviewed and added.
    assert.deepEqual(members(source("main.ts")), {
      calls: [
        "addEventListener",
        "append",
        "cancel",
        "catch",
        "clear",
        "clearTimeout",
        "delete",
        "focus",
        "forEach",
        "get",
        "getElementById",
        "has",
        "insertBefore",
        "json",
        "keys",
        "map",
        "remove",
        "replaceChildren",
        "replaceWith",
        "set",
        "setAttribute",
        "setTimeout",
        "stringify",
        "text",
        "values",
        "writeText",
      ],
      sets: ["className", "disabled", "hidden", "placeholder", "textContent", "title", "type"],
    });
    assert.deepEqual(members(source("../../site-kit.ts")), {
      calls: ["append", "cancel", "catch", "charCodeAt", "codePointAt", "createElement", "createElementNS", "createTextNode", "decode", "get", "getReader", "includes", "indexOf", "inlineNodes", "lastIndexOf", "map", "max", "min", "padStart", "push", "read", "replace", "set", "setAttribute", "slice", "subarray", "test", "toString", "toUpperCase"],
      sets: ["className", "textContent", "title", "type"],
    });
    // The pure file never touches the DOM, the window, or the network (its words, such as "per-location", left out).
    const words = /"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
    assert.doesNotMatch(source("logic.ts").replace(words, '""'), /\b(document|window|globalThis|self|navigator|location|fetch|Element|Node)\b/);
    for (const { file, text } of code()) {
      assert.doesNotMatch(text, /\w*HTML\w*\s*\(|\.\w*HTML\b|DOMParser|parseFromString|createContextualFragment|createHTMLDocument|XSLTProcessor|document\.write|srcdoc/, `${file}: an HTML parser`);
      assert.doesNotMatch(text, /\.style\b|styleSheets|adoptedStyleSheets|CSSStyleSheet|insertRule|replaceSync|\.sheet\b|setProperty|cssText|\bCSS\./, `${file}: a style or a rule from code`);
      assert.doesNotMatch(text, /[\w$)\]!]\[\s*["'`]/, `${file}: a member reached by a string`);
    }
  });

  test("a card is its own skill's: drawn, opened, and given the focus back by its id, never by the key two skills can share", () => {
    const main = source("main.ts");
    assert.doesNotMatch(main, /\bkeyOf\b/, "no card, current skill, or focus is found by collection/name");
    // The ids come from the whole list once per snapshot, in its order, so a filter or a search never renumbers them.
    assert.deepEqual([...main.matchAll(/cardIds\(([^)]*)\)/g)].map((m) => m[1]), ["skills"]);
    assert.match(main, /current = new Map\(skills\.map\(\(s, i\) => \[ids\[i\]!, s\]\)\);/);
    assert.match(main, /idOf = new Map\(skills\.map\(\(s, i\) => \[s, ids\[i\]!\]\)\);/);
    assert.match(main, /function card\(skill: DisplaySkill\): HTMLButtonElement \{\n\s*const id = idOf\.get\(skill\)!;/);
    // The cards drawn and the skills they open are looked up by a card's id alone.
    assert.deepEqual([...new Set([...main.matchAll(/\b(?:cards|current)\.(?:get|set|has|delete)\(([^,)]+)/g)].map((m) => m[1]))].sort(), ["id", "triggerId"]);
    assert.match(main, /const now = current\.get\(id\);\n\s*if \(now !== undefined\) openPanel\(now, id\);/);
    assert.match(main, /cards\.get\(triggerId\)\?\.node\.focus\(\)/);
  });

  test("the page's markup loads its own script and style only, and nothing inline; the style loads nothing", () => {
    const html = raw("index.html");
    assert.deepEqual([...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]), ['<script src="./main.js" defer>']);
    assert.deepEqual([...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]), ['<link rel="stylesheet" href="./style.css">']);
    assert.doesNotMatch(html, /<style|style=|<img|<image|<iframe|<object|<embed|<a\b|<form|href="(?!\.\/style\.css")/);
    // The one picture is the band's icon, a symbol of the page's own sprite (site-kit's icon("puzzle")).
    assert.deepEqual([...html.matchAll(/<svg\b[^>]*>/g)].map((m) => m[0]), ['<svg class="sprite" width="0" height="0" aria-hidden="true">']);
    assert.deepEqual([...html.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]), ["i-puzzle"]);
    assert.deepEqual(args(source("main.ts"), "icon"), ['"puzzle"']);
    assert.doesNotMatch(raw("style.css"), /url\(|@import/, "the style loads nothing");
  });

  test("every token in style.css is the app's own, as src/index.css has it (a view plugin's --muted is not)", () => {
    const tokens = (css: string) => {
      const block = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
      return new Map([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.replace(/\s+/g, " ").trim()]));
    };
    const app = tokens(readSource(join(SITE, "../../../src/index.css")));
    const page = tokens(raw("style.css"));
    assert.ok(page.size >= 30, `${page.size} tokens`);
    for (const [name, value] of page) assert.equal(value, app.get(name), name);
    assert.equal(page.get("--muted"), "#6f675b");
    // Every var() the page uses is one of its tokens.
    for (const m of raw("style.css").matchAll(/var\((--[\w-]+)\)/g)) assert.ok(page.has(m[1]!), m[1]!);
  });
});

describe("what the page reads and writes", () => {
  test("two requests: the snapshot through its read channel, and the toggle on its own origin", () => {
    const main = source("main.ts");
    assert.deepEqual(args(main, "fetch"), ['"/api/skills-hub/toggle"', "filesUrl(STATE)"]);
    assert.equal([...main.matchAll(/\bfetch\(/g)].length, 2);
    assert.match(main, /res = await fetch\(filesUrl\(STATE\), \{ cache: "no-store" \}\);/);
    assert.match(main, /await fetch\("\/api\/skills-hub\/toggle", \{ method: "POST", headers: \{ "Content-Type": "application\/json" \}, body: toggleBody\(skill, target, enable\) \}\);/);
    assert.doesNotMatch(main, /listUrl|XMLHttpRequest/);
    assert.deepEqual([...main.matchAll(/\/api\//g)].length, 1, "no other endpoint");
    assert.match(source("logic.ts"), /export const STATE = "os-ui\/frontend\/public\/state\.json";/);
    assert.doesNotMatch(source("logic.ts"), /fetch\(|XMLHttpRequest|import\(/);
    assert.match(source("../../site-kit.ts"), /`\.\/_os\/files\?path=\$\{encodeURIComponent\(rel\)\}`/);
  });

  test("the clipboard only through navigator.clipboard.writeText, for the two commands", () => {
    const main = source("main.ts");
    assert.deepEqual([...main.matchAll(/navigator\.clipboard\.writeText\(([^)]*\))\)/g)].map((m) => m[1]).sort(), ["installAtTargetCommand(skill, target)", "installCommand(skill)"]);
    assert.equal([...main.matchAll(/clipboard/g)].length, 2);
    for (const { file, text } of code()) assert.doesNotMatch(text, /execCommand|clipboard\.readText|clipboard\.write\(|clipboard\.read\(/, file);
  });

  test("no bridge, no storage, no message, no other window", () => {
    for (const { file, text } of sources) assert.doesNotMatch(text, /osDesktop|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource|sendBeacon|postMessage|window\.parent|window\.top|\bparent\./, file);
  });
});
