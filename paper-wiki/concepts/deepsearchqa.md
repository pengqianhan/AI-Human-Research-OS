---
type: Benchmark
title: DeepSearchQA
description: A deep-research question-answering benchmark used to evaluate agent search-and-synthesis capability.
tags:
- benchmarks
- deep-research-agents
timestamp: 2026-08-31T00:00:00Z
---

# Definition

DeepSearchQA is a deep-research benchmark referenced by this wiki's agentic-search and harness papers to evaluate how well an agent (backbone model plus harness) can search, gather, and synthesize evidence into an answer. Neither wiki paper referencing it has been fully read for the benchmark's own construction methodology (task count, scoring rubric, or corpus provenance) — this page currently records only how the two papers use it, not the benchmark's original source.

# Papers

* [JIT-Agent](../papers/2608.25593.md) - headline deep-research benchmark; GLM-5.2 equipped with a JIT-Agent-synthesized harness reaches 85.1-93.9 depending on backbone, the top score reported anywhere in the paper, improving on the strongest fixed-harness comparator by 4.7 points (85.1 vs. 80.4 on DeepSeek-V4-Flash).
* [Apodex 1.1](../papers/2608.23283.md) - one of several general-reasoning/deep-search benchmarks (alongside Humanity's Last Exam) used in Apodex's own comparison tables against Claude Opus 5 and other systems.
