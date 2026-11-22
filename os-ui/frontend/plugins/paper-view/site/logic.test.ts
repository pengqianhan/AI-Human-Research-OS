import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readSelect, referenceText } from "../../../src/plugins/select.ts";
import type { PluginPage } from "../../../src/plugins/pages.ts";
import { LABEL_MAX, QUOTE_MAX } from "../../site-kit.ts";
import {
  CUT,
  cssScale,
  destTop,
  fetchWords,
  fitZoom,
  headingAt,
  headingTitle,
  MAX_CANVAS_PIXELS,
  missingWords,
  openWords,
  outputScale,
  pageLabel,
  pagePlan,
  pagesNote,
  pagesWithin,
  projectWords,
  quoteOf,
  readerWords,
  readingOrder,
  selectionLabel,
  STEPS,
  zeroPagesWords,
  zoomFactor,
  zoomLabel,
  zoomStep,
} from "./logic.ts";
import type { Heading } from "./logic.ts";

const MARKUP = `<img src=x onerror="window.top.__pwned=8"><script>window.__pwned=9</script>`;

describe("zoom, as mockup C", () => {
  test("Fit width: the scroller less 48px over the 640px sheet, between 80% and 150%", () => {
    assert.equal(fitZoom(688), 1);
    assert.equal(fitZoom(300), 0.8);
    assert.equal(fitZoom(4000), 1.5);
    assert.equal(zoomFactor("fit", 688), 1);
    assert.equal(zoomFactor(1.25, 688), 1.25);
  });

  test("steps in and out from any zoom, stopping at the ends", () => {
    assert.deepEqual(STEPS.slice(0, 7), [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.5], "the mockup's steps come first");
    assert.equal(zoomStep(1, 1), 1.1);
    assert.equal(zoomStep(1.04, 1), 1.1);
    assert.equal(zoomStep(1.04, -1), 1);
    assert.equal(zoomStep(0.8, -1), 0.8);
    assert.equal(zoomStep(3, 1), 3);
    assert.equal(zoomStep(1.5, 1), 2);
  });

  test("labels and scale", () => {
    assert.equal(zoomLabel("fit", 1.04), "Fit · 104%");
    assert.equal(zoomLabel(1.25, 1.25), "125%");
    assert.equal(pageLabel(2, 4), "Page 2 of 4");
    assert.equal(cssScale(1, 612), 640 / 612, "a US-letter page is 640px wide at 100%");
    assert.equal(cssScale(1.5, 612) * 612, 960);
  });
});

describe("which pages are drawn", () => {
  const boxes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ top: 26 + i * 1000, height: 980 }));
  const scrollHeight = 26 + 10 * 1000 + 96;

  test("the pages near the view, nearest first; canvases kept a little further; the current page a quarter down", () => {
    const plan = pagePlan(boxes, { top: 4100, height: 800, scrollHeight });
    assert.equal(plan.current, 4);
    assert.deepEqual(plan.draw, [4, 3, 5]);
    assert.deepEqual(plan.keep, [1, 2, 3, 4, 5, 6, 7]);
    assert.ok(!plan.keep.includes(0) && !plan.keep.includes(9), "far pages are released");
  });

  test("at the bottom, the last page is current; with no pages, nothing", () => {
    assert.equal(pagePlan(boxes, { top: scrollHeight - 800, height: 800, scrollHeight }).current, 9);
    assert.deepEqual(pagePlan([], { top: 0, height: 800, scrollHeight: 0 }), { current: 0, draw: [], keep: [] });
    assert.deepEqual(pagesWithin(boxes, 0, 30), [0]);
  });

  test("a canvas never holds more than MAX_CANVAS_PIXELS, whatever the zoom", () => {
    assert.equal(outputScale(640, 828, 2), 2);
    assert.equal(outputScale(640, 828, 0), 1, "no ratio reported: 1");
    const big = outputScale(1920, 2484, 2);
    assert.ok(big < 2 && Math.abs(1920 * big * 2484 * big - MAX_CANVAS_PIXELS) < 1, String(big));
    const tall = outputScale(960, 960 * 40, 1);
    assert.ok(960 * tall * 960 * 40 * tall <= MAX_CANVAS_PIXELS + 1);
  });
});

