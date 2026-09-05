---
type: Benchmark
title: PaperBench
description: Benchmark where AI agents must replicate 20 ICML 2024 Spotlight/Oral papers from scratch, scored against 8,316 gradable sub-tasks via author-co-developed rubrics and an LLM judge.
resource: https://arxiv.org/abs/2504.01848
tags:
- benchmarks
- research-replication
- autonomous-research
timestamp: 2026-09-05T00:00:00Z
---

# Definition

PaperBench (Starace et al., 2025, arXiv:2504.01848) evaluates whether an AI agent can replicate state-of-the-art AI research: agents must replicate 20 ICML 2024 Spotlight and Oral papers from scratch, including understanding each paper's contributions, developing a codebase, and successfully executing experiments. Each replication task is hierarchically decomposed into smaller, clearly-graded sub-tasks via rubrics co-developed with the original papers' authors, totaling 8,316 individually gradable tasks; an LLM-based judge automates grading against these rubrics at scale, validated against a separate judge-evaluation benchmark. In the original paper, the best-performing tested agent (Claude 3.5 Sonnet with open-source scaffolding) reached a 21.0% average replication score, below a recruited human-PhD baseline. Code is open-sourced at https://github.com/openai/preparedness. This repository's [ASI-Bench](../papers/2608.17271.md) note classifies PaperBench (with CORE-Bench and ReplicationBench) as a research-replication benchmark using hierarchical or execution-based evaluation, distinct from execution-oriented benchmarks like MLE-Bench/RE-Bench and from full-cycle end-to-end research benchmarks.

# Papers

* [ASI-Bench: At the Dawn of Artificial Superintelligence](../papers/2608.17271.md) - cites PaperBench in its own Table 1 survey of eight prior benchmarks, noting it evaluates research replication under one fixed specification rather than ASI-Bench's graded guidance-withdrawal design.
* [Repo-To-Skill: Distilling GitHub Repositories Into AI4AI Skills](../papers/2609.02749.md) - evaluates DisCo on the full 20-paper PaperBench task set with the benchmark's official replication grader; distilled skills raise the average replication score from 29.45% to 39.59% (+34.4% relative), improving 18 of 20 papers.

# Notes

Only Repo-To-Skill reports an actual PaperBench score in this wiki so far; ASI-Bench's mention is a benchmark-survey citation rather than an evaluation run on it.
