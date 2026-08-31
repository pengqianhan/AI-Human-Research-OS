---
type: Method
title: On-policy distillation
description: Training a student on its own sampled trajectories by matching a teacher's per-token distribution rather than imitating fixed teacher outputs.
tags:
- on-policy-distillation
- post-training-feedback
timestamp: 2026-07-22T00:00:00Z
---

# Definition

On-policy distillation (OPD) trains a student model on **its own generated trajectories**, minimizing a token-level divergence between the student's distribution and a teacher's distribution over the same prefixes. Sampling from the student rather than the teacher avoids the exposure bias of off-policy sequence-level distillation: the student receives supervision exactly where its own probability mass lies, including on its own mistakes.

Two variants matter for how the signal enters the system:

* **Teacher-parametric OPD** — the teacher is a stronger model, and the learning signal comes from its larger parameter space. Feedback scales with response length.
* **Context-conditioned OPD (on-policy context distillation)** — teacher and student may be the *same* model, and the external signal enters only through text placed in the teacher's context (a solution, a hint, privileged information, or a critique). The pair forms a closed system whose signal is bounded by that context. Consolidating the context into weights means it is not needed at inference.

The second variant is what makes OPD a channel for arbitrary natural-language supervision, not just a compression technique.

# Papers

* [LLM-as-a-Coach](../papers/2607.18110.md) - uses on-policy context distillation as the mechanism that converts a coach's textual experiential knowledge into dense token-level supervision; its teacher-context ablation shows the *format* of that context decides whether the student learns to solve tasks or to critique them.
* [VoiceMem](../papers/2608.26005.md) - uses teacher-parametric black-box on-policy distillation ("SLM-verified OPD") to convert speech-in/text-out models (Qwen2.5-Omni, Qwen3-Omni, Step-Audio2-Mini) into models with explicit memory access, distilling from stronger proprietary teachers (Qwen3.5-Omni, Step-Audio2) through a loop of memory-world construction, online correction, and post-hoc verification.

# Notes

The teacher-context ablation in LLM-as-a-Coach is the sharpest practical warning about this method: prepending evaluation-flavored context (a full critique, or bare rubrics) shifts the teacher toward a *critiquing* distribution, which the student then imitates, degrading out-of-distribution instruction following even while in-distribution scores rise. The context must describe how to do the task, not how to assess it.

The same paper reports that iteratively promoting the student to teacher improves in-distribution scores but causes substantial forgetting, recoverable by mixing in general-domain prompts distilled from the original frozen checkpoint. Treat a frozen-checkpoint anchor as a default stabilizer whenever the teacher is allowed to drift.

The wiki's two papers exercise the two variants from the Definition on opposite ends: LLM-as-a-Coach uses context-conditioned OPD (same-model teacher, external signal entering only through prompt content) to avoid needing a stronger model at all; VoiceMem uses teacher-parametric OPD (a genuinely stronger, proprietary closed-source teacher) specifically because the target capability — explicit memory access in a speech-in/text-out model — does not exist in the student's own distribution to be elicited by context alone.

# Related

* [LLM-as-a-Judge](llm-as-a-judge.md) - the alternative use of the same feedback model, where the assessment is reduced to a scalar reward instead of a distributional target.
* [Post-training feedback](../topics/post-training-feedback.md)
