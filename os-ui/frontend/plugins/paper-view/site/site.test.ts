/**
 * The Paper view's page treats the PDF as untrusted input: its text and
 * outline reach the DOM as text only, the page reads only main.pdf and the
 * paper/ listing through its own channel, and nothing the PDF carries (its
 * JavaScript, XFA, links, attachments) is ever asked for. These source
 * checks, with the end-to-end suite's hostile PDF, are the guard; PLUGIN_CSP
 * is the second layer. vendor/ is PDF.js's own code, checked by vendor.test.ts.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
/** The page's own code and markup, tests left out, and the shared site-kit it bundles. */
const sources = [
  ...readdirSync(SITE)
    .filter((f) => /\.(ts|html|css)$/.test(f) && !f.endsWith(".test.ts"))
    .map((f) => ({ file: f, text: readFileSync(join(SITE, f), "utf8") })),
  { file: "../../site-kit.ts", text: readFileSync(join(SITE, "../../site-kit.ts"), "utf8") },
];
const source = (file: string) => strip(sources.find((s) => s.file === file)!.text);

describe("the page's DOM", () => {
  test("no HTML sink anywhere in the page's code or markup", () => {
    assert.deepEqual(sources.map((s) => s.file).sort(), ["../../site-kit.ts", "index.html", "logic.ts", "main.ts", "opener.ts", "pdfjs.ts", "style.css"]);
    for (const { file, text } of sources) {
      for (const sink of [/\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /DOMParser/, /createContextualFragment/, /srcdoc/, /\beval\(/, /new Function\b/, /\son[a-z]+=/i, /setAttribute\("style"/, /\.cssText\b/]) {
        assert.doesNotMatch(strip(text), sink, `${file}: ${sink}`);
      }
    }
  });

  test("the text layer is PDF.js's TextLayer over the page's text content, without the PDF's marked-content ids", () => {
    const main = source("main.ts");
    assert.match(main, /capTextRuns\(page\.streamTextContent\(\) as ReadableStream<TextChunk>, TEXT_RUNS_MAX,/);
    assert.match(main, /new lib\.TextLayer\(\{ textContentSource: source, container: slot\.text,/);
    // includeMarkedContent would give the DOM element ids written by the PDF.
    assert.doesNotMatch(main, /includeMarkedContent/);
  });
});

describe("what the page asks of PDF.js", () => {
  test("one getDocument call, with the pinned options and the bytes read over the channel", async () => {
    const main = source("main.ts");
    assert.deepEqual([...main.matchAll(/getDocument\((\{[^}]*\})\)/g)].map((m) => m[1]), ["{ ...DOCUMENT_OPTIONS, data: data.slice(), worker: pdfWorker }"]);
    assert.equal([...main.matchAll(/getDocument\(/g)].length, 1);
    // Each one keeps something the PDF carries from running, fetching, or reaching Chromium's own font or image decoders (pdfjs.ts says which).
    const { DOCUMENT_OPTIONS } = await import("./pdfjs.ts");
    assert.deepEqual(DOCUMENT_OPTIONS, {
      enableXfa: false,
      useWasm: false,
      disableFontFace: true,
      useSystemFonts: false,
      isImageDecoderSupported: false,
      useWorkerFetch: false,
      disableWorkerRendering: true,
      maxImageSize: 4096 * 4096,
      verbosity: 1,
    });
    // No URL for anything PDF.js could fetch (character maps, standard fonts, ICC profiles, wasm); the document comes as `data`.
    assert.doesNotMatch(main + source("pdfjs.ts"), /cMapUrl|standardFontDataUrl|iccUrl|wasmUrl|docBaseUrl/);
  });

  test("nothing that would run, open, or follow what the PDF carries", () => {
    for (const { file, text } of sources) {
      for (const api of [/AnnotationLayer/, /XfaLayer/, /getAttachments/, /getJSActions/, /getFieldObjects/, /enableScripting/, /sandbox/i, /saveDocument/, /getDownloadInfo/, /\.url\b/, /window\.open/, /location\.(href|assign|replace)\s*=/]) {
        assert.doesNotMatch(strip(text), api, `${file}: ${api}`);
      }
    }
  });

  test("PDF.js is loaded from its vendored files on this origin, each document's worker started by the page as a module worker", () => {
    const pdfjs = source("pdfjs.ts");
    const main = source("main.ts");
    assert.match(pdfjs, /new URL\(`\.\/vendor\/\$\{file\}`, location\.href\)\.href/);
    assert.deepEqual([...pdfjs.matchAll(/vendored\("([^"]+)"\)/g)].map((m) => m[1]), ["pdf.worker.min.mjs", "pdf.min.mjs"]);
    assert.match(pdfjs, /new Worker\(url, \{ type: "module", name: "PDF\.js" \}\)/);
    // Handed to PDF.js as a port, document by document: PDF.js never builds or caches a worker of its own.
    assert.match(main, /const opener = new Opener<PdfDocument>\(\(\) => startWorker\(\)\);/);
    assert.match(main, /new lib\.PDFWorker\(\{ port: worker as Worker \}\)/);
    assert.doesNotMatch(pdfjs + main, /workerSrc|workerPort|GlobalWorkerOptions|createObjectURL|blob:/);
  });
});

describe("what the page reads", () => {
  test("only main.pdf and the paper/ listing, through its own read channel", () => {
    const main = source("main.ts");
    assert.deepEqual(
      [...main.matchAll(/fetch\(([^,]+),/g)].map((m) => m[1]!.trim()),
      ["filesUrl(pdfPath)", "listUrl(`projects-folder/${project}/paper`)"],
    );
    assert.match(main, /const pdfPath = `projects-folder\/\$\{project\}\/paper\/main\.pdf`;/);
    assert.doesNotMatch(main, /\/api\//);
  });

  test("no bridge, no storage, no other window but the app's, which is named exactly", () => {
    for (const { file, text } of sources) assert.doesNotMatch(text, /osDesktop|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource/, file);
    // Unstripped: the comment pattern would take "//superresearch-os" for a comment.
    const main = sources.find((s) => s.file === "main.ts")!.text;
    assert.match(main, /const HOST = "app:\/\/superresearch-os";/);
    assert.deepEqual([...main.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]), ["message, HOST"]);
  });
});
