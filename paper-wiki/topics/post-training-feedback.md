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

# Open Questions

* How much of the theoretical bandwidth of a textual feedback channel is usable supervision, and how would one measure it rather than bound it?
* When does richer feedback improve transfer versus merely overfit the evaluator's latent preferences more precisely?
* Can the evaluator's *calibration* and the feedback channel's *width* be improved independently, and do the gains compose?
* What distinguishes reward overoptimization from genuine improvement without a held-out human judgement?
* Should distilled experience be consolidated into weights or retrieved at inference, and does the answer change for multi-turn agentic tasks?
