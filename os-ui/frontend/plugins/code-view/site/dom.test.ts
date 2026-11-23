/**
 * The Code view's page puts untrusted text on screen as text only, and reads
 * only through its own channel and handler. These source checks, with the
 * end-to-end suite's markup file and commit, are what stand between a file
 * name and a running `onerror=`; PLUGIN_CSP's lack of inline script is the
 * second layer. The DOM helpers themselves are site-kit's
 * (../../site-kit.test.ts).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
/** The page's own code and markup, tests left out, and the shared site-kit it bundles. */
const sources = [
  ...readdirSync(SITE)
    .filter((f) => /\.(ts|html|css)$/.test(f) && !f.endsWith(".test.ts"))
    .map((f) => ({ file: f, text: readFileSync(join(SITE, f), "utf8") })),
  { file: "../../site-kit.ts", text: readFileSync(join(SITE, "../../site-kit.ts"), "utf8") },
];

describe("the page's DOM", () => {
  test("no HTML sink anywhere in the page's code or markup", () => {
    assert.ok(sources.some((s) => s.file === "main.ts") && sources.some((s) => s.file === "../../site-kit.ts"), "the scan sees the page's code");
    for (const { file, text } of sources) {
      for (const sink of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /DOMParser/, /createContextualFragment/, /srcdoc/, /\beval\(/, /new Function\b/, /\son[a-z]+=/i]) {
        assert.doesNotMatch(text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), sink, `${file}: ${sink}`);
      }
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
    const kit = sources.find((s) => s.file === "../../site-kit.ts")!.text;
    assert.match(kit, /`\.\/_os\/files\?path=\$\{encodeURIComponent\(rel\)\}`/);
    assert.match(kit, /`\.\/_os\/list\?path=\$\{encodeURIComponent\(rel\)\}`/);
    const logic = sources.find((s) => s.file === "logic.ts")!.text;
    assert.match(logic, /`\/api\/code-view\/git\/\$\{route\}\?\$\{params\}`/);
  });

  test("no bridge, no other window but the app's, which is named exactly", () => {
    for (const { file, text } of sources) assert.doesNotMatch(text, /osDesktop|localStorage|sessionStorage|indexedDB|window\.open|XMLHttpRequest|WebSocket|EventSource/, file);
    assert.match(main, /const HOST = "app:\/\/research-os";/);
    assert.deepEqual([...main.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]), ["message, HOST"]);
  });
});