describe("the outline heading a selection falls under", () => {
  test("destinations: XYZ, FitH, FitBH, FitR carry a top; Fit and broken ones do not", () => {
    const ref = { num: 26, gen: 0 };
    assert.equal(destTop([ref, { name: "XYZ" }, 72, 416.144, null]), 416.144);
    assert.equal(destTop([ref, { name: "XYZ" }, 72, null, null]), null);
    assert.equal(destTop([ref, { name: "FitH" }, 500]), 500);
    assert.equal(destTop([ref, { name: "FitBH" }, 400]), 400);
    assert.equal(destTop([ref, { name: "FitR" }, 0, 100, 300, 700]), 700);
    assert.equal(destTop([ref, { name: "Fit" }]), null);
    assert.equal(destTop([ref]), null);
    assert.equal(destTop([ref, { name: "XYZ" }, 0, "x"]), null);
  });

  // The nanochat_cpu paper's outline, as PDF.js reads it (pages 0-based).
  const outline: Heading[] = readingOrder([
    { title: "Introduction", page: 0, top: 416.144 },
    { title: "Setup", page: 0, top: 223.865 },
    { title: "Results", page: 1, top: 367.963 },
    { title: "Limitations", page: 2, top: 381.43 },
    { title: "Reproducibility", page: 2, top: 232.714 },
  ]);

  test("by page and by height: a section starting mid-page counts from where it starts", () => {
    assert.equal(headingAt(outline, 0, 700), null, "the title, above Introduction");
    assert.equal(headingAt(outline, 0, 405)?.title, "Introduction", "the heading's own line, just under its destination");
    assert.equal(headingAt(outline, 0, 300)?.title, "Introduction");
    assert.equal(headingAt(outline, 0, 100)?.title, "Setup");
    assert.equal(headingAt(outline, 1, 700)?.title, "Setup", "the top of page 2 is still Setup");
    assert.equal(headingAt(outline, 1, 300)?.title, "Results");
    assert.equal(headingAt(outline, 2, null)?.title, "Results", "no height: the top of the page");
    assert.equal(headingAt(outline, 3, 500)?.title, "Reproducibility");
    assert.equal(headingAt([], 0, 0), null);
  });

  test("reading order sorts by page and height; a page-top heading comes first on its page", () => {
    const sorted = readingOrder([
      { title: "b", page: 1, top: 100 },
      { title: "a", page: 1, top: null },
      { title: "c", page: 0, top: 50 },
      { title: "d", page: 1, top: 600 },
    ]);
    assert.deepEqual(sorted.map((h) => h.title), ["c", "a", "d", "b"]);
    assert.equal(headingAt(sorted, 1, null)?.title, "a");
  });

  test("a title is kept as text, trimmed, bounded; none when blank or not a string", () => {
    assert.equal(headingTitle(`  ${MARKUP}  `), MARKUP);
    assert.equal(headingTitle("x".repeat(5000))!.length, 400);
    assert.equal(headingTitle("   "), null);
    assert.equal(headingTitle(null), null);
    assert.equal(headingTitle(42), null);
  });
});

