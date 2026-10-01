---
type: Topic
title: Agent test-time scaling
description: Papers about spending more inference-time compute on one agent task (more candidate actions or trajectories, stronger verification, or more improvement rounds) and about when that compute turns into higher task success.
tags:
- test-time-scaling
- verification
- agent-evaluation
- long-horizon-agents
timestamp: 2026-10-01T00:00:00Z
---

# Scope

This topic tracks how extra compute at inference time, on a single task, raises an agent's success. It covers four levers: more candidates per step (action scaling), more complete trajectories with a selector (parallel trajectory scaling), refinement runs conditioned on earlier attempts (sequential scaling), and more improvement rounds inside one run (budget scaling). It also covers the verifiers that decide which candidate wins, and the cost accounting needed to compare levers. Weight updates belong to [Agent fine-tuning](agent-fine-tuning.md) and persistent changes to skills or harnesses to [Agent self-evolution](agent-self-evolution.md); papers appear here when they measure how success changes with inference budget.

# Papers

* [LLM-as-a-Verifier](../papers/2607.05391.md) - scales the *selector* for parallel trajectories: a training-free verifier scored from the expectation over score-token logits, scaled by granularity, repeated evaluation, and criteria decomposition, with a probabilistic pivot tournament that keeps best-of-N selection affordable.
* [AREX-2](../papers/2609.38288.md) - scales *rounds within one task*: defines self-improvement as best-so-far score rising with the round budget, splits it into gain per round and number of productive rounds, and trains the model on long improvement trajectories so later rounds stay productive.
* [Mid-Harness](../papers/2609.39982.md) - scales *actions within one trajectory*: samples several candidate actions per step and verifies them before execution at the model-harness boundary, and shows this composes with Best-of-T and Sequential Refine at lower estimated token cost than more trajectories alone.

# Synthesis

The three papers spend compute at different points of one run. LLM-as-a-Verifier waits until trajectories are complete and picks the best; Mid-Harness intervenes before every action, so a bad command never reaches the environment; AREX-2 gives one agent many rounds and makes the model itself responsible for using them. They agree that generation is rarely the bottleneck. LLM-as-a-Verifier cites a 98.9% oracle Pass@K on Terminal-Bench V2, and Mid-Harness shows a frontier verifier raising TMAX-9B from 50.00% to 68.03% on the same generator's samples. Both conclude that the selector decides how much of that headroom is realized: Mid-Harness finds that extra candidates barely help under a weak listwise self-verifier, and that pairwise comparison, LLM-as-a-Verifier's own tournament format, works best. The two connect directly, since Mid-Harness reuses LLM-as-a-Verifier's pivot tournament for actions and its trajectory selector for composition.

AREX-2 locates the bottleneck elsewhere: in whether the policy can keep turning rounds into progress. On Frontier-CS, its trained model is still gaining in the fifth hour while two baselines plateau within two to three hours, and its BrowseComp accuracy keeps rising with turns even with no correctness feedback. The verifier-centric papers instead keep the generator fixed. The levers can therefore stack: Mid-Harness's composed results already show action and trajectory scaling adding up, but no paper here has combined a trained long-horizon policy with per-action verification.

Cost reporting differs across the three. Mid-Harness reports idealized parallel latency, verifier tokens, and reference-priced dollars; LLM-as-a-Verifier states its tournament's cost as O(Nk²) comparisons rather than O(N²); AREX-2 reports budgets in hours and turns. A shared cost unit would be needed to say which lever is cheapest for a given gain.

# Open Questions

* At a matched token or dollar budget, which lever gives the most success on the same benchmark: more actions per step, more trajectories, more rounds, or more reasoning effort for a single candidate? Mid-Harness lists the last comparison as untested.
* Does a policy trained for long-horizon improvement (AREX-2) still benefit from per-action verification (Mid-Harness), or does training absorb the gain verification provides?
* Verifiers err most on later, state-dependent steps (Mid-Harness: 68.13% teacher agreement at turns 1-4 against 54.07% at turns 17-32). Can verification effort be spent adaptively on irreversible or environment-changing actions, and how much of the gain does that keep?
* AREX-2's decomposition into gain per round (r̄) and productive rounds (T*) is defined but not estimated. Can it be measured for verifier-based methods too, so that "keeps improving with budget" becomes a comparable number across papers?
