---
type: Dataset
title: SWE-Gym
description: 2,438 real-world Python repository tasks, each with an executable runtime, unit tests, and a natural-language task, released for training software-engineering agents and verifiers.
resource: https://arxiv.org/abs/2412.21139
tags:
- datasets
- coding-agents
- software-engineering
- agent-training-environments
timestamp: 2026-11-06T00:00:00Z
---

# Definition

SWE-Gym (Pan et al., arXiv:2412.21139, "Training Software Engineering Agents and Verifiers with SWE-Gym") is an environment for training software-engineering agents. It holds 2,438 real-world Python task instances, each a codebase with an executable runtime environment, unit tests, and a task stated in natural language. Its paper fine-tunes language-model agents on it, reporting up to 19 points of absolute gain in resolve rate on SWE-Bench Verified and Lite, and trains verifiers on sampled agent trajectories for inference-time scaling (32.0% and 26.0% on SWE-Bench Verified and Lite combined with the fine-tuned agents). The tasks, models, and trajectories are public. This description follows the paper's abstract; the full paper has not been ingested.

# Papers

* [Harness-S](../papers/2611.04277.md) - one of three benchmarks (240 train, 100 validation, 160 test instances): Qwen3.5-4B rises from 24.38 to 38.75 Pass@3 under the base harness, while Avg@3 rises only from 22.50 to 28.75.
* [Self-HPO](../papers/2610.22791.md) - cited among executable software-engineering training environments, beside R2E-Gym and SWE-smith.
* [One to More, More to One](../papers/2609.23377.md) - cited among executable software-engineering training substrates.
* [AREX-2](../papers/2609.38288.md) - cited as training on single-attempt agent trajectories, which AREX-2 contrasts with supervising whole multi-round improvement processes.
* [Recursive Self-Rewrite](../papers/2610.02826.md) - cited as prior work on training from verified software-engineering trajectories.
* [ProgramGym](../papers/2610.13395.md) - cited as an issue-resolution environment generator that starts from an existing codebase, a limit ProgramGym's program-reproduction environments avoid.

# Notes

Only Harness-S evaluates on SWE-Gym in this wiki; the other papers cite it as a training resource. Harness-S uses its own 500-instance split, not the full 2,438 tasks.

# Related

* [SWE-bench Verified](swe-bench-verified.md) - the evaluation set SWE-Gym's own paper reports on.
