/**
 * The Idea view's rules, one test per rule of os-ui/PLUGINS.md Part 3, §5.1
 * (the file) and §5.2 (states and validation), on the frozen fixtures
 * (../../fixtures/README.md): the design's own example, the graph the mockup
 * drew for nanochat_cpu, and nanochat_cpu's paper_skeleton.md, whose claims
 * C1 to C5 are on lines 115 to 119. Then the caps, labels and quotes through
 * the host's own readSelect, the detail panel, every screen's words, and the
 * cost of hostile input. Every rule over a file's text runs on a CRLF copy too.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { PluginPage } from "../../../src/plugins/pages.ts";
import { readSelect } from "../../../src/plugins/select.ts";
import { assertOnePass, growth } from "../../growth.ts";
import { LIMITS as MD, parse } from "../../md-kit.ts";
import { LABEL_MAX, QUOTE_MAX } from "../../site-kit.ts";
import {
  barWords,
  buildGraph,
  contentWords,
  details,
  emptyWords,
  fileWords,
  HEADER_LINE,
  labelOf,
  LIMITS,
  moreWords,
  nodeWords,
  noTableWords,
  problemLine,
  problemsTitle,
  projectWords,
  QUOTE_CUT,
  quoteOf,
  READ_MAX,
  selectionOf,
  SKELETON_MAX,
  skeletonFrom,
  skeletonInput,
  STILL_OPEN,
  summary,
  tooltipOf,
  verdict,
} from "./logic.ts";
import type { Built, Graph, SkeletonRead } from "./logic.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");
/** A fixture's text with LF line endings, whatever the checkout gave it. */
const text = (rel: string) => readFileSync(join(FIXTURES, rel), "utf8").split(/\r?\n/).join("\n");
const crlf = (t: string) => t.split("\n").join("\r\n");

const EXAMPLE = text("idea_graph/example.idea_graph.md");
const MOCKUP = text("idea_graph/mockup.idea_graph.md");
const SKELETON_LF = text("nanochat_cpu.paper_skeleton.md");
const SKEL: SkeletonRead = skeletonFrom({ ok: true, doc: parse(SKELETON_LF) });

const HEAD = "| ID | Kind | Statement | Status | Links | Points to | Source |\n|---|---|---|---|---|---|---|";
/** An idea file whose table holds `rows`, the first on line 5. */
const file = (...rows: string[]) => `# Idea graph\n\n${HEAD}\n${rows.join("\n")}\n`;
const row = (...cells: string[]) => `| ${cells.join(" | ")} |`;
const Q = (id: string, links = "", status = "open") => row(id, "question", `Question ${id}`, status, links, "", "");
const H = (id: string, links = "", status = "open") => row(id, "hypothesis", `Hypothesis ${id}`, status, links, "", "");
const E = (id: string, links = "", points = "commit: none; files: Code/results/a.json", status = "done") => row(id, "experiment", `Experiment ${id}`, status, links, points, "");
const R = (id: string, from: string, links = "") => row(id, "result", `Result ${id}`, "recorded", links, `from: ${from}`, "");
const C = (id: string, claim = "", links = "", status = "verified") => row(id, "claim", `Claim ${id}`, status, links, claim === "" ? "" : `claim: ${claim}`, "");

function built(source: string, skeleton: SkeletonRead = SKEL): Built {
  return buildGraph(parse(source), skeleton);
}
function graphOf(source: string, skeleton: SkeletonRead = SKEL): Graph {
  const b = built(source, skeleton);
  assert.equal(b.kind, "graph", `a graph, not ${b.kind}`);
  return (b as Extract<Built, { kind: "graph" }>).graph;
}
const ids = (g: Graph) => g.nodes.map((n) => n.id);
const links = (g: Graph) => g.links.map((l) => [l.from.id, l.word, l.to.id]);
const came = (g: Graph) => g.came.map((c) => [c.result.id, c.experiment.id]);
const listed = (g: Graph) => g.problems.map(problemLine);
const node = (g: Graph, id: string) => g.nodes.find((n) => n.id === id)!;

/** The host's own reading of a selection (src/plugins/select.ts): taken as posted, or null. */
const PAGE: PluginPage = { key: "idea-view/idea", plugin: "idea-view", slot: "project", title: "Idea", src: "app://idea-view/index.html", origin: "app://idea-view" };
const host = (data: unknown) => readSelect({ origin: PAGE.origin!, source: PAGE, data }, PAGE, PAGE);

describe("§5.1 the design's example, as a fixture, against nanochat_cpu's skeleton", () => {
  test("four nodes in file order, two links, one result's experiment, no problem; C2 is row C2 of the claims table, line 116", () => {
    const g = graphOf(EXAMPLE);
    assert.deepEqual(
      g.nodes.map((n) => [n.id, n.kind, n.status, n.line]),
      [
        ["Q1", "question", "answered", 5],
        ["E2", "experiment", "done", 6],
        ["R3", "result", "recorded", 7],
        ["C2", "claim", "verified", 8],
      ],
    );
    assert.deepEqual(links(g), [
      ["E2", "tests", "Q1"],
      ["R3", "supports", "C2"],
    ]);
    assert.deepEqual(came(g), [["R3", "E2"]]);
    assert.deepEqual(listed(g), []);
    assert.equal(g.problemCount, 0);
    assert.deepEqual(node(g, "E2").points, { kind: "run", commit: null, files: ["Code/results/summary.json", "Code/results/training_metrics.csv"] });
    assert.deepEqual(node(g, "R3").points, { kind: "from", id: "E2" });
    const claim = g.pointers.get(node(g, "C2").key);
    assert.deepEqual(claim, { kind: "claim", state: "found", id: "C2", line: 116, text: "base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456", status: "verified" });
    assert.deepEqual(g.claims, { checked: true, verified: 1, total: 1 });
    assert.equal(node(g, "E2").statement, "Every stage: `bash runs/runcpu_small.sh all`, on 2026-09-26", "the cell as written; drawn as text by the page");
    assert.equal(node(g, "Q1").source, "paper_skeleton.md:83");
  });

  test("the mockup's graph of nanochat_cpu: 20 nodes, 9 links, 6 results with their experiments, every claim verified in the skeleton", () => {
    const g = graphOf(MOCKUP);
    assert.equal(g.nodes.length, 20);
    assert.deepEqual(links(g), [
      ["E2", "tests", "Q1"],
      ["E3", "tests", "Q2"],
      ["E4", "tests", "Q3"],
      ["R1", "motivates", "E2"],
      ["R2", "supports", "C1"],
      ["R3", "supports", "C2"],
      ["R4", "supports", "C5"],
      ["R5", "supports", "C3"],
      ["R6", "supports", "C4"],
    ]);
    assert.deepEqual(came(g), [
      ["R1", "E1"],
      ["R2", "E2"],
      ["R3", "E2"],
      ["R4", "E2"],
      ["R5", "E3"],
      ["R6", "E4"],
    ]);
    assert.deepEqual(listed(g), []);
    assert.deepEqual(g.claims, { checked: true, verified: 5, total: 5 });
    assert.deepEqual(node(g, "E5").points, { kind: "empty" }, "a planned experiment with an empty cell");
    assert.deepEqual(node(g, "E1").points, { kind: "run", commit: null, files: null }, "E1 left no commit and no result file, as the mockup has it");
  });

  test("a CRLF copy gives the same graph and line numbers, and no row keeps a carriage return", () => {
    for (const source of [EXAMPLE, MOCKUP]) {
      const lf = graphOf(source);
      const cr = graphOf(crlf(source), skeletonFrom({ ok: true, doc: parse(crlf(SKELETON_LF)) }));
      assert.deepEqual(cr.nodes.map((n) => [n.id, n.line, n.row]), lf.nodes.map((n) => [n.id, n.line, n.row]));
      assert.deepEqual(links(cr), links(lf));
      assert.deepEqual(came(cr), came(lf));
      assert.deepEqual(listed(cr), []);
      assert.ok(cr.nodes.every((n) => !n.row.includes("\r")));
    }
  });
});

