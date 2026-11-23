/**
 * The Skeleton view's rules, one test per row of os-ui/PLUGINS.md Part 3,
 * §3.2, on the frozen copies of nanochat_cpu's and the template's
 * paper_skeleton.md (../../fixtures/README.md), and every screen's words.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { CUT_MARK, readSelect, referenceText } from "../../../src/plugins/select.ts";
import type { PluginPage } from "../../../src/plugins/pages.ts";
import { parse } from "../../md-kit.ts";
import { LABEL_MAX, QUOTE_MAX, readStart } from "../../site-kit.ts";
import {
  blockSelection,
  claimsView,
  contentWords,
  docNotes,
  evidenceOf,
  fileVerdict,
  fileWords,
  openRow,
  projectWords,
  QUOTE_CUT,
  READ_MAX,
  restSections,
  SECTIONS_MAX,
  snapshotCard,
  tableNotes,
  topBar,
} from "./logic.ts";
import type { ClaimRow } from "./logic.ts";
import type { Block, Table } from "../../md-kit.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8").split(/\r?\n/).join("\n");
const NANOCHAT = fixture("nanochat_cpu.paper_skeleton.md");
const TEMPLATE = fixture("template.paper_skeleton.md");
const lineAt = (text: string, line: number) => text.split("\n")[line - 1]!;
const crlf = (text: string) => text.split("\n").join("\r\n");
/** The nanochat skeleton with line `line` replaced by `text`. */
const withLine = (line: number, text: string) => NANOCHAT.split("\n").map((l, k) => (k === line - 1 ? text : l)).join("\n");
const rowsOf = (text: string): ClaimRow[] => {
  const view = claimsView(parse(text));
  assert.equal(view.state, "claims");
  return view.state === "claims" ? view.rows : [];
};

describe("§3.2 top bar: fixed words, the file's path, Reload", () => {
  test("paper_skeleton.md, projects-folder/<P>/paper_skeleton.md, and the hint", () => {
    assert.deepEqual(topBar("nanochat_cpu"), {
      title: "paper_skeleton.md",
      path: "projects-folder/nanochat_cpu/paper_skeleton.md",
      hint: "Select a claim to see its evidence and ask the agent about it.",
      reload: "Reload",
    });
  });
});

describe("§3.2 Snapshot status pill", () => {
  test("the Status item as written; empty is 'not filled in'; no item, no pill", () => {
    assert.equal(snapshotCard(parse(NANOCHAT))!.status, "draft");
    assert.equal(snapshotCard(parse(TEMPLATE))!.status, "idea / outline / draft / submitted / revised");
    assert.equal(snapshotCard(parse(withLine(12, "- Status:")))!.status, "not filled in");
    assert.equal(snapshotCard(parse(withLine(12, "- Stage: draft")))!.status, null);
  });
});

describe("§3.2 Snapshot lines: Working title, Thesis, Audience, Research question", () => {
  test("nanochat_cpu: each value, its continuation lines joined; selectable by its lines", () => {
    const card = snapshotCard(parse(NANOCHAT))!;
    assert.deepEqual(card.title, {
      label: "Working title",
      value: "nanochat on a Laptop CPU: a Three-Minute End-to-End Example for the AI-Human Research OS",
      selection: { label: "paper_skeleton.md:8–9 · section “Snapshot”", quote: `${lineAt(NANOCHAT, 8)}\n${lineAt(NANOCHAT, 9)}` },
    });
    assert.deepEqual(
      card.lines.map((l) => [l.label, l.value, l.selection.label]),
      [
        ["Thesis", "OpenResearch's nanochat demo, scaled to a 0.84M-parameter model, runs every stage on a laptop-class CPU in about three minutes, which makes it a runnable first example rather than a research result.", "paper_skeleton.md:13–15 · section “Snapshot”"],
        ["Audience", "Research OS users running their first example; not submitted anywhere", "paper_skeleton.md:10–11 · section “Snapshot”"],
        ["Research question", "none; the paper documents an example project.", "paper_skeleton.md:16 · section “Snapshot”"],
      ],
    );
  });

  test("the template: every line there, 'not filled in' (null)", () => {
    const card = snapshotCard(parse(TEMPLATE))!;
    assert.equal(card.title!.value, null);
    assert.deepEqual(card.lines.map((l) => [l.label, l.value]), [
      ["Thesis", null],
      ["Audience", null],
      ["Research question", null],
    ]);
    assert.deepEqual(card.title!.selection, { label: "paper_skeleton.md:8 · section “Snapshot”", quote: "- Working title:" });
  });

  test("an item that is not there leaves its line out; no Snapshot section, no card", () => {
    const card = snapshotCard(parse(withLine(16, "- Something else: x")))!;
    assert.deepEqual(card.lines.map((l) => l.label), ["Thesis", "Audience"]);
    assert.equal(snapshotCard(parse(withLine(8, "- Title: x")))!.title, null);
    assert.equal(snapshotCard(parse(withLine(6, "## Overview"))), null);
  });
});

