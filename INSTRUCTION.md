# AI-Human Research OS Instructions

This repository is a file-system-native Research OS for long-horizon work by
humans and AI agents. Research is iterative, so durable material is organized
by type rather than forced through a fixed folder sequence.

The human's research practice is the primary goal. Prefer plain files, Git,
small reversible changes, and evidence-gated machinery over speculative
platform infrastructure.

## Operating model

- **Artifacts:** durable work lives in files, Git history, memory, paper notes,
  project code, figures, drafts, and evaluation reports.
- **Authority:** repository evidence wins over summaries and hand-off
  snapshots. Re-verify load-bearing state before acting.
- **Autonomy:** portfolio tracking is always on; agent-led research and
  intra-project parallel work follow the policy in
  [memory/MEMORY.md](memory/MEMORY.md).
- **Human oversight:** the human owns research direction, consequential
  choices, publication, and final verification. Agents execute bounded work,
  surface evidence, and propose options within policy.

## Execution contract

- Match the user's requested layer: answer and review tasks inspect and report
  without changing scoped artifacts unless explicitly requested; diagnosis
  identifies causes; change requests include implementation and proportionate
  validation.
- Inspect repository evidence, perform safe in-scope local work, and continue
  without asking for routine confirmation.
- Ask only for a missing user choice or before destructive, external,
  protected-data, substantial-cost, or material-expansion actions that the
  current request does not explicitly authorize.
- Complete only when the requested outcome exists and relevant checks pass.
  Report required checks as passed, failed, or unrun.
- When a required condition is missing, preserve useful findings and report
  `blocked` with the missing condition and the smallest next probe.

## Session startup

1. If [`human/human-cognition/index.md`](human/human-cognition/index.md)
   exists, skim it and the frontmatter plus `Active Index` of its four quadrant
   files. Read full entries only when relevant. Before finishing, update the
   cache only for durable cognition changes, following the
   `human-cognition-cache` privacy rules.
2. Read [HANDOFF.md](HANDOFF.md), especially Active Work and Decisions, before
   reopening settled questions; re-check its claims with repository evidence
   such as `git status`.
3. Unless the task is trivial, read [FILETREE.md](FILETREE.md), then follow the
   nearest directory `index.md` for local detail.
4. Read [human/index.md](human/index.md), when present, for stable user context,
   collaboration preferences, and privacy boundaries.
5. For broad OS or template work, read the relevant files under `memory/`. For
   project work, read that project's `PROJECT_MEMORY.md`.

## Sources of truth

| Concern | Authority |
|---|---|
| Repository navigation | [FILETREE.md](FILETREE.md), then local `index.md` files |
| Current cross-session task arc | [HANDOFF.md](HANDOFF.md) |
| Portfolio, global policy, cross-project decisions | [memory/MEMORY.md](memory/MEMORY.md) |
| Project state and next action | `<Project>/PROJECT_MEMORY.md` |
| Claims, evidence, and writing state | `<Project>/paper_skeleton.md` |
| Shared paper understanding | [paper-wiki/index.md](paper-wiki/index.md) |
| Research OS construction route | [os-build/map/index.md](os-build/map/index.md) |
| Reusable skills | [research-skills-hub/index.md](research-skills-hub/index.md) |
| Durable human cognition | [human/human-cognition/index.md](human/human-cognition/index.md) |

Link to an authority instead of mirroring its changing state elsewhere.

## Research integrity and permissions

- Preserve original datasets, references, and user-provided research material.
- Treat the current request as authorization for its exact scope. Ask before
  deleting, materially rewriting, publishing, or externally sharing user
  material beyond what the request explicitly authorizes.
- Protect frozen evaluators and authoritative result files when they exist.
- Keep every claim traceable to references, notes, data, code, figures, or
  evaluator output.
- Never invent citations, quotations, metadata, data, experimental results, or
  verification evidence; record unknowns honestly.
- Bound agent-led and parallel work by explicit intent, useful stopping
  criteria, and merge cost.
- Treat [os-build/references/](os-build/references/) as read-only design
  evidence. Preserve each vendored repository's license and attribution; reuse
  ideas by reimplementation rather than importing its code into a project.