describe("what a selection reports, and what the host makes of it", () => {
  const page: PluginPage = { key: "paper-view/paper", plugin: "paper-view", slot: "project", title: "Paper", src: "app://paper-view/index.html", origin: "app://paper-view" };
  const frame = { name: "the Paper view's frame" };
  const host = (label: string, quote?: string) =>
    readSelect({ origin: "app://paper-view", source: frame, data: { type: "os.select", label, ...(quote === undefined ? {} : { quote }) } }, page, frame);

  test("labels name the file, the page or pages, and the heading", () => {
    assert.equal(selectionLabel(2, 2, "Setup"), "paper/main.pdf p. 2 · Setup");
    assert.equal(selectionLabel(2, 3, "Setup"), "paper/main.pdf pp. 2–3 · Setup");
    assert.equal(selectionLabel(1, 1, null), "paper/main.pdf p. 1");
  });

  test("an outline title with markup, line breaks, or invisible characters is text the host accepts, the page kept when it is cut", () => {
    const markup = selectionLabel(1, 1, MARKUP);
    assert.equal(markup, `paper/main.pdf p. 1 · ${MARKUP}`);
    assert.deepEqual(host(markup), { kind: "select", reference: { label: markup } });
    const hidden = selectionLabel(1, 1, "Setup\n\u202eevil\u200b");
    assert.equal(hidden, "paper/main.pdf p. 1 · Setup⟨U+000A⟩⟨U+202E⟩evil⟨U+200B⟩");
    assert.equal(host(hidden)?.kind, "select");
    const long = selectionLabel(12, 13, "A".repeat(1000));
    assert.equal(long.length, LABEL_MAX);
    assert.ok(long.startsWith("paper/main.pdf pp. 12–13 · AAA") && long.endsWith("…"), long);
    assert.equal(host(long)?.kind, "select");
    const astral = selectionLabel(1, 1, "😀".repeat(200));
    assert.ok(astral.length <= LABEL_MAX && !/[\ud800-\udbff]…$/.test(astral), "a pair is never split");
  });

  test("the quote: the selected text without the whitespace around it, cut before the host's 2,000 with a visible mark", () => {
    assert.equal(quoteOf("  We shrink nanochat\n"), "We shrink nanochat");
    assert.equal(quoteOf(" \n\t "), null);
    const cut = quoteOf("x".repeat(5000))!;
    assert.equal(cut.length, QUOTE_MAX);
    assert.ok(cut.endsWith(CUT));
    assert.deepEqual(host("paper/main.pdf p. 1", cut), { kind: "select", reference: { label: "paper/main.pdf p. 1", quote: cut } });
    assert.equal(host("paper/main.pdf p. 1", "x".repeat(QUOTE_MAX + 1)), null, "uncut, the host would refuse it");
    const pair = quoteOf(`${"x".repeat(QUOTE_MAX - CUT.length - 1)}😀${"y".repeat(10)}`)!;
    assert.ok(pair.endsWith(`x${CUT}`), "a pair at the cut is dropped whole");
  });

  test("what the chip will send is the label and the quote as shown", () => {
    const reference = host("paper/main.pdf p. 1", "nanochat on a Laptop CPU:\nan example")!;
    assert.equal(reference.kind, "select");
    if (reference.kind === "select") assert.equal(referenceText(reference.reference), "About paper/main.pdf p. 1\n> nanochat on a Laptop CPU:\n> an example");
  });
});

describe("every state has words", () => {
  test("fetching the PDF: too large, busy, unreachable, anything else", () => {
    assert.deepEqual(fetchWords(413), { title: "Too large to show", text: "paper/main.pdf is larger than 32 MiB, the most the Paper view reads.", retry: true });
    assert.equal(fetchWords(503).title, "Too many files are being read at once");
    assert.equal(fetchWords(0).title, "The Paper view could not reach the app");
    assert.equal(fetchWords(500).text, "The app answered 500 for paper/main.pdf.");
  });

  test("no main.pdf: not built yet, no paper/ folder, or neither file", () => {
    assert.deepEqual(missingWords("P", [{ name: "main.tex", dir: false }, { name: "references.bib", dir: false }]), {
      title: "Not built yet",
      text: "The paper has not been built yet: paper/main.tex exists, paper/main.pdf does not.",
      retry: true,
    });
    assert.equal(missingWords("P", null).text, "This project has no paper/ folder.");
    assert.equal(missingWords("P", [{ name: "main.tex", dir: true }]).text, "projects-folder/P/paper/ holds neither main.pdf nor main.tex.");
  });

  test("a PDF that does not open: password, invalid, any other reason in PDF.js's words", () => {
    assert.equal(openWords({ name: "PasswordException", code: 1, message: "No password given" }).title, "The paper is password-protected");
    assert.equal(openWords({ name: "InvalidPDFException", message: "Invalid PDF structure." }).text, "paper/main.pdf could not be opened (it is not a valid PDF file).");
    assert.equal(openWords({ name: "UnknownErrorException", message: "Bad FCHECK in flate stream" }).text, "paper/main.pdf could not be opened (PDF.js reported: Bad FCHECK in flate stream).");
    assert.equal(openWords({}).text, "paper/main.pdf could not be opened (PDF.js gave no reason).");
    assert.equal(openWords({ message: MARKUP }).text, `paper/main.pdf could not be opened (PDF.js reported: ${MARKUP}).`, "a message is text");
    assert.equal(openWords({ message: "m".repeat(500) }).text.length, "paper/main.pdf could not be opened (PDF.js reported: ).".length + 200);
    assert.equal(zeroPagesWords.title, "The paper has no pages");
    assert.match(readerWords("the worker did not start").text, /\(the worker did not start\)/);
  });

  test("the project, and the bar's note", () => {
    assert.equal(projectWords("").title, "No project given");
    assert.match(projectWords("?project=..%2Fx").text, /^“\.\.\/x” is not a project folder name the Paper view can open/);
    assert.equal(pagesNote(4), "paper/main.pdf · 4 pages · select text to ask the agent about it");
    assert.equal(pagesNote(1), "paper/main.pdf · 1 page · select text to ask the agent about it");
  });
});
