---
type: Topic
title: Agent harness engineering
description: Papers about understanding, modifying, evaluating, and evolving the software layer that turns foundation models into agents.
tags:
- agent-harness-engineering
- harness-evolution
- coding-agents
- repository-understanding
timestamp: 2026-07-18T22:59:11Z
---

# Scope

This topic tracks work on the executable software layer around a foundation model: prompt construction, tool interfaces, state and memory, execution control, environment interaction, evaluation, and the representations and workflows needed to modify that layer safely.

# Papers

* [Harness Handbook](../papers/2607.13285.md) - behavior-centric repository representation and progressive-disclosure workflow for localizing distributed harness changes before editing.
* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - seven-criterion assessment of the context assembled by a harness, validated against corresponding downstream behaviors.

# Synthesis

Harness Handbook asks where a requested harness behavior lives in code so that evolution can be localized and verified. AI Agents Do Not Fail Alone asks whether one major harness output—the context presented to the model—is clear, grounded, consistent, tool-aware, hardened, and efficient before behavior is tested. Together they suggest two complementary review layers: trace behavior to authoritative implementation, then assess the runtime context that implementation assembles. Both still require downstream execution tests; navigability and context quality are leading indicators rather than proof of correct behavior.

# Open Questions

* How should agent-visible behavior be mapped to code when runtime dispatch, generated code, or external services defeat static analysis?
* Which representations improve final patch correctness, not only localization and planning quality?
* How can a harness map remain synchronized through repeated edits without making stale prose an accidental source of truth?
* What evaluation gates are necessary before agents may modify their own harnesses?
* How should harness maintainability, regression risk, token cost, and task capability be optimized together?
* Can preflight context assessment predict harness regressions on unseen tasks without sharing the biases of the behavioral judge?