describe("§3.2 claims summary: count, verified, and the table's lines", () => {
  test("nanochat_cpu: 5 claims · 5 verified · paper_skeleton.md:113–119", () => {
    const view = claimsView(parse(NANOCHAT));
    assert.ok(view.state === "claims");
    assert.equal(view.summary, "5 claims · 5 verified · paper_skeleton.md:113–119");
    assert.deepEqual(view.notes, []);
  });

  test("verified ignores case; one claim is one claim", () => {
    const one = ["| Claim | Evidence | Source file or link | Citation/result | Status |", "|---|---|---|---|---|", "| C1: x | e | s | r | Verified |"];
    const view = claimsView(parse(`## Claims and Evidence\n\n${one.join("\n")}\n`));
    assert.ok(view.state === "claims");
    assert.equal(view.summary, "1 claim · 1 verified · paper_skeleton.md:3–5");
    const weak = claimsView(parse(withLine(116, lineAt(NANOCHAT, 116).replace("| verified |", "| weak |"))));
    assert.ok(weak.state === "claims");
    assert.equal(weak.summary, "5 claims · 4 verified · paper_skeleton.md:113–119");
  });

  test("the template: no filled row; no table: said so", () => {
    assert.deepEqual(claimsView(parse(TEMPLATE)), { state: "no-claims", message: "No claims yet: the Claims and Evidence table has no filled row", notes: [] });
    for (const text of [withLine(113, "Claims go here."), withLine(111, "### Claims")]) {
      assert.deepEqual(claimsView(parse(text)), { state: "no-table", message: "No Claims and Evidence table in paper_skeleton.md" });
    }
  });
});

describe("§3.2 claim row: ID and status", () => {
  test("the ID rule; the Status cell as written, verified styled as done", () => {
    const rows = rowsOf(NANOCHAT);
    assert.deepEqual(rows.map((r) => [r.id, r.status, r.verified, r.line]), [
      ["C1", "verified", true, 115],
      ["C2", "verified", true, 116],
      ["C3", "verified", true, 117],
      ["C4", "verified", true, 118],
      ["C5", "verified", true, 119],
    ]);
    const weak = rowsOf(withLine(117, lineAt(NANOCHAT, 117).replace("| verified |", "| weak |")))[2]!;
    assert.deepEqual([weak.status, weak.verified], ["weak", false]);
    assert.deepEqual(rowsOf(withLine(117, lineAt(NANOCHAT, 117).replace("| verified |", "| VERIFIED |")))[2]!.verified, true);
  });

  test("a claim with no ID shows '—' and is known by its line", () => {
    const row = rowsOf(withLine(117, lineAt(NANOCHAT, 117).replace("C3: ", "")))[2]!;
    assert.equal(row.id, "—");
    assert.equal(row.text, "matrix LR ×2 ends 0.012 bpb lower");
    assert.deepEqual(row.selection, { label: "paper_skeleton.md:117 · Claims and Evidence", quote: lineAt(NANOCHAT, 117).replace("C3: ", "") });
    // Lower-case or too long is no ID.
    assert.equal(rowsOf(withLine(117, lineAt(NANOCHAT, 117).replace("C3: ", "c3: ")))[2]!.id, "—");
    assert.equal(rowsOf(withLine(117, lineAt(NANOCHAT, 117).replace("C3: ", "CLAIM3: ")))[2]!.id, "—");
    assert.equal(rowsOf(withLine(117, lineAt(NANOCHAT, 117).replace("C3: ", "H12a: ")))[2]!.id, "H12a");
  });

  test("a claim row's selection: its line and ID, and the row as written", () => {
    assert.deepEqual(rowsOf(NANOCHAT)[1]!.selection, { label: "paper_skeleton.md:116 · claim C2", quote: lineAt(NANOCHAT, 116) });
  });
});

