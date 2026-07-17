# AI Research Project Template

ML/AI project scaffold for traceable experiments, evidence, writing, and durable project state.

## Start here after copying

1. Fill the Snapshot in [PROJECT_MEMORY.md](PROJECT_MEMORY.md), including the
   project owner, origin, stage, current question, and next action.
2. Fill the Snapshot and initial claims in
   [paper_skeleton.md](paper_skeleton.md).
3. Replace the title and abstract placeholders in
   [paper/main.tex](paper/main.tex).
4. Record the source idea and ensure the project appears in the Active Projects
   table in the repository's [global memory](../../memory/MEMORY.md).

## Project workflow

- **Code and data:** work under [Code/](Code/), manage its environment with
  `uv`, and store datasets under [Code/Datasets/](Code/Datasets/). Keep the
  paired code READMEs current with setup, run commands, inputs, outputs,
  results, and limitations.
- **Shared reading:** store reusable paper understanding in the repository
  [paper wiki](../../paper-wiki/index.md); store project-specific BibTeX entries in
  [paper/references.bib](paper/references.bib).
- **Artifacts:** place figures and tables in [Figs/](Figs/) and baseline notes
  or comparison materials in [Baselines/](Baselines/).
- **Writing:** edit [paper/main.tex](paper/main.tex), while
  [paper_skeleton.md](paper_skeleton.md) tracks claims and evidence. Build from
  `paper/` with `latexmk -pdf -interaction=nonstopmode main.tex`; the expected
  output is `paper/main.pdf`.
- **Evaluation:** store one full report per evaluation under `Evaluations/`
  when that directory is needed; keep only summary state in
  `PROJECT_MEMORY.md` and global memory.
- **Session end:** update the newest-first Progress Log in
  `PROJECT_MEMORY.md`; update global memory only when portfolio or
  cross-project state changes.

## Parallel work

Create `Tasks/<task-id>/` only for work that is decomposable, independently
verifiable, and worth the merge cost. Record the task goal, inputs, success
criteria, findings, and artifacts there; merge only verified outputs into the
project's main areas.

## Template areas

* [PROJECT_MEMORY.md](PROJECT_MEMORY.md) - Durable project state, decisions, progress, and next action.
* [paper_skeleton.md](paper_skeleton.md) - Claims, sources, experiments, and writing status.
* [Code/](Code/) - Project code, datasets, environment, commands, and results.
* [Figs/](Figs/) - Generated figures, tables, screenshots, and visual outputs.
* [paper/](paper/) - Paper source, project bibliography, and generated PDF.
* [Baselines/](Baselines/) - Baseline notes and comparison materials.
* [log.md](log.md) - Folder-level update history for quick orientation.
