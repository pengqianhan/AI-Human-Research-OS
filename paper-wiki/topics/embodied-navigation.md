---
type: Topic
title: Embodied navigation
description: Papers about vision-language(-action) models that translate goals and egocentric observations into navigation actions across tasks, scenes, and robot embodiments.
tags:
- embodied-navigation
- vision-language-action
- vlm-agents
- generalist-navigation
timestamp: 2026-10-10T00:00:00Z
---

# Scope

This topic tracks generalist embodied navigation: systems that use a vision-language(-action) model as the shared reasoning-and-control substrate for goal-directed physical movement — instruction-following VLN, open- or closed-vocabulary object-goal navigation, and embodied visual tracking — across simulated and real robot embodiments, as distinct from task- or embodiment-specific modular pipelines (waypoint predictors, topological maps, separate action heads per platform). It is distinct from this wiki's [Agent harness engineering](agent-harness-engineering.md) topic, which covers the software layer *around* a policy (including embodied harnesses like Zetta that evolve runtime critics around a frozen VLA policy); this topic covers the design of the base navigation policy itself.

# Papers

* [LightNav-0](../papers/2608.30935.md) - a compact (4B) VLM that expresses spatial intent as dual-channel image-grid pointing and decodes actions as three residual-vector-quantized tokens inside the same autoregressive LM head, reaching state-of-the-art monocular success rates across 10 public navigation benchmarks with one checkpoint and zero-shot transfer to four real robot embodiments.
* [Show-Harness](../papers/2609.10522.md) - a manipulation-domain counterpart to this topic's navigation policies: a discrete, view-relative semantic action vocabulary deterministically grounded by a per-embodiment interpreter, letting a frozen VLM (zero-shot) or a small LoRA-adapted VLM control both a 7-DoF Franka arm and a bimanual AgileX rig through the same interface, with embodiment transfer handled entirely outside the model.
* [SuperNav](../papers/2610.12126.md) - the harness route to generalist navigation: an unmodified MLLM (GPT-5.6 Terra) picks destination points in four labelled views, a geometric or learned backend executes the motion, and Markdown Navigation Skills guide search, recovery, and completion. It reaches 78.00% success on 150 single-object instance tasks against 34.00% for the best fine-tuned baseline, with the best numbers relying on simulator depth and navigation meshes; the RGB-only learned backend keeps 68.00% success at lower path efficiency.

# Synthesis

LightNav-0 and SuperNav both express navigation intent by pointing in the image, and differ in where that ability lives. LightNav-0 trains a 4B model to emit pointing and action tokens, so one checkpoint covers ten monocular benchmarks; SuperNav leaves a frontier MLLM untouched, makes the point a tool argument, and puts search and recovery procedure in readable Skills. The two agree on the interface: removing dual-channel pointing was LightNav-0's largest ablation effect, and in SuperNav direct pointing beats routing the choice through an external grounding model. SuperNav's strongest results, however, use simulator geometry and a budget of up to an hour per episode, so the two routes have not been compared under matched sensing or cost.

# Open Questions

* LightNav-0's dual-channel pointing ablation shows the largest measured effect (-15.4% mean SR when removed) of any component tested — does an embodiment-agnostic pointing interface generalize as the primary mechanism across other generalist navigation systems (NavFoM, ABot-N0/N1, Qwen-RobotNav) that use different intermediate representations, or is its benefit specific to LightNav-0's particular RVQ action tokenizer?
* LightNav-0 trails panoramic methods on RxR nDTW (trajectory fidelity) even while leading on success rate and navigation error — does adding limited additional sensing (e.g. a second camera) close this specific gap without reintroducing the fragmentation the paper argues against, or is trajectory fidelity fundamentally harder to recover from a single forward view?
* How should a policy like LightNav-0 (the base navigation model) and a harness like [Zetta](../papers/2608.16590.md) (runtime critics/recovery skills around a frozen policy) compose — would layering Zetta-style validation-gated recovery skills on top of LightNav-0's frozen checkpoint recover its remaining INSIGHT-Bench failure modes (Institution scenes, Extremum-type instructions) without retraining the base policy?
* Show-Harness finds that a frontier VLM navigates its own discrete action vocabulary robustly zero-shot, with errors concentrating in fine-grained grasping/placement rather than planning — would the same zero-shot competence hold for LightNav-0's navigation-specific dual-channel pointing interface if exposed to a frontier VLM directly, or does navigation's larger action space and longer horizon make LightNav-0's trained action decoder necessary where Show-Harness's manipulation interface does not need one?
* SuperNav's learned RGB-only backend keeps most of the success rate but under 40% of the geometric backend's path efficiency on HM3D. Would a fine-tuned pointing policy such as LightNav-0 serve as the motion backend under SuperNav's harness, combining a general MLLM's request understanding with trained low-level navigation?
