---
type: Topic
title: Agent environments
description: Papers about the environments, permissions, artifacts, budgets, and interfaces that shape agent behavior.
tags:
- agent-environments
- environment-engineering
- agent-reliability
timestamp: 2026-07-17T12:28:52Z
---

# Scope

This topic tracks papers where the main design object is not only the agent policy or workflow, but the surrounding environment that grants affordances, constrains failure modes, records artifacts, manages resources, and enables supervision.

# Papers

* [EurekAgent](../papers/2606.13662.md) - environment engineering for metric-driven autonomous scientific discovery with CLI agents.
* [Harness Handbook](../papers/2607.13285.md) - behavior-centric mapping from harness behavior to distributed implementation sites for safer modification planning.

# Synthesis

EurekAgent treats permissions, artifacts, budgets, evaluators, and interfaces as the environment that shapes autonomous research behavior. Harness Handbook addresses the maintainability of that same surrounding layer: it makes behavior-to-code relationships explicit so a human or coding agent can find every site affected by a requested change. Together they frame the agent environment as both a control surface and a software artifact that must remain navigable and verifiably synchronized with its implementation.

# Open Questions

* Which environment controls prevent reward hacking without blocking useful exploration?
* What artifact formats make long-running agent work inspectable and resumable?
* How much human supervision should be built into the environment rather than handled through ad hoc prompts?
* How can user-visible environment behavior remain traceable to authoritative code and regression checks as the harness evolves?
