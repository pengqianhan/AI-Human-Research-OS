---
type: Topic
title: Embodied navigation
description: Papers about vision-language(-action) models that translate goals and egocentric observations into navigation actions across tasks, scenes, and robot embodiments.
tags:
- embodied-navigation
- vision-language-action
- vlm-agents
- generalist-navigation
timestamp: 2026-09-06T00:00:00Z
---

# Scope

This topic tracks generalist embodied navigation: systems that use a vision-language(-action) model as the shared reasoning-and-control substrate for goal-directed physical movement — instruction-following VLN, open- or closed-vocabulary object-goal navigation, and embodied visual tracking — across simulated and real robot embodiments, as distinct from task- or embodiment-specific modular pipelines (waypoint predictors, topological maps, separate action heads per platform). It is distinct from this wiki's [Agent harness engineering](agent-harness-engineering.md) topic, which covers the software layer *around* a policy (including embodied harnesses like Zetta that evolve runtime critics around a frozen VLA policy); this topic covers the design of the base navigation policy itself.

# Papers

* [LightNav-0](../papers/2608.30935.md) - a compact (4B) VLM that expresses spatial intent as dual-channel image-grid pointing and decodes actions as three residual-vector-quantized tokens inside the same autoregressive LM head, reaching state-of-the-art monocular success rates across 10 public navigation benchmarks with one checkpoint and zero-shot transfer to four real robot embodiments.

# Open Questions

* LightNav-0's dual-channel pointing ablation shows the largest measured effect (-15.4% mean SR when removed) of any component tested — does an embodiment-agnostic pointing interface generalize as the primary mechanism across other generalist navigation systems (NavFoM, ABot-N0/N1, Qwen-RobotNav) that use different intermediate representations, or is its benefit specific to LightNav-0's particular RVQ action tokenizer?
* LightNav-0 trails panoramic methods on RxR nDTW (trajectory fidelity) even while leading on success rate and navigation error — does adding limited additional sensing (e.g. a second camera) close this specific gap without reintroducing the fragmentation the paper argues against, or is trajectory fidelity fundamentally harder to recover from a single forward view?
* How should a policy like LightNav-0 (the base navigation model) and a harness like [Zetta](../papers/2608.16590.md) (runtime critics/recovery skills around a frozen policy) compose — would layering Zetta-style validation-gated recovery skills on top of LightNav-0's frozen checkpoint recover its remaining INSIGHT-Bench failure modes (Institution scenes, Extremum-type instructions) without retraining the base policy?
