---
type: Topic
title: LLM surrogate models
description: Papers about using LLMs as predictive surrogates that forecast outcomes instead of generating or acting directly.
tags:
- llm-surrogate-models
- selective-prediction
- evaluation
timestamp: 2026-10-09T00:00:00Z
---

# Scope

This topic tracks papers that use LLMs as predictive surrogates or evaluators - forecasting the outcome of an expensive process (e.g., compiling and running code, running an experiment) rather than generating the artifact or taking the action themselves.

# Papers

* [GPU Forecasters](../papers/2605.31464.md) - LLM surrogate that forecasts GPU kernel performance and selectively defers to real measurement when uncertain.
* [From Traces to Agentic Worlds (Trace2Env)](../papers/2610.06100.md) - an LLM surrogate for a whole interactive environment: it predicts the next observation and state change for another agent's action from a worldbook rebuilt from past traces, where the real system cannot be run.

# Synthesis

The two papers forecast different things but face the same question of when the surrogate can be trusted. GPU Forecasters answers it per prediction, deferring to real measurement when the model is uncertain. Trace2Env has no real environment to defer to, so it builds trust into the prediction step instead: retrieved evidence is labelled supporting, uncertain, or format-only, every proposed state change is validated against trace-derived schemas and rules before it is committed, and missing state is treated as unknown rather than absent. It also shows that a surrogate's own success rate can mislead: a directly prompted simulator lets ALFWorld tasks succeed 97% of the time, but only 3% of the resulting action sequences work in the real environment. Neither paper yet exposes calibrated uncertainty to the downstream consumer of a multi-step simulation.

# Open Questions

* What makes an LLM surrogate well-calibrated, and how transferable is that calibration across domains?
* When is it better to use an LLM as a surrogate/evaluator versus as the generator of the artifact being evaluated?
* How does reinforcement learning on forecast accuracy compare to other ways of improving surrogate calibration (e.g., conformal prediction, ensembling)?
* When a surrogate's predictions feed back into later inputs (Trace2Env's multi-turn simulation), single-step accuracy no longer predicts usefulness. What multi-step measure, like Trace2Env's replay consistency ratio, should replace it when the real process is unavailable for replay?
