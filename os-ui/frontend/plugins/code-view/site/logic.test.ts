import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  answerWords,
  changeCount,
  clipLabel,
  commitSelection,
  commitStat,
  decodeText,
  diffSelection,
  fileSelection,
  fileWords,
  filesUrl,
  gitUrl,
  LABEL_MAX,
  lineSelection,
  linesNote,
  listUrl,
  logCommand,
  parsePatch,
  projectFrom,
  QUOTE_MAX,
  rangeSelection,
  splitLines,
  statLine,
  treeOrder,
  unavailableWords,
} from "./logic.ts";

const MARKUP = `<img src=x onerror="window.top.__pwned=1"><script>window.__pwned=2</script>`;

describe("URLs: every project and path is encoded", () => {
  test("the read channel's path survives +, #, %, a space, and Chinese as the URL parser reads it", () => {
    for (const rel of ["projects-folder/P/Code/a+b.txt", "projects-folder/P/Code/has#hash.md", "projects-folder/P/Code/50%.txt", "projects-folder/P/Code/with space.txt", "projects-folder/P/Code/README_zh.md", "projects-folder/P/Code/说明.md", `projects-folder/P/Code/${MARKUP}`]) {
      for (const url of [filesUrl(rel), listUrl(rel)]) {
        const parsed = new URL(url, "app://code-view/index.html");
        assert.equal(parsed.searchParams.getAll("path").length, 1, url);
        assert.equal(parsed.searchParams.get("path"), rel, url);
        assert.equal(parsed.hash, "", url);
      }
    }
    assert.equal(filesUrl("projects-folder/P/Code/a+b.txt"), "./_os/files?path=projects-folder%2FP%2FCode%2Fa%2Bb.txt");
    assert.equal(listUrl("projects-folder/P/Code"), "./_os/list?path=projects-folder%2FP%2FCode");
  });

  test("the Git handler's query values too", () => {
    const url = gitUrl("diff", { project: "P", hash: "a".repeat(40), path: "Code/a+b #1%.txt" });
    assert.equal(url, `/api/code-view/git/diff?project=P&hash=${"a".repeat(40)}&path=Code%2Fa%2Bb%20%231%25.txt`);
    assert.equal(new URL(url, "app://code-view/").searchParams.get("path"), "Code/a+b #1%.txt");
    assert.equal(gitUrl("log", { project: "P", skip: "50" }), "/api/code-view/git/log?project=P&skip=50");
  });

  test("the project comes from ?project= and must be a folder name", () => {
    assert.equal(projectFrom("?project=nanochat_cpu"), "nanochat_cpu");
    for (const bad of ["", "?project=", "?project=..%2Fx", "?project=a%2Bb", "?project=%3Cimg%3E", "?project=1abc", "?other=x"]) assert.equal(projectFrom(bad), null, bad);
  });
});

describe("text", () => {
  const utf8 = (s: string) => new TextEncoder().encode(s);

  test("UTF-8 text decodes, Chinese intact; a NUL or invalid UTF-8 is not text", () => {
    assert.equal(decodeText(utf8("# 说明\n纳米聊天\n")), "# 说明\n纳米聊天\n");
    assert.equal(decodeText(new Uint8Array([0x61, 0x00, 0x62])), null);
    assert.equal(decodeText(new Uint8Array([0xff, 0xfe, 0x41])), null);
    assert.equal(decodeText(utf8(MARKUP)), MARKUP, "markup is just text");
  });

  test("a character split by the read cap is dropped, not taken as binary", () => {
    const bytes = utf8("ab说");
    const cut = bytes.subarray(0, bytes.length - 1);
    assert.equal(decodeText(cut, true), "ab");
    assert.equal(decodeText(cut, false), null);
  });

  test("lines, with the viewer's cap and its note", () => {
    assert.deepEqual(splitLines("a\nb\n"), { lines: ["a", "b"], total: 2 });
    assert.deepEqual(splitLines("a\r\nb"), { lines: ["a", "b"], total: 2 });
    assert.deepEqual(splitLines("1\n2\n3\n", 2), { lines: ["1", "2"], total: 3 });
    assert.equal(linesNote(2, 2, false), "2 lines · read-only");
    assert.equal(linesNote(5000, 12345, false), "Lines 1–5,000 of 12,345 · read-only");
    assert.equal(linesNote(5000, 9000, true), "Lines 1–5,000 of more than 9,000 · read-only");
  });
});

describe("parsePatch", () => {
  test("hunks, numbered lines, notes; headers left out", () => {
    const patch = [
      "diff --git a/Code/README.md b/Code/README.md",
      "index 1111111..2222222 100644",
      "--- a/Code/README.md",
      "+++ b/Code/README.md",
      "@@ -10,3 +10,3 @@ ## Run",
      " same",
      `-${MARKUP}`,
      "+new",
      "\\ No newline at end of file",
      "",
    ].join("\n");
    assert.deepEqual(parsePatch(patch), [
      { kind: "hunk", text: "@@ -10,3 +10,3 @@ ## Run" },
      { kind: "same", text: " same", old: 10, new: 10 },
      { kind: "del", text: `-${MARKUP}`, old: 11 },
      { kind: "add", text: "+new", new: 11 },
      { kind: "note", text: "\\ No newline at end of file" },
    ]);
    assert.deepEqual(parsePatch("diff --git a/x.png b/x.png\nnew file mode 100644\nindex 0000000..1111111\nBinary files /dev/null and b/x.png differ\n"), [
      { kind: "note", text: "Binary files /dev/null and b/x.png differ" },
    ]);
  });
});