describe("§5.1 the table: the first whose header cells are exactly the seven", () => {
  test("matched ignoring case and surrounding spaces; an earlier table with another header and the free text around it are ignored", () => {
    const g = graphOf(`# Notes\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nFree text.\n\n|  id |KIND| statement | STATUS | links | points TO | source  |\n|---|---|---|---|---|---|---|\n${Q("Q1")}\n\nA footnote.\n`);
    assert.deepEqual(ids(g), ["Q1"]);
    assert.deepEqual([g.table.first, g.table.last], [9, 11]);
    assert.equal(node(g, "Q1").line, 11);
  });

  test("no table with that header: the first header found is named, or that there is no table; inline marks, 6 or 8 columns are another header", () => {
    for (const head of ["| **ID** | Kind | Statement | Status | Links | Points to | Source |", "| ID | Kind | Statement | Status | Links | Points to |", "| ID | Kind | Statement | Status | Links | Points to | Source | More |", "| ID | Kind | Statement | Status | Links | Points-to | Source |"]) {
      const b = built(`# Idea graph\n\n${head}\n|---|---|---|---|---|---|---|\n${Q("Q1")}\n`);
      assert.deepEqual(b, { kind: "no-table", first: { line: 3, source: head }, nested: null, notes: [] }, head);
    }
    // Case is ASCII case: the Kelvin sign, which toLowerCase() makes "k", does not spell "Kind".
    const kelvin = `| ID | ${String.fromCharCode(0x212a)}ind | Statement | Status | Links | Points to | Source |`;
    assert.deepEqual(built(`# Idea graph\n\n${kelvin}\n|---|---|---|---|---|---|---|\n${Q("Q1")}\n`), { kind: "no-table", first: { line: 3, source: kelvin }, nested: null, notes: [] });
    assert.deepEqual(built("# Idea graph\n\nNo table here.\n"), { kind: "no-table", first: null, nested: null, notes: [] });
    assert.deepEqual(built(""), { kind: "no-table", first: null, nested: null, notes: [] });
  });

  test("the graph's header inside a code block or a list item is named, with where it is and why it is not read: §5.1's own example sits in a fence", () => {
    // §5.1 prints its example inside a ```markdown fence; an agent that copies it with the fence gets this.
    const fenced = built(`# Idea graph\n\n\`\`\`markdown\n${EXAMPLE}\`\`\`\n`);
    assert.deepEqual(fenced, { kind: "no-table", first: null, nested: { line: 6, where: "code", first: 3, last: 12 }, notes: [] });
    assert.equal(noTableWords(fenced as Extract<Built, { kind: "no-table" }>).found, "The graph's header is on line 6, inside the code block on lines 3–12, which is read as code, not as a table: write the table outside the fence.");
    const item = built(`# Idea graph\n\n- ${HEAD.split("\n")[0]}\n  ${HEAD.split("\n")[1]}\n  ${Q("Q1")}\n`);
    assert.deepEqual(item, { kind: "no-table", first: null, nested: { line: 3, where: "list", first: 3, last: 5 }, notes: [] });
    assert.equal(noTableWords(item as Extract<Built, { kind: "no-table" }>).found, "The graph's header is on line 3, inside the list item on lines 3–5, which is read as the item's text, not as a table: start the table at the left margin, outside the list.");
    // With another table found first, its header is named, and the nested one is a note.
    const both = built(`| a | b |\n|---|---|\n\n\`\`\`\n${HEAD}\n${Q("Q1")}\n\`\`\`\n`);
    assert.deepEqual(noTableWords(both as Extract<Built, { kind: "no-table" }>), {
      title: "No idea graph table",
      text: "No table with the expected header was found in idea_graph.md.",
      expected: HEADER_LINE,
      found: "The first table's header, on line 1: | a | b |",
      notes: ["The graph's header is on line 5, inside the code block on lines 4–8, which is read as code, not as a table: write the table outside the fence."],
      retry: true,
    });
    // A fence or list with no such header is nothing to name.
    assert.deepEqual(built("```\n| a | b |\n|---|---|\n```\n\n- | x |\n"), { kind: "no-table", first: null, nested: null, notes: [] });
  });

  test("what md-kit leaves unread before a table is said on that screen: an unclosed code fence, lines past 20,000", () => {
    const fenced = built(`# Idea graph\n\n\`\`\`\nnever closed\n\n${HEAD}\n${Q("Q1")}\n`);
    assert.deepEqual(fenced, { kind: "no-table", first: null, nested: { line: 6, where: "code", first: 3, last: 8 }, notes: ["Everything after the code fence opened on line 3 and never closed is read as code, not as a table."] });
    const long = built(`${"x\n\n".repeat(MD.lines / 2)}${HEAD}\n${Q("Q1")}\n`);
    assert.deepEqual(long, { kind: "no-table", first: null, nested: null, notes: [`idea_graph.md has more than ${MD.lines.toLocaleString("en-US")} lines; the view reads the first ${MD.lines.toLocaleString("en-US")}.`] });
  });

  test("a second table with the graph's header is not read, and the problems say so", () => {
    const g = graphOf(`${file(Q("Q1"))}\n${HEAD}\n${Q("Q2")}\n`);
    assert.deepEqual(ids(g), ["Q1"]);
    assert.deepEqual(listed(g), ["line 7: another table with the graph's header; only the first, on line 3, is read."]);
  });
});

describe("§5.1 rows: seven cells, an ID unique ignoring case, a kind, a statement, a status by kind", () => {
  test("a row must have exactly seven cells; `\\|` is a literal pipe, so it does not make an eighth", () => {
    const g = graphOf(file(Q("Q1"), "| Q2 | question | six cells | open |  |  |", `${Q("Q3")} extra |`, row("Q4", "question", "a \\| b", "open", "", "", "")));
    assert.deepEqual(ids(g), ["Q1", "Q4"]);
    assert.equal(node(g, "Q4").statement, "a | b");
    assert.deepEqual(listed(g), [
      "line 6: the row is left out: it has 6 cells, and a node's row has 7 (ID, Kind, Statement, Status, Links, Points to, Source).",
      "line 7: the row is left out: it has 8 cells, and a node's row has 7 (ID, Kind, Statement, Status, Links, Points to, Source).",
    ]);
  });

  test("an ID is a letter, then at most 15 letters, digits, _ or -; look-alikes, invisible characters and spaces are refused", () => {
    const good = ["Q1", "a", "x_y-1", `A${"b".repeat(15)}`];
    const bad = [`A${"b".repeat(16)}`, "1Q", "Q 1", "Е1", "Ｑ1", "\u212A1", "Q\u00A01", "Q1\u200B", "-Q", "Q.1"];
    const g = graphOf(file(...good.map((id) => Q(id)), ...bad.map((id) => Q(id)), Q("")));
    assert.deepEqual(ids(g), good);
    const problems = listed(g);
    assert.equal(problems.length, bad.length + 1);
    assert.equal(problems[0], `line 9: the row is left out: “A${"b".repeat(16)}” is not an ID (a letter, then at most 15 letters, digits, “_”, or “-”).`);
    assert.equal(problems[5], "line 14: the row is left out: “\u212A1” is not an ID (a letter, then at most 15 letters, digits, “_”, or “-”).", "the Kelvin sign, which lower-cases to k");
    assert.equal(problems[6], "line 15: the row is left out: “Q⟨U+00A0⟩1” is not an ID (a letter, then at most 15 letters, digits, “_”, or “-”).");
    assert.equal(problems[7], "line 16: the row is left out: “Q1⟨U+200B⟩” is not an ID (a letter, then at most 15 letters, digits, “_”, or “-”).");
    assert.equal(problems[bad.length], "line 19: the row is left out: its ID cell is empty.");
  });

  test("a lone CR in an ID cell is a character, not a line break: the row is refused and line numbers stay the file's", () => {
    const source = crlf(file(Q("Q1"), Q("Q\r2"), Q("Q3")));
    const g = graphOf(source);
    assert.deepEqual(g.nodes.map((n) => [n.id, n.line]), [
      ["Q1", 5],
      ["Q3", 7],
    ]);
    assert.deepEqual(listed(g), ["line 6: the row is left out: “Q⟨U+000D⟩2” is not an ID (a letter, then at most 15 letters, digits, “_”, or “-”)."]);
  });

  test("IDs are unique ignoring case: the later row is left out, naming the earlier, and the node shows only its own row", () => {
    const g = graphOf(file(E("E2", "tests Q1"), Q("Q1"), row("e2", "experiment", "the other E2", "done", "tests Q1", "commit: none; files: x.json", ""), E("Z9", "tests q1")));
    assert.deepEqual(ids(g), ["E2", "Q1", "Z9"]);
    assert.equal(node(g, "E2").statement, "Experiment E2");
    assert.equal(node(g, "E2").line, 5);
    assert.deepEqual(listed(g), ["line 7: the row is left out: the ID e2 is already used on line 5, as E2 (IDs are compared ignoring case)."]);
    assert.deepEqual(links(g), [
      ["E2", "tests", "Q1"],
      ["Z9", "tests", "Q1"],
    ], "a link names its target ignoring case");
    // A row whose ID repeats one left out for another problem is left out too: the rule is about the file.
    const h = graphOf(file(row("E2", "experimnt", "x", "done", "", "", ""), E("e2")));
    assert.deepEqual(ids(h), []);
    assert.deepEqual(listed(h), [
      "line 5: the row is left out: its kind “experimnt” is not question, hypothesis, experiment, result, or claim.",
      "line 6: the row is left out: the ID e2 is already used on line 5, as E2 (IDs are compared ignoring case).",
    ]);
  });

  test("the Kind column decides the kind, not the ID's letter; kinds are the five words as written", () => {
    const g = graphOf(file(row("Q7", "experiment", "an experiment named Q7", "done", "", "commit: none; files: a.json", ""), row("E1", "Experiment", "s", "done", "", "commit: none; files: a.json", ""), row("E3", "", "s", "done", "", "", "")));
    assert.deepEqual(g.nodes.map((n) => [n.id, n.kind]), [["Q7", "experiment"]]);
    assert.deepEqual(listed(g), [
      "line 6: the row is left out: its kind “Experiment” is not question, hypothesis, experiment, result, or claim.",
      "line 7: the row is left out: its Kind cell is empty.",
    ]);
  });

  test("a statement may not be empty", () => {
    const g = graphOf(file(row("Q1", "question", "", "open", "", "", "")));
    assert.deepEqual(listed(g), ["line 5: the row is left out: its Statement cell is empty."]);
  });

  test("the status words by kind; a claim's are the skeleton's (planned, verified, weak, removed), not the mockup's draft", () => {
    const words = {
      question: ["open", "answered"],
      hypothesis: ["open", "supported", "refuted"],
      experiment: ["planned", "running", "done", "failed"],
      result: ["recorded"],
      claim: ["planned", "verified", "weak", "removed"],
    };
    const rows: string[] = [];
    let k = 0;
    for (const [kind, statuses] of Object.entries(words)) for (const s of statuses) rows.push(row(`N${++k}`, kind, "s", s, "", kind === "result" ? "from: X1" : kind === "experiment" && s !== "planned" ? "commit: none; files: a.json" : "", ""));
    const ok = graphOf(file(...rows));
    assert.equal(ok.nodes.length, 14);
    const bad = graphOf(file(row("A1", "question", "s", "done", "", "", ""), row("A2", "claim", "s", "draft", "", "", ""), row("A3", "result", "s", "Recorded", "", "from: X1", ""), row("A4", "hypothesis", "s", "", "", "", "")));
    assert.deepEqual(listed(bad), [
      "line 5: the row is left out: “done” is not a status of a question (open or answered).",
      "line 6: the row is left out: “draft” is not a status of a claim (planned, verified, weak, or removed).",
      "line 7: the row is left out: “Recorded” is not a status of a result (recorded).",
      "line 8: the row is left out: its Status cell is empty (a hypothesis's status is open, supported, or refuted).",
    ]);
  });

  test("every reason a row is left out is listed, in one problem for the row", () => {
    const g = graphOf(file(row("Q1", "question", "", "done", "", "from: E1", "")));
    assert.deepEqual(listed(g), ["line 5: the row is left out: its Statement cell is empty; “done” is not a status of a question (open or answered); a question points to nothing, so its Points to cell must be empty."]);
  });
});

