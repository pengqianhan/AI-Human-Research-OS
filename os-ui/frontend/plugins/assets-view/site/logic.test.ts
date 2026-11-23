/**
 * The Assets view's rules, one test per row of os-ui/PLUGINS.md Part 3,
 * §4.2, on the frozen fixture project (a copy of nanochat_cpu's Figs/,
 * Baselines/, Code/results/, Code/Datasets/, and Code/README.md) and the
 * template's (../../fixtures/README.md), with the frozen paper_skeleton.md
 * copies; then labels, the CSV reader on hostile input, and every state's
 * words. Every rule over text read from a file runs on a CRLF copy too.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { PluginPage } from "../../../src/plugins/pages.ts";
import { readSelect } from "../../../src/plugins/select.ts";
import { parse } from "../../md-kit.ts";
import { LABEL_MAX } from "../../site-kit.ts";
import {
  buildModel,
  csvPreview,
  datasetLabel,
  datasets,
  descriptions,
  docFrom,
  fileLabel,
  GROUPS,
  HEADING,
  imageWords,
  kindOf,
  LIMITS,
  linesPreview,
  markdownPreview,
  nameInLabel,
  noPreviewWords,
  placeText,
  previewCap,
  previewWords,
  projectWords,
  README,
  readProblem,
  sizeLine,
  sizeWords,
  SKELETON,
  usedInIndex,
  usedInWords,
  walkNotes,
  workspacePath,
} from "./logic.ts";
import type { Dataset, DocRead, FileItem, Model } from "./logic.ts";
import { walk } from "./walk.ts";
import type { Entry, ListAnswer, WalkResult } from "./walk.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const PROJECT = join(FIXTURES, "assets_project");
const TEMPLATE = join(FIXTURES, "assets_template");
/** A fixture's text with LF line endings, whatever the checkout gave it. */
const text = (path: string) => readFileSync(path, "utf8").split(/\r?\n/).join("\n");
const crlf = (t: string) => t.split("\n").join("\r\n");
const lineOf = (t: string, needle: string) => t.split("\n").findIndex((l) => l.includes(needle)) + 1;

const SKELETON_LF = text(join(FIXTURES, "nanochat_cpu.paper_skeleton.md"));
const README_LF = text(join(PROJECT, "Code/README.md"));
const DEMO_README_LF = text(join(PROJECT, "Baselines/openresearch-demo/README.md"));
const TEMPLATE_README_LF = text(join(TEMPLATE, "Code/README.md"));
const TEMPLATE_SKELETON_LF = text(join(FIXTURES, "template.paper_skeleton.md"));

/** The read channel's listing of a folder on disk: dot names left out, sorted by UTF-16 code unit; 404 when it is not a folder. */
function diskList(root: string): (path: string) => Promise<ListAnswer> {
  return async (path) => {
    const dir = join(root, path);
    try {
      if (!statSync(dir).isDirectory()) return { ok: false, status: 404 };
      const entries = readdirSync(dir)
        .sort()
        .filter((name) => !name.startsWith("."))
        .map((name): Entry => {
          const info = statSync(join(dir, name));
          return { name, dir: info.isDirectory(), size: info.isDirectory() ? 0 : info.size };
        });
      return { ok: true, entries, truncated: false };
    } catch {
      return { ok: false, status: 404 };
    }
  };
}

const read = (t: string): DocRead => ({ ok: true, doc: parse(t) });
const sizeOf = (root: string, rel: string) => statSync(join(root, rel)).size;

/** The model of a fixture tree, as main.ts builds it, with its texts LF or CRLF. */
async function modelOf(root: string, skeleton: DocRead, readme: DocRead, eol: (t: string) => string = (t) => t): Promise<Model> {
  const list = diskList(root);
  const walks = await Promise.all(GROUPS.map((g) => walk(g.folder, list)));
  const readmes = new Map<string, DocRead>(walks.flatMap((w) => w.readmes).map((p) => [p, read(eol(text(join(root, p))))]));
  return buildModel({ walks, skeleton, readme, readmes });
}
const nanochat = (eol: (t: string) => string = (t) => t) => modelOf(PROJECT, read(eol(SKELETON_LF)), read(eol(README_LF)), eol);
const file = (model: Model, path: string) => model.items.get(`file:${path}`) as FileItem;
const group = (model: Model, id: string) => model.groups.find((g) => g.group.id === id)!;

/** The host's own reading of a label (src/plugins/select.ts): taken exactly as posted, or null. */
const PAGE: PluginPage = { key: "assets-view/assets", plugin: "assets-view", slot: "project", title: "Assets", src: "app://assets-view/index.html", origin: "app://assets-view" };
const host = (label: string) => readSelect({ origin: PAGE.origin!, source: PAGE, data: { type: "os.select", label } }, PAGE, PAGE);

describe("§4.2 top bar: files listed plus dataset rows, and the groups present", () => {
  test("nanochat_cpu's copy: 8 files and 4 datasets; the template: what it has", async () => {
    assert.equal((await nanochat()).count, "12 items · Figs/ · Baselines/ · Code/results/ · datasets");
    const template = await modelOf(TEMPLATE, read(TEMPLATE_SKELETON_LF), read(TEMPLATE_README_LF));
    assert.equal(template.count, "1 item · Figs/ · Baselines/ · datasets");
    // Nothing readable at all.
    const none = await modelOf(join(FIXTURES, "no-such-project"), { ok: false, status: 404 }, { ok: false, status: 404 });
    assert.equal(none.count, "0 items");
  });
});

