---
type: Benchmark
title: AndroidWorld
description: A live Android environment with 116 parameterized task workflows across 20 real apps, scored by reward signals read from the device's system state; the standard online benchmark for mobile GUI agents, which the MobileWorld authors describe as close to saturated.
resource: https://arxiv.org/abs/2405.14573
tags:
- benchmarks
- mobile-agents
- gui-agents
timestamp: 2026-10-17T00:00:00Z
---

# Definition

AndroidWorld (Rawles et al., arXiv:2405.14573, ICLR 2025) runs real Android applications in an emulator and defines 116 programmatic task workflows across 20 apps. Tasks are templates whose parameters are filled at run time and phrased in natural language, so the same workflow can be posed in many variants. Rewards are derived from the device's system state rather than from the agent's own report, which keeps them valid across task variations. The release also introduced the M3A agent (30.6% of tasks at the time) and the MobileMiniWoB++ suite. Papers here report the success rate over the 116 tasks, with task-dependent step limits.

# Papers

* [MAI-UI](../papers/2512.22047.md) - online navigation benchmark (116 tasks, 20 apps, live emulator): the 235B-A22B model reaches 76.7%, ahead of UI-TARS-2 (73.3%), and the 32B, 8B, and 2B models reach 73.3%, 70.7%, and 49.1%; also the testbed for its RL ablations and device-cloud collaboration.
* [MAI-Gym](../papers/2610.20939.md) - one of ten integrated benchmarks and an Env-OOD test (no training in its environment): MAI-Gym-9B reaches 75.9% against 80.2% for UI-Venus-2-9B and 57.8% for the Qwen3.5-9B base.
* [SwitchMem](../papers/2610.17928.md) - cites the AndroidWorld paper as the source of the M3A agent and of MobileMiniWoB++, the suite behind its 92-task online evaluation.

# Notes

The MobileWorld authors (arXiv:2512.19432, from the same team as MAI-UI and MAI-Gym) describe AndroidWorld as the dominant online mobile benchmark but near saturation, with recent agents above 90%. They add that its tasks are shorter (14.3 steps on average against 27.8) and rarely span several apps (9.5% against 62.2%), and that it lacks e-commerce and enterprise-chat apps. Scores in this wiki are taken under each paper's own harness and are not directly comparable.

# Related

* [MobileWorld](mobileworld.md) - built to be a harder successor with the same reproducible evaluation.
* [OSWorld](osworld.md) - the desktop counterpart that computer-use papers report beside it.
