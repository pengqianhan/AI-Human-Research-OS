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
* [Agent Lightning](../papers/2508.03680.md) - decouples RL training from agent execution via an MDP formulation and a unified data interface, then applies LightningRL — decomposing any agent's trajectory into individually-grouped (input, output, reward) transitions rather than concatenating turns with masks — so unmodified GRPO/PPO/REINFORCE++ can optimize arbitrarily complex, dynamically-orchestrated agents built in any framework.
* [VibeWorlding](../papers/2608.15265.md) - cold-starts a multimodal 3D-world-construction agent via SFT, then trains it further with GRPO jointly across text-only and multimodal (rendered-image) queries using purely outcome-based rewards, pushing an open-source model from 5-14% Pass@1 as a base model to matching or exceeding frontier closed-source MLLMs.

# Synthesis

Agentic ESOpt and Agent Lightning give this topic its first direct methodological contrast: gradient-free vs. gradient-based agent fine-tuning. Agentic ESOpt's population-based evolution strategies need no differentiable, per-call credit assignment at all — it treats a whole rollout as a black-box fitness evaluation — while Agent Lightning's LightningRL depends entirely on decomposing execution into fine-grained transitions to assign credit within a trajectory, then hands that decomposition to an otherwise unmodified single-turn algorithm (GRPO, PPO, or REINFORCE++). VibeWorlding adds a second GRPO-based data point alongside Agent Lightning, but at the opposite end of the generality spectrum: rather than a framework-agnostic training methodology usable on any pre-existing agent, it trains one specific agent family (VibeWorlder) tightly co-designed with its own purpose-built sandbox and dual-constraint verifier, applying GRPO jointly across text and multimodal queries with deliberately no reward shaping. Both RL papers converge on the same minimalist credit-assignment choice — plain GRPO with little bespoke machinery layered on top (see [GRPO](../concepts/grpo.md)) — which sharpens Agentic ESOpt's own open question about when ES's claimed horizon-dependent advantage over policy-gradient RL actually bites: neither Agent Lightning nor VibeWorlding reports needing anything more sophisticated than GRPO's default grouped-advantage estimation, even on long, multi-turn, tool-using trajectories.

# Open Questions

* Does evolution strategies' reported horizon-dependent advantage over policy-gradient RL hold on frontier-scale models and real (non-controlled) long-horizon tasks, not just the paper's controlled Sudoku crossover?
* How does population size need to scale with model size and task horizon, beyond a single 4B-vs-9B, G=8-vs-16 probe?
* When is it worth composing parameter-level updates with prompt-space skill/context evolution (as in [Agent self-evolution](agent-self-evolution.md)) rather than choosing one or the other?
* How do black-box, trajectory-level optimizers like ES interact with the credit-assignment concerns this wiki tracks under [Post-training feedback](post-training-feedback.md), which focuses on scalar-vs-textual reward channels rather than the optimizer itself?
* Agent Lightning's credit-assignment module currently assigns every action in an episode the same value (the final return); VibeWorlding's per-transition rewards are similarly coarse (binary or a single proportion-correct score). At what task horizon or trajectory complexity does this simplest-possible credit assignment start to underperform a learned per-step value function or ES's population-based alternative?
