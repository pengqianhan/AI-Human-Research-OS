# Project Memory

> Project-local memory. An agent updates this at the end of any session that
> changes project state. Keep it short; details belong in `paper_skeleton.md`,
> `paper/main.tex`, `paper/references.bib`, or `Code/README.md`.

## Snapshot

- Project name: nanochat_cpu
- Started: 2026-09-26 — from idea: [OpenResearch's default nanochat demo, scaled to train on this workstation's CPU](../../ideas/nanochat-cpu-baseline.md)
- Goal (one sentence): Reproduce OpenResearch's default nanochat demo at a CPU-sized scale: an end-to-end tokenizer, pretraining, SFT, and chat baseline plus its learning-rate and vocabulary probes.
- Owner: mixed
- Origin: OpenResearch default demo (alphaXiv/OpenResearch 27cb342, demo/nanochat; nanochat by Andrej Karpathy, MIT), requested by the Human Owner 2026-09-26
- Stage: probe
- Priority: P1
- Status: runnable example, 2026-09-26. Port done; `bash runs/runcpu_small.sh all` runs every stage in ~3 min on the i7-12700 CPU (see [Code/README.md](Code/README.md)); awaiting Human Owner review
- Evaluator status: nanochat's own val bpb (base and SFT) from the logged runs, in [Code/results/summary.json](Code/results/summary.json); no separate evaluator. Success criterion: every stage completes and base val bpb falls (3.456 → 2.288)
- Current question: Is the ~3-minute d1 example (0.84M params) the right first-run example for Research OS users, and should it be verified on another machine or OS?
- Next action: Human Owner reviews the README, the figures, and the ported diff, then decides on acceptance and commit

## Key Decisions

| Date | Decision | Why | Where reflected |
|---|---|---|---|
| 2026-09-26 | Make the project a minimal runnable OS example, not a research result: d1, width 64, vocab 4,096, 300 base / 40 SFT steps, ~3 min, < 1 GB RAM | Human Owner: every user should be able to run it once; the OS is the focus | [Code/README.md](Code/README.md), [runs/runcpu_small.sh](Code/nanochat/runs/runcpu_small.sh) |

## Progress Log

<!-- newest first, one dated bullet per session, keep ≤ ~30 lines -->

- 2026-09-26 — Ported OpenResearch `demo/nanochat` (27cb342, base + experiment overrides) into `Code/nanochat/`. Code changes: a switchable `torch.compile` (off on CPU), download-time SFT subsampling (`--data-keep-every`), and a CORE prompt-crop fix. Added a staged runner and logging/summary tools. Scope moved during the session from a ~30-min d2 baseline to a ~3-min d1 example, following the Human Owner's direction. Fresh run: baseline 89 s, whole example 2 min 57 s, peak RAM ≤ 1.0 GB, downloads ~0.2 GB of data, disk ~0.9 GB. Base val bpb 3.456 → 2.288; SFT 2.289 → 2.146; chat reply is nonsense, as expected. Probes at step 300: matrix lr ×2 −0.012 bpb; vocab 2,048 +0.096 bpb. d2–d6 cost measurements are recorded as scaling notes in [Code/README.md](Code/README.md).

## Open TODOs

- [ ] Human Owner review and commit of the port, READMEs, results, and figures
- [ ] Optional: run `bash runs/runcpu_small.sh all` on Linux or macOS (only Windows is tested)
