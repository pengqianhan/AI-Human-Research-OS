---
type: Topic
title: Agent harness engineering
description: Papers about understanding, modifying, evaluating, and evolving the software layer that turns foundation models into agents.
tags:
- agent-harness-engineering
- harness-evolution
- coding-agents
- repository-understanding
timestamp: 2026-07-17T12:28:52Z
---

# Scope

This topic tracks work on the executable software layer around a foundation model: prompt construction, tool interfaces, state and memory, execution control, environment interaction, evaluation, and the representations and workflows needed to modify that layer safely.

# Papers

* [Harness Handbook](../papers/2607.13285.md) - behavior-centric repository representation and progressive-disclosure workflow for localizing distributed harness changes before editing.

# Open Questions

* How should agent-visible behavior be mapped to code when runtime dispatch, generated code, or external services defeat static analysis?
* Which representations improve final patch correctness, not only localization and planning quality?
* How can a harness map remain synchronized through repeated edits without making stale prose an accidental source of truth?
* What evaluation gates are necessary before agents may modify their own harnesses?
* How should harness maintainability, regression risk, token cost, and task capability be optimized together?
