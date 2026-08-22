---
type: Topic
title: Agent self-evolution
description: Papers about agents that improve their own skills, verification signals, or behavior after deployment.
tags:
- agent-self-evolution
- agent-skills
- verification
timestamp: 2026-07-22T11:05:19Z
---

# Scope

This topic tracks papers about agents that adapt after deployment by building skills, generating practice tasks, creating verification signals, or revising behavior from open-world resources.

# Papers

* [SkillFoundry](../papers/2604.03964.md) - a self-evolving framework that mines heterogeneous scientific resources into a validated skill library and maintains it through closed-loop expand/repair/merge/prune.
* [OpenSkill](../papers/2606.06741.md) - builds transferable skills and self-built verification anchors from documentation, repositories, and the web without target-task supervision.
* [Self-Evolving Multi-Agent Systems via Decentralized Memory](../papers/2605.22721.md) - per-agent dual-pool memory (exploit past trajectories + explore LLM-generated candidates) with LLM-as-a-judge reweighting for continual improvement.
* [MemoHarness](../papers/2607.14159.md) - learns a global harness from diagnosed executions, then retrieves positive and negative experience to specialize that harness for each unseen case.
* [Self-Improvements in Modern Agentic Systems](../papers/2607.13104.md) - defines persistent self-improvement across model parameters and prompts, memory, tools, or full scaffolds, then organizes each branch by its execution-derived learning signal.
* [SkillOpt-Lite](../papers/2607.03451.md) - simplifies post-deployment skill evolution to file-based trajectory exploration, consensus mining, minimal patches, and independent validation, then applies the loop to harness code.
* [SkillOpt](../papers/2605.23904.md) - trains a persistent skill document with an explicit deep-learning analogy (bounded textual learning rate, held-out validation gate, rejected-edit buffer, epoch-wise slow/meta update) and shows the resulting artifact transfers across models, harnesses, and nearby benchmarks.
* [EnvHarness](../papers/2608.19880.md) - evolves the training/evaluation environment rather than the agent: EnvRigger diagnoses a frozen policy's trajectories and writes new wrapper components targeting the diagnosed weakness, validated on fresh rollouts before acceptance.
* [Zetta](../papers/2608.16590.md) - evolves code-based runtime critics and recovery skills online at action frequency through three timescale-separated loops, gated by historical-regression and held-out generalization checks, while the base VLA policy stays frozen.

# Synthesis

OpenSkill and DecentMem both target continual agent improvement but differ in mechanism: OpenSkill builds reusable skill objects from external resources, while DecentMem accumulates and reweights trajectory-level memory within a multi-agent system. SkillFoundry adds library-level expansion, repair, merging, and pruning (see also [Agent skill libraries](agent-skill-libraries.md)). SkillOpt-Lite updates existing skills from task trajectories and argues that file-native exploration plus independent validation can replace several pooling and damping mechanisms. SkillOpt makes the training analogy underlying self-evolution explicit and load-bearing: it names its update budget a textual learning rate, its acceptance criterion a validation gate, and its cross-epoch consolidation a slow/meta update, then ablates each component to show which ones the reported gains actually depend on (the largest single drop comes from removing the meta-skill-plus-slow-update mechanism together). MemoHarness operates on a different mutable object—the complete model harness—and separates detailed episode records from distilled global patterns before retrieving both for case-level adaptation. Its reported test-time bank is frozen, so it demonstrates experience-conditioned adaptation rather than fully online self-evolution during deployment. EnvHarness moves the mutable object outside the agent entirely: rather than evolving a skill, memory, or harness, its EnvRigger designer evolves the *environment* the frozen policy trains or is evaluated in, using the same diagnose-from-trajectories-then-validate-on-fresh-rollouts pattern this topic already tracks for agent-side artifacts. Zetta shows the same pattern compressed to action-frequency timescales in embodied control — where SkillOpt's epoch-wise slow/meta update consolidates across whole training epochs, Zetta's three loops separate per-action governance, per-rollout diagnosis, and cross-rollout validated promotion, so "self-evolution" here means a code-based critic/recovery layer updating between and even within rollouts rather than between agent sessions. Self-Improvements in Modern Agentic Systems supplies a common coordinate system for these mechanisms: what persistent substrate changes, what signal drives the change, and whether the result is fast scaffold exploration or slower parametric consolidation.

# Open Questions

* How should generated skills be represented so they remain reusable and auditable?
* What makes a self-built verifier reliable enough to guide agent improvement?
* How can self-evolution workflows avoid overfitting to synthetic practice tasks?
* Does per-agent memory evolution in DecentMem lead to agents that specialize or diverge in ways that reduce team coherence?
* When should episode-level execution records be promoted into global patterns, reusable skills, or permanent harness changes?
* How can a system measure whether case-specific adaptation is genuinely useful rather than retrieval-induced overfitting?
* What evidence should be required before a validated scaffold behavior is consolidated into model weights?
* Which skill-optimization mechanisms remain useful once an optimizer can inspect semantically rich trajectories directly, and how should that be tested without changing several components at once?
