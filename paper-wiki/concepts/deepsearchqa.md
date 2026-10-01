---
type: Benchmark
title: DeepSearchQA
description: A deep-research question-answering benchmark used to evaluate agent search-and-synthesis capability.
tags:
- benchmarks
- deep-research-agents
timestamp: 2026-10-01T22:25:31Z
---

# Definition

DeepSearchQA is a deep-research benchmark referenced by this wiki's agentic-search and harness papers to evaluate how well an agent (backbone model plus harness) can search, gather, and synthesize evidence into an answer. Neither wiki paper referencing it has been fully read for the benchmark's own construction methodology (task count, scoring rubric, or corpus provenance) — this page currently records only how the two papers use it, not the benchmark's original source.

# Papers

* [JIT-Agent](../papers/2608.25593.md) - headline deep-research benchmark; GLM-5.2 equipped with a JIT-Agent-synthesized harness reaches 85.1-93.9 depending on backbone, the top score reported anywhere in the paper, improving on the strongest fixed-harness comparator by 4.7 points (85.1 vs. 80.4 on DeepSeek-V4-Flash).
* [Apodex 1.1](../papers/2608.23283.md) - one of several general-reasoning/deep-search benchmarks (alongside Humanity's Last Exam) used in Apodex's own comparison tables against Claude Opus 5 and other systems.
* [Iris](../papers/2609.04304.md) - one of four headline evaluation benchmarks; Iris-mini/Iris-pro report 86.9/92.9 F1, the strongest scores among open-source search agents in their parameter ranges reported in the paper's own comparison table.
* [Context Language Models](../papers/2609.37725.md) - uses the DeepSearchQA rubric, applied by a GPT-5.4-nano judge, as the binary task reward when RL-training Qwen3.5-9B CLMs on OpenResearcher prompts.
