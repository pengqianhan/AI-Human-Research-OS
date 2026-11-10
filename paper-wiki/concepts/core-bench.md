---
type: Benchmark
title: CORE-Bench
description: Computational Reproducibility Agent Benchmark - 270 tasks from 90 papers in computer science, social science, and medicine, where an agent must reproduce a study's results from its provided code and data.
resource: https://arxiv.org/abs/2409.11363
tags:
- benchmarks
- reproducibility
- research-replication
timestamp: 2026-11-10T00:00:00Z
---

# Definition

CORE-Bench (Siegel et al., 2024, arXiv:2409.11363) measures how accurately AI agents carry out computational reproducibility: reproducing a study's results using the code and data the study provides. It has 270 tasks based on 90 scientific papers across computer science, social science, and medicine, at three difficulty levels, with language-only and vision-language tasks, and an evaluation system built to run agents quickly and in parallel. In the original paper the best of the tested agents (AutoGPT and a task-specific CORE-Agent, each with GPT-4o and GPT-4o-mini) reached 21% accuracy on the hardest level. Its tasks are released Code Ocean capsules with questions about their outputs, so it tests execution of authors' artifacts rather than reimplementation, which is what [PaperBench](paperbench.md) tests.

# Papers

* [ReproBridge](../papers/2611.08452.md) - external check of its refined artifacts on 45 CORE-Bench Hard capsules: 62.2% success from raw code, 68.9% from VERITAS's patched code and fix log, and 73.3% from a refined artifact, with spend per successful capsule falling from $8.43 to $4.34.
* [ASI-Bench](../papers/2608.17271.md) - lists CORE-Bench with PaperBench and ReplicationBench as research-replication benchmarks in its survey of prior benchmarks.

# Related

* [PaperBench](paperbench.md) - replication from scratch, scored by rubrics, as opposed to executing released artifacts.
