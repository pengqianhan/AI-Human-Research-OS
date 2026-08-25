---
type: Method
title: GRPO (Group Relative Policy Optimization)
description: A value-free RL algorithm that estimates a response's advantage by normalizing its reward against the mean and standard deviation of a group of responses sampled for the same prompt, avoiding a separately trained critic model.
resource: https://arxiv.org/abs/2402.03300
tags:
- reinforcement-learning
- policy-gradient
- credit-assignment
timestamp: 2026-08-25T00:00:00Z
---

# Definition

GRPO (Group Relative Policy Optimization), introduced in DeepSeekMath (Shao et al., 2024) and popularized further by DeepSeek-R1, is a policy-gradient RL algorithm for LLMs that removes the separately trained value/critic model used by standard PPO. For a given prompt, the policy samples a group of G responses; each response's advantage is computed by normalizing its reward against the group's own mean and standard deviation, rather than against a learned value function's baseline. This makes GRPO lighter-weight and simpler to implement than PPO while remaining a standard single-turn (single-call) RL recipe: it assumes one prompt produces one scored response. Papers that apply RL to multi-turn or multi-call agents therefore need some additional mechanism to turn an agent's longer trajectory into GRPO-compatible groups of same-task samples before GRPO's own grouped-advantage machinery can run unmodified.

# Papers

* [Agent Lightning](../papers/2508.03680.md) - LightningRL decomposes an agent's trajectory into individual (input, output, reward) transitions, then groups same-task transitions for advantage estimation exactly as GRPO groups same-prompt completions, making GRPO (or PPO/REINFORCE++) usable unmodified on arbitrarily complex multi-turn, multi-agent trajectories.
* [VibeWorlding](../papers/2608.15265.md) - trains VibeWorlder from a cold-started SFT checkpoint using GRPO, applied jointly in one training run to text-only 3D-world-construction queries and multimodal (rendered-image) refinement queries, with purely outcome-based (no reward shaping) binary or proportional rewards.
