---
type: Benchmark
title: SWE-bench Verified
description: A human-validated subset of SWE-bench that evaluates agents on resolving real GitHub issues in open-source repositories.
resource: https://www.swebench.com/
tags:
- benchmarks
- software-engineering
- llm-agents
timestamp: 2026-09-24T00:00:00Z
---

# Definition

SWE-bench evaluates coding agents on resolving real GitHub issues from open-source Python repositories, with success judged by the repositories' own test suites. SWE-bench Verified is the human-validated subset in which each task was checked to be solvable and correctly specified, making it the most commonly reported split for agent comparisons.

# Papers

* [Decentralized Multi-Agent Systems with Shared Context](../papers/2606.10662.md) - DeLM reports its main software-engineering results on SWE-bench Verified, with gains up to 10.5 percentage points over the strongest baseline at roughly half the cost per task.
* [LLM-as-a-Verifier](../papers/2607.05391.md) - selects among a heterogeneous three-model candidate pool (Claude Opus 4.5, Gemini 3 Flash, MiniMax M2.5) via its Probabilistic Pivot Tournament, reaching 78.2% and outperforming every individual model's own Pass@1.
* [Code2Skill](../papers/2609.05571.md) - uses SWE-bench Verified as one of eight evaluation benchmarks for CodeSkillBank; all nine protocol-matched model/reasoning-mode pairs improve with retrieved code-derived skills, the most consistent per-benchmark result in the paper's main sweep.
* [RRSI](../papers/2609.24972.md) - out-of-distribution target for a harness evolved only on Terminal-Bench 2.1: +1.8 (82.0 → 83.8) with Claude Opus 4.8 and +2.2 (76.8 → 79.0) with Gemini 3.5 Flash, never scored during search.
* [ZGCM-1](../papers/2609.13356.md) - appendix diagnostic on a fixed internal 50-task subset with mini-SWE-agent v2: 2 of 50 resolved (4.0%).
* [One to More, More to One](../papers/2609.23377.md) - used only to profile benchmark composition with SWE Labeler: 87.0% bug fixes and 86.2% single-file changes, vs. 47.3% bug fixes and 59.2% cross-module changes in SWE-bench Pro.
