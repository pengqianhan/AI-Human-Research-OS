# AI-Human Research OS Instructions

This repository is a research OS for research projects where humans work with
AI agents such as Codex or Claude Code.

Research is iterative. Ideas, references, experiments, figures, and writing often update
each other, so the folders are organized by material type instead of by a fixed sequence
of steps.

## Research Environment Model

Treat this repository as a file-system-native environment for long-horizon
human-agent research. The primary goal is the human user's own research practice;
reusable templates and open-source reuse are byproducts. Do not let future platform
or product possibilities drive heavier machinery before local research needs require it.

General-purpose agents should be controlled mostly by environment design rather than
by an over-prescribed research workflow:

- **Artifacts**: durable work lives in plain files, Git history, memory files,
  paper notes, project code, figures, drafts, and evaluation reports.
- **Permissions**: preserve user-provided research material; ask before deletion,
  rewriting, publishing, or external sharing; keep evaluators and authoritative
  result files protected when they exist.
- **Budgets**: keep agent-led and parallel work gated by explicit user intent,
  task scope, and useful stopping criteria.
- **Human oversight**: the human chooses research directions and can redirect or
  stop work; agents execute, surface evidence, and may propose or run gated ideas
  only within the configured policy.

Default autonomy policy: **portfolio always on, intra-project parallelism on demand**.
Maintain a cross-project portfolio, but do not run every project or every possible
parallel agent by default.

## Session Startup

1. Read this file first.
2. If [`human/human-cognition/index.md`](human/human-cognition/index.md)
   exists, skim it, then skim the frontmatter and `Active Index` sections of
   `known_knowns.md`, `known_unknowns.md`, `unknown_knowns.md`, and
   `unknown_unknowns.md` in that directory. Read full entries only when relevant
   to the current task. Before finishing, update the cache only for durable
   human-cognition changes likely to help future sessions, respecting the
   `human-cognition-cache` skill's privacy rules.
3. Read [`HANDOFF.md`](HANDOFF.md) for Active Work and Decisions before
   reopening a settled question. Trust the repository over hand-off snapshots
   (re-verify with `git status`).
4. Unless the task is trivial, read `FILETREE.md` next to understand the current
   repository structure.
5. Read [`human/index.md`](human/index.md), when present, for stable user
   context, collaboration preferences, and privacy boundaries.
6. For broad Research OS or template-design work, also read the relevant files under `memory/`
7. When working inside a specific project folder, also read that project's
   `PROJECT_MEMORY.md`.

## Research Policy

The global research policy lives in [memory/MEMORY.md](memory/MEMORY.md). In
particular, read `agent_led_research` before allowing agents to initiate their
own research ideas:

- `off` — default. Do not start agent-led ideas; mention optional ideas only as
  lightweight observations in the current task.
- `scout_only` — agents may record idea cards and light literature pointers, but
  should not create projects or run experiments for those ideas.
- `full_gated` — agents may run agent-led ideas through staged gates:
  `scout → probe → develop → archived/passed`.

Human-led topics and tasks remain the default starting point. Agent-emergent
ideas are agent-owned, but they still need provenance, stage labels, bounded
resources, and the same evaluator protocol as human-led research.

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

1. **Capture an idea**: add an OKF concept under [ideas/](ideas/). For a
   lightweight idea, create `ideas/<slug>.md`; for an idea that needs local
   notes or examples, create a nested bundle such as [ideas/idea_example/](ideas/idea_example/).
   Idea concepts use `type: Idea` with `title`, `description`, `status`,
   `created`, and optional `tags`. Update [ideas/index.md](ideas/index.md) and,
   for nested bundles, the local `index.md`.
