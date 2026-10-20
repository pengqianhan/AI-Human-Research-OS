---
type: Benchmark
title: AutomationBench
description: Benchmark of cross-application workflow orchestration through REST APIs in simulated SaaS environments, including API discovery and adherence to business rules.
resource: https://arxiv.org/abs/2604.18934
tags:
- benchmarks
- tool-use
- working-agents
- workflow-automation
timestamp: 2026-10-20T00:00:00Z
---

# Definition

AutomationBench (Shepard and Salimans, 2026) evaluates agents on workflows that span several business applications. As described by papers in this wiki, the agent works through REST APIs in simulated SaaS environments and must discover the relevant APIs and follow business rules while completing a cross-application task. Papers here report a task success rate, and in one case partial-credit domain scores; both use version 1.0.6.

# Papers

* [CompoWorld](../papers/2609.33665.md) - one of eight evaluation benchmarks and the largest gain: training Qwen3.6-35B-A3B on composed multi-service environments lifts task success from 10.33% to 32.33%, above the frontier models the paper lists; at an equal 1K SFT trajectories, composed-environment training beats single-environment training (12.83% to 33.33%).
* [MiMo-V2.6](../papers/2610.11959.md) - tracked during RL and reported at 53.1 (Pro) and 52.3 (Flash) against 16.0 for MiMo-V2.5 Pro and 50.3, 45.8, and 46.2 for Claude Opus 5, GPT-5.6 Sol, and Claude Fable 5; the released 9B distilled model goes from 5.0 (Qwen3.5-9B) to 30.3 after SFT and 33.1 after RL.
* [TerminalHorizon](../papers/2610.13166.md) - transfer benchmark for a model trained only on terminal trajectories: on v1.0.6 (600 rollouts over the public set, the official api tool set, a 50-step limit, three runs) Qwen3.5-27B goes from 5.5 to 17.2 Pass Rate and from 26.4 to 49.7 Partial score.
* [BizBench](../papers/2610.20424.md) - cited for scoring final application states without prescribing tool-call sequences; BizBench keeps that freedom but adds checks at consequential steps, such as whether a transfer was approved before execution.
* [CoworkEnv](../papers/2610.24960.md) - cited among benchmarks of multi-application work and workflow constraints; its synthesized training tasks likewise span several services with business rules and distractor records.

# Notes

The two papers evaluate different model generations under their own harnesses and reasoning settings, so their frontier-model rows should not be read as one leaderboard.

TerminalHorizon reports the benchmark's two official scores, Pass Rate (all assertions passed) and Partial (the fraction of assertions passed). The other entries quote one figure each, and their notes do not record which of the two it is.