describe("§4.2 groups: title, folder, and each state", () => {
  test("Figures Figs/, Reference runs Baselines/, Results Code/results/, Datasets listed in Code/README.md", async () => {
    const model = await nanochat();
    assert.deepEqual(
      model.groups.map((g) => [g.group.title, g.where]),
      [
        ["Figures", "Figs/"],
        ["Reference runs", "Baselines/"],
        ["Results", "Code/results/"],
        ["Datasets", "listed in Code/README.md"],
      ],
    );
  });

  test("a folder that is not there, one that is empty, one with only empty folders, one that could not be listed", () => {
    const base: WalkResult = { root: "ok", status: 200, empty: false, files: [], folders: ["Figs"], readmes: [], truncated: [], failed: [], deeper: [], unlisted: [], capped: false };
    const figs = GROUPS[0]!;
    assert.deepEqual(walkNotes(figs, { ...base, root: "missing", status: 404 }), ["No Figs/ folder this view can read"]);
    assert.deepEqual(walkNotes(figs, { ...base, empty: true }), ["Figs/ is empty"]);
    assert.deepEqual(walkNotes(figs, { ...base, folders: ["Figs", "Figs/a"] }), ["Figs/ holds only empty folders"]);
    assert.deepEqual(walkNotes(figs, { ...base, root: "error", status: 0 }), ["Figs/ could not be listed: the Assets view could not reach the app"]);
    assert.deepEqual(walkNotes(figs, { ...base, root: "error", status: 500 }), ["Figs/ could not be listed: the app answered 500"]);
    // With files and a complete walk: nothing to say.
    assert.deepEqual(walkNotes(figs, { ...base, files: [{ path: "Figs/a.png", rel: "a.png", name: "a.png", size: 1, folder: "Figs" }] }), []);
  });

  test("where the walk stopped, in words beside the group: more files than shown", () => {
    const base: WalkResult = { root: "ok", status: 200, empty: false, files: [], folders: ["Baselines"], readmes: [], truncated: [], failed: [], deeper: [], unlisted: [], capped: false };
    const baselines = GROUPS[1]!;
    const one = [{ path: "Baselines/a.csv", rel: "a.csv", name: "a.csv", size: 1, folder: "Baselines" }];
    assert.deepEqual(walkNotes(baselines, { ...base, files: one, truncated: ["Baselines/big"] }), ["More files than shown: Baselines/big/ has more than 5,000 entries, and the app lists only part of it."]);
    assert.deepEqual(walkNotes(baselines, { ...base, files: one, capped: true }), ["More files than shown: Baselines/ holds more than 500 files; the first 500 the view found are listed."]);
    assert.deepEqual(walkNotes(baselines, { ...base, files: one, deeper: ["Baselines/a/b/c/d/e"] }), ["More files than shown: folders more than 4 levels below Baselines/ are not listed (Baselines/a/b/c/d/e/)."]);
    assert.deepEqual(
      walkNotes(baselines, { ...base, files: one, unlisted: ["Baselines/f1", "Baselines/f2", "Baselines/f3", "Baselines/f4", "Baselines/f5", "Baselines/f6", "Baselines/f7"] }),
      ["More files than shown: the view lists at most 40 folders of Baselines/; not listed: Baselines/f1/, Baselines/f2/, Baselines/f3/, Baselines/f4/, Baselines/f5/, and 2 more."],
    );
    assert.deepEqual(walkNotes(baselines, { ...base, files: one, failed: [{ folder: "Baselines/x", status: 404 }] }), [
      "Baselines/x/ could not be listed: it is not there, or it is a link the Assets view may not follow.",
    ]);
    // Without files, a walk that stopped does not say the folder is empty.
    assert.deepEqual(walkNotes(baselines, { ...base, deeper: ["Baselines/a/b/c/d/e"] })[0], "No files in the part of Baselines/ the view could list");
    // A folder name from the disk is drawn with its invisible characters marked.
    assert.match(walkNotes(baselines, { ...base, files: one, truncated: ["Baselines/b‮ig"] })[0]!, /Baselines\/b⟨U\+202E⟩ig\//);
  });
});

describe("§4.2 group notes", () => {
  test("Figures and Reference runs: none; Results: the one sentence; Datasets: Code/README.md's words before its table", async () => {
    const model = await nanochat();
    assert.deepEqual(group(model, "figs").notes, []);
    assert.deepEqual(group(model, "baselines").notes, []);
    assert.deepEqual(group(model, "results").notes, ["The Code view also lists these files."]);
    const data = group(model, "datasets").datasets!;
    assert.equal(data.view?.state, "table");
    if (data.view?.state !== "table") return;
    assert.deepEqual(
      data.view.note.map((b) => [b.kind, b.first, b.last]),
      [["paragraph", lineOf(README_LF, "Data is downloaded on demand"), lineOf(README_LF, "session; see each dataset card.")]],
    );
    assert.deepEqual(group(model, "datasets").notes, ["Code/Datasets/ is empty"]);
  });
});

describe("§4.2 figure cards and rows", () => {
  test("images anywhere under Figs/ are cards; any other file in Figs/, and images elsewhere, are rows", async () => {
    const model = await nanochat();
    assert.deepEqual(group(model, "figs").cards.map((f) => f.rel), ["baseline_training_curves.svg", "probe_comparison.svg"]);
    assert.deepEqual(group(model, "figs").rows, []);
    assert.deepEqual(
      ["figs", "baselines", "results"].map((g) => group(model, g).rows.map((f) => f.rel)),
      [[], ["Baseline_readme.md", "openresearch-demo/README.md", "openresearch-demo/evaluation-metrics.json", "openresearch-demo/training-metrics.csv"], ["summary.json", "training_metrics.csv"]],
    );
    assert.deepEqual([kindOf("figs", "a/b/plot.PNG"), kindOf("figs", "notes.txt"), kindOf("baselines", "plot.svg"), kindOf("results", "x.jpeg")], ["figure", "text", "image", "image"]);
  });
});

describe("§4.2 sizes on cards and rows", () => {
  test("the listing's size as n bytes, x.y KB, or x.y MB", async () => {
    assert.deepEqual([0, 1, 946, 1023, 1024, 11_127, 1024 * 1024 - 1, 1024 * 1024, 33 * 1024 * 1024].map(sizeWords), [
      "0 bytes",
      "1 byte",
      "946 bytes",
      "1,023 bytes",
      "1.0 KB",
      "10.9 KB",
      "1024.0 KB",
      "1.0 MB",
      "33.0 MB",
    ]);
    const model = await nanochat();
    assert.equal(file(model, "Baselines/openresearch-demo/README.md").size, sizeOf(PROJECT, "Baselines/openresearch-demo/README.md"), "from the listing");
  });
});

describe("§4.2 descriptions: only a README.md in the same folder, its first item or row whose first link is the file", () => {
  const check = (eol: (t: string) => string) => {
    const found = descriptions(parse(eol(DEMO_README_LF)), "Baselines/openresearch-demo/README.md");
    assert.deepEqual(
      [...found].map(([path, d]) => [path, d.text, d.line]),
      [
        ["Baselines/openresearch-demo/training-metrics.csv", "base and SFT loss, validation bpb, throughput, and elapsed time by step.", lineOf(DEMO_README_LF, "[training-metrics.csv]")],
        ["Baselines/openresearch-demo/evaluation-metrics.json", "base bpb, the CORE tasks that were completed, and the final headline metrics.", lineOf(DEMO_README_LF, "[evaluation-metrics.json]")],
      ],
    );
  };
  test("nanochat_cpu's Baselines/openresearch-demo/README.md describes its two data files, and nothing else", () => check((t) => t));
  test("the same on a CRLF copy", () => check(crlf));

  test("in the model: the two files have their description, every other file none", async () => {
    for (const eol of [(t: string) => t, crlf]) {
      const model = await nanochat(eol);
      const described = [...model.items.values()].filter((i): i is FileItem => "path" in i && i.description !== null).map((i) => i.path);
      assert.deepEqual(described, ["Baselines/openresearch-demo/evaluation-metrics.json", "Baselines/openresearch-demo/training-metrics.csv"]);
    }
  });

  test("a list item's text after the link without a leading ':' or '—'; a table row's other cells; the first one wins; cut at 300", () => {
    const md = [
      "- See [a.csv](a.csv) — the first run",
      "- [a.csv](a.csv): a second item for a.csv, not used",
      "- **[b.json](b.json)**: bold around the link",
      "- [other](c.csv) then [d.csv](d.csv): the first link is c.csv's",
      "- [e.csv](e.csv)",
      "",
      "| File | What | When |",
      "|---|---|---|",
      "| [f.svg](f.svg) | a figure | 2026 |",
      "| g.csv | no link | x |",
      "| | [h.txt](./h.txt) | in the second cell |",
      "",
      `- [long.csv](long.csv): ${"x".repeat(400)}`,
      "- [out](../../x.csv): leaves the folder, resolves elsewhere",
      "- [web](https://example.com/a.csv): an address",
    ].join("\n");
    const found = descriptions(parse(md), "Baselines/README.md");
    assert.deepEqual(Object.fromEntries([...found].map(([p, d]) => [p, d.text])), {
      "Baselines/a.csv": "the first run",
      "Baselines/b.json": "bold around the link",
      "Baselines/c.csv": "then d.csv: the first link is c.csv's",
      "Baselines/e.csv": "",
      "Baselines/f.svg": "a figure · 2026",
      "Baselines/h.txt": "in the second cell",
      "Baselines/long.csv": `${"x".repeat(300)} …[cut]`,
    });
    assert.equal(found.get("Baselines/a.csv")!.line, 1);
  });

  test("a README.md in another folder describes nothing here, and one that cannot be read says so beside its folder", async () => {
    const list = async (path: string): Promise<ListAnswer> => {
      const tree: Record<string, Entry[]> = {
        Baselines: [{ name: "README.md", dir: false, size: 10 }, { name: "run", dir: true, size: 0 }],
        "Baselines/run": [{ name: "a.csv", dir: false, size: 3 }, { name: "README.md", dir: false, size: 5 }],
      };
      return tree[path] === undefined ? { ok: false, status: 404 } : { ok: true, entries: tree[path]!, truncated: false };
    };
    const walks = await Promise.all(GROUPS.map((g) => walk(g.folder, list)));
    const readmes = new Map<string, DocRead>([
      // The top README describes run/a.csv by a link into the subfolder: not its own folder's file.
      ["Baselines/README.md", read("- [a](run/a.csv): from the folder above")],
      ["Baselines/run/README.md", { ok: false, status: 503 }],
    ]);
    const model = buildModel({ walks, skeleton: { ok: false, status: 404 }, readme: { ok: false, status: 404 }, readmes });
    const a = file(model, "Baselines/run/a.csv");
    assert.equal(a.description, null);
    assert.equal(a.readmeNote, "Baselines/run/README.md could not be read (too many files were being read at once; Reload to try again), so it describes no file here.");
    assert.ok(group(model, "baselines").notes.includes(a.readmeNote!), "and the group says so");
  });
});

describe("§4.2 the panel's heading, by extension", () => {
  test("Figure, Image, Table (CSV), Data (JSON), Note (Markdown), Text, or File", () => {
    const cases: [string, string, string][] = [
      ["figs", "a.svg", "Figure"],
      ["baselines", "a.png", "Image"],
      ["results", "a.csv", "Table (CSV)"],
      ["results", "a.JSON", "Data (JSON)"],
      ["baselines", "README.md", "Note (Markdown)"],
      ["results", "run.log", "Text"],
      ["results", "train.py", "Text"],
      ["results", "model.bin", "File"],
      ["results", "paper.pdf", "File"],
      ["results", "noext", "File"],
    ];
    for (const [g, name, heading] of cases) assert.equal(HEADING[kindOf(g as "figs", name)], heading, name);
  });
});

describe("§4.2 Used in: paper_skeleton.md and Code/README.md, by link, image, or a code span of the whole path", () => {
  const check = async (eol: (t: string) => string) => {
    const model = await nanochat(eol);
    const at = (path: string) => file(model, path).usedIn.map(placeText);
    const sk = (needle: string) => lineOf(SKELETON_LF, needle);
    const rd = (needle: string) => lineOf(README_LF, needle);
    // summary.json: a code span in the skeleton's Argument Map and Experiments, links in its claims and figures; links in the README.
    assert.deepEqual(at("Code/results/summary.json"), [
      `paper_skeleton.md:${sk("| Empirical support |")} · Empirical support`,
      `paper_skeleton.md:${sk("| Main result |")} · Main result`,
      `paper_skeleton.md:${sk("| C2: ")} · C2: base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456`,
      `paper_skeleton.md:${sk("| C3: ")} · C3: matrix LR ×2 ends 0.012 bpb lower`,
      `paper_skeleton.md:${sk("| C4: ")} · C4: vocab 2,048 ends 0.096 bpb higher`,
      `paper_skeleton.md:${sk("| Table 2 |")} · Table 2`,
      `Code/README.md:${rd("in [results/summary.json](results/summary.json),")}`,
      `Code/README.md:${rd("[results/summary.json](results/summary.json)):")}`,
    ]);
    assert.deepEqual(at("Code/results/training_metrics.csv"), [
      `paper_skeleton.md:${sk("Figure 1 is drawn at build time")} · Figures and tables`,
      `paper_skeleton.md:${sk("| Empirical support |")} · Empirical support`,
      `paper_skeleton.md:${sk("| Figure 1 |")} · Figure 1`,
      `Code/README.md:${rd("[results/training_metrics.csv](results/training_metrics.csv), both tracked.")}`,
    ]);
    // An image from Code/README.md: ../Figs/x.svg resolves to the figure.
    assert.deepEqual(at("Figs/baseline_training_curves.svg"), [`Code/README.md:${rd("![Baseline training curves]")}`]);
    assert.deepEqual(at("Figs/probe_comparison.svg"), [`Code/README.md:${rd("![Probe comparison]")}`]);
    // A folder link (Baselines/openresearch-demo/) names no file in it.
    assert.deepEqual(at("Baselines/openresearch-demo/README.md"), []);
    assert.deepEqual(usedInWords(file(model, "Baselines/Baseline_readme.md"), model.usedInNotes), { places: [], more: 0, none: "Not named in paper_skeleton.md or Code/README.md", notes: [] });
  };
  test("on nanochat_cpu's frozen files", () => check((t) => t));
  test("the same on CRLF copies", () => check(crlf));

  test("a link broken across a paragraph's lines names its lines; a code span must be the whole path; code blocks are not read", () => {
    const md = ["Before", "the [training", "curves](../Figs/a.svg) here.", "","`Figs/a.svg` and `see Figs/a.svg` and `Figs/a.svg `", "", "```", "[x](../Figs/a.svg)", "```", "- item [a](../Figs/a.svg)", "  and [a](../Figs/a.svg) again"].join("\n");
    const index = usedInIndex([{ file: README, doc: parse(md) }]);
    assert.deepEqual(index.get("Figs/a.svg")!.map(placeText), ["Code/README.md:1–3", "Code/README.md:5", "Code/README.md:10", "Code/README.md:11"]);
  });

  test(`at most ${LIMITS.usedIn} places, then "and N more"; a file that could not be read is named instead of "Not named"`, () => {
    const md = Array.from({ length: 14 }, (_, k) => `- line ${k} [x](../Figs/a.svg)`).join("\n");
    const index = usedInIndex([{ file: README, doc: parse(md) }]);
    const item = { usedIn: index.get("Figs/a.svg")! } as FileItem;
    const words = usedInWords(item, []);
    assert.equal(words.places.length, LIMITS.usedIn);
    assert.equal(words.more, 4);
    const none = usedInWords({ usedIn: [] } as unknown as FileItem, ["paper_skeleton.md could not be read (it is not there, or it is a link the Assets view may not follow), so places in it are not listed."]);
    assert.equal(none.none, null, "not \"Not named\": one file was not read");
    assert.match(none.notes[0]!, /^paper_skeleton\.md could not be read/);
  });

  test("the model says which file could not be read for Used in", async () => {
    const model = await modelOf(PROJECT, { ok: false, problem: "too-large" }, read(README_LF));
    assert.deepEqual(model.usedInNotes, ["paper_skeleton.md could not be read (it is larger than 1 MiB, the most the Assets view reads of it), so places in it are not listed."]);
    assert.deepEqual(file(model, "Figs/probe_comparison.svg").usedIn.map(placeText), [`Code/README.md:${lineOf(README_LF, "![Probe comparison]")}`]);
  });
});

describe("§4.2 datasets: the first table of Code/README.md's Data section", () => {
  const check = (eol: (t: string) => string) => {
    const view = datasets(parse(eol(README_LF)));
    assert.equal(view.state, "table");
    if (view.state !== "table") return;
    const first = lineOf(README_LF, "| Pretraining text |");
    assert.equal(first, 208, "the frozen copy's line, which the design names");
    assert.deepEqual(
      view.rows.map((d) => [d.line, d.name, d.selection.label]),
      [
        [first, "karpathy/climbmix-400b-shuffle", "Code/README.md:208 · dataset karpathy/climbmix-400b-shuffle"],
        [first + 1, "HuggingFaceTB/smol-smoltalk", `Code/README.md:${first + 1} · dataset HuggingFaceTB/smol-smoltalk`],
        [first + 2, "cais/mmlu", `Code/README.md:${first + 2} · dataset cais/mmlu`],
        [first + 3, "openai/gsm8k", `Code/README.md:${first + 3} · dataset openai/gsm8k`],
      ],
    );
    // A row shows the other cells as "<header>: <text>"; a cell that is more than the name stays.
    assert.deepEqual(view.rows.map((d) => d.meta), [
      "Data: Pretraining text · Used: shard_00000 (train), shard_06542 (val)",
      "Data: SFT conversations · Used: 3,600 of 460K train rows, 190 of 24K test rows",
      "Data: SFT multiple choice · Source: cais/mmlu all · Used: 781 of 99,842 auxiliary_train rows (×3 in the mixture), 110 test rows",
      "Data: SFT math · Source: openai/gsm8k main · Used: 59 of 7,473 train rows (×4), 11 test rows",
    ]);
    // The panel: every header with its cell as written.
    assert.deepEqual(view.rows[0]!.cells.map((c) => c.header), ["Data", "Source", "Used"]);
    assert.equal(view.rows[0]!.cells[1]!.text, "[karpathy/climbmix-400b-shuffle](https://huggingface.co/datasets/karpathy/climbmix-400b-shuffle)");
    assert.deepEqual(view.notes, []);
  };
  test("four rows in nanochat_cpu's frozen Code/README.md", () => check((t) => t));
  test("the same on a CRLF copy", () => check(crlf));

  test("the template: a Data section with no table, its bullet as the note", () => {
    for (const eol of [(t: string) => t, crlf]) {
      const view = datasets(parse(eol(TEMPLATE_README_LF)));
      assert.equal(view.state, "no-table");
      if (view.state !== "no-table") continue;
      assert.deepEqual(
        view.note.map((b) => [b.kind, b.first]),
        [["list", lineOf(TEMPLATE_README_LF, "- Datasets live in")]],
      );
    }
  });

  test("no Data section; Code/README.md missing or unreadable; a dataset table's own notes", async () => {
    assert.equal(datasets(parse("# Code\n\n## Run\n\n- x\n")).state, "no-section");
    const noReadme = await modelOf(PROJECT, read(SKELETON_LF), { ok: false, status: 404 });
    assert.deepEqual(group(noReadme, "datasets").datasets, { view: null, message: "No Code/README.md" });
    const binary = await modelOf(PROJECT, read(SKELETON_LF), { ok: false, problem: "binary" });
    assert.deepEqual(group(binary, "datasets").datasets, { view: null, message: "Code/README.md could not be read: it holds binary data" });
    const noSection = await modelOf(PROJECT, read(SKELETON_LF), read("# Code\n"));
    assert.equal(group(noSection, "datasets").datasets!.message, "Code/README.md has no Data section");
    const noTable = await modelOf(TEMPLATE, read(TEMPLATE_SKELETON_LF), read(TEMPLATE_README_LF));
    assert.equal(group(noTable, "datasets").datasets!.message, "No dataset table in Code/README.md's Data section");
    const view = datasets(parse("## Data\n\nBefore.\n\n| Name | Note |\n|---|---|\n| a | x | extra |\n| b |\n\nAfter the table.\n"));
    assert.equal(view.state, "table");
    if (view.state === "table") {
      assert.deepEqual(view.notes, [
        "Lines 7 and 8 of Code/README.md have another number of cells than the header; padded or cut to it.",
        "The Data section goes on after the table (Code/README.md:10); that text is not shown here.",
      ]);
      assert.deepEqual(view.rows.map((d) => [d.name, d.meta]), [["a", "Note: x"], ["b", ""]]);
    }
  });
});

describe("previews (§4.2): CSV, JSON, Markdown, other text, PDF, and the size line", () => {
  test("CSV: the header and the first 20 of N rows of the frozen training_metrics.csv, LF or CRLF", () => {
    const csv = text(join(PROJECT, "Code/results/training_metrics.csv"));
    for (const t of [csv, crlf(csv)]) {
      const p = csvPreview(t, false);
      assert.deepEqual(p.header, ["run", "phase", "step", "train_loss", "val_bpb", "tok_per_sec", "dt_ms"]);
      assert.equal(p.rows.length, LIMITS.csvRows);
      assert.deepEqual(p.rows[0], csv.split("\n")[1]!.split(","));
      assert.equal(p.total, csv.split("\n").filter((l) => l !== "").length - 1);
      assert.equal(p.words, `First 20 of ${p.total!.toLocaleString("en-US")} rows`);
      assert.deepEqual(p.notes, []);
    }
    assert.equal(csvPreview(csv, false).total, 943);
  });

  test("CSV: quoted fields with commas, doubled quotes and line breaks, CRLF inside and between rows, a lone CR is a character", () => {
    const t = 'a,b,c\r\n"x, y","say ""hi""","two\nlines"\n1,"cr\rhere",3\n"x\r\ny",z,\n';
    const p = csvPreview(t, false);
    assert.deepEqual(p.header, ["a", "b", "c"]);
    assert.deepEqual(p.rows, [
      ["x, y", 'say "hi"', "two\nlines"],
      ["1", "cr\rhere", "3"],
      ["x\r\ny", "z", ""],
    ]);
    assert.equal(p.words, "All 3 rows");
    // A quote not at a field's start is a character; text after a closing quote is kept.
    assert.deepEqual(csvPreview('h\nab"c,"d"e\n', false).rows, [['ab"c', "de"]]);
  });

  test("CSV: uneven rows padded and named, more than 30 columns, cells cut at 200, no final line break, an empty file", () => {
    const wide = Array.from({ length: 35 }, (_, k) => `c${k}`).join(",");
    const p = csvPreview(`${wide}\n1,2\n${"y".repeat(500)}\n1,2,3`, false);
    assert.equal(p.width, LIMITS.csvColumns);
    assert.equal(p.header.length, 30);
    assert.deepEqual(p.rows[0]!.slice(0, 3), ["1", "2", ""]);
    assert.equal(p.rows[1]![0], `${"y".repeat(200)} …[cut]`);
    assert.equal(p.total, 3, "the last row needs no line break");
    assert.deepEqual(p.notes, [
      "Rows have up to 35 cells; the first 30 columns are shown.",
      "Cells longer than 200 characters are cut.",
      "3 rows (1, 2, and 3) have another number of cells than the first; shown padded.",
    ]);
    assert.equal(csvPreview("", false).words, "The file holds no row");
    assert.equal(csvPreview("only,a,header\n", false).words, "No row after the first");
  });

  test("CSV: a file cut at the read cap gives no count; an open quote is named", () => {
    const rows = Array.from({ length: 30 }, (_, k) => `${k},x`).join("\n");
    const cut = csvPreview(`h,v\n${rows}`, true);
    assert.equal(cut.total, null);
    assert.equal(cut.words, "First 20 rows of a file over 2 MiB");
    const open = csvPreview('h\na\n"never closed\nb\nc\n', false);
    assert.deepEqual(open.notes, ['A quoted field opened in row 2 is never closed; the rest of the file is read as its text.']);
    assert.equal(open.total, 2);
    assert.equal(previewCap("csv"), LIMITS.csvBytes + 1);
    assert.equal(previewCap("json"), LIMITS.previewBytes + 1);
  });

  test("CSV: hostile input of 100,000 characters costs one pass", (t) => {
    const cases: [string, string][] = [
      ["one field of 100,000 characters", "x".repeat(100_000)],
      ["100,000 commas", ",".repeat(100_000)],
      ["100,000 quotes", '"'.repeat(100_000)],
      ["doubled quotes in one field", `"${'""'.repeat(50_000)}"`],
      ["100,000 line breaks", "\n".repeat(100_000)],
      ["50,000 CRLF", "\r\n".repeat(50_000)],
      ["a quote opening every line", '"\n'.repeat(50_000)],
      ["100,000 lone CRs", "\r".repeat(100_000)],
    ];
    for (const [name, input] of cases) {
      const start = performance.now();
      const p = csvPreview(input, false);
      const ms = performance.now() - start;
      assert.ok(ms < 100, `${name}: ${ms.toFixed(1)} ms`);
      assert.ok(p.rows.length <= LIMITS.csvRows && p.header.length <= LIMITS.csvColumns, name);
      for (const row of [p.header, ...p.rows]) for (const cell of row) assert.ok(cell.length <= LIMITS.csvCell + " …[cut]".length, name);
      t.diagnostic(`csvPreview, ${name}: ${ms.toFixed(1)} ms`);
    }
    // 2 MiB, the whole read cap, of short rows.
    const big = "a,b,c\n".repeat(Math.floor((2 * 1024 * 1024) / 6));
    const start = performance.now();
    assert.equal(csvPreview(big, false).total, Math.floor((2 * 1024 * 1024) / 6) - 1);
    assert.ok(performance.now() - start < 500);
  });

  test("JSON and other text: the first 40 lines, each cut at 2,000; First 40 of N lines; LF, CRLF, and a lone CR", () => {
    const json = text(join(PROJECT, "Code/results/summary.json"));
    for (const t of [json, crlf(json)]) {
      const p = linesPreview(t, false);
      assert.equal(p.lines.length, LIMITS.previewLines);
      assert.deepEqual(p.lines, json.split("\n").slice(0, 40));
      assert.equal(p.words, `First 40 of ${json.split("\n").length - 1} lines`);
    }
    assert.equal(linesPreview(json, false).total, 217);
    assert.deepEqual(linesPreview("a\rb\nc", false), { lines: ["a\rb", "c"], total: 2, words: "2 lines" });
    assert.equal(linesPreview(`${"z".repeat(2500)}\n`, false).lines[0], `${"z".repeat(2000)} …[cut]`);
    assert.equal(linesPreview("x\n".repeat(50), true).words, "First 40 lines of a file over 256 KiB");
    assert.equal(linesPreview("", false).words, "The file is empty");
  });

  test("Markdown: md-kit's first 200 blocks, and what is left out", () => {
    const md = Array.from({ length: 205 }, (_, k) => `Paragraph ${k}.`).join("\n\n");
    const p = markdownPreview(parse(md), true);
    assert.equal(p.blocks.length, LIMITS.mdBlocks);
    assert.deepEqual(p.notes, ["The first 200 of 205 blocks are shown.", "Only the first 256 KiB of the file are read."]);
    const demo = markdownPreview(parse(DEMO_README_LF), false);
    assert.deepEqual(demo.blocks.map((b) => b.kind), ["heading", "paragraph", "list", "paragraph", "paragraph"]);
    assert.deepEqual(demo.notes, []);
  });

  test("PDF, binary, other encodings: no preview, in words", () => {
    assert.deepEqual(noPreviewWords("pdf", "paper.pdf"), { title: "No preview", text: "PDF files are not previewed here.", retry: false });
    assert.equal(noPreviewWords("binary", "model.bin").text, "model.bin holds binary data.");
  });

  test("the Size line: the listing's size, then rows or lines once the preview counted them", () => {
    assert.equal(sizeLine(40_250, null), "39.3 KB");
    assert.equal(sizeLine(40_250, { rows: 943 }), "39.3 KB · 943 rows");
    assert.equal(sizeLine(4_509, { lines: 217 }), "4.4 KB · 217 lines");
    assert.equal(sizeLine(10, { lines: 1 }), "10 bytes · 1 line");
  });
});

describe("labels: the project path, one visible line, unforgeable, within the host's 200 characters", () => {
  test("a file's label is its project path, and the host takes it exactly", async () => {
    const model = await nanochat();
    const labels = [...model.items.values()].map((i) => i.selection.label);
    assert.deepEqual(labels.slice(0, 3), ["Figs/baseline_training_curves.svg", "Figs/probe_comparison.svg", "Baselines/Baseline_readme.md"]);
    for (const label of labels) {
      const got = host(label);
      assert.ok(got?.kind === "select" && got.reference.label === label && got.reference.quote === undefined, label);
      assert.equal(got.reference.quotesAsDrawn, undefined, "the chip opens by itself (QUOTES_AS_DRAWN unchanged)");
    }
  });

  test("invisible characters, odd spaces, and line breaks in a name are markers; plain spaces stay", () => {
    assert.equal(fileLabel("Figs/a​b‮.svg"), "Figs/a⟨U+200B⟩b⟨U+202E⟩.svg");
    assert.equal(fileLabel("Figs/a b　c\td.png"), "Figs/a⟨U+00A0⟩b⟨U+3000⟩c⟨U+0009⟩d.png");
    assert.equal(fileLabel("Figs/two\nlines\r.png"), "Figs/two⟨U+000A⟩lines⟨U+000D⟩.png");
    assert.equal(fileLabel("Figs/a  b.png"), "Figs/a  b.png");
    for (const path of ["Figs/a​b‮.svg", "Figs/a b　c\td.png", "Figs/two\nlines\r.png", "Figs/⠀.png"]) assert.equal(host(fileLabel(path))?.kind, "select", path);
    // Without the markers the host refuses the label: it never rewrites one.
    assert.equal(host("Figs/a​b.svg"), null);
  });

  test("a name cannot make a label read as another form: a section, a claim, a dataset, a line, or a second path", () => {
    const forged: [string, string][] = [
      ["Figs/x · claim C1.png", "Figs/x ⟨U+00B7⟩ claim C1.png"],
      ["Figs/x · section “Results”.png", "Figs/x ⟨U+00B7⟩ section ⟨U+201C⟩Results⟨U+201D⟩.png"],
      ["Figs/a‧b・c⋅d.png", "Figs/a⟨U+2027⟩b⟨U+30FB⟩c⟨U+22C5⟩d.png"],
      ["Code/results/x.csv:12", "Code/results/x.csv⟨U+003A⟩12"],
      ["Figs/a∕Code⁄README.md", "Figs/a⟨U+2215⟩Code⟨U+2044⟩README.md"],
      ["Figs/a\\b.png", "Figs/a⟨U+005C⟩b.png"],
      ["Figs/a／b.png", "Figs/a⟨U+FF0F⟩b.png"],
    ];
    for (const [path, label] of forged) {
      assert.equal(fileLabel(path), label, path);
      assert.equal(host(label)?.kind, "select", path);
      assert.ok(!/ · |:\d/.test(label), label);
    }
    // Folder names too.
    assert.equal(fileLabel("Baselines/run · claim C1/a.csv"), "Baselines/run ⟨U+00B7⟩ claim C1/a.csv");
    assert.equal(nameInLabel("ok_name-1.csv"), "ok_name-1.csv");
    // A dataset's name: separators marked, blank runs one space, invisible characters marked; the line stays.
    assert.equal(datasetLabel(208, "x · claim C1"), "Code/README.md:208 · dataset x ⟨U+00B7⟩ claim C1");
    assert.equal(datasetLabel(9, "  a \t  b​ "), "Code/README.md:9 · dataset a b⟨U+200B⟩");
    assert.equal(datasetLabel(9, ""), "Code/README.md:9 · dataset");
    for (const label of [datasetLabel(208, "x · claim C1"), datasetLabel(9, "  a \t  b​ ")]) assert.equal(host(label)?.kind, "select", label);
  });

  test("a long label is cut to 200 characters ending in '…', never inside a marker or a surrogate pair", () => {
    const long = fileLabel(`Figs/${"a".repeat(300)}.png`);
    assert.equal(long.length, LABEL_MAX);
    assert.ok(long.startsWith("Figs/aaa") && long.endsWith("a…"), long);
    // A marker that would be split at the cut is left out whole.
    for (let pad = 180; pad < 200; pad++) {
      const label = fileLabel(`Figs/${"b".repeat(pad)}​${"c".repeat(50)}`);
      assert.ok(label.length <= LABEL_MAX);
      assert.ok(!/⟨[^⟩]*…$/.test(label), label.slice(-12));
      assert.equal(host(label)?.kind, "select");
    }
    for (let pad = 190; pad < 200; pad++) {
      const label = fileLabel(`Figs/${"d".repeat(pad)}😀😀😀😀`);
      assert.ok(!/[\uD800-\uDBFF]…$/.test(label), "no lone high surrogate before the mark");
      assert.equal(host(label)?.kind, "select");
    }
    const dataset = datasetLabel(123, "n".repeat(400));
    assert.equal(dataset.length, LABEL_MAX);
    assert.ok(dataset.startsWith("Code/README.md:123 · dataset nnn") && dataset.endsWith("n…"));
  });
});

describe("identity: by path and by README line, never by a name shown", () => {
  test("two files of one name in two folders, and two datasets of one name, are separate items with separate details", async () => {
    const list = async (path: string): Promise<ListAnswer> => {
      const tree: Record<string, Entry[]> = {
        Baselines: [{ name: "a", dir: true, size: 0 }, { name: "b", dir: true, size: 0 }],
        "Baselines/a": [{ name: "metrics.csv", dir: false, size: 11 }, { name: "README.md", dir: false, size: 1 }],
        "Baselines/b": [{ name: "metrics.csv", dir: false, size: 22 }, { name: "README.md", dir: false, size: 1 }],
      };
      return tree[path] === undefined ? { ok: false, status: 404 } : { ok: true, entries: tree[path]!, truncated: false };
    };
    const walks = await Promise.all(GROUPS.map((g) => walk(g.folder, list)));
    const readmes = new Map<string, DocRead>([
      ["Baselines/a/README.md", read("- [metrics.csv](metrics.csv): run A")],
      ["Baselines/b/README.md", read("- [metrics.csv](metrics.csv): run B")],
    ]);
    const readme = read("## Data\n\n| Name | Note |\n|---|---|\n| same | first |\n| same | second |\n|  | empty name |\n");
    const model = buildModel({ walks, skeleton: read("`Baselines/b/metrics.csv`\n"), readme, readmes });
    const a = file(model, "Baselines/a/metrics.csv");
    const b = file(model, "Baselines/b/metrics.csv");
    assert.notEqual(a.key, b.key);
    assert.deepEqual([a.size, a.description?.text, a.usedIn.length, a.selection.label], [11, "run A", 0, "Baselines/a/metrics.csv"]);
    assert.deepEqual([b.size, b.description?.text, b.usedIn.length, b.selection.label], [22, "run B", 1, "Baselines/b/metrics.csv"]);
    const view = group(model, "datasets").datasets!.view!;
    assert.equal(view.state, "table");
    const rows = view.state === "table" ? view.rows : [];
    assert.deepEqual(rows.map((d) => [d.key, d.name, d.meta]), [
      ["dataset:5", "same", "Note: first"],
      ["dataset:6", "same", "Note: second"],
      ["dataset:7", "", "Note: empty name"],
    ]);
    assert.equal((model.items.get("dataset:6") as Dataset).meta, "Note: second");
    assert.deepEqual(rows.map((d) => d.selection.label), ["Code/README.md:5 · dataset same", "Code/README.md:6 · dataset same", "Code/README.md:7 · dataset"]);
    // An empty group adds no item.
    assert.equal(group(model, "figs").cards.length + group(model, "figs").rows.length, 0);
    // Four files (two of them README.md) and three datasets.
    assert.equal(model.items.size, 7);
  });
});

describe("nothing read is left out without a word: unread files and md-kit's caps", () => {
  test("Used in lists the places it found and also says which file it could not read", async () => {
    const model = await modelOf(PROJECT, { ok: false, status: 503 }, read(README_LF));
    const words = usedInWords(file(model, "Figs/probe_comparison.svg"), model.usedInNotes);
    assert.deepEqual(words.places, [`Code/README.md:${lineOf(README_LF, "![Probe comparison]")}`]);
    assert.equal(words.none, null);
    assert.deepEqual(words.notes, ["paper_skeleton.md could not be read (too many files were being read at once; Reload to try again), so places in it are not listed."]);
    // Both read: no note.
    assert.deepEqual(usedInWords(file(await nanochat(), "Figs/probe_comparison.svg"), (await nanochat()).usedInNotes).notes, []);
  });

  test("a file past md-kit's 20,000 lines: Used in, the datasets, and a folder's README.md say what was not read", async () => {
    const long = (last: string) => `${"x\n".repeat(20_000)}${last}\n`;
    const skeletonLong = read(long("[a](Figs/probe_comparison.svg)"));
    const readmeLong = read(`${README_LF}${long("## Data")}`);
    const model = await modelOf(PROJECT, skeletonLong, readmeLong);
    assert.deepEqual(model.usedInNotes, [
      "paper_skeleton.md: the view does not read lines past 20,000, so places there are not listed.",
      "Code/README.md: the view does not read lines past 20,000, so places there are not listed.",
    ]);
    assert.ok(group(model, "datasets").notes.includes("Code/README.md: the view does not read lines past 20,000, so datasets listed there are not shown."));
    // A folder's README.md: said beside its group, and on its files without a description.
    const list = async (path: string): Promise<ListAnswer> =>
      path === "Baselines" ? { ok: true, entries: [{ name: "README.md", dir: false, size: 1 }, { name: "a.csv", dir: false, size: 1 }], truncated: false } : { ok: false, status: 404 };
    const walks = await Promise.all(GROUPS.map((g) => walk(g.folder, list)));
    const cut = buildModel({ walks, skeleton: read("# s\n"), readme: read("# r\n"), readmes: new Map([["Baselines/README.md", read(long("- [a](a.csv): too far"))]]) });
    const note = "Baselines/README.md: the view does not read lines past 20,000, so they describe no file here.";
    assert.ok(group(cut, "baselines").notes.includes(note), group(cut, "baselines").notes.join("\n"));
    assert.equal(file(cut, "Baselines/a.csv").readmeNote, note);
  });

  test("a table past md-kit's 500 rows or 30 columns: Used in and descriptions say the rest is not read; a Markdown preview says so", async () => {
    const rows = (count: number, columns = 2) => [`| ${Array.from({ length: columns }, (_, k) => `h${k}`).join(" | ")} |`, `|${"---|".repeat(columns)}`, ...Array.from({ length: count }, (_, k) => `| r${k} |${" x |".repeat(columns - 1)}`)].join("\n");
    const model = await modelOf(PROJECT, read(`# s\n\n${rows(501)}\n`), read(`# r\n\n${rows(3, 31)}\n`));
    assert.deepEqual(model.usedInNotes, [
      "paper_skeleton.md: the view does not read rows past 500 of the table at line 3, so places there are not listed.",
      "Code/README.md: the view does not read columns past 30 of the table at line 3, so places there are not listed.",
    ]);
    assert.deepEqual((await modelOf(PROJECT, read(`# s\n\n${rows(500)}\n`), read(`# r\n\n${rows(3, 30)}\n`))).usedInNotes, [], "at the caps, nothing is left out");
    assert.deepEqual(markdownPreview(parse(`${rows(501)}\n\n${rows(2, 31)}\n`), false).notes, [
      "The table at line 1 has 1 more row; the first 500 are shown.",
      "The table at line 505 has more than 30 columns; the first 30 are shown.",
    ]);
    assert.deepEqual(markdownPreview(parse(`${rows(500)}\n\n${rows(2, 30)}\n`), false).notes, []);
  });
});

describe("each limit at its boundary", () => {
  const csvRows = (count: number) => `h\n${Array.from({ length: count }, (_, k) => String(k)).join("\n")}\n`;
  test("CSV rows: 20 are all shown, 21 are the first 20 of 21", () => {
    for (const eol of [(t: string) => t, crlf]) {
      assert.deepEqual([csvPreview(eol(csvRows(20)), false).words, csvPreview(eol(csvRows(20)), false).rows.length], ["All 20 rows", 20]);
      assert.deepEqual([csvPreview(eol(csvRows(21)), false).words, csvPreview(eol(csvRows(21)), false).rows.length], ["First 20 of 21 rows", 20]);
    }
  });
  test("CSV columns: 30 are shown without a note, 31 are cut to 30 with one", () => {
    const wide = (count: number) => `${Array.from({ length: count }, (_, k) => `c${k}`).join(",")}\n${Array.from({ length: count }, () => "1").join(",")}\n`;
    assert.deepEqual([csvPreview(wide(30), false).width, csvPreview(wide(30), false).notes], [30, []]);
    assert.deepEqual([csvPreview(wide(31), false).width, csvPreview(wide(31), false).notes], [30, ["Rows have up to 31 cells; the first 30 columns are shown."]]);
  });
  test("CSV cells: 200 characters stay whole, 201 are cut to 200 and marked", () => {
    const at = (count: number) => csvPreview(`h\n${"c".repeat(count)}\n`, false);
    assert.deepEqual([at(200).rows[0]![0], at(200).notes], ["c".repeat(200), []]);
    assert.deepEqual([at(201).rows[0]![0], at(201).notes], [`${"c".repeat(200)} …[cut]`, ["Cells longer than 200 characters are cut."]]);
    // A quoted cell is measured as its text, without its quotes.
    assert.equal(csvPreview(`h\n"${"q".repeat(200)}"\n`, false).rows[0]![0], "q".repeat(200));
  });
  test("lines of a text preview: 40 are all shown, 41 are the first 40 of 41; a line of 2,000 characters stays whole, 2,001 is cut", () => {
    const lines = (count: number) => `${Array.from({ length: count }, (_, k) => `l${k}`).join("\n")}\n`;
    assert.deepEqual([linesPreview(lines(40), false).words, linesPreview(lines(40), false).lines.length], ["40 lines", 40]);
    assert.deepEqual([linesPreview(lines(41), false).words, linesPreview(lines(41), false).lines.length], ["First 40 of 41 lines", 40]);
    assert.deepEqual([linesPreview(crlf(lines(41)), false).words, linesPreview(crlf(lines(41)), false).lines], [linesPreview(lines(41), false).words, linesPreview(lines(41), false).lines]);
    assert.equal(linesPreview("z".repeat(2000), false).lines[0], "z".repeat(2000));
    assert.equal(linesPreview("z".repeat(2001), false).lines[0], `${"z".repeat(2000)} …[cut]`);
  });
  test("Used in: 10 places are all listed, 11 are 10 and 1 more", () => {
    const places = (count: number) => usedInIndex([{ file: README, doc: parse(Array.from({ length: count }, (_, k) => `- ${k} [x](../Figs/a.svg)`).join("\n")) }]).get("Figs/a.svg")!;
    assert.deepEqual(
      [10, 11].map((count) => {
        const w = usedInWords({ usedIn: places(count) } as unknown as FileItem, []);
        return [w.places.length, w.more];
      }),
      [
        [10, 0],
        [10, 1],
      ],
    );
  });
  test("descriptions: 300 characters stay whole, 301 are cut to 300 and marked", () => {
    const at = (count: number) => descriptions(parse(`- [a.csv](a.csv): ${"d".repeat(count)}`), "Baselines/README.md").get("Baselines/a.csv")!.text;
    assert.equal(at(300), "d".repeat(300));
    assert.equal(at(301), `${"d".repeat(300)} …[cut]`);
  });
  test("figures: 200 are all drawn without a note, the 201st asks for Show", async () => {
    const figs = (count: number) => async (path: string): Promise<ListAnswer> =>
      path === "Figs" ? { ok: true, entries: Array.from({ length: count }, (_, k) => ({ name: `f${String(k).padStart(3, "0")}.png`, dir: false, size: 1 })), truncated: false } : { ok: false, status: 404 };
    const notesFor = async (count: number) => {
      const walks = await Promise.all(GROUPS.map((g) => walk(g.folder, figs(count))));
      return group(buildModel({ walks, skeleton: read("# s\n"), readme: read("# r\n"), readmes: new Map() }), "figs").notes;
    };
    assert.deepEqual(await notesFor(LIMITS.thumbs), []);
    assert.deepEqual(await notesFor(LIMITS.thumbs + 1), ["Pictures are drawn for the first 200 of 201 figures; click Show on a card past them to draw it."]);
  });
  test("Markdown preview: 200 blocks are all shown, 201 are the first 200 of 201", () => {
    const blocks = (count: number) => Array.from({ length: count }, (_, k) => `P${k}.`).join("\n\n");
    assert.deepEqual(markdownPreview(parse(blocks(200)), false), { blocks: parse(blocks(200)).blocks, notes: [] });
    assert.deepEqual(markdownPreview(parse(blocks(201)), false).notes, ["The first 200 of 201 blocks are shown."]);
  });
});

describe("reading the files the rules need, and every state's words", () => {
  test("docFrom: 1 MiB is read, one byte more is too large; binary and other encodings are said", () => {
    const at = (bytes: Uint8Array, cut: boolean) => docFrom(bytes, cut, parse);
    assert.equal(at(new TextEncoder().encode("# x\n"), false).ok, true);
    assert.deepEqual(at(new Uint8Array(LIMITS.docBytes + 1), true), { ok: false, problem: "too-large" });
    assert.deepEqual(at(new Uint8Array([0x61, 0, 0x62]), false), { ok: false, problem: "binary" });
    assert.deepEqual(at(new Uint8Array([0xff, 0xfe, 0x41]), false), { ok: false, problem: "encoding" });
    assert.equal(at(new Uint8Array(LIMITS.docBytes).fill(0x61), false).ok, true);
    assert.equal(readProblem({ ok: false, problem: "encoding" }), "it is text in an encoding other than UTF-8");
    assert.equal(readProblem({ ok: false, status: 404 }), "it is not there, or it is a link the Assets view may not follow");
  });

  test("a preview's and an image's words, by status", () => {
    assert.deepEqual(previewWords(413, "huge.csv"), { title: "Too large to show", text: "huge.csv is larger than 32 MiB, the most the app reads.", retry: false });
    assert.equal(previewWords(503, "a").retry, true);
    assert.equal(previewWords(0, "a").title, "The Assets view could not reach the app");
    assert.equal(previewWords(404, "a").title, "This file cannot be opened");
    assert.equal(imageWords(200, "a.png").text, "a.png is not an image the view can draw (it may be damaged).");
    assert.equal(imageWords("timeout", "a.png").text, "a.png took too long to load.");
    assert.equal(imageWords(503, "a.png").title, "Too many files are being read at once");
  });

  test("a page with no project, or a bad one", () => {
    assert.equal(projectWords("").title, "No project given");
    assert.equal(projectWords("?project=..%2Fx").title, "Not a project name");
    assert.equal(workspacePath("nanochat_cpu", "Figs/a.svg"), "projects-folder/nanochat_cpu/Figs/a.svg");
    assert.equal(SKELETON, "paper_skeleton.md");
  });
});
