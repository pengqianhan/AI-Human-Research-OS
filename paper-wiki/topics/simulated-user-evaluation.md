---
type: Topic
title: Simulated-user evaluation
description: Papers about using LLM-powered persona agents as stand-ins for real users to evaluate AI systems and digital products at scale.
tags:
- persona-agents
- user-simulation
- agent-benchmarks
timestamp: 2026-08-17T00:00:00Z
---

# Scope

This topic tracks papers that use LLM agents conditioned on human personas or profiles as simulated evaluators or participants — running them through surveys, conversations, or product interactions to measure how outcomes vary across user populations, rather than using agents as the system under test.

# Papers

* [MatrAIx](../papers/2608.04205.md) - population-scale simulated-user infrastructure pairing an 8.3-billion-record persona dataset with four interaction environments and 1,010 application tasks.

# Open Questions

* How much does the persona-agent's own backbone model change measured outcomes, independent of the assigned persona?
* When the persona-agent model shares a backbone with the system under test, how can self-preference be separated from genuine quality signal?
* Does adherence to a declared persona trait in a single trajectory imply broader behavioral realism (disclosure, correction, refusal, abandonment)?
* What validation against real interaction logs is sufficient before a simulated-user result is used for a consequential product decision?
