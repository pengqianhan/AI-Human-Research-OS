---
type: Benchmark
title: Terminal-Bench
description: A benchmark suite for evaluating AI agents on hard, realistic tasks in command-line environments.
resource: https://arxiv.org/abs/2601.11868
tags:
- benchmarks
- shell-agents
- coding-agents
- agent-harness-engineering
timestamp: 2026-08-26T00:00:00Z
---

# Definition

Terminal-Bench evaluates AI agents on multi-step tasks performed through a command-line environment, including tool use, file manipulation, process management, and other long-horizon interactions with verifiable outcomes. It is useful for separating the contribution of a base model from the surrounding terminal-agent harness, although comparisons are only clean when models, tools, runtime surfaces, task splits, and scoring protocols are aligned.

# Papers

* [Toward Generalist Autonomous Research via Hypothesis-Tree Refinement](../papers/2606.11926.md) - uses Terminal-Bench 2.0 harness engineering as one of six Autonomous Optimization tasks for Arbor.
* [MemoHarness](../papers/2607.14159.md) - uses an 18-task held-out Terminal-Bench split for its main fixed-harness comparison, cross-model transfer study, and cost analysis.
* [LongHorizon-Harness](../papers/2608.01964.md) - evaluates on Terminal-Bench 2.1 via Harbor/Docker, improving Qwen 3.7-Plus with Claude Code from 69.7% to 77.2% success rate.
* [LLM-as-a-Verifier](../papers/2607.05391.md) - uses Terminal-Bench V2/2.0 as the primary testbed for its verification-scaling ablations (granularity, repeated evaluation, criteria decomposition) and its headline best-of-N selection result (86.5% vs. an 83.1% Pass@1 baseline, with a 98.9% oracle Pass@K ceiling).
* [StateM](../papers/2608.15089.md) - reports a 95.28% raw public-submission score on Terminal-Bench 2.1 with GPT-5.6 Sol xhigh via a frozen, GPT-5.5-developed control-layer runbook, while explicitly disclosing adjudication sensitivity (four/nine flagged trajectories scored as zero would give 94.38%/93.26%).
* [Recuris](../papers/2608.24876.md) - uses Terminal-Bench 2.1 (87 tasks, Terminus-2 agent) for its test-time adaptation mode specifically, because the benchmark's tasks share no tools or policies across each other — cross-task memory evolution admits no patch in thirteen runs, so only within-task retry-plus-adaptation applies, and the paper's own decomposition shows the attempt-budget/retry effect (+26.4 points) dominates the learning effect from adaptation itself (+2.3 points, interval including zero).
* [AutoSaddler](../papers/2608.23041.md) - automatically optimizes a Terminus 2 base harness on Terminal-Bench 2.0 (40 test tasks), raising Pass@1 from a 40.0% base to 50.0%, surpassing both automated baselines (GEPA 42.5%, Meta-Harness 43.3%) and the manually expert-tuned Terminus KIRA harness (47.5%).

# Notes

Results across these papers are not automatically comparable: they use Terminal-Bench in different optimization settings, model configurations, and evaluation protocols. StateM's own paper is a useful worked example of why: it reports its 95.28% figure as a raw, pre-adjudication public-submission score and separately discloses the adjudicated alternatives, rather than presenting one leaderboard number as final. Recuris is a further example from the other direction: it uses Terminal-Bench 2.1 specifically as a *negative* control for cross-task evolution, since the benchmark's lack of shared task structure is what forces the paper's within-task adaptation mode rather than its main cross-task loop. AutoSaddler is on the 2.0 rather than 2.1 split, so its numbers are not directly comparable to the 2.1-split papers above (StateM, LongHorizon-Harness, Recuris) despite the shared benchmark name; its own within-split comparison (against GEPA, Meta-Harness, and the manually-tuned Terminus KIRA, all also on 2.0) is the paper's actual apples-to-apples evidence.
