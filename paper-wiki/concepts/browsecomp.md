---
type: Benchmark
title: BrowseComp
description: A benchmark of hard-to-find factual questions, each built around a long-tail entity identified only through multiple indirect, mutually constraining clues, for evaluating web-browsing search agents.
resource: https://arxiv.org/abs/2504.12516
tags:
- benchmarks
- web-agents
- search-agents
timestamp: 2026-09-08T00:00:00Z
---

# Definition

BrowseComp (Wei et al., 2025) is a benchmark of short-answer questions deliberately constructed to resist easy lookup: each question identifies its target long-tail entity only through several indirect, mutually constraining clues, so a browsing or search agent must combine evidence gathered across multiple sources rather than resolve the answer from a single search. It has a Chinese-language counterpart, BrowseComp-ZH, evaluated under the same protocol on Chinese-language sources. BrowseComp is distinct from BrowseComp-Plus, a separate, longer-document deep-research variant already tracked in this wiki — the two should not be conflated when comparing reported scores.

# Papers

* [Iris](../papers/2609.04304.md) - primary headline benchmark (with BrowseComp-ZH); Iris-mini/Iris-pro report 82.2/88.6 on BrowseComp and 84.8/85.1 on BrowseComp-ZH, the paper's strongest reported open-source results in each parameter range.

# Related

* [BrowseComp-Plus](browsecomp-plus.md) - a separate, longer-document deep-research variant of the BrowseComp family already tracked in this wiki; several other wiki papers (Recursive Language Models, JIT-Agent) report on this "-Plus" variant rather than plain BrowseComp.
