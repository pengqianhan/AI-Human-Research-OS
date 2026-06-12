# Project Memory

> Project-local memory. An agent updates this at the end of any session that
> changes project state. Keep it short; details belong in `paper_skeleton.md`,
> `Code/README.md`, or `../References/`.

## Snapshot

- Project name: Example_Project (OS pipeline smoke test)
- Started: 2026-06-12 — from idea: [Ideas_log entry](../Ideas/Ideas_log.md)
- Goal (one sentence): Validate the Research OS end-to-end — idea → project from
  template → runnable code → figure → compiled PDF — with everything traceable.
- Status: experimenting
- Next action: keep as a worked example; delete if the user prefers (decision D6
  in ../task_plan.html).

## Key Decisions

| Date | Decision | Why | Where reflected |
|---|---|---|---|
| 2026-06-12 | Build with `latexmk -bibfudge-` so the shared root `References/refs.bib` resolves from the project dir | latexmk 4.86a runs bibtex inside `build/` by default, which breaks the `../References/refs` path | `main.tex` comments; INSTRUCTION.md workflow 5 |

## Progress Log

<!-- newest first, one dated bullet per session, keep ≤ ~30 lines -->

- 2026-06-12: Smoke test completed end to end — idea logged (promoted), project
  instantiated from template, uv env (numpy 2.4.6 / matplotlib 3.11.0),
  `fit_line.py` run (slope 2.0452, intercept 0.9325, MSE 0.1402),
  `Figs/linear_fit.png` generated, real arXiv reference (1706.03762) fetched via
  the literature_search_arxiv skill into `../References/refs.bib`,
  `build/main.pdf` compiled with all citations resolved.

## Open TODOs

- [ ] None — example complete. Delete this project if not wanted (decision D6).
