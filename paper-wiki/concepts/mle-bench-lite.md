---
type: Benchmark
title: MLE-Bench Lite
description: A lighter subset of MLE-Bench that evaluates agents on Kaggle-derived machine-learning engineering tasks, usually reported as an any-medal rate.
resource: https://github.com/openai/mle-bench
tags:
- benchmarks
- ml-engineering
- llm-agents
timestamp: 2026-07-07T00:00:00Z
---

# Definition

MLE-Bench evaluates AI agents on machine-learning engineering by having them solve Kaggle competitions end to end: build, train, and submit models under compute and time budgets. Performance is commonly summarized as the share of tasks where the agent's submission would earn a Kaggle medal ("Any Medal"). MLE-Bench Lite is the benchmark's low-complexity subset, widely reported because full runs are expensive.

# Papers

* [Toward Generalist Autonomous Research via Hypothesis-Tree Refinement](../papers/2606.11926.md) - Arbor reports 86.36% Any Medal on MLE-Bench Lite with GPT-5.5; its ablations on the same benchmark support the value of the hypothesis tree and insight feedback.
* [EurekAgent: Agent Environment Engineering is All You Need For Autonomous Scientific Discovery](../papers/2606.13662.md) - reports an 85.71% any-medal rate on a selected seven-task MLE-Bench Lite subset.
* [Repo-To-Skill: Distilling GitHub Repositories Into AI4AI Skills](../papers/2609.02749.md) - reports on the **full** 75-task MLE-Bench suite, not the Lite subset this page is titled after: distilled skills raise Codex+GPT-5.5's Any Medal from 31.11% to 72.89% (+134.3% relative), the largest of DisCo's four reported benchmark gains.

# Notes

The three current results are not directly comparable: EurekAgent's number is on a selected seven-task Lite subset, Arbor's is on the full Lite split, and Repo-To-Skill's is on the full 75-task suite (not Lite at all).
