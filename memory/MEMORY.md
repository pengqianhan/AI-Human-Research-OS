# Research Memory (Global)

> Cross-project long-term memory. Read this for broad or cross-project work.
> Keep under ~200 lines: prune aggressively. Per-project context lives in
> `projects-folder/<ProjectName>/PROJECT_MEMORY.md`. Update rules: see
> [INSTRUCTION.md](../INSTRUCTION.md).

## Long-Term Research Goals

-

## Research Policy

| Policy | Value | Notes |
|---|---|---|
| `agent_led_research` | `off` | Options: `off`, `scout_only`, `full_gated`. Human-led research is the default; agent-led ideas require the configured gate. |
| `parallelism` | portfolio always on; intra-project parallelism on demand | Track multiple projects in the portfolio, but start intra-project multi-agent work only when a task is decomposable, verifiable, and worth the merge cost. |

## Active Projects

| Project | Path | Owner | Stage | Priority | Status | Evaluator | Next action |
|---|---|---|---|---|---|---|---|
| Example_Project (OS smoke test) | `projects-folder/Example_Project/` | mixed | complete | P2 | kept as worked example | n/a | delete if unwanted (decision D6 in [`HANDOFF.md`](../HANDOFF.md)) |

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
| 2026-07-16 | Durable construction guidance is unified in [`GOAL.md`](../GOAL.md); the old task files are deleted, and scoped execution contracts live under `build_phases/` | removes duplicated live guides; historical task provenance is pinned to commit `38d79be`, while operating truth remains INSTRUCTION, memory, and actual artifacts |
| 2026-07-04 | End goal repositioned by the user: evolve the repo into an agent-agnostic, agent-native Research OS — direction layer in [`GOAL.md`](../GOAL.md); research practice stays first, machinery stays evidence-gated | user direction; supersession details and milestones in [`HANDOFF.md`](../HANDOFF.md) |

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
