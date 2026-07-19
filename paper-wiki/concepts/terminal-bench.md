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
timestamp: 2026-07-18T23:48:25Z
---

# Definition

Terminal-Bench evaluates AI agents on multi-step tasks performed through a command-line environment, including tool use, file manipulation, process management, and other long-horizon interactions with verifiable outcomes. It is useful for separating the contribution of a base model from the surrounding terminal-agent harness, although comparisons are only clean when models, tools, runtime surfaces, task splits, and scoring protocols are aligned.

# Papers

* [Toward Generalist Autonomous Research via Hypothesis-Tree Refinement](../papers/2606.11926.md) - uses Terminal-Bench 2.0 harness engineering as one of six Autonomous Optimization tasks for Arbor.
* [MemoHarness](../papers/2607.14159.md) - uses an 18-task held-out Terminal-Bench split for its main fixed-harness comparison, cross-model transfer study, and cost analysis.

# Notes

Results across these papers are not automatically comparable: they use Terminal-Bench in different optimization settings, model configurations, and evaluation protocols.
