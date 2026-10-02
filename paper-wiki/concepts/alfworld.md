---
type: Benchmark
title: ALFWorld
description: Text-based household-task environment aligned with the ALFRED embodied benchmark, in which an agent issues text commands to find, move, clean, heat, cool, or examine objects; a common long-horizon testbed for LLM agents, skill optimization, and context management.
resource: https://arxiv.org/abs/2010.03768
tags:
- benchmarks
- embodied-text-environments
- long-horizon-agents
timestamp: 2026-10-02T00:00:00Z
---

# Definition

ALFWorld (Shridhar et al., arXiv:2010.03768, ICLR 2021) aligns text-game versions of household tasks with the ALFRED embodied environment. The agent receives a natural-language goal and a textual observation, issues one admissible text command per step, and succeeds when the environment confirms the goal conditions. Task types include pick-and-place, clean, heat, and cool (then place), and examine in light; the valid_unseen split (134 tasks) tests unseen rooms. Its state changes across steps (an object cleaned, an appliance opened) make it a standard test of whether an agent tracks the current world over a long episode.

# Papers

* [SkillOpt](../papers/2605.23904.md) - one of six benchmarks on which its skill-optimization recipe is evaluated across seven target models.
* [SkillOpt-Lite](../papers/2607.03451.md) - one of six benchmarks; with GPT-5.4-nano it reaches 81.3%, 9.5 points above SkillOpt.
* [EnvHarness](../papers/2608.19880.md) - one of five existing environments it wraps with plug-in components that reshape initial state, rules, or task composition while keeping the original verifier.
* [PoS](../papers/2610.01415.md) - execution benchmark (valid_unseen, 134 tasks, 50 actions); explicit, validated belief states reach 88.81% with Qwen3.7-Plus against 72.39% for LongHorizon-Harness, with the gain concentrated in Transform tasks.

# Notes

The papers use different splits, budgets, and models and change different things (skills, the environment, or the decision context), so their ALFWorld numbers are not comparable. PoS's ablation shows the largest effect of belief consistency validation on this benchmark (−14.93 points without it), in line with ALFWorld's dependence on tracking state changes such as whether an object has been cleaned or a receptacle opened.
