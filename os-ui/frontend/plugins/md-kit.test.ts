/**
 * md-kit on the two frozen skeletons (fixtures/README.md says what they copy)
 * and on hostile input: CRLF and lone CR, escaped pipes and uneven rows, every
 * limit at its boundary, and inline input built to make a naive scanner
 * backtrack.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  claims,
  CUT,
  cutText,
  inline,
  LIMITS,
  linkTargets,
  parse,
  plain,
  resolveLink,
  section,
  sections,
  snapshot,
  snapshotItem,
  splitCells,
  splitLines,
  studies,
  usedBy,
} from "./md-kit.ts";
import type { Block, Doc, Table } from "./md-kit.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
/** A fixture as LF text, whatever line endings the checkout gave it. */
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8").split(/\r?\n/).join("\n");
const NANOCHAT = fixture("nanochat_cpu.paper_skeleton.md");
const TEMPLATE = fixture("template.paper_skeleton.md");
const crlf = (text: string) => text.split("\n").join("\r\n");
const lineAt = (text: string, line: number) => text.split("\n")[line - 1]!;

/** Every line number from `first` to `last` of each block, in order. */
function coverage(doc: Doc): number[] {
  return doc.blocks.flatMap((b) => Array.from({ length: b.last - b.first + 1 }, (_, k) => b.first + k));
}

/** Each non-blank line belongs to exactly one block, and each block's lines are the text's own. */
function assertEveryLineOnce(text: string): void {
  const doc = parse(text);
  const lines = text.split("\n");
  const covered = coverage(doc);
  assert.equal(new Set(covered).size, covered.length, "no line is in two blocks");
  const nonBlank = lines.flatMap((l, k) => (l.trim() === "" ? [] : [k + 1]));
  for (const no of nonBlank) assert.ok(covered.includes(no), `line ${no} belongs to a block: ${JSON.stringify(lines[no - 1])}`);
  for (const b of doc.blocks) assert.deepEqual(b.lines, lines.slice(b.first - 1, b.last), `block at ${b.first}`);
}

/** How long `run` takes, in milliseconds. */
function timed(run: () => unknown): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

