---
type: Benchmark
title: PinchBench
description: Benchmark of practical productivity and data-analysis tasks for LLMs running as OpenClaw agents, with each task scored from 0 to 100.
tags:
- benchmarks
- working-agents
- coding-agents
- agent-harness-engineering
timestamp: 2026-10-13T00:00:00Z
---

# Definition

PinchBench (Kilo AI, 2026, "PinchBench: A benchmarking system for evaluating LLM models as OpenClaw coding agents") measures how well a model completes practical tasks when it runs as an OpenClaw agent. The task categories visible through this wiki's papers include stock trend and volatility analysis, Apache log error analysis, meeting summaries, spreadsheets, contracts, and syslog analysis, each scored from 0 to 100. AgentSWE's protocol names a model as "the PinchBench judge", so at least part of the grading is model-based. JIT-Agent groups it with "Daily Work" benchmarks.

# Papers

* [AgentSWE](../papers/2610.13361.md) - one of five Optimization targets: coding agents edit an OpenClaw productivity starter against 20 development tasks and are scored on 40 held-out ones. Four of five builders end below the starter (gap closure -38.7 to 12.1); two of them added keyword-routed playbooks for visible task categories that raised development scores by 8.1 and 59.4 points and lowered held-out scores by 15.2 and 15.1.
* [JIT-Agent](../papers/2608.25593.md) - one of two Daily Work benchmarks among its nine; JIT-Agent with GLM-5.2 reaches 93.3, the best PinchBench score in its tables.
* [NeoHorse-1](../papers/2609.08183.md) - one of four end-to-end agentic benchmarks for its 4B and 9B models, run once through OpenSquilla as the agent harness, and the source of a case study in which the 9B model switches to Python's standard library after finding `pandas` unavailable.

# Notes

The benchmark is noisy when re-run. AgentSWE evaluates the same unchanged starter afresh in each of five builder runs and gets held-out scores from 21.3 to 67.7, a standard deviation of 20.8 points, the largest of its five Optimization benchmarks. Single-run PinchBench differences of a few points, as in NeoHorse-1's one-run protocol, should be read with that in mind.

The three papers run it under different harnesses (an OpenClaw starter, JIT-Agent's synthesized harnesses, OpenSquilla), so their scores are not one leaderboard. This page's definition follows AgentSWE's task table, case-coverage table, and reference entry; no canonical URL was verified, and the PinchBench source itself has not been added to the wiki.
