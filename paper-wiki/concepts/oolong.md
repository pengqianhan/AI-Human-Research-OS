---
type: Benchmark
title: OOLONG
description: A long-context benchmark whose answers depend on semantically transforming and then aggregating nearly every entry of the input.
resource: https://arxiv.org/abs/2511.02817
tags:
- benchmarks
- long-context-reasoning
- information-aggregation
timestamp: 2026-08-26T00:00:00Z
---

# Definition

OOLONG (Bertsch et al., 2025) evaluates long-context reasoning and aggregation: each task requires examining chunks of the input, applying a semantic transformation to them, and aggregating the results into a final answer. It contrasts with needle-in-a-haystack benchmarks, where the amount of information that must be processed stays roughly constant as the input grows. In OOLONG the answer depends on nearly every entry, so processing cost scales linearly with input length — which is why models degrade on it at far shorter inputs than on retrieval-shaped tasks.

The `trec_coarse` split, used in the RLM evaluation, asks the model to infer each question's answer type (description and abstract concept, entity, human being, numeric value, location, abbreviation) without being given labels, then aggregate over those inferred labels. Scoring is exact match for non-numeric answers and `0.75^|y - ŷ|` for numeric ones.

**OOLONG-Pairs** is a derived variant introduced by the RLM paper: 20 hand-written queries over `trec_coarse` that require aggregating *pairs* of entries, so both processing cost and output length scale quadratically. It is scored by F1 and is the setting where frontier base models score below 0.1%.

# Papers

* [Recursive Language Models](../papers/2512.24601.md) - uses the 50-task `trec_coarse` split as its linear-density benchmark and constructs OOLONG-Pairs as a quadratic-density extension; recursive sub-calls matter most on both.
* [Prime Agent](../papers/2608.23552.md) - uses OOLONG and OOLONG-Pairs as two of eight benchmarks in its long-context information-management suite (RQ2), comparing three model families against their own native or popular harnesses rather than against a base model, and reporting Prime Agent generally competitive with harnesses that did not use a model trained around them.

# Notes

OOLONG is useful precisely as a counterexample to length-only long-context evaluation: a system can look strong on million-token NIAH and still fail at 131K tokens here. When comparing results, check the split, the scoring function, and whether the variant is the original benchmark or the RLM paper's Pairs modification. Prime Agent's use is a harness-vs-harness comparison (its RLM abstraction wrapped in Prime Agent vs. each model's native or popular harness) rather than the RLM paper's own base-model-vs-RLM ablation, so the two papers' OOLONG numbers are not directly comparable without checking which baseline each is measured against.
