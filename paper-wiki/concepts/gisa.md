---
type: Benchmark
title: GISA
description: A general information-seeking benchmark with structured item, set, list, and table answers for deterministic scoring.
resource: https://arxiv.org/abs/2602.08543
tags:
- benchmarks
- information-seeking
- web-agents
- multi-hop-reasoning
timestamp: 2026-07-21T22:58:23Z
---

# Definition

GISA (General Information-Seeking Assistant) evaluates agents on 373 human-crafted queries reflecting realistic search scenarios. Its answers use four structured formats—item, set, list, and table—so systems can be scored deterministically while tasks still require multi-hop reasoning and broad aggregation across sources.

Format-specific metrics help distinguish finding one fact from enumerating a complete set or assembling internally consistent rows. This makes GISA useful for testing whether a system's search process improves completeness rather than only producing plausible prose.

# Papers

* [SearchOS-V1](../papers/2607.15257.md) - evaluates whether relational coverage and shared search state improve completeness across all four GISA formats.

# Notes

SearchOS reports best-of-three (`Max@3`) results on GISA. Comparisons should therefore align run aggregation as well as models, tools, search budgets, and wall-clock limits.

# Related

* [WideSearch](widesearch.md) — focuses specifically on collecting broad bilingual fact sets into complete tables.
