---
type: Benchmark
title: MobileWorld
description: A 201-task, 20-app mobile benchmark built as a harder successor to AndroidWorld, with long cross-app tasks, agent-user interaction and MCP-augmented task categories, snapshot-based containers, and functional verification through backend databases and callback APIs.
resource: https://arxiv.org/abs/2512.19432
tags:
- benchmarks
- mobile-agents
- gui-agents
- agent-user-interaction
timestamp: 2026-10-17T00:00:00Z
---

# Definition

MobileWorld (arXiv:2512.19432; from the team behind MAI-UI and MAI-Gym, with Quyu Kong and Xu Zhang among the authors of all three) has 201 tasks across 20 open-source applications that stand in for commercial ones, such as e-commerce and enterprise chat. According to its abstract, tasks need almost twice as many steps as AndroidWorld's (27.8 against 14.3 on average), and 62.2% span several apps (against 9.5%). Beyond GUI manipulation it adds task categories for agent-user interaction (vague instructions the agent must clarify) and MCP-augmented tool use. Evaluation runs in snapshot-based containers, with checks against backend databases and task callback APIs. At release the best agentic framework reached 51.7% and the best end-to-end model 20.9%. MAI-Gym reports a GUI-only split of 117 tasks.

# Papers

* [MAI-UI](../papers/2512.22047.md) - introduced alongside it as the team's realistic-oriented benchmark: the 235B-A22B model reaches 41.7% overall (+20.8 over the best end-to-end baseline), with 51.1% on the 45 user-interaction tasks and 37.5% on the 40 MCP tasks.
* [MAI-Gym](../papers/2610.20939.md) - the GUI-only split (117 tasks, 100-step limit) is its headline mobile benchmark, and half of its synthesized training tasks are built inside MobileWorld environments; MAI-Gym-9B reaches 78.4%, from 18.0% for the Qwen3.5-9B base, above Qwen3.8-Max (77.8%) and Claude Opus 4.8 (69.2%).

# Notes

The two papers are from the benchmark's own team, and MAI-Gym trains in MobileWorld's environments (on synthesized tasks, not benchmark tasks) before testing on its GUI-only split. Its 78.4% therefore measures new tasks in familiar apps, which MAI-Gym labels Task OOD, and is not comparable with MAI-UI's 41.7% on all 201 tasks.

# Related

* [AndroidWorld](androidworld.md) - the benchmark MobileWorld was built to succeed, with the same style of reproducible evaluation.
