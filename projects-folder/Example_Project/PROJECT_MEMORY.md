# Project Memory

> Project-local memory. An agent updates this at the end of any session that
> changes project state. Keep it short; details belong in `paper_skeleton.md`,
> `paper/main.tex`, `paper/references.bib`, or `Code/README.md`.

## Snapshot

- Project name: Example_Project (OS pipeline smoke test)
- Started: 2026-06-12 — from idea: [linear-fit micro-experiment](../../ideas/idea_example/linear-fit-micro-experiment.md)
- Goal (one sentence): Validate the Research OS end-to-end — idea → project from
  template → runnable code → figure → compiled PDF — with everything traceable.
- Status: experimenting
- Next action: keep as a worked example; delete if the user prefers (decision D6
  in [../../HANDOFF.md](../../HANDOFF.md)).

## Key Decisions

| Date | Decision | Why | Where reflected |
|---|---|---|---|
| 2026-06-17 | Keep bibliography entries in `paper/references.bib` next to `main.tex` | the example should compile from the project-local paper directory without depending on a missing repository-level `References/refs.bib` | `paper/main.tex`; `paper_skeleton.md`; INSTRUCTION.md workflow 3 |
| 2026-06-17 | Build in place from `paper/` with `latexmk`, so the final PDF is `paper/main.pdf` | the paper directory is the expected place to find the compiled PDF, and building from the source directory keeps figure and bibliography paths stable without an external output directory | `paper/main.tex` comments; INSTRUCTION.md workflow 5 |

## Progress Log

<!-- newest first, one dated bullet per session, keep ≤ ~30 lines -->

- 2026-06-17: Build convention updated so `latexmk` run from `paper/` writes
  `paper/main.pdf` directly; `.gitignore` now ignores the generated PDF and
  LaTeX auxiliary files under project `paper/` directories.
- 2026-06-17: Bibliography moved to project-local `paper/references.bib`, and
  `main.tex` now uses `\bibliography{references}`.
- 2026-06-12: Smoke test completed end to end — idea concept recorded (promoted), project
  instantiated from template, uv env (numpy 2.4.6 / matplotlib 3.11.0),
  `fit_line.py` run (slope 2.0452, intercept 0.9325, MSE 0.1402),
  `Figs/linear_fit.png` generated, real arXiv reference (1706.03762) fetched via
  the literature_search_arxiv skill into the bibliography,
  `paper/main.pdf` compiled with all citations resolved.

## Open TODOs

- [ ] None — example complete. Delete this project if not wanted (decision D6).
