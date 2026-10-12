---
type: Benchmark
title: ProgramBench
description: A benchmark of 200 program-reproduction tasks in which a coding agent must rebuild a program's observable behavior from an execute-only reference binary and its documentation, without source code or network access.
resource: https://arxiv.org/abs/2605.03546
tags:
- benchmarks
- coding-agents
- program-reproduction
timestamp: 2026-10-12T00:00:00Z
---

# Definition

ProgramBench (Yang et al., 2026, "ProgramBench: Can Language Models Rebuild Programs from Scratch?") asks an agent to reproduce a program from scratch. The agent receives a reference executable and usage documentation, may run the reference to discover its behavior, and must deliver source code and a build script whose executable matches the reference on black-box behavioral tests. As described by ProgramGym, it has 200 tasks and three metrics: Tests Passed (macro-average of per-task test pass rates), Almost Resolved (tasks with at least 95% of tests passing), and Resolved (all tests passing without a cheating flag). The task differs from issue resolution, which starts from an existing codebase, and from repository generation, which starts from a requirements document: here the agent has to find the requirements and choose the design itself.

# Papers

* [ProgramGym](../papers/2610.13395.md) - primary evaluation and source of the task definition for its 1,648 training environments: Qwen3.8-27B goes from 34.87% to 42.84% Tests Passed after fine-tuning and to 55.71% under the Program-Agent workflow, with Resolved at 0.00-0.50% in every row.
* [RecreationWorld](../papers/2609.22000.md) - one of five out-of-distribution transfer benchmarks: two models fine-tuned on recreation trajectories both finish above their first evaluated checkpoint, under a common Claude Code scaffold with one trial per task per checkpoint.
* [MiMo-V2.6](../papers/2610.11959.md) - listed in its evaluation table at 26.5 for MiMo-V2.6-Pro, against 37.0 for a frontier model in the same table.

# Notes

Numbers across these papers are not comparable. ProgramGym runs Claude Code or its own five-round workflow under an 8-hour limit and copies flagship rows from ProgramBench's release-time results under mini-SWE-agent (highest Tests Passed 55.10% for Claude Opus 4.7 at xhigh effort, 0.00% Resolved for every flagship model); its footnote says later flagship results are kept at programbench.com. RecreationWorld reports movement across training checkpoints rather than a single score. The MiMo-V2.6 note does not record which ProgramBench metric its table uses.

This page's definition follows ProgramGym's description and its reference entry (arXiv:2605.03546); the ProgramBench paper itself has not been added to the wiki.
