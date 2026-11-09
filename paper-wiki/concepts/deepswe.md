---
type: Benchmark
title: DeepSWE
description: 113 original long-horizon software-engineering tasks written from scratch across 91 open-source repositories and five languages, kept out of upstream repositories, each graded by a hand-written verifier that accepts any implementation providing the requested functionality.
resource: https://arxiv.org/abs/2607.07946
tags:
- benchmarks
- coding-agents
- long-horizon-agents
- contamination-resistant
timestamp: 2026-11-09T00:00:00Z
---

# Definition

DeepSWE (Huang, Lee, Tng, and Ge, arXiv:2607.07946) is a benchmark of 113 original, long-horizon software-engineering tasks for coding agents. Unlike benchmarks that mine merged GitHub fixes, its tasks are written from scratch in 91 active open-source repositories and five languages and are never contributed upstream, so reference solutions stay out of scraped training data. Each task is graded by a hand-written verifier that checks the requested functionality and accepts any implementation providing it; the abstract reports that an independent LLM judge disagrees with these verifiers far less often than with SWE-Bench Pro's inherited tests (1.4% against 32.4%), and that reference solutions touch 5.5× more code than SWE-Bench Pro's with prompts about half as long. Papers here use version 1.1. This description follows the paper's abstract; the full paper has not been ingested. The "DeepSWE" that the Agent Lightning note (arXiv:2508.03680) lists as an application-specific agentic-RL system for coding is a different, earlier work with the same name.

# Papers

* [AgentBaton](../papers/2610.35959.md) - main benchmark for capable-to-efficient model handoffs under mini-SWE-agent; AgentBaton detects handoff points at 26.6% to 41.1% of the source trajectory, earlier than on Terminal-Bench 2.1.
* [Beneath the Surface](../papers/2611.07624.md) - coding transfer target for Champions evolved on Terminal-Bench 2: seven of eight gain coverage, while all four MiniSWE Champions lose reliability.
* [MiMo-V2.6](../papers/2610.11959.md) - tracks DeepSWE v1.1 during RL, rising from 58.4 to 72.6 for the Pro model.
* [Doc2Harness](../papers/2610.20344.md) - cites DeepSWE among repository-level benchmarks, noting its per-task hand-written verifier.

# Notes

Scores on DeepSWE depend strongly on the harness: in Beneath the Surface the same GPT-5.4 seed scores 23.5% Avg@8 under MiniSWE and 45.1% under Codex. With 113 tasks, one task is 0.88 points, so single-run differences of a few points are within a few tasks.

# Related

* [Terminal-Bench](terminal-bench.md) - the terminal-task benchmark it is most often paired with in this wiki.
* [SWE-bench Verified](swe-bench-verified.md) - the mined-fix benchmark style DeepSWE is designed to avoid.
* [mini-SWE-agent](mini-swe-agent.md) - the scaffold used for DeepSWE in AgentBaton and Beneath the Surface.