describe("md-kit on nanochat_cpu's skeleton (a frozen copy)", () => {
  const doc = parse(NANOCHAT);
  const all = sections(doc);

  test("every non-blank line belongs to exactly one block", () => {
    assertEveryLineOnce(NANOCHAT);
    assert.equal(doc.cut, false);
    assert.equal(doc.lines, 132);
  });

  test("claims C1 to C5 on lines 115 to 119, in a table on lines 113 to 119, each verified", () => {
    const found = claims(all);
    assert.ok(found.found);
    assert.deepEqual([found.table.first, found.table.last], [113, 119]);
    assert.deepEqual(found.missing, []);
    assert.deepEqual(
      found.claims.map((c) => [c.id, c.line, c.status]),
      [
        ["C1", 115, "verified"],
        ["C2", 116, "verified"],
        ["C3", 117, "verified"],
        ["C4", 118, "verified"],
        ["C5", 119, "verified"],
      ],
    );
    const c2 = found.claims[1]!;
    assert.equal(c2.text, "base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456");
    assert.equal(c2.evidence, "logged runs");
    assert.equal(c2.source, "[Code/results/summary.json](Code/results/summary.json)");
    assert.equal(c2.result, "`base_val_bpb`, `sft_val_bpb`");
    assert.equal(c2.row, lineAt(NANOCHAT, 116));
    assert.equal(found.section.title, "Claims and Evidence");
    assert.equal(found.section.level, 3);
  });

  test("C1 is used by Main result, on line 83; C3 by Probe 1; C5 by none", () => {
    const rows = studies(all)!;
    assert.deepEqual(
      rows.map((r) => [r.study, r.line, r.ids]),
      [
        ["Main result", 83, ["C1", "C2"]],
        ["Probe 1", 84, ["C3"]],
        ["Probe 2", 85, ["C4"]],
      ],
    );
    assert.deepEqual(usedBy(rows, "C1").map((s) => [s.study, s.line]), [["Main result", 83]]);
    assert.deepEqual(usedBy(rows, "C3").map((s) => s.study), ["Probe 1"]);
    assert.deepEqual(usedBy(rows, "C5"), []);
  });

  test("the Snapshot's items, a value written over two lines joined", () => {
    const snap = snapshot(all)!;
    assert.deepEqual(
      snap.items.map((i) => [i.label, i.first, i.last]),
      [
        ["Working title", 8, 9],
        ["Target venue or audience", 10, 11],
        ["Status", 12, 12],
        ["One-sentence thesis", 13, 15],
        ["Main research question", 16, 16],
        ["Contributions", 17, 21],
      ],
    );
    assert.equal(snapshotItem(snap.items, "working TITLE")!.value, "nanochat on a Laptop CPU: a Three-Minute End-to-End Example for the AI-Human Research OS");
    assert.equal(snapshotItem(snap.items, "Status")!.value, "draft");
    assert.deepEqual(snapshotItem(snap.items, "Working title")!.lines, [lineAt(NANOCHAT, 8), lineAt(NANOCHAT, 9)]);
    // Contributions' numbered lines are one nested level, their wrapped line joined.
    const list = snap.section.blocks[0]!;
    assert.ok(list.kind === "list");
    assert.deepEqual(
      list.items[5]!.children.map((c) => [c.first, c.last, c.text]),
      [
        [18, 18, "A one-command, staged, CPU-only port with documented code changes."],
        [19, 19, "Time, memory, and learning-curve measurements of every stage."],
        [20, 21, "The demo's two probes (matrix learning rate ×2, vocabulary 2,048) at this scale."],
      ],
    );
  });

  test("sections are flat, by heading of any level, found ignoring case", () => {
    assert.deepEqual(
      all.map((s) => [s.level, s.title, s.line]),
      [
        [1, "Paper Skeleton", 1],
        [2, "Snapshot", 6],
        [2, "Source Map", 23],
        [2, "Argument Map", 41],
        [2, "Abstract", 52],
        [2, "Introduction", 57],
        [2, "Related Work", 67],
        [2, "Method", 72],
        [2, "Experiments", 79],
        [2, "Results and Discussion", 87],
        [2, "Limitations", 96],
        [2, "Conclusion", 103],
        [2, "Tracking", 109],
        [3, "Claims and Evidence", 111],
        [3, "Figures and Tables", 121],
        [3, "Appendix and TODOs", 129],
      ],
    );
    assert.equal(section(all, "claims and evidence")?.line, 111);
    assert.equal(section(all, "Nothing"), null);
    assert.deepEqual(section(all, "Tracking")!.blocks, [], "Tracking holds only subsections");
  });

  test("a CRLF copy, and a lone-CR copy, give the same blocks, line numbers, claims and quotes, with no CR anywhere", () => {
    const lf = parse(NANOCHAT);
    for (const [name, text] of [
      ["CRLF", crlf(NANOCHAT)],
      ["CR", NANOCHAT.split("\n").join("\r")],
    ] as const) {
      const other = parse(text);
      assert.deepEqual(other, lf, name);
      assert.deepEqual(claims(sections(other)), claims(sections(lf)), name);
      assert.deepEqual(snapshot(sections(other)), snapshot(sections(lf)), name);
      assert.doesNotMatch(JSON.stringify(other), /\\r/, `${name}: no carriage return in any block, cell, row, or text`);
    }
    // The template too.
    assert.deepEqual(parse(crlf(TEMPLATE)), parse(TEMPLATE));
  });
});

