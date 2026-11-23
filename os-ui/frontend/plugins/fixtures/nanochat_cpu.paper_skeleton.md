# Paper Skeleton

Reusable manuscript control sheet. Keep claims traceable to references, notes,
data, code, figures, or experiment outputs.

## Snapshot

- Working title: nanochat on a Laptop CPU: a Three-Minute End-to-End Example
  for the AI-Human Research OS
- Target venue or audience: Research OS users running their first example; not
  submitted anywhere
- Status: draft
- One-sentence thesis: OpenResearch's nanochat demo, scaled to a 0.84M-parameter
  model, runs every stage on a laptop-class CPU in about three minutes, which
  makes it a runnable first example rather than a research result.
- Main research question: none; the paper documents an example project.
- Contributions:
  1. A one-command, staged, CPU-only port with documented code changes.
  2. Time, memory, and learning-curve measurements of every stage.
  3. The demo's two probes (matrix learning rate ×2, vocabulary 2,048) at this
     scale.

## Source Map

Relative links assume this template has been copied to
`projects-folder/<ProjectName>/`; follow the copied
[project entrypoint](index.md). Project-specific references live under
`paper/`.

| Asset | Link or path | Notes |
|---|---|---|
| Paper draft | [paper/main.tex](paper/main.tex) | LaTeX source; builds to `paper/main.pdf`. |
| Code and experiments | [Code/](Code/) | Port, runner, and tools; see [Code/README.md](Code/README.md). |
| Datasets | [Code/README.md](Code/README.md) "Data" | Downloaded into `Code/nanochat/.cache/`, not tracked. |
| Figures and tables | [paper/main.tex](paper/main.tex) | Figure 1 is drawn at build time from `Code/results/training_metrics.csv`; the SVGs in [Figs/](Figs/) serve the README. |
| Baselines | [Baselines/openresearch-demo/](Baselines/openresearch-demo/) | Unchanged reference-run evidence from the demo. |
| Bibliography | [paper/references.bib](paper/references.bib) | Each entry checked against its source on 2026-09-29. |
| Paper notes |  | None. |
| Ideas and meetings | [../../ideas/](../../ideas/) | Source idea `nanochat-cpu-baseline.md`. |

## Argument Map

| Element | Notes |
|---|---|
| Problem | Research OS users need one example they can run end to end on their own machine. |
| Gap in prior work | The OpenResearch demo needs over nine hours of pretraining on this CPU. |
| Key idea | Shrink model, data, and steps while keeping every stage and a similar data:parameter ratio. |
| What is new | Nothing scientifically; the port, its measurements, and its documentation. |
| Empirical support | `Code/results/summary.json`, `Code/results/training_metrics.csv`, and the first-run timings in `Code/README.md`. |
| Speculative or weak points | Single-seed probes; probe 2 also changes parameter count and bytes per step. |

## Abstract

- Problem -> gap -> method -> evidence -> implication: see the abstract in
  [paper/main.tex](paper/main.tex).

## Introduction

- Motivation and task: a first runnable example for Research OS users.
- Prior limitations: the demo's scale needs a GPU-class budget.
- Proposed approach: the scaled-down port in `Code/nanochat/`.
- Summary of results: 2 min 57 s end to end; base val bpb 3.456 → 2.288; SFT
  2.289 → 2.146.
- Contributions: see Snapshot.
- Intro figure or table: none.

## Related Work

Out of scope for this example; the paper cites only its sources (nanochat,
OpenResearch, Muon, and the datasets).

## Method

- Method overview: nanochat's pipeline unchanged in structure, with the recipe
  in Table 1 of the paper.
- Implementation source: [Code/README.md](Code/README.md) "Changes from the
  demo".

## Experiments

| Study | Question | Data | Baselines | Metric | Output | Claim |
|---|---|---|---|---|---|---|
| Main result | Does every stage run and does val bpb fall? | ClimbMix shard; SFT mixture at 1/128 | Demo reference run (not comparable in scale) | val bpb, wall time, peak RAM | `Code/results/summary.json` | C1, C2 |
| Probe 1 | Effect of a doubled Muon matrix LR | same | 300-step baseline | val bpb at matched steps | `summary.json` `probes_val_bpb` | C3 |
| Probe 2 | Effect of a 2,048-token vocabulary | same | 300-step baseline | val bpb at matched steps | `summary.json` `probes_val_bpb` | C4 |

## Results and Discussion

- Main quantitative result: base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456.
- Main qualitative result: the chat reply is nonsense, as expected.
- Negative or unexpected result: SFT at the demo's LR fraction 0.8 raised val
  bpb (2.29 → 2.63 spike).
- Interpretation: the example demonstrates the pipeline, not a model.
- Relation to prior work: none claimed.

## Limitations

- Method: single-seed probes; weight-decay scaling far outside its tuned range.
- Data and evaluation: SFT subsample of 1/128; mostly short conversations.
- Generalization: numbers say nothing about larger models.
- Reproducibility: only one Windows machine tested.

## Conclusion

- Final answer: the scaled port runs end to end on a CPU in about three minutes.
- Main evidence: C1–C2.
- Takeaway: a deterministic first example for the Research OS.

## Tracking

### Claims and Evidence

| Claim | Evidence | Source file or link | Citation/result | Status |
|---|---|---|---|---|
| C1: every stage runs; whole pipeline 2 min 57 s, ≤ 1.0 GB RAM per process | first-run stage log | [Code/README.md](Code/README.md) "What to expect", "Results" | fresh run 2026-09-26 | verified |
| C2: base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456 | logged runs | [Code/results/summary.json](Code/results/summary.json) | `base_val_bpb`, `sft_val_bpb` | verified |
| C3: matrix LR ×2 ends 0.012 bpb lower | probe run | [Code/results/summary.json](Code/results/summary.json) | `probe_lr2x` step 300 | verified |
| C4: vocab 2,048 ends 0.096 bpb higher | probe run | [Code/results/summary.json](Code/results/summary.json) | `probe_vocab2048` step 300 | verified |
| C5: runs are deterministic | two fresh runs identical to 6 decimals | [Code/README.md](Code/README.md) "Results" | recorded 2026-09-26 | verified |

### Figures and Tables

| Label | Purpose | Source data/code | Output file | Status |
|---|---|---|---|---|
| Table 1 | Recipe: demo vs this example | [Code/README.md](Code/README.md) "Recipe" | `paper/main.pdf` | final |
| Figure 1 | Pretraining val bpb, baseline and probes | [Code/results/training_metrics.csv](Code/results/training_metrics.csv) (pgfplots) | `paper/main.pdf` | final |
| Table 2 | Probe deltas at steps 0–300 | [Code/results/summary.json](Code/results/summary.json) | `paper/main.pdf` | final |

### Appendix and TODOs

- Appendix items: none.
- Open TODOs: Human Owner review of the draft.
