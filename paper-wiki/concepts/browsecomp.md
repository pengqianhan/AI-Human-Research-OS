---
type: Benchmark
title: BrowseComp
description: A benchmark of hard-to-find factual questions, each built around a long-tail entity identified only through multiple indirect, mutually constraining clues, for evaluating web-browsing search agents.
resource: https://arxiv.org/abs/2504.12516
tags:
- benchmarks
- web-agents
- search-agents
timestamp: 2026-10-01T00:00:00Z
---

# Definition

BrowseComp (Wei et al., 2025) is a benchmark of short-answer questions deliberately constructed to resist easy lookup: each question identifies its target long-tail entity only through several indirect, mutually constraining clues, so a browsing or search agent must combine evidence gathered across multiple sources rather than resolve the answer from a single search. It has a Chinese-language counterpart, BrowseComp-ZH, evaluated under the same protocol on Chinese-language sources. BrowseComp is distinct from BrowseComp-Plus, a separate, longer-document deep-research variant already tracked in this wiki — the two should not be conflated when comparing reported scores.

# Papers

* [Iris](../papers/2609.04304.md) - primary headline benchmark (with BrowseComp-ZH); Iris-mini/Iris-pro report 82.2/88.6 on BrowseComp and 84.8/85.1 on BrowseComp-ZH, the paper's strongest reported open-source results in each parameter range.
* [ZGCM-1](../papers/2609.13356.md) - a from-scratch 7B model reporting 19.43 with a 64-step ReAct harness. Its comparisons (e.g., Claude 4 Sonnet 12.20, Qwen3-235B-A22B 2.30) are taken from other reports rather than same-harness reruns.
* [Raven](../papers/2609.33439.md) - one of four sources pooled in DeepResearch Mixed; with DeepSeek-V4-Flash, Raven-Research answers 69.3% of its BrowseComp questions against at most 62.4% for MiroFlow and DeepSeek-Harness on the same backbone and search tools, with one LLM-judged attempt per question.
* [AREX-2](../papers/2609.38288.md) - 84.0 with no new search training data; under a recursive research process with no correctness feedback, accuracy rises from 64.8 at 47 turns to 84.0 at 143 turns, more than 12 points ahead of AREX (122B) at about 140 turns.

# Related

* [BrowseComp-Plus](browsecomp-plus.md) - a separate, longer-document deep-research variant of the BrowseComp family already tracked in this wiki; several other wiki papers (Recursive Language Models, JIT-Agent) report on this "-Plus" variant rather than plain BrowseComp.
