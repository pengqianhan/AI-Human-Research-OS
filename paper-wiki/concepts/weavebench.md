---
type: Benchmark
title: WeaveBench
description: Long-horizon hybrid computer-use benchmark of 114 tasks across eight work domains on a real Ubuntu desktop, where each trajectory must combine GUI operation with CLI and code work, graded by a trajectory-aware judge.
resource: https://arxiv.org/abs/2606.09426
tags:
- benchmarks
- computer-use-agents
- hybrid-interfaces
timestamp: 2026-11-05T00:00:00Z
---

# Definition

WeaveBench evaluates whether computer-use agents can orchestrate GUI, CLI, and code operations within a single long trajectory, on tasks grounded in real user requests and publicly verifiable artifacts. Agents run on a real Ubuntu desktop inside deployed CLI-agent runtimes, with a minimal desktop-control plugin added. A companion trajectory-aware judge inspects deliverables, files, screenshots, logs, and action traces and looks for shortcuts such as fabricated visual evidence or hard-coded metrics. Its abstract reports a best PassRate of 41.2% across frontier model-runtime pairings, and that outcome-only grading substantially overestimates performance. This description follows the paper's abstract; the full paper has not been ingested.

# Papers

* [Hybrid Computer Use](../papers/2610.41432.md) - released HCU with GPT-5.4 (medium) reaches a mean score of 53.25 on all 114 tasks, against 46.37 for CUA Driver and 43.84 for the official OpenClaw baseline, at about half the cost; 24 tasks score at least 0.8 against 12 for CUA Driver.
* [LongHorizon-Harness](../papers/2608.01964.md) - main evaluation with official tasks, workspaces, and judge templates: PassRate 51.8% to 80.7% with Qwen 3.7-Plus on a Claude Code backend.
* [RecreationWorld](../papers/2609.22000.md) - one of five external benchmarks used to test out-of-distribution transfer after fine-tuning on recreation trajectories.

# Notes

These papers report different quantities (mean score and PassRate) under different model settings, so their numbers should not be read as one leaderboard.

# Related

* [OSWorld](osworld.md) - the desktop benchmark family most often reported beside it.
* [Agents' Last Exam](agents-last-exam.md) - also studies GUI access inside general agents.