describe("§5.1 Links: `<word> <ID>` items separated by `;`, from this row's node", () => {
  test("empty, one, several, a trailing `;` and empty items between are fine; spaces and tabs around a word are fine", () => {
    const g = graphOf(file(Q("Q1"), H("H1"), H("H2", "motivates E1;"), E("E1", " tests Q1 ;;\ttests  H1; "), Q("Q2", "motivates Q1")));
    assert.deepEqual(links(g), [
      ["H2", "motivates", "E1"],
      ["E1", "tests", "Q1"],
      ["E1", "tests", "H1"],
      ["Q2", "motivates", "Q1"],
    ]);
    assert.deepEqual(listed(g), []);
  });

  test("which kinds each word may join: motivates from any kind to a question, hypothesis or experiment; tests from an experiment to a question or hypothesis; supports and refutes from a result to a hypothesis or claim", () => {
    const nodes = [Q("Q1"), H("H1"), E("E1"), R("R1", "E1"), C("C1")];
    const kindOf: Record<string, string> = { Q1: "question", H1: "hypothesis", E1: "experiment", R1: "result", C1: "claim" };
    const allowed: Record<string, [string[], string[]]> = {
      motivates: [["Q1", "H1", "E1", "R1", "C1"], ["Q1", "H1", "E1"]],
      tests: [["E1"], ["Q1", "H1"]],
      supports: [["R1"], ["H1", "C1"]],
      refutes: [["R1"], ["H1", "C1"]],
    };
    for (const [word, [from, to]] of Object.entries(allowed)) {
      for (const a of Object.keys(kindOf)) {
        for (const b of Object.keys(kindOf)) {
          if (a === b) continue;
          const rows = nodes.map((r) => (r.startsWith(`| ${a} |`) ? r.replace(/^(\| \w+ \| \w+ \| [^|]+ \| \w+ \| )/, `$1${word} ${b} `) : r));
          const g = graphOf(file(...rows));
          const ok = from.includes(a) && to.includes(b);
          assert.deepEqual(links(g), ok ? [[a, word, b]] : [], `${a} ${word} ${b}`);
          if (!ok) assert.match(listed(g)[0]!, new RegExp(`left out: “${word}” goes from `), `${a} ${word} ${b}`);
        }
      }
    }
    const one = graphOf(file(R("R1", "E1", "tests C1"), E("E1"), C("C1")));
    assert.deepEqual(listed(one), ["line 5: R1's link “tests C1” is left out: “tests” goes from an experiment to a question or a hypothesis; R1 is a result and C1 a claim."]);
  });

  test("a link with an unknown word, not a word and an ID, a target that is no ID, a link to itself, or a duplicate is left out and listed; the node stays", () => {
    const g = graphOf(file(Q("Q1"), E("E1", "checks Q1; tests; tests Q1 Q2; tests Q\u212A; tests E1; tests Q1; tests q1; motivates Q1")));
    assert.deepEqual(ids(g), ["Q1", "E1"]);
    assert.deepEqual(links(g), [
      ["E1", "tests", "Q1"],
      ["E1", "motivates", "Q1"],
    ]);
    assert.deepEqual(listed(g), [
      // Two words to one node are two links; these two make a loop (Q1 comes before the experiment that tests it).
      "lines 5 and 6: a cycle runs through Q1 and E1: Q1 before E1 (E1 tests Q1) and E1 before Q1 (E1 motivates Q1), counting each link from what must exist first to what follows from it; each node is still drawn.",
      "line 6: E1's link “checks Q1” is left out: “checks” is not a link word (motivates, tests, supports, or refutes).",
      "line 6: E1's link “tests” is left out: it is not a link word and an ID, as “tests Q1”.",
      "line 6: E1's link “tests Q1 Q2” is left out: it is not a link word and an ID, as “tests Q1”.",
      "line 6: E1's link “tests Q\u212A” is left out: “Q\u212A” is not an ID.",
      "line 6: E1's link “tests E1” is left out: E1 would link to itself.",
      "line 6: E1's link “tests q1” is left out: it states “tests Q1” again.",
    ]);
  });

  test("a target that is not drawn is named by what was read: no such ID, a row left out, a node past the cap", () => {
    const many = Array.from({ length: LIMITS.nodes }, (_, k) => Q(`P${k + 1}`));
    const g = graphOf(file(E("E1", "tests Q9; tests Q2; tests P201"), row("Q2", "question", "", "open", "", "", ""), ...many.slice(0, LIMITS.nodes - 1), Q("P201")));
    assert.deepEqual(links(g), []);
    assert.deepEqual(listed(g).slice(0, 4), [
      "line 5: E1's link “tests Q9” is left out: no node in the table has the ID Q9.",
      "line 5: E1's link “tests Q2” is left out: Q2 (line 6) is left out for a problem of its own.",
      `line 5: E1's link “tests P201” is left out: P201 (line ${6 + LIMITS.nodes}) is past the first ${LIMITS.nodes} nodes, which are all the view draws.`,
      "line 6: the row is left out: its Statement cell is empty.",
    ]);
  });
});