## Workflow routing

| Work | Read and follow |
|---|---|
| Capture or promote an idea | [ideas/index.md](ideas/index.md) and `okf-repo-organizer` when structural normalization is needed |
| Instantiate a project | [projects-folder/templates/index.md](projects-folder/templates/index.md), then the copied project `index.md` |
| Add or organize research reading | [paper-wiki/index.md](paper-wiki/index.md) and `paper-wiki-manager` |
| Run experiments or create artifacts | The project `index.md` and local `Code/README.md` |
| Write a paper | The project `paper_skeleton.md` and `paper/main.tex` |
| Evaluate project work | The evaluator contract below and project-local `Evaluations/` |
| End a project-changing session | Update project memory; update global memory only for portfolio or cross-project changes |

## Environment and documentation

- Use `uv` for Python environments. Keep dependency metadata at the smallest
  useful scope, usually the current project or `Code/` folder; use a
  repository-wide environment only for genuinely shared workflows.
- Use clickable relative links for local references in each file's native
  format.
- When code, configuration, or results change, update the nearest README or
  runbook with relevant environment, setup, run commands, inputs, outputs,
  results, and limitations.
- When paired English and Chinese documentation already exists, update both in
  the same task. Create a new language counterpart only when useful or
  explicitly requested.

## Memory and evaluation

| Layer | Location | Update rule | Hygiene |
|---|---|---|---|
| Global | `memory/MEMORY.md` | Portfolio or cross-project state changes | Keep under about 200 lines; prune aggressively |
| Project | `<Project>/PROJECT_MEMORY.md` | Every session that changes project state | Progress newest-first; keep about 30 lines |
| Task | `scratch/` or conversation | Current task only | Distill durable findings upward, then discard |

Evaluate research artifacts rather than empty ideas. Combine:

- hard checks for execution, reproducibility, real citations, claim-to-evidence
  links, and hypothesis coverage;
- rubric scoring for novelty, significance, soundness, evidence, rigor,
  clarity, reusability, and future potential; and
- LLM critique clearly separated from verified facts.

Store full reports under `<Project>/Evaluations/`; keep only summary state in
project and global memory.

## Repository navigation

[FILETREE.md](FILETREE.md) is the generated cold-start map of core files and
public top-level areas. Every public top-level directory owns an English
`index.md` whose H1 is followed by one plain-English summary sentence of at
most 20 words.

After adding, removing, or renaming a public top-level directory, or changing
its summary, run:

```bash
python research-skills-hub/open-paper-skills/filetree-simple/scripts/filetree.py generate
python research-skills-hub/open-paper-skills/filetree-simple/scripts/filetree.py lint
```

## Skills and OS extension

- [research-skills-hub/index.md](research-skills-hub/index.md) is the canonical
  skill-store entrypoint.
  Use `research-skill-installer` so `.agents/skills/` and `.claude/skills/`
  remain byte-identical.
- Review a third-party skill's `SKILL.md`, scripts, provenance, and license
  before installation.
- Keep project-local skills in both `<Project>/.agents/skills/` and
  `<Project>/.claude/skills/`; promote one to the hub after it proves useful
  across projects.
- Keep each hub collection's `index.md` and README aligned when its public skill
  inventory or descriptions change; use `skill-organizer` for new skills.
- Author skills around explicit behavior, branch routing, and checkable
  completion criteria. A fixed `scope / inputs / outputs / limitations` section
  layout is optional, not a repository requirement.
- Keep the OS core small: the entry chain, memory layers, and directory
  semantics. Extend through reusable skills and project templates; follow the
  [template contract](projects-folder/templates/index.md).
- Add plugin machinery, manifests, versioning, or a CLI only after an observed
  local need justifies them.

## Completion checks

Before finishing a change that touches `paper-wiki/`, an installed skill, a
public top-level `index.md`, or [FILETREE.md](FILETREE.md), run
[`./verify.sh`](verify.sh) from the repository root. It is a read-only,
agent-neutral check for paper-wiki validity, FILETREE drift, and installed-copy
sync for `paper-wiki-manager` and `filetree-simple`. Resolve every reported
inconsistency before committing.
