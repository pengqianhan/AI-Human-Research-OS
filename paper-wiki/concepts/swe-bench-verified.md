---
type: Benchmark
title: SWE-bench Verified
description: A human-validated subset of SWE-bench that evaluates agents on resolving real GitHub issues in open-source repositories.
resource: https://www.swebench.com/
tags:
- benchmarks
- software-engineering
- llm-agents
timestamp: 2026-08-20T00:00:00Z
---

# Definition

SWE-bench evaluates coding agents on resolving real GitHub issues from open-source Python repositories, with success judged by the repositories' own test suites. SWE-bench Verified is the human-validated subset in which each task was checked to be solvable and correctly specified, making it the most commonly reported split for agent comparisons.

# Papers

* [Decentralized Multi-Agent Systems with Shared Context](../papers/2606.10662.md) - DeLM reports its main software-engineering results on SWE-bench Verified, with gains up to 10.5 percentage points over the strongest baseline at roughly half the cost per task.
* [LLM-as-a-Verifier](../papers/2607.05391.md) - selects among a heterogeneous three-model candidate pool (Claude Opus 4.5, Gemini 3 Flash, MiniMax M2.5) via its Probabilistic Pivot Tournament, reaching 78.2% and outperforming every individual model's own Pass@1.
