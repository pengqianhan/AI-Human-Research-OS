# Project Memory

> Project-local memory. An agent updates this at the end of any session that
> changes project state. Keep it short; details belong in `paper_skeleton.md`,
> `paper/main.tex`, `paper/references.bib`, or `Code/README.md`.

## Snapshot

- Project name: Example_Project (OS pipeline smoke test)
- Started: 2026-06-12 — from idea: [linear-fit micro-experiment](../../ideas/idea_example/linear-fit-micro-experiment.md)
- Goal (one sentence): Validate the Research OS end-to-end — idea → project from
  template → runnable code → figure → compiled PDF — with everything traceable.
- Owner: mixed
- Origin: OS pipeline smoke test from the 2026-06 task brief (Git `38d79be`); now
  the N17 workflow smoke-test vehicle in [os-build/map/index.md](../../os-build/map/index.md)
- Stage: probe
- Priority: P1
- Status: smoke-test vehicle; ready for the N17 Pi workflow smoke test
- Evaluator status: existing reproducible linear fit (`Code/fit_line.py`); no frozen evaluator
- Current question: does the file workflow survive a multi-seed extension with
  transcript-independent takeover? (N17)
- Next action: after N16, run the N17 multi-seed workflow smoke test before `circle_packing`

## Key Decisions

| Date | Decision | Why | Where reflected |
|---|---|---|---|
| 2026-06-17 | Keep bibliography entries in `paper/references.bib` next to `main.tex` | the example should compile from the project-local paper directory without depending on a missing repository-level `References/refs.bib` | `paper/main.tex`; `paper_skeleton.md`; INSTRUCTION.md workflow 3 |
| 2026-06-17 | Build in place from `paper/` with `latexmk`, so the final PDF is `paper/main.pdf` | the paper directory is the expected place to find the compiled PDF, and building from the source directory keeps figure and bibliography paths stable without an external output directory | `paper/main.tex` comments; INSTRUCTION.md workflow 5 |

## Progress Log

<!-- newest first, one dated bullet per session, keep ≤ ~30 lines -->

- 2026-09-23: Snapshot completed to the template contract (Owner, Origin, Stage,
  Priority, Evaluator status, Current question added; Stage `probe`, the
  smoke-test role moved into Status and Origin); Active Projects row re-projected
  by `research-project-manager sync`.
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
