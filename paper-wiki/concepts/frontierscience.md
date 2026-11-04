---
type: Benchmark
title: FrontierScience
description: OpenAI benchmark of expert-level scientific reasoning with two tracks, Olympiad problems at IPhO, IChO, and IBO level and PhD-level open-ended Research sub-tasks graded by rubric, covering physics, chemistry, and biology with several hundred questions, 160 of them open-sourced.
resource: https://arxiv.org/abs/2601.21165
tags:
- benchmarks
- scientific-reasoning
- ai-for-science
timestamp: 2026-11-05T00:00:00Z
---

# Definition

FrontierScience evaluates expert-level scientific reasoning in frontier language models, motivated by existing science benchmarks being nearly saturated. The Olympiad track contains original problems written by international Olympiad medalists and national team coaches. The Research track contains PhD-level, open-ended research sub-tasks written and verified by PhD scientists, with a granular rubric that assesses the process of solving rather than only a final answer. This description follows the paper's abstract; the full paper has not been ingested.

# Papers

* [Axion 1.0](../papers/2611.03233.md) - both tracks in its main table, best single run: Olympiad 86.0 and 87.0, Research 56.7 and 66.7 at 35B and 122B (average rubric scores 6.67 and 7.09), against 63.3 for GPT-5.6 Sol on Research and 40.0 for Agents-A1. Stage I SFT moves 35B Research from 26.7 to 48.3.
* [Apodex 1.1](../papers/2608.23283.md) - FrontierScience-Research is among its public-benchmark comparison tables, where its Agent Team is the highest-scoring system in its own table; Axion's table lists it at 55.0 (ReAct) and 63.3 (Agent Team).
* [Into the Unknown](../papers/2610.19159.md) - cited as a benchmark with an existing anchor, where the task is graded against a reference, in contrast with its own open-ended research setting.

# Notes

Axion's table shows why sources should be kept apart: its Research baselines come from three kinds of evaluation (official reports, the Agents-A1 and Apodex reports, and the authors' own runs), which it calls indicative rather than strictly controlled.
