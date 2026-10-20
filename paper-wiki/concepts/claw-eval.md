---
type: Benchmark
title: Claw-Eval
description: 300 human-verified agent tasks in three groups (service orchestration, multimodal perception and generation, multi-turn professional dialogue), graded over execution traces, audit logs, and environment snapshots for completion, safety, and robustness, with Pass@k and Pass^k over three trials.
resource: https://arxiv.org/abs/2604.06132
tags:
- agent-benchmarks
- trajectory-aware-grading
- agent-safety
timestamp: 2026-10-20T00:00:00Z
---

# Definition

Claw-Eval (Ye, Li, Yang, Liu, Yao, Lv, and others, arXiv:2604.06132) is an end-to-end evaluation suite for autonomous agents in software environments. Its abstract describes 300 human-verified tasks across 9 categories in three groups: general service orchestration, multimodal perception and generation, and multi-turn professional dialogue. Every agent action is recorded through three channels (execution traces, audit logs, and environment snapshots), so grading uses the trajectory, over 2,159 fine-grained rubric items, rather than only the final output. Scores cover Completion, Safety, and Robustness, reported as Average Score, Pass@k, and Pass^k over three trials. The paper reports that output-only grading misses 44% of safety violations and 13% of robustness failures that its hybrid pipeline catches. CoworkEnv's use splits it into 161 General, 38 Multi-turn, and 101 Multimodal tasks.

# Papers

* [CoworkEnv](../papers/2610.24960.md) - main benchmark: LoRA SFT on synthesized coworker tasks lifts Qwen3-VL-8B-Instruct from 46.6 to 64.1 on the 199 General and Multi-turn tasks (Multi-turn 45.9 to 77.8), with 14 reference rows copied from the Claw-Eval paper (v3) under settings the paper says are not shown to be aligned.
* [GraphForge](../papers/2609.38923.md) - cited among evaluations of working agents, beside GDPVal, Workspace-Bench, APEX-Agents, and SpreadsheetBench II.

# Notes

CoworkEnv applies the per-trial pass threshold of 0.75 for Pass@3 and Pass^3 and notes that the original protocol uses temperature zero, extended thinking where available, and LLM judges and a user simulator (Gemini 3 Flash for open-ended General criteria, Claude Opus 4.6 for the Multi-turn simulator and judge). Comparisons with published rows should state whether these settings were reproduced.

# Related

* [GDPVal](gdpval.md) - another evaluation of professional work, graded by expert rubrics rather than trajectory evidence.