describe("§3.2 claim text; evidence · result; source", () => {
  test("the Claim cell after its ID; the Evidence, Citation/result, and Source cells", () => {
    const c2 = rowsOf(NANOCHAT)[1]!;
    assert.deepEqual([c2.text, c2.evidence, c2.result, c2.source], [
      "base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456",
      "logged runs",
      "`base_val_bpb`, `sft_val_bpb`",
      "[Code/results/summary.json](Code/results/summary.json)",
    ]);
  });

  test("a missing column leaves its part out, and a note under the table names the header", () => {
    const table = [
      "## Claims and Evidence",
      "",
      "| Claim | Proof | Status |",
      "|---|---|---|",
      "| C1: x | y | verified |",
    ].join("\n");
    const view = claimsView(parse(table));
    assert.ok(view.state === "claims");
    assert.deepEqual([view.rows[0]!.evidence, view.rows[0]!.source, view.rows[0]!.result, view.rows[0]!.status], [null, null, null, "verified"]);
    assert.deepEqual(view.notes, ["No “Evidence”, “Source file or link”, or “Citation/result” column in the Claims and Evidence table."]);
    const noStatus = claimsView(parse("## Claims and Evidence\n\n| Claim | Evidence | Source file or link | Citation/result |\n|---|---|---|---|\n| C1: x | e | s | r |\n"));
    assert.ok(noStatus.state === "claims");
    assert.deepEqual(noStatus.notes, ["No “Status” column in the Claims and Evidence table."]);
    assert.equal(noStatus.summary, "1 claim · 0 verified · paper_skeleton.md:3–5");
    // No Claim column: nothing is a claim.
    const noClaim = claimsView(parse("## Claims and Evidence\n\n| Statement | Status |\n|---|---|\n| x | verified |\n"));
    assert.deepEqual(noClaim, {
      state: "no-claims",
      message: "No claims yet: the Claims and Evidence table has no filled row",
      notes: ["No “Claim”, “Evidence”, “Source file or link”, or “Citation/result” column in the Claims and Evidence table."],
    });
  });
});

describe("two claims with one ID (review F1)", () => {
  const HEAD = "| Claim | Evidence | Source file or link | Citation/result | Status |\n|---|---|---|---|---|";
  const TWO = `## Claims and Evidence\n\n${HEAD}\n| C3: first C3 | e1 | [one](Code/one.py) | r1 | verified |\n| C3: second C3 | e2 | [two](Code/two.py) | r2 | removed |\n\n## Experiments\n\n| Study | Claim |\n|---|---|\n| Main | C3 |\n`;

  test("a note under the table names the ID and its lines", () => {
    const view = claimsView(parse(TWO));
    assert.ok(view.state === "claims");
    assert.deepEqual(view.notes, ["C3 is used by 2 rows: lines 5 and 6."]);
    const three = claimsView(parse(TWO.replace("| C3: second C3", "| C3: second C3 | e | s | r | weak |\n| C3: third C3")));
    assert.ok(three.state === "claims");
    assert.deepEqual(three.notes.filter((n) => n.startsWith("C3")), ["C3 is used by 3 rows: lines 5, 6, and 7."]);
    const nano = claimsView(parse(NANOCHAT));
    assert.ok(nano.state === "claims" && nano.notes.length === 0, "no note without a repeated ID");
  });

  test("each row's evidence is its own; Used by lists the studies naming the ID for each", () => {
    const doc = parse(TWO);
    const rows = rowsOf(TWO);
    const [first, second] = [evidenceOf(doc, rows[0]!), evidenceOf(doc, rows[1]!)];
    assert.deepEqual([first.heading, first.files, first.usedBy], ["Claim C3 · paper_skeleton.md:5", [{ kind: "path", text: "Code/one.py" }], ["Main (paper_skeleton.md:12)"]]);
    assert.deepEqual([second.heading, second.files, second.usedBy], ["Claim C3 · paper_skeleton.md:6", [{ kind: "path", text: "Code/two.py" }], ["Main (paper_skeleton.md:12)"]]);
  });

  test("the open claim is kept by its line; across a Reload by its ID only when one row has it", () => {
    const rows = rowsOf(TWO);
    assert.equal(openRow(rows, null), null);
    assert.equal(openRow(rows, { line: 6, id: "C3" })?.line, 6, "the second C3, not the first");
    assert.equal(openRow(rows, { line: 5, id: "C3" })?.line, 5);
    // Reload after a line was added above: the ID moves the claim when it is unique.
    const moved = rowsOf(withLine(114, `${lineAt(NANOCHAT, 114)}\n| C0: new | e | s | r | weak |`));
    assert.equal(openRow(moved, { line: 116, id: "C2" })?.line, 117);
    // Not unique: by its line; that line no longer a claim: closed.
    assert.equal(openRow(rows, { line: 6, id: "C3" })?.text, "second C3");
    assert.equal(openRow(rows, { line: 9, id: "C3" }), null);
    // A claim with no ID: by its line.
    const noId = rowsOf(withLine(117, lineAt(NANOCHAT, 117).replace("C3: ", "")));
    assert.equal(openRow(noId, { line: 117, id: null })?.line, 117);
  });
});