describe("§5.1 Points to, by kind", () => {
  test("an experiment: commit (7 to 64 lower-case hex digits, or none) and files (bare or a code span, `, ` only in a code span); both, unless it is planned with an empty cell", () => {
    const g = graphOf(
      file(
        E("E1", "", "commit: c4d4a85; files: Code/results/a.json"),
        E("E2", "", `commit: ${"f".repeat(64)}; files: \`Code/results/a, b.json\`, Code/results/c.json`),
        E("E3", "", "files: `x;y.json`; commit: none"),
        E("E4", "", "", "planned"),
        E("E5", "", " commit : none ;  files :  a.json , b,c.json ; ", "running"),
      ),
    );
    assert.deepEqual(
      g.nodes.map((n) => n.points),
      [
        { kind: "run", commit: "c4d4a85", files: ["Code/results/a.json"] },
        { kind: "run", commit: "f".repeat(64), files: ["Code/results/a, b.json", "Code/results/c.json"] },
        { kind: "run", commit: null, files: ["x;y.json"] },
        { kind: "empty" },
        { kind: "run", commit: null, files: ["a.json", "b,c.json"] },
      ],
    );
    assert.deepEqual(listed(g), []);
  });

  test("`files: none`: a done, running, or failed run with no result file, as `commit: none` for no commit; none stands alone, and a file named none is a code span", () => {
    const g = graphOf(
      file(
        E("E1", "", "commit: none; files: none"),
        E("E2", "", "commit: c4d4a85; files: none", "running"),
        E("E3", "", "files:  none ; commit: none", "failed"),
        E("E4", "", "commit: none; files: none", "planned"),
        E("E5", "", "commit: none; files: `none`"),
        E("E6", "", "commit: none; files: `none`, Code/results/a.json"),
      ),
    );
    assert.deepEqual(
      g.nodes.map((n) => [n.id, n.points]),
      [
        ["E1", { kind: "run", commit: null, files: null }],
        ["E2", { kind: "run", commit: "c4d4a85", files: null }],
        ["E3", { kind: "run", commit: null, files: null }],
        ["E4", { kind: "run", commit: null, files: null }],
        ["E5", { kind: "run", commit: null, files: ["none"] }],
        ["E6", { kind: "run", commit: null, files: ["none", "Code/results/a.json"] }],
      ],
    );
    assert.deepEqual(listed(g), []);
    // The panel says in words that the row names no result file; a file named none is a file.
    assert.deepEqual(details(g, node(g, "E1")).points, { lines: ["Commit: none recorded by the run", "Result files: none (the row says “files: none”)"], files: [], chip: null, claim: null, problem: null });
    assert.deepEqual(details(g, node(g, "E5")).points, { lines: ["Commit: none recorded by the run"], files: ["none"], chip: null, claim: null, problem: null });
    // none mixed with paths is a problem, worded by what was found.
    const mixed = graphOf(file(E("E1", "", "commit: none; files: none, Code/results/a.json"), E("E2", "", "commit: none; files: a.json, none, `b, c.json`")));
    assert.deepEqual(listed(mixed), [
      "line 5: the row is left out: “files:” names none and also 1 path (“Code/results/a.json”); none stands alone (a file named none is written as a code span, `none`).",
      "line 6: the row is left out: “files:” names none and also 2 paths (“a.json” and “b, c.json”); none stands alone (a file named none is written as a code span, `none`).",
    ]);
  });

  test("an experiment's Points to problems leave its row out", () => {
    const cases: [string, string, string][] = [
      ["commit: none", "done", "Points to has no “files:”"],
      ["files: a.json", "done", "Points to has no “commit:”"],
      ["", "done", "a done experiment needs “commit:” and “files:” in Points to"],
      ["commit: none", "planned", "Points to has no “files:”"],
      ["commit: C4D4A85; files: a.json", "done", "“C4D4A85” is not a commit (7 to 64 lower-case hex digits, or none)"],
      ["commit: c4d4a8; files: a.json", "done", "“c4d4a8” is not a commit (7 to 64 lower-case hex digits, or none)"],
      [`commit: ${"a".repeat(65)}; files: a.json`, "done", `“${"a".repeat(59)}…” is not a commit (7 to 64 lower-case hex digits, or none)`],
      ["commit: none; files:", "done", "“files:” names no path (a run with no result file says “files: none”)"],
      ["commit: none; files: a.json; commit: none", "done", "Points to names “commit:” twice"],
      ["commit: none; files: a.json; from: E1", "done", "“from” is not a key an experiment points with (commit, files)"],
      ["commit: none; files a.json", "done", "“files a.json” in Points to is not a “key: value” pair"],
      ["commit: none; files: ../x.json", "done", "“../x.json” is not a path inside the project (no leading “/”, no “.” or “..” segment or name starting with “.”, no empty segment, no “\\”, no address)"],
      ["commit: none; files: /etc/passwd", "done", "“/etc/passwd” is not a path inside the project (no leading “/”, no “.” or “..” segment or name starting with “.”, no empty segment, no “\\”, no address)"],
      ["commit: none; files: Code/.env", "done", "“Code/.env” is not a path inside the project (no leading “/”, no “.” or “..” segment or name starting with “.”, no empty segment, no “\\”, no address)"],
      ["commit: none; files: Code//a.json", "done", "“Code//a.json” is not a path inside the project (no leading “/”, no “.” or “..” segment or name starting with “.”, no empty segment, no “\\”, no address)"],
      ["commit: none; files: https://x.invalid/a", "done", "“https://x.invalid/a” is not a path inside the project (no leading “/”, no “.” or “..” segment or name starting with “.”, no empty segment, no “\\”, no address)"],
      ["commit: none; files: Code\\a.json", "done", "“Code\\a.json” is not a path inside the project (no leading “/”, no “.” or “..” segment or name starting with “.”, no empty segment, no “\\”, no address)"],
      ["commit: none; files: `a`.json", "done", "“`a`.json” is not a path written bare or as one code span"],
    ];
    for (const [points, status, cause] of cases) {
      const g = graphOf(file(E("E1", "", points, status)));
      assert.deepEqual(listed(g), [`line 5: the row is left out: ${cause}.`], points);
    }
  });

  test("a result: `from: <ID of an experiment>`, required; one that names no experiment leaves the node drawn, its pointer as written", () => {
    const g = graphOf(file(E("E1"), Q("Q1"), R("R1", "E1"), R("R2", "E9"), R("R3", "Q1"), R("R4", "e1"), row("R5", "result", "s", "recorded", "", "", ""), R("R6", "E-")));
    assert.deepEqual(ids(g), ["E1", "Q1", "R1", "R2", "R3", "R4", "R6"]);
    assert.deepEqual(came(g), [
      ["R1", "E1"],
      ["R4", "E1"],
    ]);
    assert.deepEqual(listed(g), [
      "line 8: R2's “from: E9” is shown as written: no node in the table has the ID E9.",
      "line 9: R3's “from: Q1” is shown as written: Q1 is a question, not an experiment.",
      "line 11: the row is left out: a result needs “from: <ID of an experiment>” in Points to.",
      "line 12: R6's “from: E-” is shown as written: no node in the table has the ID E-.",
    ]);
    assert.deepEqual(g.pointers.get(node(g, "R2").key), { kind: "from", state: "missing", id: "E9", why: "no node in the table has the ID E9" });
    // "E-" is an ID by the pattern (a letter, then "-"): its row stays, and the pointer names no node.
    assert.equal(g.pointers.get(node(g, "R6").key)?.kind, "from");
    const bad = graphOf(file(R("R1", "E 1")));
    assert.deepEqual(listed(bad), ["line 5: the row is left out: “E 1” after “from:” is not an ID."]);
  });

  test("a claim: `claim: <claim ID>` of the skeleton's claims table, compared exactly; one the skeleton does not have, or has twice, is listed and shown as written", () => {
    const skeleton = skeletonFrom({ ok: true, doc: parse("## Claims and Evidence\n\n| Claim | Evidence | Source file or link | Citation/result | Status |\n|---|---|---|---|---|\n| C1: one | e | s | r | verified |\n| C3: first | e | s | r | weak |\n| C3: second | e | s | r | verified |\n| C4: four | e | s | r | Verified |\n") });
    const g = graphOf(file(C("C1", "C1"), C("C2", "C2"), C("C3", "C3"), C("C4", "C4"), C("C5"), C("C6", "C1a")), skeleton);
    assert.deepEqual(ids(g), ["C1", "C2", "C3", "C4", "C5", "C6"]);
    assert.deepEqual(listed(g), [
      "line 6: C2's “claim: C2” is shown as written: no row of the Claims and Evidence table in paper_skeleton.md starts with “C2: ”.",
      "line 7: C3's “claim: C3” is shown as written: rows on lines 6 and 7 of paper_skeleton.md both start with “C3: ”.",
      "line 10: C6's “claim: C1a” is shown as written: no row of the Claims and Evidence table in paper_skeleton.md starts with “C1a: ”.",
    ]);
    assert.deepEqual(g.pointers.get(node(g, "C4").key), { kind: "claim", state: "found", id: "C4", line: 8, text: "four", status: "Verified" });
    assert.deepEqual(g.pointers.get(node(g, "C5").key), { kind: "claim", state: "none" }, "an empty Points to: the claim names no row");
    assert.deepEqual(g.claims, { checked: true, verified: 2, total: 6 }, "by the skeleton's Status, ignoring case: C1 and C4");
    const bad = graphOf(file(C("C1", "c1"), C("C2", "C1 "), C("C3", "CLAIM1"), row("C4", "claim", "s", "verified", "", "from: E1", "")));
    assert.deepEqual(listed(bad), [
      "line 5: the row is left out: “c1” after “claim:” is not a claim ID (1 to 4 capitals, 1 to 4 digits, an optional small letter, as C1).",
      "line 7: the row is left out: “CLAIM1” after “claim:” is not a claim ID (1 to 4 capitals, 1 to 4 digits, an optional small letter, as C1).",
      "line 8: the row is left out: “from” is not a key a claim points with (claim).",
    ]);
  });

  test("a claim's status has two sources: when the skeleton's differs, one problem; the panel counts by the skeleton's", () => {
    const g = graphOf(file(C("C2", "C2", "", "planned"), C("C1", "C1", "", "Verified"), C("C3", "C3", "", "verified")));
    // The idea file's own word is refused before any comparison: "Verified" is no claim status there.
    assert.deepEqual(ids(g), ["C2", "C3"]);
    assert.deepEqual(listed(g), ["line 5: C2 is “planned” here, “verified” in paper_skeleton.md:116.", "line 6: the row is left out: “Verified” is not a status of a claim (planned, verified, weak, or removed)."]);
    assert.deepEqual(g.claims, { checked: true, verified: 2, total: 2 }, "C2 counts as verified: the skeleton is the authority");
  });

  test("a question or hypothesis points to nothing", () => {
    const g = graphOf(file(row("Q1", "question", "s", "open", "", "claim: C1", ""), row("H1", "hypothesis", "s", "open", "", " ", "")));
    assert.deepEqual(ids(g), ["H1"]);
    assert.deepEqual(listed(g), ["line 5: the row is left out: a question points to nothing, so its Points to cell must be empty."]);
  });
});

