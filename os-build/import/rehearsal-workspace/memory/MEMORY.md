# Research Memory (Global)

> The rehearsal workspace's global memory, a placeholder that only a rehearsal
> export holds, never the import. It has the shape a workspace's programs read:
> the generator and `research-project-manager` read and write these tables. The
> one portfolio row is the example project's, as `research-project-manager sync`
> writes it.

## Long-Term Research Goals

-

## Research Policy

| Policy | Value | Notes |
|---|---|---|
| `agent_led_research` | `off` | Options: `off`, `scout_only`, `full_gated`. Human-led research is the default. |
| `parallelism` | portfolio always on; intra-project parallelism on demand | Start intra-project multi-agent work only when a task is decomposable, verifiable, and worth the merge cost. |
| `paper_sources` | [paper-sources.json](paper-sources.json) | Literature sources the `paper-search` skill may query; a source that is off stays off on every route. |

## Active Projects

| Project | Path | Owner | Stage | Priority | Status | Evaluator | Next action |
|---|---|---|---|---|---|---|---|
| nanochat_cpu | `projects-folder/nanochat_cpu/` | mixed | probe | P1 | runnable example with a short paper, 2026-09-29. `bash runs/runcpu_small.sh all` runs every stage in ~3 min on the i7-12700 CPU (see [Code/README.md](../projects-folder/nanochat_cpu/Code/README.md)); paper in [paper/main.pdf](../projects-folder/nanochat_cpu/paper/main.pdf); awaiting Human Owner review | nanochat's own val bpb (base and SFT) from the logged runs, in [Code/results/summary.json](../projects-folder/nanochat_cpu/Code/results/summary.json); no separate evaluator. Success criterion: every stage completes and base val bpb falls (3.456 → 2.288) | Human Owner reviews the README, figures, and short paper, then accepts or revises; accepting the 2026-09-26 dispatch run also completes GOAL.md H2 |

## Key Decisions (cross-project)

| Date | Decision | Why |
|---|---|---|
