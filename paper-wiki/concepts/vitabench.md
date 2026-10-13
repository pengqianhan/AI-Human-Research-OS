---
type: Benchmark
title: VitaBench
description: Benchmark of interactive, multi-turn agent tasks in everyday service applications (food delivery, in-store services, travel), run against an LLM user simulator and scored by a rubric-based trajectory evaluator.
resource: https://arxiv.org/abs/2509.26490
tags:
- benchmarks
- conversational-agents
- simulated-users
- tool-use
timestamp: 2026-10-13T00:00:00Z
---

# Definition

VitaBench (He et al., 2025, "VitaBench: Benchmarking LLM Agents with Versatile Interactive Tasks in Real-world Applications") evaluates agents on interactive tasks drawn from everyday service applications. As described by TerminalHorizon, the main English Cross-domain set of VitaBench 1.0 has 100 tasks spanning food delivery, in-store services, and travel; the agent talks with an LLM user simulator while calling tools, and a model applies the official rubric-based sliding-window trajectory evaluator to decide success. Results are usually averaged over repeated runs of each task, for example Avg@4 over four runs. CompoWorld reports a later VitaBench 2.0 as a separate benchmark.

# Papers

* [TerminalHorizon](../papers/2610.13166.md) - transfer benchmark for a model fine-tuned only on terminal trajectories: Qwen3.5-27B goes from 20.5 to 31.8 Avg@4 on the English Cross-domain set (four runs per task, 300-step limit), with DeepSeek-V4-Pro-0813 as both user simulator and trajectory judge.
* [CompoWorld](../papers/2609.33665.md) - VitaBench and VitaBench 2.0 are two of its eight evaluation benchmarks: training on composed multi-service environments adds 10.50 and 1.62 points over the Qwen3.6-35B-A3B backbone, with frontier models still ahead on 2.0.
* [NeoHorse-1](../papers/2609.08183.md) - one of four end-to-end agentic benchmarks for its 4B and 9B models, run once under the official harness with DeepSeek-V4-Flash substituted as user simulator and judge because the recommended models were unavailable.

# Notes

Scores are not comparable across these papers. The user simulator and the success verdict are both model outputs, and the three papers use different models for them (DeepSeek-V4-Pro-0813 in TerminalHorizon, DeepSeek-V4-Flash in NeoHorse-1; the CompoWorld note records a Qwen judge "in some" evaluations without saying which). They also differ in the number of runs (four per task, one, and unrecorded) and in base model.

This page's definition follows TerminalHorizon's evaluation appendix and its reference entry (arXiv:2509.26490); the VitaBench paper itself has not been added to the wiki.
