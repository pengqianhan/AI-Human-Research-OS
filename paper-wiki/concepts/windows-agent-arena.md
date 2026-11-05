---
type: Benchmark
title: Windows Agent Arena
description: Adaptation of the OSWorld framework to a real Windows OS, with more than 150 tasks across everyday applications, tools, and browsers, parallelized on Azure.
resource: https://arxiv.org/abs/2409.08264
tags:
- benchmarks
- computer-use-agents
- windows
timestamp: 2026-11-05T00:00:00Z
---

# Definition

Windows Agent Arena lets agents operate freely inside a real Windows OS with the applications, tools, and browsers available to human users. It adapts the OSWorld framework to more than 150 Windows tasks that require planning, screen understanding, and tool use, and it can run in parallel on Azure, with a full evaluation in as little as 20 minutes. In its paper the Navi agent succeeds on 19.5% of tasks, against 74.5% for an unassisted human. This description follows the paper's abstract; the full paper has not been ingested.

# Papers

* [Hybrid Computer Use](../papers/2610.41432.md) - evaluates the native Windows backend (UIA3 and Win32) on 111 tasks with GPT-5.4: 80.86 against 71.89 for CUA Driver, 88 against 78 full-score tasks, at 50.6% lower total cost.
* [AutoGUIWorld](../papers/2610.01215.md) - evaluates on 154 tasks with partial credit: Qwen3.5-35B-A3B rises from 19.4 to 27.9, while Chrome tasks fall from 11.2 to 0.0.

# Notes

The two papers use different task counts and very different model scales, so the scores are not comparable with each other.

# Related

* [OSWorld](osworld.md) - the framework it adapts.
