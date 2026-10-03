---
type: Benchmark
title: OfficeQA
description: Enterprise grounded-reasoning benchmark of 246 numeric questions over roughly 89,000 pages of U.S. Treasury Bulletins spanning nearly a century, requiring document parsing, retrieval across text and tables, and numerical reasoning, scored within a relative error tolerance.
resource: https://arxiv.org/abs/2603.08655
aliases:
- OfficeQA Pro
tags:
- benchmarks
- document-agents
- enterprise-reasoning
timestamp: 2026-10-03T00:00:00Z
---

# Definition

OfficeQA (Opsahl-Ong et al., "OfficeQA Pro: An Enterprise Benchmark for End-to-End Grounded Reasoning", arXiv:2603.08655, 2026) poses 246 questions over a corpus of U.S. Treasury Bulletins covering about 89,000 pages. Answering requires parsing the documents, retrieving the relevant text and tables, and computing a numerical answer, which is correct when it falls within an allowed relative error. Papers in this wiki use it as a skill-optimization benchmark with small train/validation splits carved from the 246 questions, as an environment to wrap, and as a transfer target.

# Papers

* [SkillOpt](../papers/2605.23904.md) - one of six benchmarks across seven target models.
* [SkillOpt-Lite](../papers/2607.03451.md) - one of six benchmarks (as OfficeQA Pro, in an offline setup with modified splits); the paper notes its very small validation pool.
* [EnvHarness](../papers/2608.19880.md) - one of five existing environments it wraps with plug-in components while preserving the original verifier.
* [Iris](../papers/2609.04304.md) - a "Cowork" transfer target not targeted in training, to which Iris's search-specialized data and models transferred positively.
* [RASO](../papers/2609.38024.md) - 50 / 24 / 172 split; the benchmark where an agent without a skill scores 11.44 with GPT-5.6-Luna, where retrieval-grounded initialization alone reaches 45.74, and where RASO ends at 49.03 against 45.54 for SkillOpt.

# Notes

OfficeQA's numbers across these papers are not comparable: RASO and SkillOpt-Lite both derive splits from the same 246 questions but differently, and Iris reports transfer rather than optimization. Two papers (SkillOpt-Lite, RASO) flag that a 24-question validation split makes validation-gated acceptance decisions sensitive to single items.