describe("md-kit on the template's skeleton (a frozen copy)", () => {
  const doc = parse(TEMPLATE);
  const all = sections(doc);

  test("every non-blank line belongs to exactly one block", () => {
    assertEveryLineOnce(TEMPLATE);
  });

  test("no claims: the table holds only the placeholder row, whose Claim cell is empty", () => {
    const found = claims(all);
    assert.ok(found.found);
    assert.deepEqual([found.table.first, found.table.last], [159, 161]);
    assert.equal(found.table.rows.length, 1);
    assert.equal(found.table.rows[0]!.cells[4], "planned / verified / weak / removed");
    assert.deepEqual(found.claims, []);
    assert.deepEqual(found.missing, []);
  });

  test("every Snapshot value is empty but Status, which still lists its choices", () => {
    const snap = snapshot(all)!;
    assert.deepEqual(
      snap.items.map((i) => [i.label, i.value]),
      [
        ["Working title", ""],
        ["Target venue or audience", ""],
        ["Status", "idea / outline / draft / submitted / revised"],
        ["One-sentence thesis", ""],
        ["Main research question", ""],
        ["Contributions", ""],
      ],
    );
    const list = snap.section.blocks[0]!;
    assert.ok(list.kind === "list");
    assert.deepEqual(list.items[5]!.children.map((c) => c.text), ["", "", ""], "the bare 1. 2. 3. are empty nested items");
  });

  test("the Experiments table names no claim; a bare numbered line is an empty item", () => {
    assert.deepEqual(studies(all)!.map((s) => s.ids), [[], [], [], []]);
    const sketch = section(all, "Algorithm Sketch")!.blocks[0]!;
    assert.ok(sketch.kind === "list" && sketch.ordered);
    assert.deepEqual(sketch.items.map((i) => [i.first, i.text]), [[113, ""], [114, ""], [115, ""]]);
  });
});

describe("blocks", () => {
  const kinds = (text: string) => parse(text).blocks.map((b) => [b.kind, b.first, b.last]);

  test("headings: 1 to 6 '#' and a space; a closing run of '#' dropped", () => {
    const doc = parse("# One\n###### Six ##\n####### seven\n#nospace\n## Trail#\n#\n##   \n");
    assert.deepEqual(
      doc.blocks.map((b) => (b.kind === "heading" ? [b.level, b.text] : [b.kind, b.first, b.last])),
      [
        [1, "One"],
        [6, "Six"],
        ["paragraph", 3, 4],
        [2, "Trail#"],
        ["paragraph", 6, 6],
        [2, ""],
      ],
    );
    assert.equal((parse("## Trail#").blocks[0] as Block & { text: string }).text, "Trail#", "a '#' with no space before it is the title's");
  });

  test("a fenced block runs to its matching fence, or to the end of the file, blank lines and all", () => {
    assert.deepEqual(kinds("```js\na\n\n| not | a table |\n```\nafter\n"), [
      ["code", 1, 5],
      ["paragraph", 6, 6],
    ]);
    const open = parse("~~~~\n# not a heading\n~~~\n\nstill code");
    assert.deepEqual(open.blocks.map((b) => [b.kind, b.first, b.last]), [["code", 1, 5]]);
    assert.ok(open.blocks[0]!.kind === "code" && !open.blocks[0]!.closed);
    assert.deepEqual(kinds("``\nnot a fence\n"), [["paragraph", 1, 2]]);
  });

  test("lists: '- ', '* ', '+ ', '1. ' items; continuation lines indented by two; one nested level; another marker starts another list", () => {
    const doc = parse("- a\n  more\n  - nested\n    deeper\n- b\n* c\n1. d\n10. e\nnot indented\n");
    assert.deepEqual(kinds("- a\n  more\n  - nested\n    deeper\n- b\n* c\n1. d\n10. e\nnot indented\n"), [
      ["list", 1, 5],
      ["list", 6, 6],
      ["list", 7, 8],
      ["paragraph", 9, 9],
    ]);
    const first = doc.blocks[0]!;
    assert.ok(first.kind === "list");
    assert.deepEqual(
      first.items.map((i) => [i.first, i.last, i.text, i.children.map((c) => c.text)]),
      [
        [1, 4, "a more", ["nested deeper"]],
        [5, 5, "b", []],
      ],
    );
    assert.deepEqual(kinds("-not an item\n1.5 not either\n"), [["paragraph", 1, 2]]);
  });

  test("tables: a '|' line, a delimiter row, then '|' lines; without the delimiter row, a paragraph", () => {
    assert.deepEqual(kinds("| a | b |\n|---|:-:|\n| 1 | 2 |\n| 3 | 4 |\ntext\n"), [
      ["table", 1, 4],
      ["paragraph", 5, 5],
    ]);
    assert.deepEqual(kinds("| a | b |\n| 1 | 2 |\n"), [["paragraph", 1, 2]]);
    assert.deepEqual(kinds("text\n| a |\n|---|\n| 1 |\n"), [
      ["paragraph", 1, 1],
      ["table", 2, 4],
    ], "a table starts after a paragraph line");
    assert.deepEqual(kinds("a | b\n--|--\n"), [["paragraph", 1, 2]], "a table without a leading '|' is literal text");
  });

  test("escaped pipes and uneven rows: '\\|' is a pipe in its cell; a row is padded or cut to the header's count, and flagged", () => {
    const table = parse("| a | b | c |\n|---|---|---|\n| x \\| y | `p\\|q` | z |\n| only |\n| 1 | 2 | 3 | 4 |\n|  |  |  |\n").blocks[0] as Table;
    assert.deepEqual(table.header, ["a", "b", "c"]);
    assert.deepEqual(
      table.rows.map((r) => [r.cells, r.uneven]),
      [
        [["x | y", "`p|q`", "z"], false],
        [["only", "", ""], true],
        [["1", "2", "3"], true],
        [["", "", ""], false],
      ],
    );
    assert.deepEqual(splitCells("| a | b"), ["a", "b"], "no trailing pipe");
    assert.deepEqual(splitCells("| a \\|"), ["a |"], "an escaped pipe at the end is the cell's");
  });

  test("a paragraph ends at a blank line or at a line that starts another block; its drawn text is its lines joined", () => {
    const doc = parse("one\ntwo\n# head\nthree\n- item\n");
    assert.deepEqual(doc.blocks.map((b) => b.kind), ["paragraph", "heading", "paragraph", "list"]);
    assert.equal((doc.blocks[0] as Block & { text: string }).text, "one two");
  });

  test("Markdown outside the subset is kept as literal text", () => {
    const doc = parse("Title\n=====\n> quote\n<div onclick=x>html</div>\n[^1]: note\n[ref]: https://example.invalid\n");
    assert.deepEqual(doc.blocks.map((b) => b.kind), ["paragraph"]);
    assert.equal((doc.blocks[0] as Block & { text: string }).text, "Title ===== > quote <div onclick=x>html</div> [^1]: note [ref]: https://example.invalid");
  });
});

