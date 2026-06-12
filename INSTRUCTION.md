# AI-Human Research OS Instructions

This repository is a research OS for research projects where humans work with
AI agents such as Codex or Claude Code.

Research is iterative. Ideas, references, experiments, figures, and writing often update
each other, so the folders are organized by material type instead of by a fixed sequence
of steps.

## Session Startup

1. Read this file first.
2. Unless the task is trivial, read `FILETREE.md` next to understand the current
   repository structure.
3. For broad Research OS or template-design work, also read the relevant files under `Memory/`
4. When working inside a specific project folder, also read that project's
   `PROJECT_MEMORY.md`.

## Python Environment

- When a task needs a Python environment, create and manage it with `uv`.
- Start with a simple minimal environment. Add new libraries only when a task
  requires them.
- Keep environment files and dependency metadata at the smallest useful scope for
  the work, such as the current project, experiment, or code folder. 
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

## Core Workflows

1. **Capture an idea**: append a new entry below the `---` line in
   [Ideas/Ideas_log.md](Ideas/Ideas_log.md) (newest first), using the format
   block in that file.
2. **Idea → Project**: copy the template to the repository root:
   `cp -R Paper_Initial_template <ProjectName>`. Fill the Snapshot sections of
   `<ProjectName>/PROJECT_MEMORY.md` and `<ProjectName>/paper_skeleton.md`, set
   the idea's status to `promoted` with a link to the project, add a row to
   Active Projects in [Memory/MEMORY.md](Memory/MEMORY.md), and refresh
   `FILETREE.md`. Projects sit at the root, sibling to `References/` and
   `Ideas/`, so the template's relative links keep working.
3. **Reference intake**: store the PDF in [References/](References/); append a
   BibTeX entry to [References/refs.bib](References/refs.bib) — fetch metadata
   with the literature-search skills, never invent fields; append a reading note
   to [References/paper_notes.md](References/paper_notes.md) using
   [paper_notes_template.md](References/paper_notes_template.md).
4. **Experiments and artifacts**: code in `<Project>/Code/` with a `uv`-managed
   environment at that folder's scope; datasets in `<Project>/Code/Datasets/`;
   figures in `<Project>/Figs/`; baseline runs in `<Project>/Baselines/`. Update
   the nearest README (both languages if a pair exists) in the same task.
5. **Writing**: edit `<Project>/main.tex`; track claims and evidence in
   `<Project>/paper_skeleton.md`; build with
   `latexmk -pdf -interaction=nonstopmode -outdir=build main.tex` (`build/` is
   gitignored).
6. **Session end**: update the Progress Log in `<Project>/PROJECT_MEMORY.md`;
   update [Memory/MEMORY.md](Memory/MEMORY.md) only if cross-project state
   changed.

## Research Memory

- Use `Memory/` for durable project context, long-term research goals, key
  decisions, progress summaries, and lessons that should survive across sessions.
- Update memory only when the information is likely to be useful later. Avoid
  storing noisy command output, transient observations, or details already captured
  clearly in code, references, figures, or writing.
- Keep project-specific lessons in the project or repository memory. Promote a
  lesson to a reusable skill only when it is useful across multiple research
  projects.

### Memory Layers

| Layer | Lives in | Updated when / by | Hygiene |
|---|---|---|---|
| Global | `Memory/MEMORY.md` | Agent at the end of a session that changes project status or yields a cross-project lesson; human anytime | ≤ ~200 lines; prune aggressively |
| Project | `<Project>/PROJECT_MEMORY.md` | Agent at the end of every session that changes project state | Progress log newest-first, ≤ ~30 lines |
| Task | `scratch/` (gitignored) or the conversation itself | During a single task only | Distill durable findings upward at task end, then discard |

## Skills

- Installed skills live in `.agents/skills/` (Codex) and `.claude/skills/`
  (Claude Code). The two directories must stay byte-identical: apply any change
  to both.
- [Research-skills-hub/](Research-skills-hub/) is the canonical store; its index
  [skills_map.md](Research-skills-hub/skills_map.md) lists every skill and the
  install procedure.
- Promotion path: record lessons in `PROJECT_MEMORY.md` first; turn a lesson
  into a project-local skill (`<Project>/.claude/skills/` plus
  `<Project>/.agents/skills/`, created on demand) when it is procedural; add it
  to the hub only when it is useful across multiple projects and
  domain-independent or lightly coupled.
- Every hub skill's `SKILL.md` must state scope, inputs, outputs, and
  limitations. After adding or changing a skill, update `skills_map.md` and
  refresh `FILETREE.md`.

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
