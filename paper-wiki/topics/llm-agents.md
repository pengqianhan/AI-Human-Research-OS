---
type: Topic
title: LLM agents
description: Papers about language-model agents, skills, verification, and autonomous task execution.
tags:
- llm-agents
- skills
- verification
timestamp: 2026-07-17T12:28:52Z
---

# Scope

This topic tracks papers about LLM agents that execute tasks, build reusable skills, use verification signals, or coordinate with other agents.

# Papers

* [OpenSkill](../papers/2606.06741.md) - open-world self-evolution through skills and self-built verification anchors.
* [Decentralized Multi-Agent Systems with Shared Context](../papers/2606.10662.md) - multi-agent test-time scaling through shared verified context.
* [Arbor](../papers/2606.11926.md) - coordinator-executor agents using a persistent hypothesis tree for autonomous research.
* [EurekAgent](../papers/2606.13662.md) - CLI agents coordinated by an environment that manages permissions, artifacts, budgets, and human oversight.
* [Harness Handbook](../papers/2607.13285.md) - a behavior-centric map and progressive-disclosure workflow for locating where an agent harness must change.

# Synthesis

OpenSkill focuses on reusable skills and verification anchors, DeLM focuses on shared verified context across agents, Arbor focuses on a persistent hypothesis tree for research state, EurekAgent focuses on the environment around CLI agents, and Harness Handbook focuses on making that surrounding software layer behaviorally navigable and editable. Together they suggest that durable agent capability depends on external structures as much as prompting: skills, shared memory, hypothesis records, evaluators, budget controls, artifacts, and maintainable behavior-to-code maps.

# Open Questions

* What should a durable agent skill contain, and what should stay in the knowledge base?
* How should agents validate generated skills before using them on real tasks?
* How do skills, shared context, and OKF documents reinforce each other?
* When should a system improve the agent itself, and when should it improve the environment around the agent?
* When is a centralized hypothesis tree preferable to decentralized shared memory?
* What repository representation lets an agent safely evolve its own harness without treating generated documentation as more authoritative than live code?