describe("§5.2 paper_skeleton.md as the claims' authority", () => {
  test("an unreadable skeleton is one problem, claims not checked; pointers are shown as written", () => {
    const g = graphOf(file(C("C1", "C1"), C("C9", "C9")), skeletonFrom({ ok: false, status: 404 }));
    assert.deepEqual(listed(g), ["claims not checked: paper_skeleton.md is not there, or it is a link the Idea view may not follow."]);
    assert.deepEqual(g.claims, { checked: false, total: 2, why: "paper_skeleton.md is not there, or it is a link the Idea view may not follow" });
    assert.deepEqual(g.pointers.get(node(g, "C1").key), { kind: "claim", state: "unchecked", id: "C1" });
    for (const [read, why] of [
      [{ ok: false, problem: "too-large" }, "paper_skeleton.md is larger than 1 MiB, the most the Idea view reads of it"],
      [{ ok: false, problem: "binary" }, "paper_skeleton.md holds binary data"],
      [{ ok: false, problem: "encoding" }, "paper_skeleton.md is text in an encoding other than UTF-8"],
      [{ ok: false, status: 503 }, "too many files were being read at once; Reload to try again"],
      [{ ok: false, status: 0 }, "the Idea view could not reach the app"],
      [{ ok: true, doc: parse("# Paper\n\nNo claims.\n") }, "no Claims and Evidence table was found in paper_skeleton.md"],
      [{ ok: true, doc: parse("## Claims and Evidence\n\n| Statement | Status |\n|---|---|\n| x | verified |\n") }, "the Claims and Evidence table in paper_skeleton.md has no Claim column"],
    ] as const) {
      assert.deepEqual(listed(graphOf(file(C("C1", "C1")), skeletonFrom(read))), [`claims not checked: ${why}.`], why);
    }
  });

  test("no claim node, no check: an unreadable skeleton is no problem then", () => {
    assert.deepEqual(listed(graphOf(file(Q("Q1")), skeletonFrom({ ok: false, status: 404 }))), []);
  });

  test("a skeleton md-kit read only in part: a missing claim is worded by the rows read", () => {
    const rows = Array.from({ length: MD.rows + 1 }, (_, k) => `| C${k + 1}: c | e | s | r | verified |`).join("\n");
    const skeleton = skeletonFrom({ ok: true, doc: parse(`## Claims and Evidence\n\n| Claim | Evidence | Source file or link | Citation/result | Status |\n|---|---|---|---|---|\n${rows}\n`) });
    const g = graphOf(file(C("C9", "C9"), C("C501", "C501")), skeleton);
    assert.deepEqual(listed(g), [
      "line 6: C501's “claim: C501” is shown as written: no row of the Claims and Evidence table in paper_skeleton.md starts with “C501: ” among the rows the view reads (the table's first 500).",
    ]);
  });
});

describe("§5.1 a DAG: each link counts from what must exist first to what follows from it; a cycle is listed, and every node is still drawn", () => {
  const COUNTED = "counting each link from what must exist first to what follows from it";

  test("the rule's table: A motivates B is A → B; E tests X is X → E; R supports or refutes X is X → R; R from: E is E → R", () => {
    // The rows are written in the order the members are named, so a cycle's members are listed in file order.
    const cases: [string, string[], string[] | null][] = [
      ["E1 tests H1; R1 from E1; R1 supports H1", [H("H1"), E("E1", "tests H1"), R("R1", "E1", "supports H1")], null],
      ["H1 motivates E1; E1 tests H1", [H("H1", "motivates E1"), E("E1", "tests H1")], null],
      ["C1 motivates E2; R2 from E2; R2 supports C1", [C("C1", "", "motivates E2"), E("E2"), R("R2", "E2", "supports C1")], null],
      ["R1 from E1; R1 motivates E2; E2 tests Q1; R2 from E2; R2 supports C1; C1 motivates E3", [Q("Q1"), E("E1"), E("E2", "tests Q1"), E("E3"), R("R1", "E1", "motivates E2"), R("R2", "E2", "supports C1"), C("C1", "", "motivates E3")], null],
      ["R1 from E1; R1 motivates E1", [E("E1"), R("R1", "E1", "motivates E1")], ["E1", "R1"]],
      ["R1 motivates H2; R1 supports H2", [R("R1", "E1", "motivates H2; supports H2"), H("H2"), E("E1")], ["R1", "H2"]],
      ["R1 from E1; R1 motivates Q2; E1 tests Q2", [Q("Q2"), E("E1", "tests Q2"), R("R1", "E1", "motivates Q2")], ["Q2", "E1", "R1"]],
      ["Q1 motivates Q2; Q2 motivates Q1", [Q("Q1", "motivates Q2"), Q("Q2", "motivates Q1")], ["Q1", "Q2"]],
    ];
    for (const [says, rows, cycle] of cases) {
      const g = graphOf(file(...rows));
      assert.equal(g.nodes.length, rows.length, says);
      const found = g.problems.filter((p) => p.text.startsWith("a cycle runs through "));
      assert.deepEqual(listed(g).filter((p) => !p.includes("a cycle runs through ")), [], says);
      if (cycle === null) assert.deepEqual(found, [], says);
      else {
        assert.equal(found.length, 1, says);
        const named = /^a cycle runs through (.*?)(?::|; one of its loops:) /.exec(found[0]!.text)?.[1];
        assert.equal(named, cycle.length === 2 ? cycle.join(" and ") : `${cycle.slice(0, -1).join(", ")}, and ${cycle[cycle.length - 1]}`, says);
      }
    }
  });

  test("the problem says how the cycle was counted, step by step, so it can be checked against the file", () => {
    assert.deepEqual(listed(graphOf(file(E("E1"), R("R1", "E1", "motivates E1")))), [`lines 5 and 6: a cycle runs through E1 and R1: E1 before R1 (R1 from E1) and R1 before E1 (R1 motivates E1), ${COUNTED}; each node is still drawn.`]);
    assert.deepEqual(listed(graphOf(file(Q("Q2"), E("E1", "tests Q2"), R("R1", "E1", "motivates Q2")))), [
      `lines 5, 6, and 7: a cycle runs through Q2, E1, and R1: Q2 before E1 (E1 tests Q2), E1 before R1 (R1 from E1), and R1 before Q2 (R1 motivates Q2), ${COUNTED}; each node is still drawn.`,
    ]);
    assert.deepEqual(listed(graphOf(file(R("R1", "E1", "refutes H2; motivates H2"), H("H2"), E("E1")))), [`lines 5 and 6: a cycle runs through R1 and H2: R1 before H2 (R1 motivates H2) and H2 before R1 (R1 refutes H2), ${COUNTED}; each node is still drawn.`]);
    // Three nodes on loops, one loop shown: named as one of them.
    const g = graphOf(file(H("H1", "motivates H2; motivates H3"), H("H2", "motivates H1"), H("H3", "motivates H1"), Q("Q1", "motivates H1")));
    assert.equal(g.links.length, 5);
    assert.deepEqual(listed(g), [`lines 5, 6, and 7: a cycle runs through H1, H2, and H3; one of its loops: H1 before H2 (H1 motivates H2) and H2 before H1 (H2 motivates H1), ${COUNTED}; each node is still drawn.`]);
  });

  test("a cycle through every node of a full graph is one problem, naming the first ten nodes and steps", () => {
    const n = LIMITS.nodes;
    const g = graphOf(file(...Array.from({ length: n }, (_, k) => H(`H${k + 1}`, `motivates H${((k + 1) % n) + 1}`))));
    assert.equal(g.nodes.length, n);
    const steps = Array.from({ length: 10 }, (_, k) => `H${k + 1} before H${k + 2} (H${k + 1} motivates H${k + 2})`).join(", ");
    assert.deepEqual(listed(g), [`lines 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, and ${n - 10} more: a cycle runs through H1, H2, H3, H4, H5, H6, H7, H8, H9, H10, and ${n - 10} more: ${steps}, and ${n - 10} more, ${COUNTED}; each node is still drawn.`]);
  });
});

