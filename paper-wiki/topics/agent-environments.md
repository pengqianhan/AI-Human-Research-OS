---
type: Topic
title: Agent environments
description: Papers about the environments, permissions, artifacts, budgets, and interfaces that shape agent behavior.
tags:
- agent-environments
- environment-engineering
- agent-reliability
timestamp: 2026-07-18T22:59:11Z
---

# Scope

This topic tracks papers where the main design object is not only the agent policy or workflow, but the surrounding environment that grants affordances, constrains failure modes, records artifacts, manages resources, and enables supervision.

# Papers

* [EurekAgent](../papers/2606.13662.md) - environment engineering for metric-driven autonomous scientific discovery with CLI agents.
* [Harness Handbook](../papers/2607.13285.md) - behavior-centric mapping from harness behavior to distributed implementation sites for safer modification planning.
* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - context-quality measurement for the instructions, tools, grounding, memory, policies, and trust boundaries that condition agent behavior.
* [ScientistOne](../papers/2605.26340.md) - evidence-bearing artifacts, canonical evaluators, and claim verification as controls on autonomous research outputs.

# Synthesis

EurekAgent treats permissions, artifacts, budgets, evaluators, and interfaces as the environment that shapes autonomous research behavior. Harness Handbook addresses the maintainability of that same surrounding layer by mapping behavior to authoritative code. AI Agents Do Not Fail Alone turns the assembled instructions, tools, grounding, memory, policies, and trust boundaries into an explicit diagnostic object. ScientistOne adds an evidence boundary around the research output. Together they frame the agent environment as a control surface, a maintainable software artifact, a measurable preflight condition, and the source of provenance for downstream claims.

# Open Questions

* Which environment controls prevent reward hacking without blocking useful exploration?
* What artifact formats make long-running agent work inspectable and resumable?
* How much human supervision should be built into the environment rather than handled through ad hoc prompts?
* How can user-visible environment behavior remain traceable to authoritative code and regression checks as the harness evolves?
* Which provenance records should the environment emit during execution so later paper writing does not have to reconstruct evidence?
* Which environment properties should be checked before a run, and which can only be validated through observed behavior?
