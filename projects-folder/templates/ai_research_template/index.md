# AI Research Project Template

ML/AI project scaffold for traceable experiments, evidence, writing, and durable project state.

## Setup after copying

`research-project-manager new` has already set this file's title and summary,
the identity fields of the Snapshot, and the template line in
[AGENTS.md](AGENTS.md). Finish the rest, then delete this section.

1. Fill the Snapshot fields still empty in [PROJECT_MEMORY.md](PROJECT_MEMORY.md),
   usually status, evaluator status, current question, and next action.
2. Fill the Snapshot and initial claims in
   [paper_skeleton.md](paper_skeleton.md).
3. Replace the title and abstract placeholders in
   [paper/main.tex](paper/main.tex).
4. Add rules that apply only to this project under "Project-specific rules" in
   [AGENTS.md](AGENTS.md), and adjust the lists below to the project's own
   files.

## Start here

* [AGENTS.md](AGENTS.md) - Workflow, integrity, and project-specific rules for agents working here.
* [PROJECT_MEMORY.md](PROJECT_MEMORY.md) - Durable project state, decisions, progress, and next action.
* [paper_skeleton.md](paper_skeleton.md) - Claims, sources, experiments, and writing status.
* [Code/README.md](Code/README.md) - Setup, run commands, results, and limitations.

## Project areas

* [Code/](Code/) - Project code, datasets, environment, commands, and results.
* [Figs/](Figs/) - Generated figures, tables, screenshots, and visual outputs.
* [paper/](paper/) - Paper source, project bibliography, and generated PDF.
* [Baselines/](Baselines/) - Baseline notes and comparison materials.
* [log.md](log.md) - Newest-first project update log.
