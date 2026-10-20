---
type: Method
title: GiGPO (Group-in-Group Policy Optimization)
description: Critic-free RL for multi-turn LLM agents that adds step-level relative advantages, computed by grouping actions taken from the same environment state across a group's trajectories, to GRPO-style episode-level advantages; a standard temporal credit-assignment method for agent RL.
resource: https://arxiv.org/abs/2505.10978
tags:
- reinforcement-learning
- credit-assignment
- agent-fine-tuning
timestamp: 2026-10-20T00:00:00Z
---

# Definition

GiGPO (Feng, Xue, Liu, and An, arXiv:2505.10978, NeurIPS 2025) targets the credit-assignment problem of training LLM agents with sparse or delayed rewards over many steps, while keeping group-based RL's properties: no critic, low memory, stable convergence. It estimates relative advantage at two levels. At the episode level, as in [GRPO](grpo.md), it compares complete trajectories within a group. At the step level, an anchor-state grouping step looks for environment states that recur across the group's trajectories and groups the actions taken from the same state, so each action is compared with the alternatives tried from that state. The two levels are combined without auxiliary models or extra rollouts. Its abstract reports gains of more than 12% on [ALFWorld](alfworld.md) and more than 9% on [WebShop](webshop.md) over GRPO with Qwen2.5-1.5B- and 7B-Instruct.

# Papers

* [CoworkEnv](../papers/2610.24960.md) - one of four RL configurations trained from a shared warm-up on synthesized coworker tasks (step-advantage weight ω = 1.0, no ω = 0 control): highest Claw-Eval Overall (60.7) and General (59.7) scores, but the lowest Multi-turn score of the four (64.8).
* [SLCA-GRPO](../papers/2609.29050.md) - cited as a temporal credit-assignment method (which step deserves credit) beside VinePPO and SPO; SLCA adds a structural axis (tool versus summary tokens) and names the combination with GiGPO as untested.
* [X-Tree](../papers/2609.32993.md) - cited among multi-turn agent-training methods, via its verl-agent implementation.
* [ActionOPD](../papers/2610.19820.md) - cited for same-state grouping across trajectories with return-based advantages; ActionOPD instead scores same-state candidates against a shared teacher sample set, without estimating returns.

# Notes

Step-level grouping needs repeated environment states across a group's trajectories, which is natural in text environments such as ALFWorld and WebShop. How often states recur in open tool-use or coworker environments, where CoworkEnv's results are mixed across task categories, is not measured in these papers.

# Related

* [GRPO](grpo.md) - the episode-level estimator GiGPO extends.
* [ALFWorld](alfworld.md) and [WebShop](webshop.md) - the benchmarks of the original paper.