describe("caps and what md-kit leaves unread, each said (§1 fact 6, §5.2)", () => {
  test(`past ${LIMITS.nodes} nodes, the first ${LIMITS.nodes} are drawn and the problems and the bar say so`, () => {
    const g = graphOf(file(...Array.from({ length: LIMITS.nodes + 30 }, (_, k) => Q(`Q${k + 1}`))));
    assert.equal(g.nodes.length, LIMITS.nodes);
    assert.deepEqual(g.totals, { nodes: LIMITS.nodes + 30, links: 0 });
    assert.deepEqual(listed(g), [`lines ${5 + LIMITS.nodes}–${4 + LIMITS.nodes + 30}: 30 nodes past the first ${LIMITS.nodes} are not drawn.`]);
    assert.equal(barWords(g), `${LIMITS.nodes} of ${LIMITS.nodes + 30} nodes · 0 links`);
  });

  test(`past ${LIMITS.links} links, the first ${LIMITS.links} in file order are drawn`, () => {
    const questions = Array.from({ length: 11 }, (_, k) => Q(`Q${k + 1}`));
    const experiments = Array.from({ length: 100 }, (_, k) => E(`E${k + 1}`, Array.from({ length: 11 }, (_, j) => `tests Q${j + 1}`).join("; ")));
    const g = graphOf(file(...questions, ...experiments));
    assert.equal(g.links.length, LIMITS.links);
    assert.deepEqual(g.totals, { nodes: 111, links: 1100 });
    assert.deepEqual(listed(g), [`lines ${16 + 90}–${16 + 99}: 100 links past the first ${LIMITS.links.toLocaleString("en-US")} are not drawn.`]);
    assert.equal(barWords(g), `111 nodes · ${LIMITS.links.toLocaleString("en-US")} of 1,100 links`);
  });

  test("rows past md-kit's 500, and lines inside the table holding only invisible characters, are said", () => {
    const rows = Array.from({ length: MD.rows + 2 }, (_, k) => row(`X${k + 1}`, "question", "s", "open", "", "", ""));
    const g = graphOf(file(rows[0]!, "\u200B", ...rows.slice(1)));
    const all = listed(g);
    assert.equal(all[0], `the table has 2 rows past the ${MD.rows} the view reads; they are not read.`);
    assert.equal(all[1], "line 6: it holds only invisible characters; the table goes on after it.");
    assert.match(all[2]!, new RegExp(`^lines 206–505: 300 nodes past the first ${LIMITS.nodes} are not drawn\\.$`));
    assert.equal(all.length, 3);
    // A link to a row md-kit did not read is worded by the rows read.
    const far = graphOf(file(E("E1", `tests X${MD.rows + 1}`), ...rows));
    assert.equal(listed(far).find((p) => p.startsWith("line 5:")), `line 5: E1's link “tests X${MD.rows + 1}” is left out: no node among the rows the view reads has the ID X${MD.rows + 1}.`);
  });

  test("rows after a blank line are not rows of the table (md-kit ends it there): the problems say so, and a link to one is worded by the rows read", () => {
    const g = graphOf(file(Q("Q1"), E("E1", "tests Q2"), "", Q("Q2"), Q("Q3"), "", "Free text.", "", Q("Q4")));
    assert.deepEqual(ids(g), ["Q1", "E1"]);
    assert.deepEqual(listed(g), [
      "line 6: E1's link “tests Q2” is left out: no node among the rows the view reads has the ID Q2.",
      "lines 8–9: these lines start with “|” after the table, which ends on line 6 (a blank line or other text ends it); they are not read as rows.",
      "line 13: this line starts with “|” after the table, which ends on line 6 (a blank line or other text ends it); it is not read as a row.",
    ]);
    // Rows indented under a list item after the table are the item's text: said, and a link to one is worded by the rows read.
    const listed2 = graphOf(file(Q("Q1"), E("E1", "tests Q2")) + "\n- Rows added later:\n  | Q2 | question | added later | open |  |  |  |\n  | Q3 | question | and another | open |  |  |  |\n\n* one more\n  | Q4 | question | q4 | open |  |  |  |\n");
    assert.deepEqual(ids(listed2), ["Q1", "E1"]);
    assert.deepEqual(listed(listed2), [
      "line 6: E1's link “tests Q2” is left out: no node among the rows the view reads has the ID Q2.",
      "lines 9–10: these lines start with “|” inside a list item after the table, which ends on line 6 (a table inside a list item is read as the item's text); they are not read as rows.",
      "line 13: this line starts with “|” inside a list item after the table, which ends on line 6 (a table inside a list item is read as the item's text); it is not read as a row.",
    ]);
    // A table after it with another header is free text, as §5.1 says, and a link to nothing in a whole file is worded so.
    const other = graphOf(`${file(E("E1", "tests Q9"))}\n| a | b |\n|---|---|\n| 1 | 2 |\n`);
    assert.deepEqual(listed(other), ["line 5: E1's link “tests Q9” is left out: no node in the table has the ID Q9."]);
  });

  test("the problems listed stop at 500, the count is every one, and the list ends “and N more problems are not listed”", () => {
    assert.deepEqual({ ...LIMITS }, { nodes: 200, links: 1000, problems: 500 });
    const g = graphOf(file(Q("Q1"), Q("Q2", Array.from({ length: 550 }, () => "x").join("; "))));
    assert.equal(g.problemCount, 550);
    assert.equal(g.problems.length, 500);
    assert.equal(problemsTitle(g.problemCount), "550 problems in idea_graph.md");
    assert.equal(moreWords(g), "and 50 more problems are not listed");
    assert.equal(problemsTitle(1), "1 problem in idea_graph.md");
    const one = graphOf(file(Q("Q1"), Q("Q2", Array.from({ length: 501 }, () => "x").join("; "))));
    assert.deepEqual([one.problems.length, moreWords(one)], [500, "and 1 more problem is not listed"]);
    assert.equal(moreWords(graphOf(file(Q("Q1", "x")))), null, "every problem listed: no such line");
  });
});

describe("labels and quotes (§1 fact 5): `idea_graph.md · E2 (experiment)`, the row as written", () => {
  test("the label names the ID and kind; the quote is the row as written, one line", () => {
    const g = graphOf(EXAMPLE);
    const e2 = node(g, "E2");
    assert.deepEqual(selectionOf(e2), { label: "idea_graph.md · E2 (experiment)", quote: EXAMPLE.split("\n")[5] });
    assert.deepEqual(host({ type: "os.select", ...selectionOf(e2) }), { kind: "select", reference: { label: "idea_graph.md · E2 (experiment)", quote: EXAMPLE.split("\n")[5] } });
  });

  test("a lone CR, U+2028, and other line breaks inside a row are quoted as markers, so the quote is one line; a quote over 2,000 is cut by the host's rule", () => {
    const g = graphOf(file(row("Q1", "question", "a\rb\u2028c\u000Bd\u0085e", "open", "", "", "")));
    const q = selectionOf(node(g, "Q1")).quote!;
    assert.equal(q, "| Q1 | question | a⟨U+000D⟩b⟨U+2028⟩c⟨U+000B⟩d⟨U+0085⟩e | open |  |  |  |");
    const shown = host({ type: "os.select", label: "x", quote: q });
    assert.ok(shown?.kind === "select" && !shown.reference.quote!.includes("\n"));
    const long = graphOf(file(row("Q2", "question", `${"x".repeat(QUOTE_MAX)}\u202E`, "open", "", "", "")));
    const cut = quoteOf(node(long, "Q2").row);
    assert.equal(cut.length, QUOTE_MAX);
    assert.ok(cut.endsWith(QUOTE_CUT));
    assert.ok(host({ type: "os.select", label: "x", quote: cut }) !== null);
    assert.equal(host({ type: "os.select", label: "x", quote: node(long, "Q2").row }), null, "uncut, the host would drop the selection");
  });

  test("labelOf marks, in one pass, what the host refuses and ⟨ ⟩ themselves: any two strings get two labels, and the host takes each", () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const ALPHABET = ["a", "Z", "1", "_", "-", " ", "⟨", "⟩", "U", "+", "0", "\u00A0", "\u200B", "\u202E", "\r", "\n", "\u2028", "\u212A", "·", "(", ")", "😀", "\uD800", "\t"];
    const seen = new Map<string, string>();
    for (let k = 0; k < 20_000; k++) {
      const id = Array.from({ length: 1 + rand(12) }, () => ALPHABET[rand(ALPHABET.length)]).join("");
      const label = labelOf(id, "claim");
      assert.ok(label.length <= LABEL_MAX);
      assert.notEqual(host({ type: "os.select", label }), null, JSON.stringify(id));
      const other = seen.get(label);
      assert.ok(other === undefined || other === id, `${JSON.stringify(id)} and ${JSON.stringify(other)} share ${label}`);
      seen.set(label, id);
    }
    assert.equal(labelOf("a⟨U+0020⟩b", "question"), "idea_graph.md · a⟨U+27E8⟩U+0020⟨U+27E9⟩b (question)", "a name that spells a marker is not another's");
    for (const [one, other] of [
      ["a\u00A0b", "a⟨U+00A0⟩b"],
      ["Q1\u200B", "Q1⟨U+200B⟩"],
      [" Q1", "⟨U+0020⟩Q1"],
    ]) assert.notEqual(labelOf(one!, "claim"), labelOf(other!, "claim"), `${JSON.stringify(one)} and ${JSON.stringify(other)}`);
    assert.equal(labelOf("Q1", "question"), "idea_graph.md · Q1 (question)", "an ID by the pattern is drawn as written");
  });

  test("on random files with hostile cells, every drawn node has its own label, and the host takes every label and quote", () => {
    let seed = 11;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };
    const IDS = ["Q1", "q1", "E2", "e2", "R3", "C2", "H1", "h1", "Q\u212A", "X-1", "x_1", "Е1", "Q1\u200B"];
    const KINDS = ["question", "hypothesis", "experiment", "result", "claim"];
    const CELLS = ["", "plain", "⟨U+0041⟩", "a\rb", "x\u2028y", "\u202Eevil", "`code | pipe`", "x".repeat(2500), "tests Q1", "motivates E2; supports C2"];
    for (let round = 0; round < 200; round++) {
      const rows = Array.from({ length: 1 + rand(12) }, () => {
        const kind = KINDS[rand(KINDS.length)]!;
        const points = kind === "result" ? "from: E2" : kind === "experiment" ? "commit: none; files: a.json" : kind === "claim" ? "claim: C2" : "";
        return row(IDS[rand(IDS.length)]!, kind, CELLS[1 + rand(CELLS.length - 1)]!, { question: "open", hypothesis: "open", experiment: "done", result: "recorded", claim: "planned" }[kind]!, CELLS[rand(CELLS.length)]!, points, CELLS[rand(CELLS.length)]!);
      });
      const source = rand(2) === 0 ? file(...rows) : crlf(file(...rows));
      const g = graphOf(source);
      const labels = g.nodes.map((n) => selectionOf(n).label);
      assert.equal(new Set(labels).size, labels.length, labels.join(" / "));
      for (const n of g.nodes) {
        const sel = selectionOf(n);
        const got = host({ type: "os.select", ...sel });
        assert.ok(got !== null, `${sel.label}: ${JSON.stringify(sel.quote)}`);
        assert.equal(source.split(/\r?\n/)[n.line - 1], n.row, "the node's line is the file's");
      }
    }
  });
});

