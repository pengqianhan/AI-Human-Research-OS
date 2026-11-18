---
type: Benchmark
title: NL2Repo-Bench
description: A long-horizon repository-generation benchmark in which a coding agent receives one natural-language requirements document and an empty workspace and must produce a complete, installable Python library, scored by test pass rates.
resource: https://arxiv.org/abs/2512.12730
tags:
- benchmarks
- coding-agents
- repository-generation
timestamp: 2026-11-18T00:00:00Z
---

# Definition

NL2Repo-Bench (Ding et al., 2025, "NL2Repo-Bench: Towards Long-Horizon Repository Generation Evaluation of Coding Agents") gives an agent only a natural-language requirements document and an empty workspace. The agent must design the architecture, manage dependencies, implement multi-module logic, and deliver a fully installable Python library, which is checked by tests. Its abstract reports that even the strongest agents at release reached below 40% average test pass rates and rarely completed an entire repository, with failures such as premature termination, loss of global coherence, and fragile cross-file dependencies. It differs from issue resolution (an existing codebase) and from ProgramBench-style reproduction (a reference executable to probe): the requirements are written out, and the agent must build from them.

# Papers

* [ProgramGym](../papers/2610.13395.md) - cited in related work as a requirements-document setting that, in ProgramGym's argument, reduces the task to implementation because the requirements are given.
* [Doc2Harness](../papers/2610.20344.md) - cited, not run, among repository-generation benchmarks that rebuild released software and judge it with unit tests through a fixed interface.
* [RepoFactory](../papers/2611.21152.md) - headline evaluation: fine-tuning Qwen3.5-35B-A3B on RepoFactory's full-repository environments raises NL2Repo from 23.8 to 46.4 (41.3 without environment evolution), under a Claude Code harness.

# Notes

RepoFactory's training environments share NL2Repo-Bench's task format (build a repository from a specification), so its NL2Repo gain is partly an in-format result; its other four benchmarks are the out-of-format checks. The definition here follows the benchmark's arXiv abstract (via the Hugging Face paper page) and RepoFactory's description; the NL2Repo-Bench paper itself has not been added to the wiki.