describe("§3.2 the evidence panel", () => {
  const doc = parse(NANOCHAT);
  const rows = rowsOf(NANOCHAT);

  test("its heading, and the evidence as the skeleton states it: the same three cells", () => {
    const ev = evidenceOf(doc, rows[1]!);
    assert.equal(ev.heading, "Claim C2 · paper_skeleton.md:116");
    assert.deepEqual(ev.stated, ["logged runs", "[Code/results/summary.json](Code/results/summary.json)", "`base_val_bpb`, `sft_val_bpb`"]);
    assert.equal(evidenceOf(doc, rowsOf(withLine(117, lineAt(NANOCHAT, 117).replace("C3: ", "")))[2]!).heading, "Claim at paper_skeleton.md:117");
  });

  test("Files it names: each link target of the Source cell as a project path, an address as text; none: said so", () => {
    assert.deepEqual(evidenceOf(doc, rows[1]!).files, [{ kind: "path", text: "Code/results/summary.json" }]);
    assert.deepEqual(evidenceOf(doc, rows[0]!).files, [{ kind: "path", text: "Code/README.md" }]);
    assert.equal(evidenceOf(doc, rows[0]!).filesNote, null);
    const odd = rowsOf(withLine(116, "| C2: x | y | [a](Code/a%20b.md#s) and [web](https://example.invalid/p) [up](../../ideas/x.md) [me](paper_skeleton.md) | r | verified |"))[1]!;
    assert.deepEqual(evidenceOf(doc, odd).files, [
      { kind: "path", text: "Code/a b.md" },
      { kind: "address", text: "https://example.invalid/p" },
      { kind: "outside", text: "../../ideas/x.md" },
      { kind: "path", text: "paper_skeleton.md" },
    ]);
    const none = rowsOf(withLine(116, "| C2: x | y | Code/README.md, no link | r | verified |"))[1]!;
    assert.deepEqual([evidenceOf(doc, none).files, evidenceOf(doc, none).filesNote], [[], "The source cell names no file"]);
  });

  test("Used by: the Study and line of each Experiments row whose Claim cell lists the ID", () => {
    assert.deepEqual([evidenceOf(doc, rows[0]!).usedBy, evidenceOf(doc, rows[0]!).usedByNote], [["Main result (paper_skeleton.md:83)"], null]);
    assert.deepEqual(evidenceOf(doc, rows[2]!).usedBy, ["Probe 1 (paper_skeleton.md:84)"]);
    assert.deepEqual([evidenceOf(doc, rows[4]!).usedBy, evidenceOf(doc, rows[4]!).usedByNote], [[], "No study in the Experiments table names C5"]);
    const noTable = parse(withLine(79, "## Experiment notes"));
    assert.equal(evidenceOf(noTable, rowsOf(withLine(79, "## Experiment notes"))[0]!).usedByNote, "No Experiments table in paper_skeleton.md");
    const noColumn = withLine(81, "| Study | Question | Data | Baselines | Metric | Output | Claims |");
    assert.equal(evidenceOf(parse(noColumn), rowsOf(noColumn)[0]!).usedByNote, "No Experiments table in paper_skeleton.md");
    // No ID: the line is left out.
    const noId = rowsOf(withLine(115, lineAt(NANOCHAT, 115).replace("C1: ", "")))[0]!;
    assert.deepEqual([evidenceOf(doc, noId).usedBy, evidenceOf(doc, noId).usedByNote], [null, null]);
  });
});