describe("limits, each at its boundary", () => {
  test(`at most ${LIMITS.lines} lines are read`, () => {
    const exact = parse(Array.from({ length: LIMITS.lines }, (_, k) => `line ${k + 1}`).join("\n"));
    assert.equal(exact.lines, LIMITS.lines);
    assert.equal(exact.cut, false);
    const over = parse(Array.from({ length: LIMITS.lines + 1 }, (_, k) => `- ${k + 1}`).join("\n"));
    assert.equal(over.cut, true);
    assert.equal(over.lines, LIMITS.lines);
    assert.equal(over.blocks[over.blocks.length - 1]!.last, LIMITS.lines, "the block ends at the last line read");
    assert.equal(parse(`${"x\n".repeat(LIMITS.lines)}`).cut, false, "a final line break is no extra line");
  });

  test(`at most ${LIMITS.rows} rows a table; the others are counted and still belong to it`, () => {
    const table = (rows: number) => parse(`| a |\n|---|\n${"| r |\n".repeat(rows)}after\n`);
    const exact = table(LIMITS.rows);
    assert.equal((exact.blocks[0] as Table).rows.length, LIMITS.rows);
    assert.equal((exact.blocks[0] as Table).more, 0);
    const over = table(LIMITS.rows + 1);
    const t = over.blocks[0] as Table;
    assert.equal(t.rows.length, LIMITS.rows);
    assert.equal(t.more, 1);
    assert.equal(t.last, LIMITS.rows + 3);
    assert.deepEqual(over.blocks[1]!.kind, "paragraph");
  });

  test(`at most ${LIMITS.columns} columns`, () => {
    const table = (columns: number) => parse(`|${" h |".repeat(columns)}\n|${"---|".repeat(columns)}\n|${" c |".repeat(columns)}\n`).blocks[0] as Table;
    const exact = table(LIMITS.columns);
    assert.deepEqual([exact.header.length, exact.rows[0]!.cells.length, exact.columnsCut, exact.rows[0]!.uneven], [LIMITS.columns, LIMITS.columns, false, false]);
    const over = table(LIMITS.columns + 1);
    assert.deepEqual([over.header.length, over.rows[0]!.cells.length, over.columnsCut, over.rows[0]!.uneven], [LIMITS.columns, LIMITS.columns, true, false]);
  });

  test(`a cell, a drawn line, or a title is cut at ${LIMITS.cell} characters with "${CUT}"`, () => {
    const at = "x".repeat(LIMITS.cell);
    const over = "x".repeat(LIMITS.cell + 1);
    assert.equal(cutText(at), at);
    assert.equal(cutText(over), at + CUT);
    const table = parse(`| a | b |\n|---|---|\n| ${at} | ${over} |\n`).blocks[0] as Table;
    assert.deepEqual(table.rows[0]!.cells, [at, at + CUT]);
    assert.equal(table.rows[0]!.source, `| ${at} | ${over} |`, "the row as written is kept whole: it is the quote, which the view cuts");
    assert.equal((parse(over).blocks[0] as Block & { text: string }).text, at + CUT);
    assert.equal((parse(`## ${over}`).blocks[0] as Block & { text: string }).text, at + CUT);
    // A cut never splits a surrogate pair.
    const fits = `${"x".repeat(LIMITS.cell - 2)}😀`;
    assert.equal(cutText(fits), fits, "exactly the limit in code units");
    assert.equal(cutText(`${"x".repeat(LIMITS.cell - 1)}😀`), `${"x".repeat(LIMITS.cell - 1)}${CUT}`, "the pair is left out whole");
  });
});

