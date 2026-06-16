---
type: Topic
title: Agent self-evolution
description: Papers about agents that improve their own skills, verification signals, or behavior after deployment.
tags:
- agent-self-evolution
- agent-skills
- verification
timestamp: 2026-06-15T00:00:00Z
---

# Scope

This topic tracks papers about agents that adapt after deployment by building skills, generating practice tasks, creating verification signals, or revising behavior from open-world resources.

# Papers

* [OpenSkill](../papers/2606.06741.md) - builds transferable skills and self-built verification anchors from documentation, repositories, and the web without target-task supervision.
* [Self-Evolving Multi-Agent Systems via Decentralized Memory](../papers/2605.22721.md) - per-agent dual-pool memory (exploit past trajectories + explore LLM-generated candidates) with LLM-as-a-judge reweighting for continual improvement.

# Synthesis

OpenSkill and DecentMem both target continual agent improvement but differ in mechanism: OpenSkill builds reusable skill objects from external resources, while DecentMem accumulates and reweights trajectory-level memory within a multi-agent system. The two approaches are complementary and could potentially be combined.

# Open Questions

* How should generated skills be represented so they remain reusable and auditable?
* What makes a self-built verifier reliable enough to guide agent improvement?
* How can self-evolution workflows avoid overfitting to synthetic practice tasks?
* Does per-agent memory evolution in DecentMem lead to agents that specialize or diverge in ways that reduce team coherence?