describe("§3.2 the rest of paper_skeleton.md, folded", () => {
  test("every section of levels 2 to 6 but Snapshot and Claims and Evidence that has a block, in file order, with its line and entries", () => {
    const rest = restSections(parse(NANOCHAT));
    assert.equal(rest.note, null);
    assert.deepEqual(
      rest.sections.map((s) => [s.title, s.summary]),
      [
        ["Source Map", "line 23 · 9 entries"],
        ["Argument Map", "line 41 · 6 entries"],
        ["Abstract", "line 52 · 1 entry"],
        ["Introduction", "line 57 · 6 entries"],
        ["Related Work", "line 67 · 1 entry"],
        ["Method", "line 72 · 2 entries"],
        ["Experiments", "line 79 · 3 entries"],
        ["Results and Discussion", "line 87 · 5 entries"],
        ["Limitations", "line 96 · 4 entries"],
        ["Conclusion", "line 103 · 3 entries"],
        ["Figures and Tables", "line 121 · 3 entries"],
        ["Appendix and TODOs", "line 129 · 2 entries"],
      ],
    );
    // The level-1 title and its paragraph, Snapshot, Tracking (no block of its own), and Claims and Evidence are not listed.
    const template = restSections(parse(TEMPLATE)).sections.map((s) => s.title);
    assert.ok(!template.includes("Paper Skeleton") && !template.includes("Snapshot") && !template.includes("Tracking") && !template.includes("Claims and Evidence"));
    assert.deepEqual(template.slice(0, 4), ["Source Map", "Argument Map", "Abstract", "Introduction"]);
  });

  test(`at most ${SECTIONS_MAX} sections are listed, and the view says how many there are`, () => {
    const many = (n: number) => parse(Array.from({ length: n }, (_, k) => `## S${k}\n\ntext\n`).join("\n"));
    assert.deepEqual([restSections(many(SECTIONS_MAX)).sections.length, restSections(many(SECTIONS_MAX)).note], [SECTIONS_MAX, null]);
    const over = restSections(many(SECTIONS_MAX + 1));
    assert.equal(over.sections.length, SECTIONS_MAX);
    assert.equal(over.note, `paper_skeleton.md has 301 sections; the first ${SECTIONS_MAX} are listed.`);
  });

  test("a block of an open section: its lines and its section in the label, its lines as the quote", () => {
    assert.deepEqual(blockSelection(83, 83, "Experiments", [lineAt(NANOCHAT, 83)]), { label: "paper_skeleton.md:83 · section “Experiments”", quote: lineAt(NANOCHAT, 83) });
    assert.deepEqual(blockSelection(25, 28, "Source Map", NANOCHAT.split("\n").slice(24, 28)), {
      label: "paper_skeleton.md:25–28 · section “Source Map”",
      quote: NANOCHAT.split("\n").slice(24, 28).join("\n"),
    });
  });
});

describe("§3.2 the narrow window", () => {
  test("below 780 px of the view's width the panel is hidden and the evidence opens under its row", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const narrow = /@media \(max-width: 779\.98px\) \{([\s\S]*?)\n\}/.exec(css);
    assert.ok(narrow !== null, "a max-width: 779.98px rule");
    assert.match(narrow[1]!, /\.sk-side \{[^}]*display: none/);
    assert.match(narrow[1]!, /\.evrow\.nar \{[^}]*display: table-row/);
    assert.match(css, /\.evrow\.nar \{[^}]*display: none/, "wide: no evidence row");
  });
});

