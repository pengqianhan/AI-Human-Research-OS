---
type: Benchmark
title: GameCraft-Bench
description: 140-task benchmark of complete games built end to end by agents in a real game engine, scored through replayed gameplay against game-specific rubrics on Mechanics, Depth, Visuals, and Art.
resource: https://arxiv.org/abs/2606.17861
aliases:
- GameCraft Bench
tags:
- game-development-agents
- benchmark
- coding-agents
timestamp: 2026-10-08T00:00:00Z
---

# Definition

GameCraft-Bench (Luo et al., 2026, "Can Agents Build Playable Games End-to-End in a Real Game Engine?") asks agents to build complete games in the Godot engine from a specification. Its 140 tasks span 15 game families. Each submitted build is scored by replaying gameplay and applying game-specific rubrics along four dimensions: mechanics, content depth, functional visuals, and art. Papers in this wiki report the four dimensions, scores grouped by game category (Action, Timing, Strategy, Simulation, Adventure), or an overall score on a 0-100 scale. The benchmark scores a single submitted build, so iterative-development papers report the score of whichever version their loop retains. This page is assembled from how the papers below describe and use the benchmark; the GameCraft-Bench paper itself has not been read for this wiki.

# Papers

* [RSIGame](../papers/2609.39045.md) - uses all 140 tasks, instantiated in both Godot and Phaser, as its main evaluation, with a Qwen3.8-27B judge averaging three replay-and-score runs and a cross-judge re-scoring of 40 tasks with GPT-5.5.
* [RSIAgent](../papers/2609.15364.md) - a generalization check on 40 sampled tasks against Play2Code across four base game generators, the precursor to RSIGame's full-benchmark study.
* [RecreationWorld](../papers/2609.22000.md) - one of five out-of-distribution benchmarks on which models fine-tuned on application-recreation trajectories improve, run under a common Claude Code scaffold with one trial per task.
* [Recursive Game Creator](../papers/2610.08621.md) - three refinement rounds on a 45-task subset chosen by Harness-of-Harness raise its overall score from 72.70 to 77.89, against 71.26 for the same model's baseline.

# Notes

Scores are not comparable across these papers: they use different task subsets (140, 45, 40), engines (Godot only or Godot plus Phaser), judges, and generator models.
