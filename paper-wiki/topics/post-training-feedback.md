---
type: Topic
title: Post-training feedback
description: Papers about the signals used to post-train language models when no verifier exists, and what those signals discard.
tags:
- post-training-feedback
- reward-hacking
- evaluation
- non-verifiable-tasks
timestamp: 2026-07-22T00:00:00Z
---

# Scope

This topic tracks how a model-produced judgement is converted into a training signal for open-ended, non-verifiable tasks — where no execution, unit test, or exact-match check is available and quality is multi-dimensional.

The recurring questions are about the *channel*, not the evaluator: what a scalar reward throws away relative to the critique it was distilled from; whether richer textual feedback transfers better or merely fits the evaluator more closely; and which failure modes (reward overoptimization, critique imitation, forgetting on out-of-distribution capabilities) each channel invites.

It is adjacent to but distinct from [Agent self-evolution](agent-self-evolution.md), which concerns agents improving their scaffolding or skills after deployment. This topic concerns weight-level post-training signals.

# Papers

* [LLM-as-a-Coach](../papers/2607.18110.md) - replaces the scalar rubric reward with coach-extracted transferable experiential knowledge internalized via on-policy context distillation; reports better transfer despite smaller training-set gains.
* [PaperGym](../papers/2608.31119.md) - uses the same instance-specific rubric as both channels in sequence rather than choosing one: first as OPSD's privileged teacher context (a dense, distributional signal), then as GRPO's scalar reward (per-criterion binary verdicts combined into one number), with an ablation finding the raw-rubric-conditioned teacher is its best-performing privileged-context variant.

# Synthesis

LLM-as-a-Coach and PaperGym reach opposite rankings on a question both papers directly ablate: what should condition an OPSD-style teacher's privileged context? LLM-as-a-Coach's teacher-context ablation finds that conditioning on bare rubrics or a full critique biases the teacher toward a *critiquing* distribution that degrades out-of-distribution instruction-following, and that coach-*extracted transferable experience* — a further distillation step beyond the raw rubric — is what actually wins. PaperGym's own privileged-information ablation (its Table 5) finds the opposite: a teacher conditioned directly on the raw rubric outperforms one conditioned on the reference answer, or on rubric plus reference answer together. The two results are not a direct contradiction — the tasks differ (single-turn open-ended instruction-following vs. research-plan generation) and the comparison baselines differ (LLM-as-a-Coach compares raw rubrics against *extracted experience*; PaperGym compares rubrics against a *reference answer*, and never tests extracted experience as a third condition) — but together they narrow this topic's open question about channel *content*, not just channel *width*: raw evaluative context (rubrics, critiques) may specifically risk teaching a critiquing rather than a doing distribution, a risk that both papers observe in different forms but neither fully isolates from the surrounding task type.

# Open Questions

* How much of the theoretical bandwidth of a textual feedback channel is usable supervision, and how would one measure it rather than bound it?
* When does richer feedback improve transfer versus merely overfit the evaluator's latent preferences more precisely?
* Can the evaluator's *calibration* and the feedback channel's *width* be improved independently, and do the gains compose?
* What distinguishes reward overoptimization from genuine improvement without a held-out human judgement?
* Should distilled experience be consolidated into weights or retrieved at inference, and does the answer change for multi-turn agentic tasks?
* Does conditioning an OPSD-style teacher on raw rubrics, versus a reference answer, versus coach-extracted textual experience, trade off differently depending on whether the downstream task is single-turn instruction-following (LLM-as-a-Coach) or open-ended plan generation (PaperGym) — and would adding extracted-experience conditioning to PaperGym's ablation, or raw-rubric conditioning to LLM-as-a-Coach's, resolve the apparent disagreement?
