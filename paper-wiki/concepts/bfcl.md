---
type: Benchmark
title: BFCL (Berkeley Function-Calling Leaderboard)
description: Executable function-calling benchmark and leaderboard for evaluating whether LLMs choose the right tools and produce correct arguments across unseen schemas, with single-turn, multi-turn, and relevance-detection categories that later versions extend toward agentic evaluation.
tags:
- benchmarks
- tool-calling
- function-calling
timestamp: 2026-09-28T00:00:00Z
---

# Definition

BFCL (Berkeley Function-Calling Leaderboard; Patil et al., ICML 2025) evaluates how well a language model calls functions. The model must pick the right function or functions from provided schemas and emit arguments that match the expected call, judged by abstract-syntax-tree (AST) matching or execution. Categories include single-turn calls, multi-turn interaction, and relevance detection (recognizing when no provided function applies). The versions cited in this wiki are V3 and V4, which grow from atomic single-turn calls toward multi-turn and agentic evaluation. Because papers report different versions and category subsets, BFCL numbers are only comparable when version and categories match.

# Papers

* [SLCA-GRPO](../papers/2609.29050.md) - out-of-distribution test on BFCL V3 *single-turn only*, with relevance detection excluded. Segment-locked credit assignment beats matched GRPO by +0.40 / +1.36 / +3.35 pp at 3B / 7B / 8B (8B: 70.31% vs. 66.96%).
* [NeoHorse-1](../papers/2609.08183.md) - BFCL V4 is one of its agentic tool-use benchmarks, and part of the 5-benchmark subset used for its data ablations.
* [Atria Dawn](../papers/2609.15818.md) - lists BFCL v4 among the 12 General Agentic Intelligence benchmarks in its model-evaluation table.
* [Iris](../papers/2609.04304.md) - cites BFCL as a general tool-use domain, not targeted in training, to which its search-specialized data and models transferred positively.

# Notes

These four papers use at least two BFCL versions (V3, V4) and, in SLCA-GRPO's case, an explicit category subset. None of their BFCL numbers should be compared across papers without matching version and categories.