describe("labels and quotes within the host's limits", () => {
  test("a section title's invisible characters are markers, its blank runs one space; a long title is what is cut", () => {
    assert.equal(blockSelection(5, 5, "Sec​tion‮ one", ["x"]).label, "paper_skeleton.md:5 · section “Sec⟨U+200B⟩tion⟨U+202E⟩ one”");
    assert.equal(blockSelection(5, 5, "a\t 　 b", ["x"]).label, "paper_skeleton.md:5 · section “a b”");
    const long = blockSelection(123, 456, "T".repeat(500), ["x"]).label;
    assert.equal(long.length, LABEL_MAX);
    assert.ok(long.startsWith("paper_skeleton.md:123–456 · section “TTT") && long.endsWith("T…”"), long);
    // What the host takes: one line of visible characters, and the label exactly as posted.
    const page: PluginPage = { key: "skeleton-view/skeleton", plugin: "skeleton-view", slot: "project", title: "Skeleton", src: "app://skeleton-view/index.html", origin: "app://skeleton-view" };
    const frame = {};
    for (const label of ["paper_skeleton.md:5 · section “Sec⟨U+200B⟩tion”", long, "paper_skeleton.md:116 · claim C2"]) {
      const read = readSelect({ origin: page.origin!, source: frame, data: { type: "os.select", label, quote: "x" } }, page, frame);
      assert.ok(read?.kind === "select" && read.reference.label === label, label);
    }
  });

  test("a block larger than the host's 2,000 characters is cut on the page, so the host takes it; uncut, it would ignore it", () => {
    const lines = Array.from({ length: 40 }, (_, k) => `- line ${k}: ${"x".repeat(80)}`);
    const selection = blockSelection(1, 40, "Big", lines);
    assert.equal(selection.quote!.length, QUOTE_MAX);
    assert.ok(selection.quote!.endsWith(CUT_MARK), "ending in the host's mark (review F3)");
    assert.ok(selection.quote!.startsWith(`${lines[0]}\n${lines[1]}`));
    // A whole claim row can be 30 cells of 2,000 characters.
    const huge = `| C1: ${"y".repeat(5000)} | e | s | r | verified |`;
    const row = rowsOf(withLine(115, huge))[0]!;
    assert.equal(row.selection.quote!.length, QUOTE_MAX);
    const page: PluginPage = { key: "skeleton-view/skeleton", plugin: "skeleton-view", slot: "project", title: "Skeleton", src: "app://skeleton-view/index.html", origin: "app://skeleton-view" };
    const frame = {};
    const ask = (quote: string) => readSelect({ origin: page.origin!, source: frame, data: { type: "os.select", label: selection.label, quote } }, page, frame);
    assert.equal(ask(selection.quote!)?.kind, "select");
    assert.equal(ask(lines.join("\n")), null, "the host ignores a quote over 2,000 characters (select.ts)");
    // The chip opens by itself: the Skeleton view is not among the views that quote what they draw.
    assert.equal((ask(selection.quote!) as { reference: { quotesAsDrawn?: true } }).reference.quotesAsDrawn, undefined);
    // A cut never leaves half a surrogate pair.
    const emoji = blockSelection(1, 1, "E", [`${"x".repeat(QUOTE_MAX - 2)}😀😀`]).quote!;
    assert.equal(emoji.length <= QUOTE_MAX && /^x+…\[cut\]$/.test(emoji), true, emoji.slice(-8));
  });

  test("a lone CR in a row: its label keeps the LF line number, and the host shows the CR as a marker in a one-line quote (review F2)", () => {
    const text = withLine(116, lineAt(NANOCHAT, 116).replace("logged runs", "logged\rruns"));
    const row = rowsOf(text)[1]!;
    assert.equal(row.selection.label, "paper_skeleton.md:116 · claim C2");
    const page: PluginPage = { key: "skeleton-view/skeleton", plugin: "skeleton-view", slot: "project", title: "Skeleton", src: "app://skeleton-view/index.html", origin: "app://skeleton-view" };
    const frame = {};
    const read = readSelect({ origin: page.origin!, source: frame, data: { type: "os.select", ...row.selection } }, page, frame);
    assert.ok(read?.kind === "select");
    assert.equal(read.reference.quote!.split("\n").length, 1, "one line, as the label cites one");
    assert.match(read.reference.quote!, /logged⟨U\+000D⟩runs/);
  });

  test("a cut quote ends in the host's own mark, within 2,000 characters, splitting no pair and no marker (review F3)", () => {
    assert.equal(QUOTE_CUT, CUT_MARK, "the page's mark is the host's");
    const page: PluginPage = { key: "skeleton-view/skeleton", plugin: "skeleton-view", slot: "project", title: "Skeleton", src: "app://skeleton-view/index.html", origin: "app://skeleton-view" };
    const frame = {};
    const host = (selection: { label: string; quote?: string }) => {
      const read = readSelect({ origin: page.origin!, source: frame, data: { type: "os.select", ...selection } }, page, frame);
      assert.ok(read?.kind === "select", selection.label);
      return read.reference;
    };
    // The reviewer's claim: the cell's last word fell past the cut, and a bare "…" did not say so.
    const cell = `C1: The method improves accuracy${" ".repeat(1965)}not`;
    const row = rowsOf(withLine(115, `| ${cell} | e | s | r | verified |`))[0]!;
    assert.equal(row.selection.quote!.length, QUOTE_MAX);
    assert.ok(row.selection.quote!.endsWith(CUT_MARK), JSON.stringify(row.selection.quote!.slice(-12)));
    const sent = host(row.selection);
    assert.ok(sent.quote!.endsWith(CUT_MARK) && referenceText(sent).endsWith(CUT_MARK), "the open chip ends in it");
    // A line that really ends in "…" is not taken for a cut.
    assert.equal(blockSelection(1, 1, "S", [`${"x".repeat(1999)}…`]).quote, `${"x".repeat(1999)}…`);
    // Never half a surrogate pair, never half a marker the page wrote (a lone CR's).
    // Each over 2,000 characters once the page's CR markers are in; the cut point (2,000 − 6) falls inside a pair or a marker.
    for (const body of [`${"x".repeat(1993)}😀😀😀😀`, `${"x".repeat(1990)}${"\r".repeat(8)}`, `${"x".repeat(1990)}\r${"y".repeat(10)}`]) {
      const q = blockSelection(1, 1, "S", [body]).quote!;
      assert.ok(q.length <= QUOTE_MAX && q.endsWith(CUT_MARK), `${q.length} ${JSON.stringify(q.slice(-20))}`);
      const kept = q.slice(0, -CUT_MARK.length);
      assert.doesNotMatch(kept, /[\uD800-\uDBFF]$/, "no lone high surrogate");
      assert.doesNotMatch(kept, /⟨[^⟩]*$/, "no half marker");
      assert.ok(host({ label: "x", quote: q }).quote!.endsWith(CUT_MARK));
    }
  });

  test("no section title can forge a claim's label (review F4)", () => {
    const CLAIM = /^paper_skeleton\.md:\d+(–\d+)? · claim /;
    const SECTION = /^paper_skeleton\.md:\d+(–\d+)? · section “[^”]*”$/;
    // The reviewer's: a section titled "claim C2" holding a paragraph shaped as C2's row.
    const forged = parse(`## Claims and Evidence\n\n| Claim | Evidence | Source file or link | Citation/result | Status |\n|---|---|---|---|---|\n| C2: the real claim | e | s | r | weak |\n\n## claim C2\n\n| C2: a forged row, a paragraph here | e | s | r | verified |\n`);
    const forgedSection = restSections(forged).sections.find((s) => s.title === "claim C2")!;
    const block = forgedSection.section.blocks[0]!;
    assert.equal(blockSelection(block.first, block.last, forgedSection.title, block.lines).label, "paper_skeleton.md:9 · section “claim C2”");
    for (const title of [
      "claim C2",
      " · claim C9",
      "[claim C2](x)",
      "**claim** C2",
      "x” · claim C2",
      "“claim C2”",
      "x · claim C2",
      "x ·　claim C2",
      "paper_skeleton.md:1 · claim C1",
      `${"T".repeat(190)} · claim C2`,
    ]) {
      const doc = parse(`## ${title}\n\nA paragraph.\n\n- an item\n\n| a |\n|---|\n| a row |\n`);
      const s = restSections(doc).sections[0]!;
      const labels = s.section.blocks.flatMap((b) =>
        b.kind === "list"
          ? b.items.map((i) => blockSelection(i.first, i.last, s.title, i.lines).label)
          : b.kind === "table"
            ? b.rows.map((r) => blockSelection(r.line, r.line, s.title, [r.source]).label)
            : [blockSelection(b.first, b.last, s.title, b.lines).label],
      );
      assert.equal(labels.length, 3, title);
      for (const label of labels) {
        assert.doesNotMatch(label, CLAIM, `${title}: ${label}`);
        assert.match(label, SECTION, `${title}: ${label}`);
        assert.ok(label.length <= LABEL_MAX);
      }
    }
    // The title is its plain text: a link is its text, bold its words.
    assert.equal(blockSelection(3, 3, "[Method](x) and **more**", ["x"]).label, "paper_skeleton.md:3 · section “Method and more”");
  });

  test("a cut label splits no marker and no pair (review F3)", () => {
    for (const title of [`${"T".repeat(150)}${"​".repeat(20)}`, `${"T".repeat(165)}​${"T".repeat(30)}`, "😀".repeat(120)]) {
      const label = blockSelection(3, 3, title, ["x"]).label;
      assert.ok(label.length <= LABEL_MAX, `${label.length}`);
      assert.ok(label.endsWith("…”"), label.slice(-12));
      assert.doesNotMatch(label, /⟨[^⟩]*…”$/, `half a marker: ${label.slice(-14)}`);
      assert.doesNotMatch(label, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/, "no lone surrogate");
    }
  });

  test("a CRLF copy gives the same rows, selections, and Snapshot, with no carriage return", () => {
    const lf = parse(NANOCHAT);
    const cr = parse(crlf(NANOCHAT));
    assert.deepEqual(claimsView(cr), claimsView(lf));
    assert.deepEqual(snapshotCard(cr), snapshotCard(lf));
    assert.deepEqual(restSections(cr).sections.map((s) => s.summary), restSections(lf).sections.map((s) => s.summary));
    assert.doesNotMatch(JSON.stringify([claimsView(cr), snapshotCard(cr)]), /\\r/);
  });
});

