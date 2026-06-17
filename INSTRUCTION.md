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

1. **Capture an idea**: add an OKF concept under [Ideas/](Ideas/). For a
   lightweight idea, create `Ideas/<slug>.md`; for an idea that needs local
   notes or examples, create a nested bundle such as [Ideas/idea_example/](Ideas/idea_example/).
   Idea concepts use `type: Idea` with `title`, `description`, `status`,
   `created`, and optional `tags`. Update [Ideas/index.md](Ideas/index.md) and,
   for nested bundles, the local `index.md`.
2. **Idea → Project**: copy the template to the repository root:
   `cp -R Paper_Initial_template <ProjectName>`. Fill the Snapshot sections of
   `<ProjectName>/PROJECT_MEMORY.md` and `<ProjectName>/paper_skeleton.md`, set
   the idea concept's `status` to `promoted` with a link to the project, add a row to
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
5. **Writing**: edit `<Project>/paper/main.tex`; track claims and evidence in
   `<Project>/paper_skeleton.md`; build from the project root with
   `cd paper && latexmk -pdf -bibfudge- -interaction=nonstopmode -outdir=../build main.tex`
   (`build/` is gitignored at the project root; `-bibfudge-` keeps the
   shared-bibliography path working from the `paper/` directory).
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
- Skills contain runnable scripts. Skim a skill's `scripts/` before installing
  it from outside this repository.

## Extending the OS

The OS separates a small fixed core from replaceable content (plugins):

- **Core** (keep stable): the entry chain `AGENTS.md`/`CLAUDE.md` →
  `INSTRUCTION.md` → `FILETREE.md` → memory, the three memory layers, and the
  directory semantics in this file.
- **Plugins** (open, addable): **skills** (reusable behaviors, see Skills
  above) and **project templates** (instantiable scaffolds).

Template contract — a directory is a valid project template when:

1. it instantiates with `cp -R <template> <ProjectName>` at the repository
   root;
2. its internal relative links are written for that root-level position;
3. it states which files to fill right after instantiation (for
   `Paper_Initial_template`: the Snapshot sections of `PROJECT_MEMORY.md`,
   `paper_skeleton.md`, and the title/abstract placeholders in `paper/main.tex`);
4. shared conventions (build command, README pairing, memory rules) stay in
   this file; templates reference them instead of restating them.

`Paper_Initial_template/` is currently the only template. When a second
template is added, create a `Templates/` container directory (mirroring
`Research-skills-hub/`), move templates inside, and update the docs and
`FILETREE.md` in the same task. Do not add a plugin manager, manifest format,
versioning system, or CLI for plugins.

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
