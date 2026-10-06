---
type: Topic
title: Simulated-user evaluation
description: Papers about using LLM-powered persona agents as stand-ins for real users to evaluate AI systems and digital products at scale.
tags:
- persona-agents
- user-simulation
- agent-benchmarks
timestamp: 2026-10-07T00:00:00Z
---

# Scope

This topic tracks papers that use LLM agents conditioned on human personas or profiles as simulated evaluators or participants — running them through surveys, conversations, or product interactions to measure how outcomes vary across user populations, rather than using agents as the system under test.

# Papers

* [MatrAIx](../papers/2608.04205.md) - population-scale simulated-user infrastructure pairing an 8.3-billion-record persona dataset with four interaction environments and 1,010 application tasks.
* [Foundations of Proactive Agents](../papers/2609.37267.md) - Proactivity-Gym's simulated users (three personas per scenario that differ in how much they delegate) respond to a proactive agent over several simulated days; a deterministic state machine decides each approval, decline, or deferral from the persona, history, and trust state, and Qwen 3.8-27B only phrases the reply, so the generated text cannot grant extra permission.

# Synthesis

MatrAIx and Proactivity-Gym put the simulated user in different roles and constrain it differently. MatrAIx's persona agents stand in for users who try AI systems and digital products, so their interactions across user cohorts are the measurement; Proactivity-Gym's simulated user is part of the environment that a proactive agent is tested against, and the decisions that matter for scoring (approve, decline, defer) are taken out of the language model and given to rules. That makes Proactivity-Gym's trust-alignment score reproducible, but it measures agreement with the authors' persona rules rather than with real people; the paper's human study uses separate written vignettes rather than the simulated trajectories, so the simulator itself is not validated against humans.

# Open Questions

* How much does the persona-agent's own backbone model change measured outcomes, independent of the assigned persona?
* When the persona-agent model shares a backbone with the system under test, how can self-preference be separated from genuine quality signal?
* Does adherence to a declared persona trait in a single trajectory imply broader behavioral realism (disclosure, correction, refusal, abandonment)?
* What validation against real interaction logs is sufficient before a simulated-user result is used for a consequential product decision?
* When a simulator's key decisions are scripted (Proactivity-Gym's approval state machine) and only its wording comes from an LLM, which user behaviors are lost, such as gradually changing delegation preferences or inconsistent feedback, and does an agent tuned against scripted users transfer to real ones?
