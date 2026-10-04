---
type: Method
title: GEPA
description: Reflective prompt evolution that has an LLM reflect on execution traces from training mini-batches to propose prompt updates and keeps candidates through Pareto-based evolutionary selection on validation performance; a standard prompt-optimization baseline for skill and harness optimizers.
resource: https://arxiv.org/abs/2507.19457
tags:
- prompt-optimization
- agent-harness-engineering
- agent-self-evolution
timestamp: 2026-10-04T00:00:00Z
---

# Definition

GEPA (Agrawal et al., "GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning", arXiv:2507.19457, ICLR 2026) optimizes the prompts of an LLM system without updating weights. It runs the system on training mini-batches, has an LLM reflect in natural language on the traces and feedback to propose prompt changes, and keeps a pool of candidates selected by Pareto performance across validation instances. Papers in this wiki use it as the prompt-centric baseline against which harness- and skill-level optimizers are compared, and describe it as sitting between search-based and learning-based harness optimization.

# Papers

* [SkillOpt](../papers/2605.23904.md) - one of seven baselines (as the paper's own reimplementation) across six benchmarks and seven target models; SkillOpt reports outperforming it.
* [AutoSaddler](../papers/2608.23041.md) - baseline on GAIA2 (54.6% vs. AutoSaddler's 62.0%), SWE-Bench Pro, and Terminal-Bench 2.0; AutoSaddler characterizes it as prompt-centric optimization driven by shallow reflection.
* [ActiveSaddler](../papers/2610.00906.md) - baseline (54.2% GAIA2, 65.8% Terminal-Bench 2.0 with gpt-5.5) and a second host optimizer: letting ActiveSaddler choose GEPA's training batches raises its GAIA2 score to 57.2%.
* [RASO](../papers/2609.38024.md) - one of four skill-update baselines (own rerun): with GPT-5.6-Luna it is the second-best retrieval-free updater on SpreadsheetBench (54.53 vs SkillOpt 57.02, RASO 63.33), while with Qwen-3.5-9B it degrades the initial skill on SpreadsheetBench (24.05 vs 27.74).
* [Context Language Models](../papers/2609.37725.md) - reuses GEPA's reflective prompt-evolution loop (Agrawal et al., 2026) to evolve context-management *skill documents* for a self-editing model: rollouts on a training split, a proposer writes candidate skills from the traces, selection on a dev split, one final held-out evaluation; with Claude Fable 5.1 proposing for Qwen3.6-27B (assisted) or Opus 5 as both agent and proposer (self-evolution), the evolved skills expand the accuracy-versus-compute Pareto frontier on ContextBench, up to +35.9 held-out points on KV Store.

# Notes

The GEPA numbers in these papers come from each paper's own reruns under its own budget, backbone, and harness, not from the original GEPA paper, which this wiki has not ingested. ActiveSaddler's result suggests that GEPA's fixed choice of training mini-batches, not only its reflection step, limits what it finds. RASO adds that GEPA, like the other retrieval-free updaters, barely improves a skill that was already initialized from retrieved knowledge (at most +0.59 with Qwen-3.5-9B under RASI).