2. **Idea → Project**: copy a template from [projects-folder/templates/](projects-folder/templates/)
   into [projects-folder/](projects-folder/), for example:
   `cp -R projects-folder/templates/ai_research_template projects-folder/<ProjectName>`.
   Fill the project entrypoint `projects-folder/<ProjectName>/index.md`, the
   Snapshot sections of `projects-folder/<ProjectName>/PROJECT_MEMORY.md` and
   `projects-folder/<ProjectName>/paper_skeleton.md`, set the idea concept's
   `status` to `promoted` with a link to the project, add a row to Active
   Projects in [memory/MEMORY.md](memory/MEMORY.md), and refresh `FILETREE.md`.
   `ai_research_template` is an AI-research paper template;
   add sibling templates under `projects-folder/templates/` for other
   disciplines or outputs such as books and blogs.
3. **Reference intake**: keep two reference layers distinct. Durable, project-
   independent reading notes — one summary per paper, grouped into themes — live
   in the repo-level [paper-wiki/](paper-wiki/) OKF paper wiki, maintained
   with the `paper-wiki-manager` skill (per-paper notes in
   [paper-wiki/papers/](paper-wiki/papers/), themes in
   [paper-wiki/topics/](paper-wiki/topics/), entity pages for named
   methods, datasets, benchmarks, metrics, terms, and tools in
   [paper-wiki/concepts/](paper-wiki/concepts/), graph in
   `paper-wiki/viz.html`). Single-paper notes should start from the configured
   minimal review profile; deeper reading is added only when a project question
   requires it. Topic pages are lightweight literature synthesis and research
   roadmaps, not mere tags; create or deepen them only when they help retrieval,
   comparison, or next-step planning. Concept pages are for entities referenced
   by two or more papers or durable field-level entities; a paper may point to
   the projects that use it via an optional `# Used In Projects` section.
   Project-specific citations are appended as BibTeX
   entries to `<Project>/paper/references.bib`. In both layers, fetch metadata
   with the literature-search skills and never invent fields; store PDFs and
   longer reading notes in a local project reference area when needed.
4. **Experiments and artifacts**: code in `<Project>/Code/` with a `uv`-managed
   environment at that folder's scope; datasets in `<Project>/Code/Datasets/`;
   figures in `<Project>/Figs/`; baseline runs in `<Project>/Baselines/`. Update
   the nearest README (both languages if a pair exists) in the same task.
5. **Writing**: edit `<Project>/paper/main.tex`; track claims and evidence in
   `<Project>/paper_skeleton.md`; build from the project root with
   `cd paper && latexmk -pdf -interaction=nonstopmode main.tex`
   (`paper/main.pdf` is the expected PDF output path; LaTeX auxiliary files
   created under `paper/` are gitignored; building from `paper/` keeps figure
   and shared-bibliography paths stable).
6. **Session end**: update the Progress Log in `<Project>/PROJECT_MEMORY.md`;
   update [memory/MEMORY.md](memory/MEMORY.md) only if cross-project state
   changed.

## Portfolio, Projects, and Parallel Work

[memory/MEMORY.md](memory/MEMORY.md) is the portfolio dashboard. Its Active
Projects table tracks cross-project state with at least these fields:
`Project`, `Path`, `Owner`, `Stage`, `Priority`, `Status`, `Evaluator`, and
`Next action`.

Inside a project, `PROJECT_MEMORY.md` is the source of truth for project state.
Its Snapshot should include, when applicable: `owner` (`human-led`, `agent-led`,
or `mixed`), `origin`, `stage`, `priority`, `evaluator_status`,
`current_question`, and `next_action`. The project `index.md` is only a human
readable navigation summary; `paper_skeleton.md` tracks claims, evidence, and
writing rather than portfolio management.

Project-level stages are lightweight labels, not a heavyweight workflow engine.
Use the smallest useful stage vocabulary, such as `scout`, `probe`, `develop`,
`writing`, `paused`, `complete`, and `archived`.

For intra-project parallel work, create isolated task workspaces only when the
task is decomposable, verifiable, and worth the merge cost:
`projects-folder/<ProjectName>/Tasks/<task-id>/`. Each task workspace should
contain the task goal, inputs, success criteria, findings, and artifacts needed
for review. Merge only verified outputs back into the project's main `Code/`,
`Figs/`, `paper/`, and `PROJECT_MEMORY.md`.

