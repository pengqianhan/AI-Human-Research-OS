---
type: Topic
title: Agent fine-tuning
description: Papers about algorithms and objectives for updating an LLM agent's weights on long-horizon, multi-turn tasks.
tags:
- agent-fine-tuning
- reinforcement-learning
- evolution-strategies
- credit-assignment
timestamp: 2026-08-20T00:00:00Z
---

# Scope

This topic tracks methods that update an LLM agent's parameters — as opposed to its prompts, skills, or memory, which this wiki tracks under [Agent self-evolution](agent-self-evolution.md) — to improve performance on multi-turn, long-horizon tasks with sparse, trajectory-level rewards. It covers reinforcement learning objectives, evolution strategies and other black-box optimizers, credit-assignment strategies across expanding interaction horizons, and the GPU/memory cost trade-offs each approach implies.

# Papers

* [Agentic ESOpt](../papers/2608.17310.md) - full-parameter evolution-strategies fine-tuning at inference-level GPU memory, using a cosine-decayed perturbation schedule and a variance argument for why its advantage over GRPO/PPO should grow with task horizon; validated on controlled Sudoku (crossover at H*=15), ReAct math/DocVQA, WebArena-Lite (27B, full-parameter), and automatic heuristic design.

# Open Questions

* Does evolution strategies' reported horizon-dependent advantage over policy-gradient RL hold on frontier-scale models and real (non-controlled) long-horizon tasks, not just the paper's controlled Sudoku crossover?
* How does population size need to scale with model size and task horizon, beyond a single 4B-vs-9B, G=8-vs-16 probe?
* When is it worth composing parameter-level updates with prompt-space skill/context evolution (as in [Agent self-evolution](agent-self-evolution.md)) rather than choosing one or the other?
* How do black-box, trajectory-level optimizers like ES interact with the credit-assignment concerns this wiki tracks under [Post-training feedback](post-training-feedback.md), which focuses on scalar-vs-textual reward channels rather than the optimizer itself?
