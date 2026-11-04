---
type: Benchmark
title: LOCA-Bench
description: Benchmark for language agents under controllable context growth, which scales environment state through mock MCP services while keeping task semantics fixed, across 15 task types, seven context lengths from 8K to 256K, and five seeds, scored by final-state evaluators.
resource: https://arxiv.org/abs/2602.07962
aliases:
- LOCA-bench
tags:
- benchmarks
- long-context-reasoning
- context-engineering
- tool-use
timestamp: 2026-11-05T00:00:00Z
---

# Definition

LOCA-Bench (Zeng et al., 2026) measures how language agents, evaluated as a model plus its scaffold, hold up as context grows during interaction rather than in a single long retrieval prompt. It controls environment state automatically, so the amount of information reachable through tools can grow while the task stays the same. Citing papers describe 15 task types, seven environment-description lengths (8K, 16K, 32K, 64K, 96K, 128K, and 256K), and five seeds, run against local mock MCP services and scored on the final environment state. Its authors report that performance generally degrades as states grow and that advanced context management can substantially raise success. The full LOCA-Bench paper has not been ingested.

# Papers

* [EvoTeam](../papers/2610.39813.md) - eight task types with 16 evolution cases at 96K and 240 held-out cases at other lengths and seeds; Meta-Team leads under per-benchmark evolution (69.58 against 63.75), and EvoTeam leads under mixed evolution (67.08 against 58.33), where removing its learned rules costs 8.75 points.
* [Beyond Memory](../papers/2610.01415.md) - one of four benchmarks, all 525 cases (15 task types, seven lengths, five seeds) with up to 100 MCP calls, and success reported against context length; its global audits run every 32 steps here rather than every 8.

# Notes

Environment-description length is distinct from the model's context window, as EvoTeam points out. The two papers use different task subsets and call budgets, so their scores are not comparable.

# Related

* [Context rot](context-rot.md) - the degradation the benchmark is built to measure.