## Evaluator Protocol

Use one evaluator protocol for human-led and agent-led research. The final
evaluation target is the research artifact, not an empty idea: paper draft,
code, figures, references, reproducibility notes, and project memory.

The evaluator combines:

- **Hard checks**: code runs when required, results are reproducible enough for
  the stage, citations and metadata are real, claims map to evidence, and
  experiments address the stated hypothesis.
- **Rubric scoring**: novelty, significance, method soundness, evidence quality,
  experimental rigor, writing clarity, reusability, and future potential.
- **LLM critique**: structured review comments and revision requests, clearly
  separated from hard facts.

Store full evaluation reports inside the project under
`projects-folder/<ProjectName>/Evaluations/`, one report per evaluation. Keep
only summary status in `PROJECT_MEMORY.md` and the global Active Projects table.

## Research Memory

- Use `memory/` for durable project context, long-term research goals, key
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
| Global | `memory/MEMORY.md` | Agent at the end of a session that changes project status or yields a cross-project lesson; human anytime | ≤ ~200 lines; prune aggressively |
| Project | `projects-folder/<ProjectName>/PROJECT_MEMORY.md` | Agent at the end of every session that changes project state | Progress log newest-first, ≤ ~30 lines |
| Task | `scratch/` (gitignored) or the conversation itself | During a single task only | Distill durable findings upward at task end, then discard |

## External References

- [resource/](resource/) holds read-only external material for study and
  inspiration: vendored copies of other agent and research repositories plus the
  walk-through notes (`*-讲解与启发.md`) distilled from them. Treat it as reference
  only — do not run or import its code into a project; reimplement an idea in your
  own files instead. Each subdirectory is a separate upstream clone and keeps its
  original license and attribution.

## Skills

- Installed skills live in `.agents/skills/` (Codex) and `.claude/skills/`
  (Claude Code). The two directories must stay byte-identical: use the
  `research-skill-installer` skill to install or sync them from
  [research-skills-hub/](research-skills-hub/) so both copies update together, or
  apply any manual change to both.
- [research-skills-hub/](research-skills-hub/) is the canonical store; its index
  [index.md](research-skills-hub/index.md) links the skill collections (each with
  its own `index.md`) and the install procedure.
- Promotion path: record lessons in `PROJECT_MEMORY.md` first; turn a lesson
  into a project-local skill (`projects-folder/<ProjectName>/.claude/skills/`
  plus `projects-folder/<ProjectName>/.agents/skills/`, created on demand) when
  it is procedural; add it
  to the hub only when it is useful across multiple projects and
  domain-independent or lightly coupled.
- Every hub skill's `SKILL.md` must state scope, inputs, outputs, and
  limitations. After adding or changing a skill, update `research-skills-hub/index.md`
  and refresh `FILETREE.md`.
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

1. it instantiates with
   `cp -R projects-folder/templates/<TemplateName> projects-folder/<ProjectName>`;
2. its internal relative links are written for the
   `projects-folder/<ProjectName>/` position after copying;
3. it states which files to fill right after instantiation (for
   `ai_research_template`: the Snapshot sections of `PROJECT_MEMORY.md`,
   `paper_skeleton.md`, the folder entrypoint `index.md`, and the
   title/abstract placeholders in `paper/main.tex`);
4. shared conventions (build command, README pairing, memory rules) stay in
   this file; templates reference them instead of restating them.

`projects-folder/templates/ai_research_template/` is currently the bundled
AI-research paper template. Add future templates as sibling directories
under `projects-folder/templates/` when other disciplines or output formats
need different scaffolds. Do not add a plugin manager, manifest format,
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
9. Before finishing a change that touches `paper-wiki/`, an installed skill, or an
   indexed doc, run [`./verify.sh`](verify.sh) from the repo root. It is a read-only,
   agent-neutral consistency check (paper-wiki validator, `FILETREE.md` lint, and the
   three-copy skill-sync diff). It reports drift; it does not fix it — resolve any
   reported item before committing.