describe("reading the file", () => {
  test(`at most ${READ_MAX} bytes (1 MiB): a file of exactly that is read, one byte more is too large`, async () => {
    assert.equal(READ_MAX, 1024 * 1024);
    for (const [size, kind] of [
      [READ_MAX, "text"],
      [READ_MAX + 1, "too-large"],
      [0, "text"],
    ] as const) {
      // The page reads one byte past the cap, so a file of exactly the cap is not taken as cut.
      const read = await readStart(new Response(new Uint8Array(size).fill(0x61)), READ_MAX + 1);
      assert.equal(fileVerdict(read.bytes, read.cut).kind, kind, `${size} bytes`);
    }
    assert.equal(fileVerdict(new Uint8Array([0x61, 0, 0x62]), false).kind, "binary");
    assert.equal(fileVerdict(new Uint8Array([0x63, 0x61, 0x66, 0xe9]), false).kind, "encoding");
    assert.deepEqual(fileVerdict(new TextEncoder().encode("# x\r\n"), false), { kind: "text", text: "# x\r\n" });
  });

  test("past 20,000 lines the view says it read the first 20,000", () => {
    assert.deepEqual(docNotes(parse("x\n".repeat(20_000))), []);
    assert.deepEqual(docNotes(parse("x\n".repeat(20_001))), ["paper_skeleton.md has more than 20,000 lines; the view reads the first 20,000."]);
  });

  test("a table's own notes: rows past 500, columns past 30, rows of another width", () => {
    const table = (body: string) => parse(body).blocks.find((b: Block): b is Table => b.kind === "table")!;
    assert.deepEqual(tableNotes(table(`| a |\n|---|\n${"| r |\n".repeat(500)}`)), []);
    assert.deepEqual(tableNotes(table(`| a |\n|---|\n${"| r |\n".repeat(502)}`)), ["This table has 2 more rows; the first 500 are shown."]);
    assert.deepEqual(tableNotes(table(`|${" h |".repeat(31)}\n|${"---|".repeat(31)}\n`)), ["This table has more than 30 columns; the first 30 are shown."]);
    assert.deepEqual(tableNotes(table("| a | b |\n|---|---|\n| 1 |\n| 1 | 2 | 3 |\n")), ["Lines 3 and 4 have another number of cells than the header; they are padded or cut to it."]);
    assert.deepEqual(tableNotes(table("| a | b |\n|---|---|\n| 1 |\n")), ["Line 3 has another number of cells than the header; it is padded or cut to it."]);
  });
});

