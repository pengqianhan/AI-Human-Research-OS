import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readSelect, referenceText } from "../../../src/plugins/select.ts";
import type { PluginPage } from "../../../src/plugins/pages.ts";
import { LABEL_MAX, QUOTE_MAX } from "../../site-kit.ts";
import {
  capTextRuns,
  CUT,
  cssScale,
  LAYOUT_MAX_PX,
  overBudgetWords,
  PAGE_BUDGET_MS,
  PAGES_MAX,
  pagesLimitWords,
  pagesShown,
  quotedPages,
  slowWords,
  textCutWords,
  visibleBudget,
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

describe("bounds on an enormous or hostile PDF", () => {
  const letter = () => 792;

  test("at most PAGES_MAX pages are laid out, and the bar and the column say how many of how many", () => {
    assert.equal(pagesShown(4, letter, 612), 4);
    assert.equal(pagesShown(300_000, letter, 612), PAGES_MAX);
    assert.equal(PAGES_MAX, 1000);
    assert.equal(pagesNote(300_000, 1000), "paper/main.pdf · first 1,000 of 300,000 pages · select text to ask the agent about it");
    assert.equal(pagesNote(4, 4), "paper/main.pdf · 4 pages · select text to ask the agent about it");
    assert.match(pagesLimitWords(1000, 300_000), /^The Paper view shows the first 1,000 of this PDF's 300,000 pages .*Open paper\/main\.pdf in a PDF reader for the rest\.$/);
  });

  test("no page is laid out below what one scrolling column can reach, at the largest zoom", () => {
    const scaleAtMost = cssScale(STEPS[STEPS.length - 1]!, 612);
    // 1,000 letter pages at 300% take about 2.5 million pixels: all fit.
    assert.ok(1000 * (792 * scaleAtMost + 18) < LAYOUT_MAX_PX);
    // A one-point-wide first page makes a 14,400-point page about 27 million pixels tall at 300%: only the first page is laid out.
    assert.equal(pagesShown(2, (i) => (i === 0 ? 1 : 14_400), 1), 1);
    // Tall pages after ordinary ones: as many as fit, never past the clamp.
    const tall = (i: number) => (i < 10 ? 792 : 14_400);
    const shown = pagesShown(500, tall, 612);
    let height = 26 + 96;
    for (let i = 0; i < shown; i++) height += Math.floor(tall(i) * scaleAtMost) + 18;
    assert.ok(shown > 10 && shown < 500 && height <= LAYOUT_MAX_PX, `${shown} pages, ${height} px`);
    assert.ok(LAYOUT_MAX_PX < 16_777_216, "under Chromium's clamp on an element's height");
  });

  test("a page's text stream is cut at the run limit, and the source is cancelled", async () => {
    let cancelled = false;
    const chunks = [{ items: [1, 2, 3], styles: {} }, { items: [4, 5, 6, 7], styles: {} }, { items: [8], styles: {} }];
    const source = new ReadableStream<{ items: unknown[]; styles?: unknown }>({
      pull(controller) {
        const next = chunks.shift();
        if (next === undefined) controller.close();
        else controller.enqueue(next);
      },
      cancel() {
        cancelled = true;
      },
    });
    let cuts = 0;
    const read: unknown[] = [];
    const reader = capTextRuns(source, 5, () => cuts++).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read.push(...value.items);
    }
    assert.deepEqual(read, [1, 2, 3, 4, 5]);
    assert.equal(cuts, 1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(cancelled, true);
    // Under the limit, everything passes and nothing is cut.
    const small = capTextRuns(new ReadableStream({ start: (c) => (c.enqueue({ items: [1] }), c.close()) }), 5, () => cuts++).getReader();
    assert.deepEqual((await small.read()).value?.items, [1]);
    assert.equal((await small.read()).done, true);
    assert.equal(cuts, 1);
  });

  test("a page's budget counts only time the page can be seen, and no more than two ticks for a long gap", () => {
    let now = 0;
    let tick: (() => void) | null = null;
    const clock = { now: () => now, every: (fn: () => void) => (tick = fn), stop: () => (tick = null) };
    let visible = true;
    let over = 0;
    const step = (ms: number) => {
      now += ms;
      tick?.();
    };
    const stop = visibleBudget(1000, () => over++, () => visible, clock, 250);
    step(250);
    step(250);
    visible = false; // another tab, or the window in the background: PDF.js's drawing waits too
    for (let i = 0; i < 100; i++) step(250);
    assert.equal(over, 0, "25 s hidden count for nothing");
    visible = true;
    step(250);
    assert.equal(over, 0);
    step(60_000); // a sleep: one gap, at most two ticks
    assert.equal(over, 1, "750 + 500 ms visible reach the 1,000 ms budget");
    assert.equal(tick, null, "it stops once over");
    stop();
    let stopped = 0;
    const early = visibleBudget(1000, () => stopped++, () => true, clock, 250);
    early();
    for (let i = 0; i < 10; i++) step(250);
    assert.equal(stopped, 0, "a page drawn in time stops its budget");
  });

  test("words for a page stopped, text cut, and a reader that did not answer", () => {
    assert.equal(PAGE_BUDGET_MS, 15_000);
    assert.equal(overBudgetWords(3), "Page 3 took longer than 15 s to draw, so the Paper view stopped it and the rest of the paper is shown. Reload tries again.");
    assert.equal(textCutWords(2, "runs"), "Only the first 10,000 pieces of page 2's text can be selected.");
    assert.match(textCutWords(2, "time"), /^Page 2's text took longer than 15 s to lay out/);
    assert.deepEqual(slowWords("open", 20), {
      title: "The paper took too long to open",
      text: "PDF.js did not open paper/main.pdf within 20 s, so it was stopped. The file may be damaged or built to be slow.",
      retry: true,
    });
    assert.equal(slowWords("start", 20).retry, true);
  });
});

describe("the pages a selection quotes", () => {
  test("only pages whose part of the selection holds text count", () => {
    // From the very end of page 1's text into page 2: page 1's part is empty.
    assert.deepEqual(quotedPages([{ page: 1, text: "" }, { page: 2, text: "\nKnob Demo This example" }]), { first: 2, last: 2 });
    assert.deepEqual(quotedPages([{ page: 1, text: " \n " }, { page: 2, text: "x" }, { page: 3, text: "\n" }]), { first: 2, last: 2 });
    assert.deepEqual(quotedPages([{ page: 1, text: "a" }, { page: 2, text: "" }, { page: 3, text: "b" }]), { first: 1, last: 3 });
    assert.equal(quotedPages([{ page: 1, text: "" }]), null);
    assert.equal(quotedPages([]), null);
    const pages = quotedPages([{ page: 1, text: "" }, { page: 2, text: "Knob" }])!;
    assert.equal(selectionLabel(pages.first, pages.last, "Setup"), "paper/main.pdf p. 2 · Setup");
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
    // The review's title: Hangul fillers (default-ignorable, so drawn as nothing) padding a phrase that reads as another reference.
    const filler = String.fromCodePoint(0x3164);
    const padded = selectionLabel(1, 1, `Setup${filler.repeat(30)}see paper/main.tex`);
    assert.ok(padded.startsWith("paper/main.pdf p. 1 · Setup⟨U+3164⟩⟨U+3164⟩") && padded.length <= LABEL_MAX, padded);
    assert.deepEqual(host(padded), { kind: "select", reference: { label: padded } }, "the host takes it as posted");
    const blank = selectionLabel(1, 1, `Setup${String.fromCodePoint(0x2800)}x`);
    assert.equal(blank, "paper/main.pdf p. 1 · Setup⟨U+2800⟩x");
    // Blank runs collapse as the host collapses them, so the label posted is the label shown.
    const spaced = selectionLabel(1, 1, `Set up${" ".repeat(40)}and${String.fromCodePoint(0x3000)}go\t `);
    assert.equal(spaced, "paper/main.pdf p. 1 · Set up and go");
    assert.deepEqual(host(spaced), { kind: "select", reference: { label: spaced } });
    // The host refuses (never rewrites) a label with any space but U+0020, and a refused label drops the selection
    // silently: every other space character in a heading reaches it as a plain space.
    const others = [0x00a0, 0x1680, 0x2002, 0x2007, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000].map((c) => String.fromCodePoint(c));
    for (const space of others) {
      const label = selectionLabel(2, 2, `Results${space}and${space}${space}notes`);
      assert.equal(label, "paper/main.pdf p. 2 · Results and notes", `U+${space.codePointAt(0)!.toString(16)}`);
      assert.deepEqual(host(label), { kind: "select", reference: { label } }, `U+${space.codePointAt(0)!.toString(16)}`);
    }
    // Unchanged, the host would refuse it.
    assert.equal(host(`paper/main.pdf p. 2 · Results${others[0]}and`), null);
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
