---
type: Method
title: ReasoningBank
description: A memory framework that distills generalizable reasoning strategies from an agent's self-judged successful and failed experiences, retrieves relevant ones at test time, and writes new learnings back after each task; a common baseline for experience memory in self-evolving agents.
resource: https://arxiv.org/abs/2509.25140
tags:
- agent-memory
- agent-self-evolution
- learning-from-experience
timestamp: 2026-11-11T00:00:00Z
---

# Definition

ReasoningBank (arXiv:2509.25140, 2025; "ReasoningBank: Scaling Agent Self-Evolving with Reasoning Memory") is a memory framework for agents that face a continuing stream of tasks. According to its abstract, it distills generalizable reasoning strategies from the agent's self-judged successful and failed experiences; at test time the agent retrieves relevant memories to inform its interaction and then integrates new learnings back. The same paper introduces memory-aware test-time scaling (MaTTS), which spends more compute per task to generate diverse experiences for memory synthesis, and reports gains over memories that store raw trajectories or only successful routines on web browsing and software engineering benchmarks. Its distinguishing features among experience memories are learning from failures as well as successes and judging outcomes without ground truth.

# Papers

* [Harness²](../papers/2610.14224.md) - baseline consisting of a fixed harness plus retrieved memory distilled under an answer-free self-judge; Harness² beats it on WorkBuddy-Bench and JobBench in all four executor-harness pairs. The note records that the two papers share an author group.
* [WikiTrace](../papers/2611.14320.md) - official implementation built once from shared no-memory runs with the true binary outcome instead of a self-judge, and not updated per test task; 81.7 average over eight suites against 79.5 without memory, with Regression at about the level of a no-memory rerun.

# Notes

The two wiki papers run different variants: Harness² keeps the answer-free self-judge, while WikiTrace replaces it with the true outcome and removes the per-task update, so their ReasoningBank numbers are not the same method (reader observation). Other notes mention it only in related work.

# Related

* [ExpeL](expel.md) - earlier insight-extraction memory.
* [Agent Workflow Memory](agent-workflow-memory.md) - workflow induction from successful trajectories only.
