# AI-Human Research Template Instructions

This repository is a lightweight template for research projects where humans work with
AI agents such as Codex or Claude Code.

Research is iterative. Ideas, references, experiments, figures, and writing often update
each other, so the folders are organized by material type instead of by a fixed sequence
of steps.

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