describe("inline tokens", () => {
  test("code spans, links, images, bold, and escapes; everything else literal", () => {
    assert.deepEqual(inline("a `b` c"), [
      { kind: "text", text: "a " },
      { kind: "code", text: "b" },
      { kind: "text", text: " c" },
    ]);
    assert.deepEqual(inline("``a ` b`` and ` x `"), [
      { kind: "code", text: "a ` b" },
      { kind: "text", text: " and " },
      { kind: "code", text: "x" },
    ]);
    assert.deepEqual(inline("[Code/README.md](Code/README.md) \"Results\""), [
      { kind: "link", children: [{ kind: "text", text: "Code/README.md" }], target: "Code/README.md" },
      { kind: "text", text: ' "Results"' },
    ]);
    assert.deepEqual(inline("![a figure](https://md-image.invalid/a.png)"), [{ kind: "image", alt: "a figure", target: "https://md-image.invalid/a.png" }]);
    assert.deepEqual(inline("**bold [x](y)** after"), [
      { kind: "bold", children: [{ kind: "text", text: "bold " }, { kind: "link", children: [{ kind: "text", text: "x" }], target: "y" }] },
      { kind: "text", text: " after" },
    ]);
    assert.deepEqual(inline("\\*\\*not bold\\*\\* \\`not code\\` \\[not](a link) a\\b"), [{ kind: "text", text: "**not bold** `not code` [not](a link) a\\b" }]);
    for (const literal of ["[open", "[x] (y)", "[x](y", "`open", "**open", "****", "![x]", "[a [b](c)", "*one*", "_under_"]) {
      assert.equal(plain(inline(literal)), literal.replace("[a [b](c)", "[a b"), literal);
    }
    assert.deepEqual(inline("[a [b](c)"), [
      { kind: "text", text: "[a " },
      { kind: "link", children: [{ kind: "text", text: "b" }], target: "c" },
    ]);
  });

  test("markup and script in the text are tokens of text, never markup", () => {
    const markup = `<script>window.top.__pwned=2</script><img src=x onerror="window.top.__pwned=3">`;
    assert.deepEqual(inline(markup), [{ kind: "text", text: markup }]);
    assert.deepEqual(inline("[x](javascript:alert(1))"), [
      { kind: "link", children: [{ kind: "text", text: "x" }], target: "javascript:alert(1" },
      { kind: "text", text: ")" },
    ]);
    assert.deepEqual(linkTargets(inline("[a](A.md) and **[b](B.md)** ![c](C.png)")), ["A.md", "B.md"]);
  });

  test("input built to make a scanner backtrack costs one pass", (t) => {
    const cases: [string, string][] = [
      ["100,000 '[' and backticks", "[`".repeat(50_000)],
      ["100,000 '['", "[".repeat(100_000)],
      ["100,000 '[' then one ']'", `${"[".repeat(100_000)}]`],
      ["'[x](' with no ')'", "[x](".repeat(25_000)],
      ["backtick runs of every length", Array.from({ length: 440 }, (_, k) => "`".repeat(k + 1)).join(" ")],
      ["'**' with nothing to close", "** a ".repeat(20_000)],
      ["'![' without ']'", "![".repeat(50_000)],
      ["'\\' before every character", "\\[".repeat(50_000)],
    ];
    for (const [name, text] of cases) {
      assert.ok(text.length >= 95_000, `${name}: ${text.length} characters`);
      let tokens: ReturnType<typeof inline> = [];
      const ms = timed(() => (tokens = inline(text)));
      assert.ok(ms < 500, `${name}: ${ms.toFixed(1)} ms`);
      assert.ok(tokens.length >= 1, name);
      t.diagnostic(`inline, ${name} (${text.length} characters): ${ms.toFixed(1)} ms`);
    }
    // The same for a whole file of such lines through parse.
    const file = `${"| [` |\n".repeat(10)}${"[`".repeat(50_000)}\n`;
    assert.ok(timed(() => parse(file)) < 500);
  });
});

describe("links", () => {
  test("resolveLink: a project path, an address as written, or null when it leaves the project", () => {
    const from = "paper_skeleton.md";
    assert.deepEqual(resolveLink("Code/results/summary.json", from), { kind: "path", path: "Code/results/summary.json" });
    assert.deepEqual(resolveLink("Code/", from), { kind: "path", path: "Code/" });
    assert.deepEqual(resolveLink("Code/README.md#results", from), { kind: "path", path: "Code/README.md" });
    assert.deepEqual(resolveLink("Figs/a%20b.svg?x=1", from), { kind: "path", path: "Figs/a b.svg" });
    assert.deepEqual(resolveLink("./paper/main.tex", from), { kind: "path", path: "paper/main.tex" });
    assert.deepEqual(resolveLink("../paper/main.tex", "Code/README.md"), { kind: "path", path: "paper/main.tex" });
    for (const address of ["https://example.invalid/x", "javascript:alert(1)", "mailto:a@b.invalid", "/etc/passwd", "#results"]) {
      assert.deepEqual(resolveLink(address, from), { kind: "address", text: address });
    }
    for (const away of ["../../ideas/", "../x.md", "Code/../../x", ".env", "Code/.git/config", "a//b", "a\\b", "%E0%A4%A", "", "?x", "Code/%2e%2e/%2e%2e/x"]) {
      assert.equal(resolveLink(away, from), null, away);
    }
  });
});

describe("splitLines", () => {
  test("CRLF, CR, and LF each end a line; a final line break ends the last one", () => {
    assert.deepEqual(splitLines("a\r\nb\rc\nd"), ["a", "b", "c", "d"]);
    assert.deepEqual(splitLines("a\n"), ["a"]);
    assert.deepEqual(splitLines("a\n\n"), ["a", ""]);
    assert.deepEqual(splitLines("\r\n"), [""]);
    assert.deepEqual(splitLines(""), []);
  });
});
