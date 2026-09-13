---
type: Tool
title: DSPy
description: An open-source framework for compiling declarative, multi-stage language-model programs into self-improving pipelines, providing both prompt-optimization (e.g., MIPROv2) and, more recently, RL-based weight-optimization (e.g., mmGRPO) optimizers.
resource: https://dspy.ai
aliases:
- dspy.ai
tags:
- lm-programs
- prompt-optimization
- framework
timestamp: 2026-09-13T00:00:00Z
---

# Definition

DSPy (Khattab et al., ICLR 2024) is a framework for programming — rather than manually prompting — language models: developers declare a modular pipeline of typed LM calls (signatures and modules) and DSPy compiles it, automatically optimizing prompts (instructions and few-shot demonstrations) against a metric and training set rather than requiring hand-tuned prompt strings. Its optimizer ecosystem originally centered on prompt-space search (including MIPROv2, a Bayesian-optimization-based instruction-and-demonstration optimizer) and has since been extended to weight-space reinforcement learning, with `dspy.GRPO` (mmGRPO) as its first RL optimizer capable of updating the underlying LM weights of a multi-module program rather than only its prompts.

# Papers

* [Multi-module GRPO](../papers/2508.04660.md) - open-sources its mmGRPO algorithm as the `dspy.GRPO` optimizer, and uses DSPy's own MIPROv2 prompt optimizer both as a baseline and as the first stage of its BetterTogether(PO, mmGRPO) staged-training recipe.
