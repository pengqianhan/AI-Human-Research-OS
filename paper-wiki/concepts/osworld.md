---
type: Benchmark
title: OSWorld
description: A benchmark for evaluating multimodal computer-use agents on open-ended, real-world desktop tasks executed inside real operating-system environments.
resource: https://arxiv.org/abs/2404.07972
tags:
- benchmarks
- gui-computer-use-agents
- agent-harness-engineering
timestamp: 2026-09-22T00:00:00Z
---

# Definition

OSWorld evaluates computer-use agents on long-horizon, open-ended tasks executed in real desktop-OS environments (file managers, browsers, office applications, and other real software) rather than a simplified simulator, scoring task completion against executable, environment-grounded checks. Its successor line, OSWorld 2.0 (also referenced as OSWorld-Verified in some papers), extends the original task set and evaluation infrastructure. Because it runs real applications rather than scripted mocks, it is a common testbed both for evaluating raw agent capability and for evaluating harness-level mechanisms (memory, verification, workflow guidance) layered on top of a base model.

# Papers

* [RSIAgent](../papers/2609.15364.md) - uses OSWorld 2.0 (0808 offline, 82 tasks) as one of two primary evaluation benchmarks; autonomously-constructed, verifier-gated causal memory raises GLM-5.3/Kimi-K3's partial score from 71.97 to 78.98 and binary accuracy from 37.80 to 42.68, exceeding GPT-6 Astra (72.60) and Claude Opus 5 (70.19) without weight updates.
* [LongHorizon-Harness](../papers/2608.01964.md) - uses OSWorld 2.0 (108 desktop-workflow tasks, official Docker VM infrastructure) as one of three matched-comparison benchmarks for its Manage-Execute-Audit harness, reporting binary and partial accuracy under a hybrid GUI+CLI tool pool where official baselines are GUI-only.
* [UI-Mate](../papers/2608.15930.md) - uses OSWorld-Verified as a primary benchmark for its base training stack (open-weight state-of-the-art general computer-use results) and, via the paired-protocol design of its own new OSWorkerBench, argues OSWorld's instruction-only setup cannot isolate whether a demonstration helps beyond what the instruction alone conveys.
* [RecreationWorld](../papers/2609.22000.md) - cites OSWorld 2.0 as the GUI-operation research line it positions its own hybrid GUI+code recreation task against, and separately uses it as one of five out-of-distribution transfer benchmarks: two model initializations fine-tuned on 35,000 recreation trajectories both finish above their first checkpoint on OSWorld 2.0 alongside four other external benchmarks, evidence the recreation training transfers to a benchmark it was never trained on.

# Notes

Results across these papers are not directly comparable: RSIAgent and LongHorizon-Harness both use the 0808-offline OSWorld 2.0 split but different backbone models, tool pools (RSIAgent's code-as-policy harness vs. LongHorizon-Harness's hybrid GUI+CLI pool), and mechanisms under test (frozen causal memory vs. an externalized Manage-Execute-Audit state layer), so neither paper's reported gain isolates the other's contribution. UI-Mate uses the OSWorld-Verified variant rather than 2.0, and its own stated motivation for introducing OSWorkerBench is precisely that OSWorld's instruction-only task format cannot measure what a same-task demonstration adds — a limitation this wiki's other two OSWorld-using papers do not address, since neither evaluates demonstration-conditioned performance. RecreationWorld's use is different in kind from all three papers above: rather than reporting a single-point OSWorld 2.0 score for a fixed mechanism, it tracks OSWorld 2.0 performance across two training checkpoint sweeps to evidence transfer from a differently-structured source task (application recreation) — its own paper is explicit that the resulting score trajectories are "not uniformly monotonic," so the OSWorld 2.0 numbers should be read as "finished above the first checkpoint," not as a smooth improvement curve.
