# Project Instructions

Based on the `ai_research_template` project template, last synced YYYY-MM-DD.

These rules govern agent work in this project directory, whether the project
lives inside the AI-Human Research OS or stands alone as its own repository.
If this directory is `projects-folder/templates/<name>/`, it is the template
itself: edit it as a template and skip the project rules below.

## Start

Read [index.md](index.md) for navigation and the Snapshot in
[PROJECT_MEMORY.md](PROJECT_MEMORY.md) for current state; use
[Code/README.md](Code/README.md) for setup, commands, and results.

## Workflow

- **Code and data:** work under [Code/](Code/), manage its environment with
  `uv`, and store datasets under [Code/Datasets/](Code/Datasets/) with their
  source, version, and license. Keep the paired code READMEs current with
  setup, run commands, inputs, outputs, results, and limitations.
- **Artifacts:** place figures and tables in [Figs/](Figs/) and baseline notes
  or comparison materials in [Baselines/](Baselines/).
- **Writing:** edit [paper/main.tex](paper/main.tex), with claims and evidence
  tracked in [paper_skeleton.md](paper_skeleton.md) and project BibTeX entries
  in [paper/references.bib](paper/references.bib). Build from `paper/` with
  `latexmk -pdf -interaction=nonstopmode main.tex`; the expected output is
  `paper/main.pdf`.
- **Evaluation:** store one full report per evaluation under `Evaluations/`
  when that directory is needed; keep only summary state in
  `PROJECT_MEMORY.md`.
- **Session end:** add a dated bullet to the newest-first Progress Log in
  `PROJECT_MEMORY.md` and update every Snapshot field the session changed.

## Parallel work

Create `Tasks/<task-id>/` only for work that is decomposable, independently
verifiable, and worth the merge cost. Record the task goal, inputs, success
criteria, findings, and artifacts there; merge only verified outputs into the
project's main areas.

## Research integrity

- Preserve original datasets, reference material, and user-provided research
  material; keep frozen evaluators and authoritative result files as they are.
- Keep every claim traceable to a source or artifact, and every reported
  number reproducible from a stated command. Record unknowns as unknown;
  never invent citations, quotations, data, results, or verification.

## Inside the Research OS

When this project sits under `projects-folder/` in the Research OS, the
repository root's `AGENTS.md` applies as well, and:

- Reusable paper understanding goes to the shared
  [paper wiki](../../paper-wiki/index.md); project-specific BibTeX stays in
  `paper/references.bib`.
- The project's row in [global memory](../../memory/MEMORY.md) is a projection
  of the Snapshot: after changing the Snapshot, run `research-project-manager`
  `sync`. Edit global memory directly only for cross-project changes.
- The source idea lives under [ideas/](../../ideas/).

## Project-specific rules

<!-- Rules that apply only to this project: hardware, data locations,
protected files, scope. Keep the sections above as the template ships them, so
later template changes can be ported. -->
