---
type: Method
title: AlphaEvolve
description: Google DeepMind's LLM-powered coding agent that evolves programs against one or more evaluators to discover algorithms and mathematical constructions, a common reference baseline for LLM-driven evolutionary discovery systems.
resource: https://arxiv.org/abs/2506.13131
tags:
- llm-driven-discovery
- evolutionary-search
- autonomous-research
- gpu-kernel-optimization
timestamp: 2026-10-04T00:00:00Z
---

# Definition

AlphaEvolve is an LLM-powered evolutionary coding agent that iteratively proposes, evaluates, and refines candidate programs against one or more automated evaluators, applied to algorithm design and open-ended mathematical discovery (e.g., matrix-multiplication algorithms, packing and inequality problems). It established the propose-evaluate-refine loop, with a base model kept frozen across iterations and quality bounded by that fixed capacity, that a large family of later LLM-driven discovery systems (OpenEvolve, CodeEvolve, ShinkaEvolve, and others) extend or compare against.

# Papers

* [Dream-RSI](../papers/2609.14858.md) - uses AlphaEvolve and its successor AlphaEvolveV2 as primary quantitative baselines on three mathematical-optimization tasks (Sum-Difference, Circle Packing, Autocorrelation Inequalities); Dream-RSI matches or exceeds AlphaEvolve's reported Circle Packing and Sum-Difference results while using far fewer discovery-agent calls than SimpleTES, though the comparison mixes different underlying backbone models rather than holding the discovery agent fixed across systems.
* [ScientistOne](../papers/2605.26340.md) - cites AlphaEvolve, AdaEvolve, and EvoX as evidence that agentic algorithm-discovery systems can reach strong solver scores, while arguing this alone does not guarantee trustworthy manuscripts — the gap ScientistOne's own claim-provenance mechanism targets.
* [Self-Improvements in Modern Agentic Systems](../papers/2607.13104.md) - places AlphaEvolve in its taxonomy as an example of full-scaffold improvement in scientific and technical optimization: evolving programs against one or more evaluators as a case of bounded self-modification under executable feedback.
* [PaperGym](../papers/2608.31119.md) - groups AlphaEvolve with DeepScientist under "search-based iterative refinement via evolutionary or Bayesian operators," one of three paradigms for automated-research-capability work, distinguished from PaperGym's own training-driven approach by keeping the base model frozen and bounding output quality by its fixed capacity.
* [Context Language Models](../papers/2609.37725.md) - takes four AlphaEvolve/OpenEvolve mathematical-optimization problems (circle packing, Heilbronn triangle, min-max/min-distance 2D, Erdős minimum overlap) as open-discovery testbeds and compares a general CLM agent, given the evolutionary algorithm only as in-context guidance, against OpenEvolve and an OpenEvolve-Agent variant with Claude 4.6 Sonnet under 100 scored attempts or five hours; CLM posts the best best-of-run score on all four (e.g., circle packing 2.618 against 2.541, Heilbronn 0.03653 against 0.03127), though the Erdős and min-max margins are small and no variance is reported.

# Notes

Only Dream-RSI engages with AlphaEvolve as a directly compared quantitative baseline under its own evaluation tasks; the other three papers cite it only as related-work context (a named example of the evolutionary-discovery paradigm) rather than reporting a head-to-head number. Dream-RSI's own comparison is not fully controlled either — AlphaEvolve and AlphaEvolveV2's reported scores come from their own papers under Gemini-2.0-family backbones, not re-run under Dream-RSI's Gemini-3.1 Pro / Gemini-3.7-Flash harness, so the comparison holds the task and metric fixed but not the underlying model.
