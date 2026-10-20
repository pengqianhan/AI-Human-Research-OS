---
type: Method
title: Self-Harness
description: A harness-evolution loop in which an LLM agent improves its own operating harness without human engineers or a stronger proposer, by mining model-specific weaknesses from execution traces, proposing minimal harness edits tied to them, and accepting edits only after regression testing; a common harness-only baseline with a frozen self-proposer.
resource: https://arxiv.org/abs/2606.09498
tags:
- agent-harness-engineering
- harness-evolution
- recursive-self-improvement
timestamp: 2026-10-20T00:00:00Z
---

# Definition

Self-Harness (Zhang, Zhang, Li, Zhang, Chen, Zhang, Bai, and Hu, arXiv:2606.09498) treats harness design as model-specific and lets the agent's own base model revise its harness. Each iteration has three stages: Weakness Mining finds the model's failure patterns in execution traces, Harness Proposal generates diverse but minimal harness modifications tied to those failures, and Proposal Validation accepts a candidate edit only after regression testing. The model weights stay fixed. Its abstract reports held-out Terminal-Bench 2.0 pass rates rising from 40.5% to 61.9% for MiniMax M2.5, 23.8% to 38.1% for Qwen3.5-35B-A3B, and 42.9% to 57.1% for GLM-5 from a minimal initial harness. Later papers use it as the self-proposed counterpart to [Meta-Harness](meta-harness.md), whose proposer is a stronger external model.

# Papers

* [Self-Evolving Coding Agents via Harness-Policy Optimization](../papers/2610.22791.md) - harness-only baseline in the self-improving setting (frozen policy as proposer, fixed search set, same search budget): 60.1 average resolve rate over three SWE-bench variants against Self-HPO's 64.8. The two share the first H-step, after which a second harness-only step lowers SWE-bench Multilingual from 55.0 to 54.3.
* [Self-evolving Agent Harness](../papers/2610.18813.md) - placed in the survey's taxonomy among methods that patch selected executable components, and in its evolutionary mapping under elitist (1+λ) search, recombination, and Pareto selection; named as reusing a held-out regression split during search, which its admission bounds treat as violating fresh-validation independence.
* [The Last AI Built by Humans](../papers/2609.11873.md) - the example for its L2 level, improvement-strategy autonomy: the objective stays externally fixed while the system diagnoses its own weaknesses and decides how to improve.

# Notes

The definition above comes from the Self-Harness abstract only; the paper itself has not been ingested in this wiki. Self-HPO's comparison table characterizes it as a frozen self-proposer searching on a fixed task set, which is the contrast Self-HPO builds on by training the proposer and moving the search set.

# Related

* [Meta-Harness](meta-harness.md) - the external-proposer counterpart; Self-HPO uses Meta-Harness and Self-Harness as the harness-only baselines of its two settings.
