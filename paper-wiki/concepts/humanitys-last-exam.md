---
type: Benchmark
title: Humanity's Last Exam
description: A 2,500-question, expert-written, multimodal closed-ended academic benchmark (multiple-choice and short-answer) built to stay hard for frontier LLMs; search and deep-research agents usually report its text-only subset.
resource: https://arxiv.org/abs/2501.14249
tags:
- benchmarks
- knowledge-reasoning
- deep-research
timestamp: 2026-10-01T00:00:00Z
---

# Definition

Humanity's Last Exam (HLE; Phan et al., 2025) is a closed-ended academic benchmark written by subject-matter experts worldwide to remain difficult after popular benchmarks such as MMLU saturated. It has 2,500 multiple-choice and short-answer questions across dozens of subjects, including mathematics, the humanities, and the natural sciences. Each question has an unambiguous, automatically gradable answer that cannot be found quickly by internet search. Part of the set is multimodal, so agent papers often report a text-only subset, sometimes graded by an LLM judge.

# Papers

* [AREX-2](../papers/2609.38288.md) - 52.6 on the text-only subset with no new search training data, above AREX (122B) at 52.4 and Iris-mini at 52.3 in its comparison table; several frontier rows in the same table use the full set.
* [Iris](../papers/2609.04304.md) - one of four headline benchmarks (text-only subset, official judge prompt): Iris-mini 52.3 and Iris-pro 56.4.
* [Raven](../papers/2609.33439.md) - text-only exact-match HLE is one of four sources in its pooled DeepResearch Mixed set; Raven-Research reaches 60.0% on its HLE questions with DeepSeek-V4-Flash, against at most 43.3% for the other harnesses.
* [Apodex 1.1](../papers/2608.23283.md) - one of its general-reasoning and deep-search benchmarks, where Apodex 1.1 scores below Claude Opus 5.
* [ASI-Bench](../papers/2608.17271.md) - cited as a knowledge-only benchmark with no execution or research autonomy, to motivate a benchmark that grades end-to-end research under withdrawn guidance.

# Notes

Scores are comparable only under the same subset and grading. Papers mix the full multimodal set with the text-only subset (AREX-2's table marks full-set rows), and Raven samples HLE questions into a pooled set rather than running the benchmark whole. Agent results also depend on the search tools and turn budget allowed.

# Related

* [Search agents](../topics/search-agents.md) - most papers in this wiki that report HLE do so as a deep-research or search-agent benchmark, with web tools enabled.
* [BrowseComp](browsecomp.md) - usually reported alongside HLE in the same deep-research tables.
