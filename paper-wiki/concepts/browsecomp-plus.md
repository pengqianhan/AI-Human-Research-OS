---
type: Benchmark
title: BrowseComp-Plus
description: A multi-hop deep-research QA benchmark with a verified offline corpus containing gold, evidence, and hard-negative documents.
resource: https://arxiv.org/abs/2508.06600
tags:
- benchmarks
- long-context-reasoning
- multi-hop-qa
- retrieval
timestamp: 2026-07-21T00:00:00Z
---

# Definition

BrowseComp-Plus (Chen et al., 2025) evaluates deep-research agents on multi-hop questions that require piecing together evidence from several documents. Its contribution over live-web deep-research evaluation is a fixed offline corpus of 100K documents, verified to contain the gold document, the supporting evidence documents, and hard negatives for every task. Removing the live search engine makes the retrieval surface identical across systems, so differences in score reflect the agent rather than the index it happened to hit.

Evaluations typically sample a subset of tasks and provide a subset of the corpus. The RLM paper uses 150 sampled tasks with 1000 randomly chosen documents per task, guaranteed to include the gold and evidence documents — a 6–11M token input that no current model can ingest directly. Scoring is percentage of correct answers.

# Papers

* [Recursive Language Models](../papers/2512.24601.md) - uses the 1K-document configuration as its beyond-the-window regime; RLM(GPT-5) reaches 91.33 where base GPT-5 cannot fit the input at all.

# Notes

Because the corpus subset size is a free parameter, BrowseComp-Plus numbers are only comparable when the document count, sample of tasks, and retriever (if any) match. The information density is constant rather than length-scaling — the answer depends on a few documents no matter how many are supplied — which makes it a test of search and filtering rather than of exhaustive aggregation.

# Related

* [OOLONG](oolong.md) — the complementary shape: aggregation over nearly every entry rather than multi-hop search for a few.
