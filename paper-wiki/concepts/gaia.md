---
type: Benchmark
title: GAIA
description: Benchmark for general AI assistants of 466 real-world questions at three difficulty levels, simple for humans but requiring reasoning, multimodal handling, web browsing, and tool use, with answers scored by exact match after normalization.
resource: https://arxiv.org/abs/2311.12983
tags:
- benchmarks
- general-assistant-agents
- web-browsing
- tool-use
timestamp: 2026-11-09T00:00:00Z
---

# Definition

GAIA (Mialon et al., 2023) proposes real-world questions that need reasoning, multimodal handling, web browsing, and general tool use, and that are conceptually simple for people: its authors report 92% for human respondents against 15% for GPT-4 with plugins. It has 466 questions, with the answers to 300 withheld for a leaderboard. Questions fall into three difficulty levels and some include supplementary files. A prediction counts only if the complete final answer matches the reference under the evaluator's normalization rules, so partial answers score zero. The full paper has not been ingested; these details come from its abstract and from [EvoTeam](../papers/2610.39813.md).

# Papers

* [EvoTeam](../papers/2610.39813.md) - the 120-question validation subset, split 20 for evolution and 100 held out following Meta-Team; 78.00 under per-benchmark evolution and 77.00 under a mixed stream, against Meta-Team's 73.00 and 67.00, with Level 3 still at 38.46.
* [AREX-2](../papers/2609.38288.md) - deep-research benchmark, reaching 92.2 against 81.6 and 85.4 for earlier AREX models.
* [ContextPilot](../papers/2608.28476.md) - the text-only subset (103 examples, pass@1) among its deep-search evaluations.
* [OpenHands](../papers/2407.16741.md) - one of 15 existing benchmarks integrated into the platform.
* [HyperBrowseComp](../papers/2610.03574.md) - cited among web-browsing and search benchmarks that it extends with multilingual and multimodal evidence.
* [VisSearch-Bench](../papers/2611.04894.md) - cited for multi-step reasoning and tool use in realistic tasks.
* [The Last Mile to the Real World (HEELO)](../papers/2611.07461.md) - Navigation Primitives (ANTMAN) reach 58.3% on GAIA-Text-103 against 45.6% for iterative sparse retrieval.

# Notes

Papers use different subsets (the 120-question validation set, a 103-question text-only set), tool configurations, and pass@k conventions, so scores across them should not be read as one leaderboard. GAIA is separate from [GAIA2](gaia2.md), which tests dynamic, asynchronous assistant tasks in a simulated smartphone.
