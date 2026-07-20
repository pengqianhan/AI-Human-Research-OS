---
type: Topic
title: Agent harness engineering
description: Papers about understanding, modifying, evaluating, and evolving the software layer that turns foundation models into agents.
tags:
- agent-harness-engineering
- harness-evolution
- coding-agents
- repository-understanding
timestamp: 2026-07-20T03:20:28Z
---

# Scope

This topic tracks work on the executable software layer around a foundation model: prompt construction, tool interfaces, state and memory, execution control, environment interaction, evaluation, and the representations and workflows needed to modify that layer safely.

# Papers

* [Harness Handbook](../papers/2607.13285.md) - behavior-centric repository representation and progressive-disclosure workflow for localizing distributed harness changes before editing.
* [MemoHarness](../papers/2607.14159.md) - six-dimensional harness search with a dual-layer experience bank and feedback-free per-case adaptation at test time.
* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - seven-criterion assessment of the context assembled by a harness, validated against corresponding downstream behaviors.
* [Self-Improvements in Modern Agentic Systems](../papers/2607.13104.md) - surveys prompt, memory, tool, and full-harness updates as the fast, explicit branch of persistent agent self-improvement.

# Synthesis

Harness Handbook asks where requested harness behavior lives in code so evolution can be localized and verified. MemoHarness searches six control surfaces and carries execution diagnoses forward as reusable adaptation evidence. AI Agents Do Not Fail Alone asks whether one major harness output—the context presented to the model—is clear, grounded, consistent, tool-aware, hardened, and efficient before behavior is tested. Self-Improvements in Modern Agentic Systems generalizes these cases into prompt, memory, tool, and full-scaffold updates and argues that this explicit layer should host fast exploration before validated behavior is consolidated into slower model updates. Together they suggest a four-part loop: map behavior to authoritative implementation, modify the control layer using execution evidence, independently gate the candidate, then assess both the assembled context and downstream behavior. The current evidence does not yet show that these representations and diagnostics remain accurate through long-running self-modification.

# Open Questions

* How should agent-visible behavior be mapped to code when runtime dispatch, generated code, or external services defeat static analysis?
* Which representations improve final patch correctness, not only localization and planning quality?
* How can a harness map remain synchronized through repeated edits without making stale prose an accidental source of truth?
* What evaluation gates are necessary before agents may modify their own harnesses?
* How should harness maintainability, regression risk, token cost, and task capability be optimized together?
* Can preflight context assessment predict harness regressions on unseen tasks without sharing the biases of the behavioral judge?
* Which parts of adaptive harness performance come from global search, case-level experience, distilled patterns, and test-time specialization?
* How should a harness reject stale, misleading, or adversarially similar experience before adapting a new case?
* Which scaffold updates are safe to automate, and which require an independent or human acceptance boundary?