describe("the detail panel and the summary (§5.4)", () => {
  test("nothing selected: counts by kind, what is still open, and the claims verified in paper_skeleton.md", () => {
    const g = graphOf(MOCKUP);
    const s = summary(g);
    assert.equal(s.counts, "20 nodes: 4 questions, 5 experiments, 6 results, 5 claims; none is a hypothesis.");
    assert.deepEqual(s.open.map((n) => [n.id, n.status]), [
      ["Q4", "open"],
      ["E5", "planned"],
    ]);
    assert.equal(s.claims, "5 of 5 verified in paper_skeleton.md");
    assert.equal(summary(graphOf(file(C("C1", "C1")), skeletonFrom({ ok: false, status: 404 }))).claims, "not checked: paper_skeleton.md is not there, or it is a link the Idea view may not follow");
    assert.equal(summary(graphOf(file(Q("Q1")))).claims, "no claim node is drawn");
    assert.equal(summary(graphOf(file(Q("Q1"), H("H1")))).counts, "2 nodes: 1 question, 1 hypothesis; none is an experiment, a result, or a claim.");
  });

  test("“Still open” lists the nodes whose status is open, planned, or running, and no other", () => {
    const all = graphOf(
      file(
        Q("Q1"),
        Q("Q2", "", "answered"),
        H("H1"),
        H("H2", "", "supported"),
        H("H3", "", "refuted"),
        E("E1", "", "", "planned"),
        E("E2", "", undefined, "running"),
        E("E3", "", undefined, "done"),
        E("E4", "", undefined, "failed"),
        R("R1", "E3"),
        C("C1", "", "", "planned"),
        C("C2", "", "", "verified"),
        C("C3", "", "", "weak"),
        C("C4", "", "", "removed"),
      ),
    );
    assert.equal(all.nodes.length, 14);
    assert.deepEqual(summary(all).open.map((n) => `${n.id} ${n.status}`), ["Q1 open", "H1 open", "E1 planned", "E2 running", "C1 planned"]);
    assert.equal(STILL_OPEN, "Still open");
  });

  test("a selected node: its links by word, both ways, where it came from, its results, what it points to, and its source", () => {
    const g = graphOf(MOCKUP);
    const e2 = details(g, node(g, "E2"));
    assert.deepEqual(e2.links.map((l) => [l.label, l.nodes.map((n) => n.id)]), [
      ["Tests", ["Q1"]],
      ["Motivated by", ["R1"]],
      ["Its results", ["R2", "R3", "R4"]],
    ]);
    assert.deepEqual(e2.points, { lines: ["Commit: none recorded by the run"], files: ["Code/results/summary.json", "Code/results/training_metrics.csv"], chip: null, claim: null, problem: null });
    assert.equal(e2.source, "Code/README.md:122 (\"Results\")");
    const r3 = details(g, node(g, "R3"));
    assert.deepEqual(r3.links.map((l) => [l.label, l.nodes.map((n) => n.id)]), [
      ["Supports", ["C2"]],
      ["Came from", ["E2"]],
    ]);
    assert.deepEqual(r3.points, { lines: ["from: E2"], files: [], chip: node(g, "E2"), claim: null, problem: null });
    const c2 = details(g, node(g, "C2"));
    assert.deepEqual(c2.links.map((l) => [l.label, l.nodes.map((n) => n.id)]), [["Supported by", ["R3"]]]);
    assert.deepEqual(c2.points, { lines: ["Row C2 of the Claims and Evidence table, paper_skeleton.md:116"], files: [], chip: null, claim: { text: "base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456", status: "verified" }, problem: null });
    assert.deepEqual(details(g, node(g, "E5")).points, { lines: ["No run yet"], files: [], chip: null, claim: null, problem: null });
    assert.deepEqual(details(g, node(g, "Q4")).links, []);
    assert.equal(details(g, node(g, "Q4")).source, "PROJECT_MEMORY.md:18 (\"Current question\")");
    const commit = graphOf(file(E("E1", "", "commit: c4d4a85; files: a.json")));
    assert.deepEqual(details(commit, commit.nodes[0]!).points.lines, ["Commit c4d4a85"]);
  });

  test("a pointer that does not resolve is shown as written beside it, with why", () => {
    const g = graphOf(file(R("R2", "E9"), C("C9", "C9"), C("C5")));
    assert.deepEqual(details(g, node(g, "R2")).points, { lines: ["from: E9"], files: [], chip: null, claim: null, problem: "Shown as written: no node in the table has the ID E9." });
    assert.deepEqual(details(g, node(g, "C9")).points, { lines: ["claim: C9"], files: [], chip: null, claim: null, problem: "Shown as written: no row of the Claims and Evidence table in paper_skeleton.md starts with “C9: ”." });
    assert.deepEqual(details(g, node(g, "C5")).points, { lines: ["This claim names no row of paper_skeleton.md: its Points to is empty."], files: [], chip: null, claim: null, problem: null });
  });

  test("a statement that draws nothing visible, and a space other than U+0020 in a result file's path, are drawn as markers", () => {
    const g = graphOf(file(row("Q1", "question", " ", "open", "", "", ""), row("Q2", "question", "![](x.png)", "open", "", "", ""), row("Q3", "question", "a b ‮evil", "open", "", "", ""), E("E1", "", "commit: none; files: Code/a b.json, Code/c d.csv, Code/plain name.json")));
    // The map's box (and its tooltip): a statement of only a no-break space was a blank box.
    assert.deepEqual(g.nodes.map((n) => nodeWords(n.statement)), ["⟨U+00A0⟩", "![](x.png)", "a b ⟨U+202E⟩evil", "Experiment E1"]);
    // The panel: drawn through md-kit's tokens, so a blank statement is given marked.
    assert.equal(details(g, node(g, "Q1")).statement, "⟨U+00A0⟩");
    assert.equal(details(g, node(g, "Q3")).statement, "a b ‮evil", "visible words stay as written; the page marks the invisible ones");
    // A path is a name: a no-break or em space in it is a marker, as in a label; a plain space stays.
    assert.deepEqual(details(g, node(g, "E1")).points.files, ["Code/a⟨U+00A0⟩b.json", "Code/c⟨U+2003⟩d.csv", "Code/plain name.json"]);
  });

  test("a node's tooltip names its ID, kind, status, and statement, marked as everything else from the file", () => {
    const g = graphOf(file(row("Experiment_runA1", "experiment", "Run \u202Eevil `x`", "running", "", "commit: none; files: none", ""), row("Q1", "question", "\u00A0", "answered", "", "", "")));
    assert.equal(tooltipOf(node(g, "Experiment_runA1")), "Experiment_runA1 (experiment), running: Run ⟨U+202E⟩evil x");
    assert.equal(tooltipOf(node(g, "Q1")), "Q1 (question), answered: ⟨U+00A0⟩");
  });

  test("a statement or source over 2,000 characters is drawn cut, and the panel says so", () => {
    const g = graphOf(file(row("Q1", "question", "s".repeat(MD.cell + 5), "open", "", "", "x".repeat(MD.cell + 1))));
    const d = details(g, g.nodes[0]!);
    assert.equal(d.statement, `${"s".repeat(MD.cell)} …[cut]`);
    assert.deepEqual(d.notes, [`The statement is longer than ${MD.cell.toLocaleString("en-US")} characters; the rest is not shown here (the agent gets the row as written, up to ${QUOTE_MAX.toLocaleString("en-US")} characters).`, `The source is longer than ${MD.cell.toLocaleString("en-US")} characters; the rest is not shown here.`]);
  });

  test("the bar: N nodes · M links", () => {
    assert.equal(barWords(graphOf(MOCKUP)), "20 nodes · 9 links");
    assert.equal(barWords(graphOf(file(Q("Q1")))), "1 node · 0 links");
  });
});