describe("every screen's words", () => {
  test("the project in ?project=", () => {
    assert.deepEqual(projectWords(""), { title: "No project given", text: "The Skeleton view opens from a project's workspace, which names the project it shows.", retry: false });
    assert.deepEqual(projectWords("?project=..%2Fx"), {
      title: "Not a project name",
      text: "“../x” is not a project folder name the Skeleton view can open (a letter, then letters, digits, _ or -).",
      retry: false,
    });
  });

  test("the read channel's answers, by status", () => {
    assert.deepEqual(fileWords(404, "P"), {
      title: "No paper_skeleton.md to show",
      text: "projects-folder/P/paper_skeleton.md is not there, or it is a link the Skeleton view may not follow (one leading outside the project's paper_skeleton.md).",
      retry: true,
    });
    assert.deepEqual(fileWords(413, "P"), { title: "Too large to show", text: "paper_skeleton.md is larger than 32 MiB, the most the app reads.", retry: true });
    assert.deepEqual(fileWords(503, "P"), { title: "Too many files are being read at once", text: "Try again in a moment.", retry: true });
    assert.deepEqual(fileWords(0, "P"), { title: "The Skeleton view could not reach the app", text: "Try again; if it keeps failing, restart the app.", retry: true });
    assert.deepEqual(fileWords(500, "P"), { title: "paper_skeleton.md could not be read", text: "The app answered 500 for paper_skeleton.md.", retry: true });
  });

  test("what the file holds, when it is not text the view shows", () => {
    assert.deepEqual(contentWords("too-large"), { title: "Too large to show", text: "paper_skeleton.md is larger than 1 MiB, the most the Skeleton view reads.", retry: true });
    assert.deepEqual(contentWords("binary"), { title: "Not a text file", text: "paper_skeleton.md holds binary data, so it is not shown here.", retry: true });
    assert.deepEqual(contentWords("encoding"), { title: "Text in another encoding", text: "paper_skeleton.md seems to be text in an encoding other than UTF-8, which the Skeleton view cannot show.", retry: true });
  });
});
