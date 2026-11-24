# Idea graph

nanochat_cpu's questions, experiments, results, and claims, one row each, and
the links between them, in the table the desktop app's Idea view draws. Every
row was written on 2026-11-25 from the project's own files; its Source cell
names the file and line its statement, status, and links rest on. The project
records no hypotheses, and its 2026-09-26 runs recorded no commit. Two links
the Idea view's mockup inferred and no file states are left out: E1 tests Q1,
and E5 tests Q4. The format is stated in the
[template's idea_graph.md](../templates/ai_research_template/idea_graph.md).

| ID | Kind | Statement | Status | Links | Points to | Source |
|---|---|---|---|---|---|---|
| Q1 | question | Does every stage run and does val bpb fall? | answered |  |  | paper_skeleton.md:83 (Experiments table, "Main result" row; its claims C1 and C2 are verified at :115–116) |
| Q2 | question | Effect of a doubled Muon matrix LR | answered |  |  | paper_skeleton.md:84 (Experiments table, "Probe 1" row; its claim C3 is verified at :117) |
| Q3 | question | Effect of a 2,048-token vocabulary | answered |  |  | paper_skeleton.md:85 (Experiments table, "Probe 2" row; its claim C4 is verified at :118) |
| Q4 | question | Is the ~3-minute d1 example (0.84M params) the right first-run example for Research OS users, and should it be verified on another machine or OS? | open |  |  | PROJECT_MEMORY.md:18 ("Current question"; :19, the next action is the Human Owner's review) |
| E1 | experiment | SFT at the demo's `--init-lr-frac 0.8` | done |  | commit: none; files: none | Code/README.md:91 (Recipe table, "SFT steps / LR" row, which records what the run did; also paper_skeleton.md:91–92). No result file and no commit record the run |
| E2 | experiment | Every stage: `bash runs/runcpu_small.sh all`, on 2026-09-26 | done | tests Q1 | commit: none; files: Code/results/summary.json, Code/results/training_metrics.csv | Code/README.md:122–124 ("Results"); :126–129, the command was run more than once: two fresh runs gave identical val bpb, the README's timings are from the first run, and summary.json's stage timings from the last, a re-run with the data cached (the files do not say how many runs there were); tests Q1: paper_skeleton.md:83, the "Main result" study asks Q1 and outputs Code/results/summary.json |
| E3 | experiment | Probe 1: the base recipe with `--matrix-lr=0.04` | done | tests Q2 | commit: none; files: Code/results/summary.json, Code/results/training_metrics.csv | Code/README.md:53 (stage "probe_lr", measured 47.1 s; one of the stages `all` runs, :41); tests Q2: paper_skeleton.md:84; files: summary.json "probes_val_bpb" → "probe_lr2x", and the rows of training_metrics.csv whose run is "probe_lr2x" |
| E4 | experiment | Probe 2: a 2,048-token tokenizer, then the base recipe | done | tests Q3 | commit: none; files: Code/results/summary.json, Code/results/training_metrics.csv | Code/README.md:54 (stage "probe_vocab", measured 3.3 s + 35.1 s; one of the stages `all` runs, :41); tests Q3: paper_skeleton.md:85; files: summary.json "probes_val_bpb" → "probe_vocab2048", and the rows of training_metrics.csv whose run is "probe_vocab2048" |
| E5 | experiment | Run `bash runs/runcpu_small.sh all` on Linux or macOS | planned |  |  | PROJECT_MEMORY.md:39 (Open TODOs, unchecked and marked optional; Code/README.md:230–232, only Windows was tested) |
| R1 | result | At 0.8, SFT val bpb spiked from 2.29 to 2.63 and ended above its start | recorded | motivates E2 | from: E1 | Code/README.md:91; paper_skeleton.md:91–92; motivates E2: Code/README.md:91 gives the spike as the reason ("Why") the recipe's SFT uses `--init-lr-frac=0.1` (:51), which E2 runs |
| R2 | result | Every stage exits 0; the whole example takes 2 min 57 s; peak RAM 1.0 GB (data download), training ≤ 0.94 GB | recorded | supports C1 | from: E2 | Code/README.md:18–19 (the first run); Code/results/summary.json "stages", each "exit" 0 (the last, warm-cache re-run: Code/README.md:127–129); supports C1: paper_skeleton.md:115 |
| R3 | result | Base val bpb 3.4564 → 2.2882 in 300 steps; SFT 2.2892 → 2.1456 in 40 steps | recorded | supports C2 | from: E2 | Code/results/summary.json "base_val_bpb" (3.456354 → 2.288206), "sft_val_bpb" (steps 0 to 39); paper_skeleton.md:89; supports C2: paper_skeleton.md:116 |
| R4 | result | Two fresh runs gave identical val bpb to 6 decimals | recorded | supports C5 | from: E2 | Code/README.md:126–127; supports C5: paper_skeleton.md:119 |
| R5 | result | Neutral through step 100, then slightly better; at step 300, 2.2761 against the baseline's 2.2882 (Δ −0.0121) | recorded | supports C3 | from: E3 | Code/README.md:158, 160–161; Code/results/summary.json "probes_val_bpb" → "probe_lr2x" → "300"; supports C3: paper_skeleton.md:117 |
| R6 | result | Worse at every step; at step 300, 2.3840 against 2.2882 (Δ +0.0958); the gap narrows from 0.23 to 0.10 | recorded | supports C4 | from: E4 | Code/README.md:158, 162–163; Code/results/summary.json "probes_val_bpb" → "probe_vocab2048" → "300"; supports C4: paper_skeleton.md:118 |
| C1 | claim | every stage runs; whole pipeline 2 min 57 s, ≤ 1.0 GB RAM per process | verified |  | claim: C1 | paper_skeleton.md:115 (Claims and Evidence, row C1) |
| C2 | claim | base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456 | verified |  | claim: C2 | paper_skeleton.md:116 (Claims and Evidence, row C2) |
| C3 | claim | matrix LR ×2 ends 0.012 bpb lower | verified |  | claim: C3 | paper_skeleton.md:117 (Claims and Evidence, row C3) |
| C4 | claim | vocab 2,048 ends 0.096 bpb higher | verified |  | claim: C4 | paper_skeleton.md:118 (Claims and Evidence, row C4) |
| C5 | claim | runs are deterministic | verified |  | claim: C5 | paper_skeleton.md:119 (Claims and Evidence, row C5) |
