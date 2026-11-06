---
type: Benchmark
title: MemSyco-Bench
description: Benchmark of memory-induced sycophancy with five tasks testing when a retrieved memory should influence an agent's answer and how a valid memory should be used.
resource: https://arxiv.org/abs/2607.01071
tags:
- benchmarks
- agent-memory
- memory-induced-sycophancy
- personalization
timestamp: 2026-11-06T00:00:00Z
---

# Definition

MemSyco-Bench (Xiang et al., arXiv:2607.01071, "MemSyco-Bench: Benchmarking Sycophancy in Agent Memory") evaluates whether retrieved memories make an agent over-align with its user at the cost of factual accuracy or objective reasoning. Its five tasks ask whether an agent can reject memory as factual evidence, respect a memory's applicable scope, resolve conflicts between memory and objective evidence, track memory updates, and use valid memory for personalization. Wiki papers group them as When to Use Memory (Objective Fact Judgment, Contextual Scope Control, Memory-Evidence Conflict) and How to Use Memory (Personalized Memory Use, Valid Memory Selection). Each instance introduces user information through a multi-turn dialogue and tests its use in a final request. Metrics include accuracy, a sycophancy rate (responses that follow a misleading memory), and correct use of valid memory. This description follows the paper's abstract and the benchmark descriptions in the papers below; the full paper has not been ingested.

# Papers

* [MemAdapter](../papers/2610.05162.md) - main benchmark (all 1,550 instances: 300 for each When-to-Use task, 300 for Personalized Memory Use, 350 for Valid Memory Selection); with DeepSeek-V4-Flash its training-free post-retrieval layer raises When-to-Use accuracy to 87.89-91.22 and How-to-Use to 82.15-89.39 across five memory systems.
* [EvoMemState](../papers/2611.03743.md) - main memory-use benchmark: 57.6 average accuracy with Qwen3-8B and 58.9 with GPT-4o-mini, 12.2 and 5.9 points above the best of nine memory systems, with the lowest sycophancy rate; its Valid Memory Selection subset is used for the preliminary studies.

# Notes

Both papers in this wiki share authors with the benchmark (Zhishang Xiang, Zerui Chen, Qinggang Zhang, and Jinsong Su among them), and EvoMemState's training data is built to the same pattern. Their numbers are not comparable with each other: MemAdapter reports a DeepSeek-V4-Flash backbone and 4-bit Qwen3-8B, EvoMemState full-precision Qwen3-8B and GPT-4o-mini with its own memory pipeline.

# Related

* [MemTrapBench](memtrapbench.md) - the companion memory-use benchmark both papers also report.
