---
type: Benchmark
title: MemTrapBench
description: Benchmark of memory-induced cognitive traps, where faithfully recorded and relevant memories distort an LLM's reasoning or beliefs on the current task, in Reasoning Fixation and Belief Distortion scenarios.
resource: https://arxiv.org/abs/2608.20202
tags:
- benchmarks
- agent-memory
- memory-induced-failures
- agent-reliability
timestamp: 2026-11-06T00:00:00Z
---

# Definition

MemTrapBench (Wang et al., arXiv:2608.20202, "MemTrapBench: Benchmarking Cognitive Traps in LLM Memory Use", ZJUNLP) tests how retrieved memories reshape reasoning on the current task rather than whether they were stored and retrieved correctly. It covers two forms of trap: Reasoning Fixation, split in later papers into Task Boundary (prior task rules persisting), Cognitive Bias (overgeneralizing a strategy that once worked), and Trauma (avoidance after negative feedback), and Belief Distortion, tested with Safety scenarios where a historical counterfactual premise may override a current safety judgment. Each final query is answerable on its own, so results can be compared with answering without memory. Its paper reports that every evaluated memory strategy, across two model families and five memory frameworks, scores below the no-memory setting, and proposes AdaptiveMem, an inference-time instruction to avoid the traps. Answers are scored by an LLM judge. This description follows the paper's abstract and the benchmark descriptions in the papers below; the full paper has not been ingested.

# Papers

* [MemAdapter](../papers/2610.05162.md) - one of three benchmarks (1,050 instances; top-10 retrieved memories per query), scored with the official judge.
* [EvoMemState](../papers/2611.03743.md) - second memory-use benchmark (Safety, Cognitive Bias, Task Boundary, Trauma): best average with GPT-4o-mini (78.7), third with Qwen3-8B (79.1 against 79.9 for SimpleMem); removing its RL-trained rules costs 15.0 to 16.4 points.

# Notes

The two papers describe the judge scale differently: EvoMemState converts a 1-5 mean to a percentage, while the MemAdapter note records 0-5 scores. Neither compares against the benchmark's own AdaptiveMem.

# Related

* [MemSyco-Bench](memsyco-bench.md) - the companion memory-use benchmark both papers report.
