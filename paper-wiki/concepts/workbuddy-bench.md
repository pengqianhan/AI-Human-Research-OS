---
type: Benchmark
title: WorkBuddy-Bench
description: Tencent's multi-domain agent benchmark with contamination-resistant task construction, split into Code, Web, and Office datasets and graded by a composite verifier of hidden tests, file and structure checks, and LLM or VLM judge items.
resource: https://arxiv.org/abs/2607.20911
tags:
- benchmarks
- coding-agents
- office-automation
- professional-work
timestamp: 2026-10-14T00:00:00Z
---

# Definition

WorkBuddy-Bench (Tencent WorkBuddy Bench Team, 2026, "Tencent WorkBuddy Bench: A Multi-Domain Coding-Agent Benchmark with Contamination-Resistant Task Construction", arXiv:2607.20911) has three domains released as separate datasets. As described by Harness², Code has 80 tasks over five role categories (developer, algorithms, product, operations, QA), Web 70 tasks over seven categories such as page interaction, data visualization, and document conversion, and Office 50 tasks over data-file operations, document operations, and workspace automation. Tasks run in the benchmark's containers, and a composite verifier combines deterministic checks (hidden tests, file and structure checks) with LLM and VLM judge items; a task's score is the fraction of its checks that pass.

# Papers

* [Harness²](../papers/2610.14224.md) - main benchmark: test halves of 40, 35, and 25 tasks, Gemini 3.5 Flash as judge where needed; one improvement step raises the three-domain average by 3.0 to 11.5 points over the base harness, and it carries the budget, ablation, library, and component studies.
* [NeoHorse-1](../papers/2609.08183.md) - one of four end-to-end agentic benchmarks for its 4B and 9B models, and the source of a code-repair case study in which the 9B model completes an edit-test-inspect-repair cycle the 4B model abandons.
* [Raven](../papers/2609.33439.md) - the WorkBuddy code subset (80 tasks) is one of four Raven-Code benchmarks, run in the authors' AgentEval containers with official graders.

# Notes

The papers use different subsets (Harness² the test halves of all three domains, Raven the full Code set) and different judges for the model-graded items, so scores are not comparable across them. This page's definition follows Harness²'s benchmark appendix and its reference entry; the WorkBuddy-Bench paper itself has not been added to the wiki.
