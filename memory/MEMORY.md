# Research Memory (Global)

> Cross-project long-term memory. Read this for broad or cross-project work.
> Keep under ~200 lines: prune aggressively. Per-project context lives in
> `projects-folder/<ProjectName>/PROJECT_MEMORY.md`. Update rules: see
> [AGENTS.md](../AGENTS.md).

## Long-Term Research Goals

-

## Research Policy

| Policy | Value | Notes |
|---|---|---|
| `agent_led_research` | `off` | Options: `off`, `scout_only`, `full_gated`. Human-led research is the default; agent-led ideas require the configured gate, provenance, a stage, bounded resources, and the same evaluator protocol. |
| `parallelism` | portfolio always on; intra-project parallelism on demand | Track multiple projects in the portfolio, but start intra-project multi-agent work only when a task is decomposable, verifiable, and worth the merge cost. |

## Active Projects

| Project | Path | Owner | Stage | Priority | Status | Evaluator | Next action |
|---|---|---|---|---|---|---|---|
| Example_Project (OS pipeline smoke test) | `projects-folder/Example_Project/` | mixed | probe | P1 | smoke-test vehicle; Pi route superseded 2026-09-26 by the os-harness route (ADR-0003); waits for the Human Owner to choose the next harness step | reproducible linear fit (`Code/fit_line.py`) and 20-seed stability run (`Code/multi_seed.py`); no frozen evaluator | Human Owner reviews and accepts or revises the multi-seed smoke-test run (uncommitted), then decides the next harness step |
| nanochat_cpu | `projects-folder/nanochat_cpu/` | mixed | probe | P1 | runnable example, 2026-09-26. Port done; `bash runs/runcpu_small.sh all` runs every stage in ~3 min on the i7-12700 CPU (see [Code/README.md](Code/README.md)); awaiting Human Owner review | nanochat's own val bpb (base and SFT) from the logged runs, in [Code/results/summary.json](Code/results/summary.json); no separate evaluator. Success criterion: every stage completes and base val bpb falls (3.456 → 2.288) | Human Owner reviews the README, the figures, and the ported diff, then decides on acceptance and commit |

## Key Decisions (cross-project)

