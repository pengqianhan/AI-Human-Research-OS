# AI-Human Research OS Instructions

A file-system-native environment serving the human's long-horizon research.
Organize durable work by type. Prefer plain files, Git, and small reversible
changes. Keep the OS core small; extend through skills and project templates,
adding infrastructure only when an observed local need justifies it.

## Execution contract

- Match the request: answers and reviews inspect and report without changing
  scoped artifacts unless requested; diagnosis finds causes; change requests
  include implementation and proportionate validation.
- Continue authorized, safe local work without routine confirmation. Ask only
  for a necessary user choice or destructive, external, protected-data,
  substantial-cost, or scope-expanding actions not already authorized.
- The human owns research direction, consequential choices, publication, and
  final acceptance. Agent verification is part of delivery.
- Repository evidence outranks summaries and handoffs. Re-check facts that
  determine the next action; link to authorities instead of copying state.
- Finish when the requested outcome exists and relevant checks pass; report
  checks as passed, failed, or unrun. If blocked, complete independent work and
  report the missing condition and smallest next probe.

## Read by task

Read the relevant rows, not the whole table's destinations at every startup.
Project paths below are relative to the project being worked on.

| When | Read and follow |
|---|---|
| Need repository navigation | [FILETREE.md](FILETREE.md), then the nearest directory `index.md` |
| Resume cross-session work or revisit a settled decision | [HANDOFF.md](HANDOFF.md), especially Active Work and Decisions |
| Work on global policy, portfolio, OS, or templates | [memory/MEMORY.md](memory/MEMORY.md) |
| Start agent-led research or intra-project parallel work | The Research Policy in global memory; bound work by intent, stopping criteria, resources, and merge cost |
| Build the Research OS | [os-build/index.md](os-build/index.md), then the Active Work section of [HANDOFF.md](HANDOFF.md) |
| Work in a project | Its `index.md` and `PROJECT_MEMORY.md`; use `Code/README.md` for experiments and artifacts |
| Write or assess research claims | Project `paper_skeleton.md`; use `paper/main.tex` for the paper and the evaluation contract below for assessment |
| Capture or promote an idea | [ideas/index.md](ideas/index.md); use `okf-repo-organizer` for structural normalization |
| Create, register, validate, or archive a project | `research-project-manager`, then the copied project's `index.md` |
| Add or organize research reading | [paper-wiki/index.md](paper-wiki/index.md) and `paper-wiki-manager` |
| Find reusable skills | [research-skills-hub/index.md](research-skills-hub/index.md) |
| Need user context or handle personal information | [human/index.md](human/index.md); read `human/private/` only when explicitly requested |

## Human cognition

At session startup, if [the cognition cache](human/human-cognition/index.md)
exists, skim its index and the frontmatter plus `Active Index` of all four
quadrants. Read full entries only when relevant.

At substantive task completion, use `human-cognition-cache` to capture durable
cognition supported by the conversation, including engineering and tooling,
without asking first. Follow its evidence, merge-before-append, decay, and
privacy rules. Report each written entry ID in a closing line; correct or
remove entries on the human's word alone. This cognition-specific authorization
takes precedence over general confirmation rules in `human/`. Keep credentials
and high-sensitivity personal data out of tracked files.

## Research integrity and evaluation

- Preserve original datasets, references, and user-provided research material;
  protect frozen evaluators and authoritative result files.
- Keep claims traceable to sources or artifacts. Record unknowns honestly;
  never invent citations, quotations, metadata, data, results, or verification.
- Treat [os-build/references/](os-build/references/) as read-only design evidence.
  Preserve licenses and attribution; reuse ideas by reimplementation rather
  than importing vendored code into projects.

Evaluate research artifacts, not empty ideas: combine hard checks for execution,
reproducibility, real citations, claim-to-evidence links, and hypothesis coverage;
rubric scoring for novelty, significance, soundness, evidence, rigor, clarity,
reusability, and future potential; and LLM critique separated from verified facts.
Store full reports in project `Evaluations/`, with summaries in memory.

## Maintenance

- Update `PROJECT_MEMORY.md` after sessions that change project state; update
  global memory only for portfolio or cross-project changes. Follow each file's
  size and ordering conventions. Keep temporary notes in `scratch/` or the
  conversation; distill durable findings into the appropriate memory layer.
- Use `uv` for Python environments, with dependencies scoped to the project or
  `Code/` unless a workflow is shared across the repository.
- Use clickable relative links in repository files. Update the nearest README
  or runbook when setup, commands, inputs, outputs, results, or limitations change.
  Update existing English/Chinese pairs together; add counterparts only when useful.
- Install, update, or remove hub skills through `research-skill-installer`;
  follow its review, target, and source-policy rules instead of manual copying.
- Keep project-local skills in both `.agents/skills/` and `.claude/skills/`;
  promote them to the hub after they prove useful across projects. Keep collection
  indexes and READMEs aligned; use `skill-organizer` when adding a skill.
- Use `writing-for-agents` when authoring agent instructions or skills, with
  explicit triggers and checkable outcomes; no fixed section layout is required.
- When adding, removing, or renaming a public top-level directory, or changing
  its index summary, use `filetree-simple` for the entrypoint contract and run
  its generate and lint workflows.

## Completion checks

For changes to `paper-wiki/`, `projects-folder/`, installed skills, public
top-level `index.md` files, or `FILETREE.md`, run [`./verify.sh`](verify.sh)
from the repository root.
Fix failures introduced by the task; report pre-existing failures separately.
Run other checks proportionate to the change. Broaden or repeat them only for
new changes, failures, or unresolved concerns.
