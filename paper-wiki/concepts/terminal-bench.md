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
timestamp: 2026-08-20T00:00:00Z
---

# Definition

Terminal-Bench evaluates AI agents on multi-step tasks performed through a command-line environment, including tool use, file manipulation, process management, and other long-horizon interactions with verifiable outcomes. It is useful for separating the contribution of a base model from the surrounding terminal-agent harness, although comparisons are only clean when models, tools, runtime surfaces, task splits, and scoring protocols are aligned.

# Papers

* [Toward Generalist Autonomous Research via Hypothesis-Tree Refinement](../papers/2606.11926.md) - uses Terminal-Bench 2.0 harness engineering as one of six Autonomous Optimization tasks for Arbor.
* [MemoHarness](../papers/2607.14159.md) - uses an 18-task held-out Terminal-Bench split for its main fixed-harness comparison, cross-model transfer study, and cost analysis.
* [LongHorizon-Harness](../papers/2608.01964.md) - evaluates on Terminal-Bench 2.1 via Harbor/Docker, improving Qwen 3.7-Plus with Claude Code from 69.7% to 77.2% success rate.
* [LLM-as-a-Verifier](../papers/2607.05391.md) - uses Terminal-Bench V2/2.0 as the primary testbed for its verification-scaling ablations (granularity, repeated evaluation, criteria decomposition) and its headline best-of-N selection result (86.5% vs. an 83.1% Pass@1 baseline, with a 98.9% oracle Pass@K ceiling).
* [StateM](../papers/2608.15089.md) - reports a 95.28% raw public-submission score on Terminal-Bench 2.1 with GPT-5.6 Sol xhigh via a frozen, GPT-5.5-developed control-layer runbook, while explicitly disclosing adjudication sensitivity (four/nine flagged trajectories scored as zero would give 94.38%/93.26%).

# Notes

Results across these papers are not automatically comparable: they use Terminal-Bench in different optimization settings, model configurations, and evaluation protocols. StateM's own paper is a useful worked example of why: it reports its 95.28% figure as a raw, pre-adjudication public-submission score and separately discloses the adjudicated alternatives, rather than presenting one leaderboard number as final.
