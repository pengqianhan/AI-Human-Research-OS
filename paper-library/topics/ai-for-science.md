---
type: Topic
title: AI for science
description: Papers about AI systems that design, run, and revise scientific experiments.
tags:
- ai-for-science
- scientific-discovery
- experiments
timestamp: 2026-06-15T00:00:00Z
---

# Scope

This topic tracks papers about AI systems used to plan, run, and revise scientific experiments over repeated cycles.

# Papers

* [AutoScientists](../papers/2605.28655.md) - self-organizing agent teams for long-running computational scientific experimentation.
* [EurekAgent](../papers/2606.13662.md) - environment engineering for metric-driven autonomous scientific discovery.

# Synthesis

AutoScientists emphasizes decentralized team organization for sustained experimentation, while EurekAgent emphasizes the surrounding execution environment: hidden evaluators, durable artifacts, budget controls, and supervision interfaces. Both treat scientific discovery as iterative agent work, but they put the main design pressure on different layers.

# Open Questions

* How should failed experiments be captured so future agents avoid repeating them?
* Which parts of scientific experimentation map onto long-running literature review workflows?
* How should compute budgets shape agent critique and proposal acceptance?
* Which environment boundaries are necessary before autonomous discovery results should be trusted?
