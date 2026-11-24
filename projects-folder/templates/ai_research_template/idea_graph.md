# Idea graph

This project's questions, hypotheses, experiments, results, and claims, one
row each, and the links between them. The desktop app's Idea view draws the
table at the end of this file and never edits it; the project agent writes it
and keeps it current. Write each row from the project's own files, name where
it comes from in Source, and leave out what no file supports.

- **The table** is the first one with exactly the header below. Add rows under
  it with no blank line between them, and keep it the last thing in the file;
  text outside the table is free. A `|` inside a cell is written `\|`.
- **ID:** a letter, then at most 15 letters, digits, `_`, or `-`, unique
  ignoring case. By convention the kind's letter and a number: Q1, H1, E1, R1,
  C1.
- **Kind** and its **Status** words: `question` (open, answered);
  `hypothesis` (open, supported, refuted); `experiment` (planned, running,
  done, failed); `result` (recorded); `claim` (planned, verified, weak,
  removed), the same as the Status of its row in `paper_skeleton.md`.
- **Statement:** not empty; inline Markdown.
- **Links:** empty, or `<word> <ID>` items separated by `;`, from this row's
  node to the node named. `motivates` goes from any node to a question,
  hypothesis, or experiment; `tests` from an experiment to a question or
  hypothesis; `supports` and `refutes` from a result to a hypothesis or claim.
  Links and results' `from:` must not form a cycle.
- **Points to**, by kind. An experiment:
  `commit: <7 to 64 lower-case hex digits, or none>; files: <path>, <path>`,
  or `files: none` when the run left no result file; a planned one may leave
  the cell empty. A result: `from: <ID of an experiment>`. A claim:
  `claim: C1`, the short name its row in `paper_skeleton.md`'s Claims and
  Evidence table starts with (`C1: …`). A question or hypothesis: empty. Paths
  are relative to the project folder; one holding `, ` is written as a code
  span.
- **Source:** optional; where the node comes from, as `file:line`.
- The view reads at most 512 KiB of this file and draws at most 200 nodes and
  1,000 links.

| ID | Kind | Statement | Status | Links | Points to | Source |
|---|---|---|---|---|---|---|