| Date | Decision | Why |
|---|---|---|
| 2026-06-12 | Research OS normalized: entry chain (AGENTS/CLAUDE → INSTRUCTION → FILETREE → memory), six core workflows, 3-layer memory, hub-as-store skill lifecycle | historical normalization brief at Git commit `38d79be`; see [`HANDOFF.md`](../HANDOFF.md) |
| 2026-06-17 | Projects live under `projects-folder/<ProjectName>/`; templates live under `projects-folder/templates/<TemplateName>/` | keeps the repository root compact as project count grows, while leaving room for discipline- or format-specific templates |
| 2026-06-12 | Plugin model: small fixed core (entry chain, memory layers, directory semantics) + two plugin types — skills and project templates; `Templates/` container deferred until a second template exists; no plugin manager / manifest / versioning / CLI | keeps the OS open and extensible without machinery (INSTRUCTION.md → Extending the OS) |
| 2026-07-03 | Research OS positioned as a file-system-native environment for long-horizon human-agent research | aligns with the environment-engineering lesson from EurekAgent while keeping the repository plain-file and human-steered |
| 2026-07-03 | Shared paper library has three layers: paper notes, topic synthesis pages, and project-specific usage records | keeps paper understanding reusable across projects while preserving each project's claim/evidence trail |
| 2026-07-03 | Unified evaluator protocol applies to human-led and agent-led research: hard checks + rubric scoring + LLM critique | avoids judging empty ideas or polished prose without runnable, traceable artifacts |
| 2026-07-03 | Agent-led research is gated by `agent_led_research` (`off`, `scout_only`, `full_gated`) | preserves human-led research as the default while leaving room for controlled agent-owned research lanes |
| 2026-07-16 | [`GOAL.md`](../os-build/GOAL.md) is the Long-term Research OS vision; `os-build/build_phases/` is the Research OS MVP execution layer; [`CONTEXT.md`](../CONTEXT.md) defines shared domain language; old task files remain deleted | separates long-term intent from executable MVP contracts while operating truth remains INSTRUCTION, memory, and actual artifacts |
| 2026-07-04 | End goal repositioned by the user: evolve the repo into an agent-agnostic, agent-native Research OS — direction layer in [`GOAL.md`](../os-build/GOAL.md); research practice stays first, machinery stays evidence-gated | user direction; supersession details and milestones in [`HANDOFF.md`](../HANDOFF.md) |
| 2026-07-17 | External repositories and walk-through notes used to build the Research OS live under [`os-build/references/`](../os-build/references/) | co-locates construction evidence with the OS-build layer while preserving a read-only reference boundary |
| 2026-07-17 | `FILETREE.md` is a Git-independent generated map of core files and public top-level areas; each area owns its English summary in `index.md` | keeps cold-start context compact while delegating deeper navigation to local indexes |
| 2026-07-19 | Current MVP uses Pi Coding Agent's existing TUI for one human-supervised, file-native Research Run; after a successful SDK hello, the uncommitted `os-runtime/` spike was deleted and SDK/custom runtime work deferred until reference-project study | prevents historical runtime code from competing with the active workflow route; project files remain authoritative and Git optional |
| 2026-07-19 | `Paper_VAE` is temporarily removed; `Example_Project` is the workflow smoke test; `circle_packing` is the first real project after the smoke test | separates low-risk OS validation from real research and prevents a removed legacy project from remaining an implicit governance dependency |
| 2026-09-23 | Research Projects are managed through the `research-project-manager` skill: a project's `PROJECT_MEMORY.md` Snapshot is the source of its state, its Active Projects row is a projection written by `sync`, and `validate` runs inside `./verify.sh` | removes the hand-maintained duplicate between project memory and this table; decisions in [`HANDOFF.md`](../HANDOFF.md) |
| 2026-09-23 | `os-build/map/` and `os-build/build_phases/` deleted by the Human Owner; construction status returns to HANDOFF Active Work, [`GOAL.md`](../os-build/GOAL.md) keeps direction and gates, ADRs keep architecture decisions | the map had driven no work since 2026-07-23 and its live route was stalled on human verification; last version at Git `0f1805c` |
| 2026-09-26 | The OS drives Claude Code and Codex through their official CLIs on the Human Owner's own subscriptions, via [`os-harness/`](../os-harness/README.md) (ADR-0003); this supersedes the Pi Coding Agent TUI route (ADR-0002), and Pi stays the intended long-term engine | fastest working route without API keys or token handling; the adapter layering follows alphaXiv OpenResearch; decisions in [`HANDOFF.md`](../HANDOFF.md) |
| 2026-09-26 | [`GOAL.md`](../os-build/GOAL.md) revised by the Human Owner: one root agent is the human's single point of contact, project work runs on the human's own subscriptions, and traces feed reflection (H1–H3). The root agent is any code agent at the repository root following the `project-dispatch` skill (ADR-0004) | adopted the agent's draft; replaces the Pi-centred M2 and lifts the M4 gate for request-driven dispatch |
| 2026-09-27 | The planned `circle_packing` project is cancelled before instantiation; `Example_Project` and `nanochat_cpu` are the two example projects, and no further project is queued | Human Owner decision: the OS is the focus and two examples suffice; history in [`HANDOFF.md`](../HANDOFF.md) |

## Lessons and Principles

<!-- promote to research-skills-hub/ only when useful across multiple projects -->

- Keep project bibliography entries in
  `projects-folder/<ProjectName>/paper/references.bib` and build in place from
  `projects-folder/<ProjectName>/paper/`. This writes
  `projects-folder/<ProjectName>/paper/main.pdf` directly and avoids external-output-directory
  BibTeX path issues.
- Promote project experience only when it generalizes: project-only facts stay
  in `PROJECT_MEMORY.md`, cross-project principles go to memory, and repeatable
  procedures become skills only when another project agent can execute them
  without local context.
