# Idea graph

The nodes and links the Idea view's mockup drew for nanochat_cpu
(os-ui/mockups/step2/views.html), written in the confirmed format. The two
links the mockup inferred rather than read are left out.

| ID | Kind | Statement | Status | Links | Points to | Source |
|---|---|---|---|---|---|---|
| Q1 | question | Does every stage run and does val bpb fall? | answered |  |  | paper_skeleton.md:83 (Experiments table, "Main result" row) |
| Q2 | question | Effect of a doubled Muon matrix LR | answered |  |  | paper_skeleton.md:84 (Experiments table, "Probe 1" row) |
| Q3 | question | Effect of a 2,048-token vocabulary | answered |  |  | paper_skeleton.md:85 (Experiments table, "Probe 2" row) |
| Q4 | question | Is the ~3-minute d1 example (0.84M params) the right first-run example for Research OS users, and should it be verified on another machine or OS? | open |  |  | PROJECT_MEMORY.md:18 ("Current question") |
| E1 | experiment | SFT at the demo's `--init-lr-frac 0.8` | done |  | commit: none; files: none | Code/README.md:91 (Recipe table, "SFT steps / LR" row) |
| E2 | experiment | Every stage: `bash runs/runcpu_small.sh all`, on 2026-09-26 | done | tests Q1 | commit: none; files: Code/results/summary.json, Code/results/training_metrics.csv | Code/README.md:122 ("Results") |
| E3 | experiment | Probe 1: the base recipe with `--matrix-lr=0.04` | done | tests Q2 | commit: none; files: Code/results/summary.json | Code/README.md:53 (stage "probe_lr") |
| E4 | experiment | Probe 2: a 2,048-token tokenizer, then the base recipe | done | tests Q3 | commit: none; files: Code/results/summary.json | Code/README.md:54 (stage "probe_vocab") |
| E5 | experiment | Run `bash runs/runcpu_small.sh all` on Linux or macOS | planned |  |  | PROJECT_MEMORY.md:38 (Open TODOs, marked optional) |
| R1 | result | At 0.8, SFT val bpb spiked from 2.29 to 2.63 and ended above its start | recorded | motivates E2 | from: E1 | Code/README.md:91; paper_skeleton.md:91–92 |
| R2 | result | Every stage exits 0; the whole example takes 2 min 57 s; peak RAM 1.0 GB (data download), training ≤ 0.94 GB | recorded | supports C1 | from: E2 | Code/README.md:18–19 (first run); Code/results/summary.json "stages" |
| R3 | result | Base val bpb 3.4564 → 2.2882 in 300 steps; SFT 2.2892 → 2.1456 in 40 steps | recorded | supports C2 | from: E2 | Code/results/summary.json "base_val_bpb", "sft_val_bpb"; paper_skeleton.md:89 |
| R4 | result | Two fresh runs gave identical val bpb to 6 decimals | recorded | supports C5 | from: E2 | Code/README.md:126–127 |
| R5 | result | Neutral through step 100, then slightly better; at step 300, 2.2761 against the baseline's 2.2882 (Δ −0.0121) | recorded | supports C3 | from: E3 | Code/README.md:158, 160–161 |
| R6 | result | Worse at every step; at step 300, 2.3840 against 2.2882 (Δ +0.0958); the gap narrows from 0.23 to 0.10 | recorded | supports C4 | from: E4 | Code/README.md:158, 162–163 |
| C1 | claim | every stage runs; whole pipeline 2 min 57 s, ≤ 1.0 GB RAM per process | verified |  | claim: C1 | paper_skeleton.md:115 |
| C2 | claim | base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456 | verified |  | claim: C2 | paper_skeleton.md:116 |
| C3 | claim | matrix LR ×2 ends 0.012 bpb lower | verified |  | claim: C3 | paper_skeleton.md:117 |
| C4 | claim | vocab 2,048 ends 0.096 bpb higher | verified |  | claim: C4 | paper_skeleton.md:118 |
| C5 | claim | runs are deterministic | verified |  | claim: C5 | paper_skeleton.md:119 |
