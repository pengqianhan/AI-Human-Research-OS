---
type: Benchmark
title: ScreenSpot-Pro
description: GUI grounding benchmark of expert-annotated, high-resolution screenshots from professional applications, where a model must predict the coordinate of the element an instruction refers to; scored by whether the point falls inside the target box.
resource: https://arxiv.org/abs/2504.07981
tags:
- benchmarks
- gui-computer-use-agents
- gui-grounding
timestamp: 2026-10-02T00:00:00Z
---

# Definition

ScreenSpot-Pro (Li et al., arXiv:2504.07981) tests single-step GUI grounding in professional software: high-resolution screenshots from creative, office, scientific, development, CAD, and operating-system applications on several platforms, each paired with an instruction naming one target element. A prediction is correct when its coordinate lies inside the annotated box; results are usually split by text versus icon targets and by application group. Dense interfaces and small targets make it much harder than earlier ScreenSpot sets, so it is a standard grounding benchmark for computer-use agents.

# Papers

* [MAI-UI](../papers/2512.22047.md) - one of five grounding benchmarks: 67.9% (73.5% with zoom-in) at 32B, 4.1 points above the strongest baseline, GTA1-32B.
* [AutoGUIWorld](../papers/2610.01215.md) - 1,581 English positive-target examples: fine-tuning Qwen3.5-35B-A3B on image-generated trajectories raises accuracy from 31.7% to 57.1% (text 41.2 → 72.0, icons 16.2 → 32.9), with click labels from the LocateAnything grounding model.

# Notes

The two papers evaluate different model families, scales, and inference settings (MAI-UI also reports a zoom-in variant), so their numbers are not directly comparable. In AutoGUIWorld's breakdown, icon accuracy stays below text accuracy in every application domain even after training.
