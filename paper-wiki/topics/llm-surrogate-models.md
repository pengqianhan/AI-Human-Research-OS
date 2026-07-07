---
type: Topic
title: LLM surrogate models
description: Papers about using LLMs as predictive surrogates that forecast outcomes instead of generating or acting directly.
tags:
- llm-surrogate-models
- selective-prediction
- evaluation
timestamp: 2026-06-16T00:00:00Z
---

# Scope

This topic tracks papers that use LLMs as predictive surrogates or evaluators - forecasting the outcome of an expensive process (e.g., compiling and running code, running an experiment) rather than generating the artifact or taking the action themselves.

# Papers

* [GPU Forecasters](../papers/2605.31464.md) - LLM surrogate that forecasts GPU kernel performance and selectively defers to real measurement when uncertain.

# Open Questions

* What makes an LLM surrogate well-calibrated, and how transferable is that calibration across domains?
* When is it better to use an LLM as a surrogate/evaluator versus as the generator of the artifact being evaluated?
* How does reinforcement learning on forecast accuracy compare to other ways of improving surrogate calibration (e.g., conformal prediction, ensembling)?