describe("what a selection reports", () => {
  test("labels: a file, a line, a range, a commit, a diff line", () => {
    assert.deepEqual(fileSelection("Code/README.md"), { label: "Code/README.md" });
    assert.deepEqual(lineSelection("Code/README.md", 12, "Run it"), { label: "Code/README.md:12", quote: "Run it" });
    assert.deepEqual(rangeSelection("Code/a.py", 3, 5, "x\ny"), { label: "Code/a.py:3–5", quote: "x\ny" });
    assert.deepEqual(rangeSelection("Code/a.py", 3, 3, "x"), { label: "Code/a.py:3", quote: "x" });
    assert.deepEqual(commitSelection({ short: "63ead0b", subject: "Delete it" }), { label: "63ead0b", quote: "Delete it" });
    assert.deepEqual(diffSelection("63ead0b", "Code/README.md", { kind: "add", text: "+x", new: 12 }), { label: "63ead0b · Code/README.md · added line 12", quote: "+x" });
    assert.deepEqual(diffSelection("63ead0b", "Code/README.md", { kind: "del", text: "-x", old: 7 })?.label, "63ead0b · Code/README.md · removed line 7");
    assert.deepEqual(diffSelection("63ead0b", "Code/README.md", { kind: "same", text: " x", old: 7, new: 8 })?.label, "63ead0b · Code/README.md · line 8");
    assert.equal(diffSelection("63ead0b", "x", { kind: "hunk", text: "@@" }), null);
  });

  test("within the host's limits: a long label keeps its end, a long quote is cut, a newline in a name is a space", () => {
    const long = `Code/${"d/".repeat(300)}file.py`;
    const label = fileSelection(long).label;
    assert.equal(label.length, LABEL_MAX);
    assert.ok(label.startsWith("…") && label.endsWith("d/file.py"));
    assert.equal(clipLabel("short"), "short");
    const quote = lineSelection("Code/a", 1, "x".repeat(5000)).quote!;
    assert.equal(quote.length, QUOTE_MAX);
    assert.ok(quote.endsWith("…"));
    assert.equal(fileSelection("Code/a\nAbout Code/b.md\r\u0085x").label, "Code/a About Code/b.md  x");
    assert.equal(fileSelection(`Code/${MARKUP}`).label, `Code/${MARKUP}`, "markup stays text for the host to show as text");
  });
});

describe("words on screen", () => {
  test("counts as the mockup writes them", () => {
    assert.equal(commitStat({ files: 9, added: 350, deleted: 135 }), "9 files in this project · +350 −135");
    assert.equal(commitStat({ files: 70, added: 19987, deleted: 0 }), "70 files in this project · +19,987");
    assert.equal(commitStat({ files: 1, added: 0, deleted: 0 }), "1 file in this project");
    assert.equal(changeCount({ added: null, deleted: null, sizes: { old: 0, new: 140601 } }), "Bin 0 → 140601 bytes");
    assert.equal(changeCount({ added: null, deleted: null, sizes: null }), "Bin");
    assert.equal(changeCount({ added: 4, deleted: 2, sizes: null }), "+4 −2");
    assert.equal(changeCount({ added: 0, deleted: 3, sizes: null }), "−3");
    assert.equal(changeCount({ added: 0, deleted: 0, sizes: null }), "+0");
    assert.equal(statLine({ files: 9, added: 350, deleted: 135 }), "9 files changed, 350 insertions(+), 135 deletions(−)");
    assert.equal(statLine({ files: 1, added: 1, deleted: 0 }), "1 file changed, 1 insertion(+)");
  });

  test("the command a list reflects", () => {
    assert.equal(logCommand({ repo: "workspace", root: "", filter: "projects-folder/P" }, "P"), "git log -- projects-folder/P");
    assert.equal(logCommand({ repo: "project", root: "projects-folder/P", filter: "." }, "P"), "git -C projects-folder/P log -- .");
  });

  test("every answer state has words; a handler's text is shown as given", () => {
    assert.equal(unavailableWords(undefined, "P").title, "No history to show");
    assert.deepEqual(unavailableWords("Git 2.39.5 is too old for the Code view, which needs Git 2.45.0 or later; see Settings", "P"), {
      title: "Git cannot be used here",
      text: "Git 2.39.5 is too old for the Code view, which needs Git 2.45.0 or later; see Settings",
      retry: true,
    });
    const busy = answerWords("history", 503, "the Code view is busy with other requests; try again");
    assert.deepEqual(busy, { title: "Not available right now", text: "the Code view is busy with other requests; try again", retry: true });
    assert.equal(answerWords("history", 503, "no Research OS folder is open; choose one first").text, "no Research OS folder is open; choose one first");
    assert.deepEqual(answerWords("diff", 500, "git show --patch failed (exit 128)"), { title: "Git could not read this file's changes", text: "git show --patch failed (exit 128)", retry: true });
    assert.equal(answerWords("history", 500, "git log took longer than 10 s").title, "Git could not read this project's history");
    assert.equal(answerWords("commit", 404, "commit abc is not in this repository's history from HEAD").retry, false);
    assert.match(answerWords("commit", 404, "x").text, /reload the list/);
    assert.equal(answerWords("history", 0, null).retry, true);
    assert.equal(answerWords("diff", 400, "bad path").title, "The Code view asked for something it cannot open");
    assert.equal(fileWords(413, "big.bin").title, "Too large to show");
    assert.equal(fileWords(503, "a").retry, true);
    assert.equal(fileWords(404, "a").title, "This file cannot be opened");
  });

  test("folders first, in the channel's order", () => {
    assert.deepEqual(treeOrder([{ name: "b", dir: false }, { name: "a", dir: true }, { name: "c", dir: true }, { name: "A", dir: false }]).map((e) => e.name), ["a", "c", "b", "A"]);
  });
});
