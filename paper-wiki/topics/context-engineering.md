---
type: Topic
title: Context engineering
description: Papers about assembling, measuring, and governing the information environment in which AI agents reason and act.
tags:
- context-engineering
- llm-agents
- agent-reliability
timestamp: 2026-07-18T22:59:11Z
---

# Scope

This topic tracks the design and runtime management of agent context: instructions, tools, retrieved evidence, memory, prior turns, policies, untrusted inputs, compression, ordering, trust boundaries, and the mechanisms used to assess whether the assembled context supports reliable action.

# Papers

* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - defines seven context-quality criteria and tests whether their isolated scores predict corresponding agent behaviors under controlled context variation.

# Open Questions

* Which context-quality dimensions are causally distinct rather than correlated consequences of a generally better harness?
* How should context assembly represent source authority, freshness, trust, and precedence across files, retrieval, tools, memory, and user input?
* What information can be compressed or discarded without losing safety constraints, evidence, or resumability?
* Can context-quality judgments be calibrated against human experts and predict failures on unseen tasks, models, and domains?
* How should capability, safety, latency, and token cost be optimized when hardening improves specification quality but reduces task completion?
