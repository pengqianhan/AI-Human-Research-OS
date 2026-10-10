---
type: Benchmark
title: ARC-AGI-3
description: Interactive benchmark of grid games with unknown rules and goals, scored by action efficiency relative to humans (RHAE), used to test agents that learn an environment through interaction.
resource: https://arxiv.org/abs/2603.24621
aliases:
- ARC-AGI 3
tags:
- benchmarks
- interactive-reasoning
- game-agents
- learning-from-experience
timestamp: 2026-10-10T00:00:00Z
---

# Definition

ARC-AGI-3 (ARC Prize Foundation, 2026, "ARC-AGI-3: a new challenge for frontier agentic intelligence") is an interactive benchmark in which an agent must infer a game's rules and goal by acting, under a human-derived action budget. As described by papers in this wiki, each observation is a 64x64 colour grid, actions come from a key and click interface whose meaning is not given, and there is no task description or access to the environment source; later levels of a game can introduce new mechanics. The public set has 25 games. The score is Relative Human Action Efficiency (RHAE, ceiling 100): each level's efficiency is the squared ratio of human to agent actions, capped at 1.15, weighted by level index and bounded by the weighted share of levels cleared. Every action sent to the environment counts, including resets.

# Papers

* [Prime Agent](../papers/2608.23552.md) - its test-time-scaling study: RHAE Best@1 rises from 30% to 95.5% as output tokens and cost grow, with the harness supplying only the environment interface and an autonomous prompt.
* [Memento 3](../papers/2610.11794.md) - main evaluation: a rulebook-plus-code world model verified by cell-exact replay clears all 25 public games (183 levels) at mean RHAE 100.0 with 7,518 actions, 44% of the human count; the closest listed baseline (baseline1) scores 99.0.
* [Learn2Play Bench](../papers/2610.08215.md) - not evaluated on: cited as the closest prior benchmark built on unfamiliar environments, with the objection that it mixes visual ability into the measurement of learning from experience.

# Notes

Memento 3's own related-work section reports that other groups find the public set saturated or nearly saturated with stronger frontier models, and that public-set completion alone cannot isolate what an agent architecture contributes. Scores in the papers above use different backbones, reasoning budgets, and reporting conventions (Best@1 in Prime Agent, official scorecard values in Memento 3), so they are not directly comparable.