describe("every screen's words (§5.2, §2)", () => {
  test("the empty state names the file, what it is, and that the view writes nothing; the header line is given as text", () => {
    assert.deepEqual(emptyWords(), {
      title: "No idea file to draw",
      text: "The Idea view draws idea_graph.md in the project folder: a table with one row per question, hypothesis, experiment, result, or claim, and the links between them. This project has none, or it is a link the view may not follow. Ask the project agent to write one.",
      header: HEADER_LINE,
    });
    assert.equal(HEADER_LINE, "| ID | Kind | Statement | Status | Links | Points to | Source |");
  });

  test("no table with the expected header: worded by what was searched, the first header found beside the expected one", () => {
    assert.deepEqual(noTableWords({ kind: "no-table", first: { line: 3, source: "| **ID** | Kind |" }, nested: null, notes: ["n"] }), {
      title: "No idea graph table",
      text: "No table with the expected header was found in idea_graph.md.",
      expected: HEADER_LINE,
      found: "The first table's header, on line 3: | **ID** | Kind |",
      notes: ["n"],
      retry: true,
    });
    assert.equal(noTableWords({ kind: "no-table", first: null, nested: null, notes: [] }).found, "No table was found in idea_graph.md.");
  });

  test("the read channel's answers and the file's content", () => {
    assert.equal(fileWords(404, "P"), null, "404 is the empty state, not an error");
    assert.deepEqual(fileWords(413, "P"), { title: "Too large to show", text: "idea_graph.md is larger than 32 MiB, the most the app reads.", retry: true });
    assert.deepEqual(fileWords(503, "P"), { title: "Too many files are being read at once", text: "Try again in a moment.", retry: true });
    assert.deepEqual(fileWords(0, "P"), { title: "The Idea view could not reach the app", text: "Try again; if it keeps failing, restart the app.", retry: true });
    assert.deepEqual(fileWords(500, "P"), { title: "idea_graph.md could not be read", text: "The app answered 500 for projects-folder/P/idea_graph.md.", retry: true });
    assert.deepEqual(contentWords("too-large"), { title: "Too large to show", text: "idea_graph.md is larger than 512 KiB, the most the Idea view reads.", retry: true });
    assert.deepEqual(contentWords("binary"), { title: "Not a text file", text: "idea_graph.md holds binary data, so it is not drawn here.", retry: true });
    assert.deepEqual(contentWords("encoding"), { title: "Text in another encoding", text: "idea_graph.md seems to be text in an encoding other than UTF-8, which the Idea view cannot read.", retry: true });
    assert.deepEqual(projectWords(""), { title: "No project given", text: "The Idea view opens from a project's workspace, which names the project it shows.", retry: false });
    assert.equal(projectWords("?project=../x").title, "Not a project name");
  });

  test("idea_graph.md is read up to 512 KiB (524,288 bytes): exactly that is read, one byte more is too large, and the screen says 512 KiB", () => {
    assert.equal(READ_MAX, 524_288);
    const at = new TextEncoder().encode("x".repeat(524_288));
    assert.deepEqual(verdict(at, false), { kind: "text", text: "x".repeat(524_288) });
    assert.deepEqual(verdict(new TextEncoder().encode("x".repeat(524_289)), false), { kind: "too-large" });
    assert.equal(contentWords("too-large").text, "idea_graph.md is larger than 512 KiB, the most the Idea view reads.");
    assert.deepEqual(verdict(at, true), { kind: "too-large" }, "readStart stopped at the cap");
    assert.deepEqual(verdict(new Uint8Array([0x61, 0, 0x62]), false), { kind: "binary" });
    assert.deepEqual(verdict(new Uint8Array([0xff, 0xfe, 0x41]), false), { kind: "encoding" });
  });

  test("paper_skeleton.md is read up to 1 MiB (1,048,576 bytes): one byte more, or a read the cap stopped, is “larger than 1 MiB”", () => {
    assert.equal(SKELETON_MAX, 1_048_576);
    const claims = "## Claims and Evidence\n\n| Claim | Evidence | Source file or link | Citation/result | Status |\n|---|---|---|---|---|\n| C1: one | e | s | r | verified |\n";
    const padded = (size: number) => new TextEncoder().encode(claims + "x".repeat(size - claims.length));
    const whole = skeletonInput({ ok: true, bytes: padded(1_048_576), cut: false });
    assert.equal(whole.ok, true, "exactly 1 MiB is read");
    assert.deepEqual(skeletonFrom(whole).ok, true);
    assert.deepEqual(skeletonInput({ ok: true, bytes: padded(1_048_577), cut: false }), { ok: false, problem: "too-large" });
    assert.deepEqual(skeletonInput({ ok: true, bytes: padded(1_000), cut: true }), { ok: false, problem: "too-large" }, "readStart stopped at the cap");
    assert.deepEqual(skeletonFrom(skeletonInput({ ok: true, bytes: padded(1_048_577), cut: false })), { ok: false, why: "paper_skeleton.md is larger than 1 MiB, the most the Idea view reads of it" });
    assert.deepEqual(skeletonInput({ ok: false, status: 404 }), { ok: false, status: 404 });
    assert.deepEqual(skeletonInput({ ok: true, bytes: new Uint8Array([0x61, 0, 0x62]), cut: false }), { ok: false, problem: "binary" });
    assert.deepEqual(skeletonInput({ ok: true, bytes: new Uint8Array([0xff, 0xfe, 0x41]), cut: false }), { ok: false, problem: "encoding" });
  });
});

describe("hostile input costs one pass: parse, validate, and lay out (§1 fact 6, by growth, not a wall clock)", () => {
  const run = (source: string) => buildGraph(parse(source), SKEL);

  test("50,000 bad links in one row format numbers for the problems listed, not once a link", () => {
    // Counted, not timed: the first build formatted the row's line number for every bad link, listed or not
    // (toLocaleString 170,000 times for a 512 KiB cell), which put this file's bad-items case over the growth
    // floor on the slowest CI runner (macos-x64, 825 ms at 4n).
    const source = file(Q("Q1"), Q("Q2", "x; ".repeat(50_000)));
    const format = Number.prototype.toLocaleString;
    let calls = 0;
    Number.prototype.toLocaleString = function (this: number, ...args: []) {
      calls++;
      return format.apply(this, args);
    };
    let g: Graph;
    try {
      g = graphOf(source);
    } finally {
      Number.prototype.toLocaleString = format;
    }
    assert.equal(g.problemCount, 50_000);
    assert.equal(g.problems.length, LIMITS.problems);
    assert.ok(calls <= 4 * LIMITS.problems, `${calls} numbers formatted for ${LIMITS.problems} problems listed of 50,000`);
  });
  // Sized by one rule (os-ui/PLUGINS.md, the Idea view's growth cases). With the case run alone on the machine the
  // view was built on (an M1 Pro): 1. the code as it is takes at most about 17 ms at 4n, so a runner 15 times slower
  // on a day twice as slow stays under growth.ts's 500 ms floor; 2. the mistake the case guards against, put back on
  // a scratch copy, takes at least 2 s at 4n and fails the case. From 128 to 512 KiB the collector's work (gone under
  // --max-semi-space-size=64) made one pass grow up to 14 times here and 37 times on macos-x64 (the huge statement;
  // the `;` cell 8 and 21, the backticks 8 and 14), so those cases passed only by the floor, and macos-x64 failed two.
  // That work comes from md-kit's splitCells, which builds each cell a character at a time: a scratch copy that
  // slices cells grows about 4 times. Most cases now stay under 128 KiB at 4n; the huge statement (384 KiB) and the
  // files list (256 KiB) go over it, where their mistakes are slow enough, and still meet the first rule here
  // (macos-x64 took 342 ms and 186 ms for them at 512 KiB). "Honest" is the worst of twelve runs at 4n; "mistake" is
  // one run, timed as the test times it (best of five at 4n).
  const cases: [string, (n: number) => string, number][] = [
    // Both hold: honest 10.5 ms. Mistake: md-kit's splitCells looking for the cell's end again from every character
    // (`if (body.indexOf("|", i) < 0) break;` first in its loop), 17.9 times the time, 3.5 s.
    ["one huge statement", (n) => file(row("Q1", "question", "s".repeat(n), "open", "", "", "")), 96 * 1024],
    // Both hold: honest 7.2 ms. Mistake: a link that scans its whole cell again, empty items included
    // (`if (node.linksCell.lastIndexOf("\u0000") >= 0) continue;` first in the links loop), 20.1 times, 3.9 s.
    ["a Links cell of `;` only", (n) => file(Q("Q1", ";".repeat(n))), 24 * 1024],
    // Both hold: honest 15.5 ms. Mistake: that same scan of the whole cell for each link, 23.3 times, 2.8 s.
    ["a Links cell of bad items", (n) => file(Q("Q1"), Q("Q2", "x; ".repeat(n / 3))), 32 * 1024],
    // No mistake found that fails it, so sized by the first rule only: honest 9.4 ms. Its rows are short, so a link
    // that scans its cell again (8.6 ms at 4n) or a row looking its ID up among the rows before it (10.1 ms) still
    // costs about one pass.
    ["links all to one node", (n) => file(Q("Q1"), ...Array.from({ length: 199 }, (_, k) => E(`E${k}`, "tests Q1; ".repeat(n / 2200)))), 16 * 1024],
    // The first holds, the second only in part: honest 14.8 ms; the mistake fails the case, but under 2 s. A files
    // list checked against itself (`if (paths.includes(path)) continue;` before each push): 39.8 times, 692 ms; the
    // same check as a search of the files text (`files.indexOf(path) !== files.lastIndexOf(path)`): 16.8 times, 1.7 s.
    // At 80 KiB the honest time is 18.8 ms and the mistake still under 2 s (1.6 s), so no size meets both.
    ["a files list of many paths, each its own", (n) => file(E("E1", "", `commit: none; files: ${Array.from({ length: n / 16 }, (_, k) => `a/b${k}.json`).join(", ")}`)), 64 * 1024],
    // Both hold: honest 2.3 ms. Mistake: a backtick run measured again from each of its backticks (codeSpans
    // stepping `i++`, not `i = j`, past a run), 15.9 times, 4.0 s.
    ["backticks in Points to", (n) => file(E("E1", "", `commit: none; files: ${"`".repeat(n)}`)), 8 * 1024],
    // No mistake found that fails it: md-kit reads 500 rows and the view draws 200 nodes whatever the size, so a row
    // looking its ID up among the rows before it costs 20.2 ms at 4n, 1.0 times. Honest 3.0 ms. Its rows are a chain,
    // not a cycle: each motivates the next, and H199's link names a row past the cap.
    ["a cycle through every node, and rows past the caps", (n) => file(...Array.from({ length: n / 64 }, (_, k) => H(`H${k}`, `motivates H${k + 1}`))), 32 * 1024],
  ];
  for (const [name, make, n] of cases) {
    test(name, (t) => {
      assert.ok(make(4 * n).length <= READ_MAX + 4096, `${name}: ${make(4 * n).length} characters at 4n`);
      assertOnePass(t, name, growth(make, run, n));
    });
  }
});
