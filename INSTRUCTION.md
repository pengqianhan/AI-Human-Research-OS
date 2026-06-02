# AI-Human Research Template Instructions

This repository is a lightweight template for research projects where humans work with
AI agents such as Codex or Claude Code.

Research is iterative. Ideas, references, experiments, figures, and writing often update
each other, so the folders are organized by material type instead of by a fixed sequence
of steps.

## What Goes Where

- `.gitignore`: Ignore local, generated, or environment-specific files.
- `AGENTS.md`: Entry-point instructions for Codex-style agents. It points agents
  to `instruction.md`.
- `CLAUDE.md`: Entry-point instructions for Claude Code-style agents.
- `README.md`: Human-facing overview of the Research OS template and starting
  workflow.
- `Research-skills-hub/`: Self-contained hub for optional research skills and
  their helper files.
- `Research-skills-hub/README.md`: Short index of skills under
  `Research-skills-hub/skills/`. Read it only when skill details are needed.
- `instruction.md`: The main guide for humans and AI agents.
- `setup.md`: One-time setup steps after cloning this template for a new research
  project.
- `Code/`: Scripts, notebooks, analysis code, data processing code, and small helper
  tools.
- `Code/Datasets/`: Raw or processed datasets. Preserve original data when
  possible, and do not overwrite user-provided data without confirmation.
- `Ideas/`: Research ideas, evolving hypotheses, notes, outlines, meeting notes,
  experiment plans, and reflections after reading or analysis.
- `Paper/`: Writing materials for papers, reports, manuscripts, and related
  outputs.
- `Paper/Figs/`: Figures, tables, plots, screenshots, and visual outputs used
  for analysis or writing.
- `Paper/paper_skeleton.md`: A simple paper/report writing skeleton.
- `References/`: Papers, bibliographic files, literature notes, source PDFs, links, and
  citation material.
- `References/paper_notes.md`: Shared notes for reading papers and recording key
  takeaways.
- `References/refs.bib`: Project bibliography file for BibTeX-compatible
  citations.
- Empty research folders may contain `.gitkeep` files so Git can track them.
## Python Environment

- For Python work under `Code/`, create and manage the environment with `uv`.
- Start with a simple minimal environment. Add new libraries only when a task
  requires them.
- Prefer keeping environment files and dependency metadata local to `Code/`
  unless the project later needs a repository-wide Python setup.
## Code Experiment Documentation

- Treat `Code/README.md` as the English entry point for code, experiment setup, run commands, and current results.
- Keep `Code/README_zh.md` as the Chinese counterpart to `Code/README.md`.
- Whenever code, configuration, or experiment results under `Code/` are added or changed, update both `Code/README.md` and `Code/README_zh.md` in the same task so readers can understand the latest runnable workflow and results.
- After updating documentation or indexed files, refresh `FILETREE.md` with the local filetree skill and run its lint check.
## Agent Rules

1. Read this file first.
2. If this is a newly cloned project, read `setup.md` next.
3. Treat research as iterative. Do not assume work must move through the folders in a
   fixed order.
4. Preserve original datasets and references unless explicitly asked to modify them.
5. Keep claims traceable to references, notes, data, code, or figures.
6. Do not invent citations, quotes, data, or results.
7. Ask before deleting or rewriting user-provided research materials.
