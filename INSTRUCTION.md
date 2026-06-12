# AI-Human Research Template Instructions

This repository is a lightweight template for research projects where humans work with
AI agents such as Codex or Claude Code.

Research is iterative. Ideas, references, experiments, figures, and writing often update
each other, so the folders are organized by material type instead of by a fixed sequence
of steps.

## Session Startup

1. Read this file first.
2. Unless the task is trivial, read `FILETREE.md` next to understand the current
   repository structure.
3. For broad Research OS or template-design work, also read `README.md` and the
   relevant files under `Memory/` when they exist.
4. If documentation conflicts with the real directory tree, prefer the real tree and
   record the conflict as a follow-up or user-decision item.

## Python Environment

- When a task needs a Python environment, create and manage it with `uv`.
- Start with a simple minimal environment. Add new libraries only when a task
  requires them.
- Keep environment files and dependency metadata at the smallest useful scope for
  the work, such as the current project, experiment, or code folder. Do not assume
  a repository-level `Code/` directory exists.
- Use a repository-wide Python setup only when multiple projects or workflows
  clearly need to share the same environment.

## Documentation Links

- Across this repository, when a file references another local file or directory,
  use a clickable relative link in the file's native format, such as
  `[name](path)` in Markdown or `<a href="path">name</a>` in HTML.

## Repository Map

`FILETREE.md` is the compact repository map. Read it after this file unless the
task is too small to need repository context. After updating documentation or indexed
files, refresh `FILETREE.md` with the local `filetree-simple` skill and run its
lint check.

## Research Memory

- Use `Memory/` for durable project context, long-term research goals, key
  decisions, progress summaries, and lessons that should survive across sessions.
- Update memory only when the information is likely to be useful later. Avoid
  storing noisy command output, transient observations, or details already captured
  clearly in code, references, figures, or writing.
- Keep project-specific lessons in the project or repository memory. Promote a
  lesson to a reusable skill only when it is useful across multiple research
  projects.

## Code Experiment Documentation

- Whenever code, configuration, or experiment results are added or changed, update
  the nearest relevant README or documentation file in the same project or code
  area so readers can understand the runnable workflow and current results.
- If paired English and Chinese documentation files already exist for that code
  area, update both in the same task. Do not create a second language counterpart
  unless it is useful for the project or explicitly requested.
- Document the environment, setup commands, run commands, expected inputs and
  outputs, current results, and known limitations when they are relevant.

## Agent Rules

1. Read this file first.
2. Read `FILETREE.md` next unless the task is trivial.
3. Treat research as iterative. Do not assume work must move through the folders in a
   fixed order.
4. Preserve original datasets and references unless explicitly asked to modify them.
5. Keep claims traceable to references, notes, data, code, or figures.
6. Do not invent citations, quotes, data, or results.
7. Ask before deleting or rewriting user-provided research materials.
8. Prefer small, reversible changes. Avoid adding heavyweight structure unless the
   task clearly requires it.
