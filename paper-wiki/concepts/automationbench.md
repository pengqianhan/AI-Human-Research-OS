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
timestamp: 2026-10-10T00:00:00Z
---

# Definition

AutomationBench (Shepard and Salimans, 2026) evaluates agents on workflows that span several business applications. As described by papers in this wiki, the agent works through REST APIs in simulated SaaS environments and must discover the relevant APIs and follow business rules while completing a cross-application task. Papers here report a task success rate, and in one case partial-credit domain scores; both use version 1.0.6.

# Papers

* [CompoWorld](../papers/2609.33665.md) - one of eight evaluation benchmarks and the largest gain: training Qwen3.6-35B-A3B on composed multi-service environments lifts task success from 10.33% to 32.33%, above the frontier models the paper lists; at an equal 1K SFT trajectories, composed-environment training beats single-environment training (12.83% to 33.33%).
* [MiMo-V2.6](../papers/2610.11959.md) - tracked during RL and reported at 53.1 (Pro) and 52.3 (Flash) against 16.0 for MiMo-V2.5 Pro and 50.3, 45.8, and 46.2 for Claude Opus 5, GPT-5.6 Sol, and Claude Fable 5; the released 9B distilled model goes from 5.0 (Qwen3.5-9B) to 30.3 after SFT and 33.1 after RL.

# Notes

The two papers evaluate different model generations under their own harnesses and reasoning settings, so their frontier-model rows should not be read as one leaderboard.
