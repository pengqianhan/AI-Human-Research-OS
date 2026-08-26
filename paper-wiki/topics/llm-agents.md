---
type: Topic
title: LLM agents
description: Papers about language-model agents, skills, verification, and autonomous task execution.
tags:
- llm-agents
- skills
- verification
timestamp: 2026-08-20T00:00:00Z
---

# Scope

This topic tracks papers about LLM agents that execute tasks, build reusable skills, use verification signals, or coordinate with other agents.

# Papers

* [OpenSkill](../papers/2606.06741.md) - open-world self-evolution through skills and self-built verification anchors.
* [Decentralized Multi-Agent Systems with Shared Context](../papers/2606.10662.md) - multi-agent test-time scaling through shared verified context.
* [Arbor](../papers/2606.11926.md) - coordinator-executor agents using a persistent hypothesis tree for autonomous research.
* [EurekAgent](../papers/2606.13662.md) - CLI agents coordinated by an environment that manages permissions, artifacts, budgets, and human oversight.
* [Harness Handbook](../papers/2607.13285.md) - a behavior-centric map and progressive-disclosure workflow for locating where an agent harness must change.
* [Self-Improvements in Modern Agentic Systems](../papers/2607.13104.md) - a survey of persistent agent adaptation through model parameters, prompts, memory, tools, and full scaffolds.
* [COLLEAGUE.SKILL](../papers/2605.31264.md) - distills heterogeneous human traces into versioned, correctable, capability/behavior-split agent skill packages.
* [TradingAgents](../papers/2412.20138.md) - role-specialized trading-firm agents using structured-document communication and bull/bear/risk debate.
* [MatrAIx](../papers/2608.04205.md) - population-scale persona agents used as simulated evaluators of AI systems and digital products.
* [OpenHands (f.k.a. OpenDevin)](../papers/2407.16741.md) - an open agent platform (event-stream protocol, sandboxed bash/IPython/browser runtime, extensible skills library, multi-agent delegation) where one generalist agent stays competitive across software-engineering, web-browsing, and miscellaneous-assistance benchmarks under a single system prompt.
* [LLM-as-a-Verifier](../papers/2607.05391.md) - a training-free verification framework that scores agent trajectories by the expectation over scoring-token logits, used for best-of-N selection, task-progress monitoring, and dense RL rewards across coding, robotics, and medical agent domains.
* [StateM](../papers/2608.15089.md) - an agent-native runbook that externalizes durable execution state for long-horizon CLI agents and studies how far the resulting control profile transfers across model generations, providers, and task families.
* [MemOS](../papers/2507.03724.md) - positions memory as first-class infrastructure for persistent, self-adapting agents ("Mem-training paradigm"), unifying plaintext, activation, and parameter memory under one OS-inspired scheduling system.
* [Agentic ESOpt](../papers/2608.17310.md) - a weight-level fine-tuning method for long-horizon LLM agents using full-parameter evolution strategies instead of backpropagation-based RL, reported to widen its advantage as task horizon and model size grow.
* [AgentScope 1.0](../papers/2508.16279.md) - a ReAct-grounded, developer-centric agent framework unifying model/memory/tool abstractions, real-time steering, state persistence, and multi-agent primitives with production tooling (Evaluation, Studio, Runtime/Sandbox).
* [SWE-bench Science](../papers/2608.19799.md) - a repository-level coding-agent benchmark for scientific software engineering (119 tasks, 98 repositories, 20 domains) with a four-mechanism failure taxonomy and a paired ablation showing scientific guidance helps or hurts repair depending on how well-grounded it is.
* [Securing the AI Agent (AI-Infra-Guard)](../papers/2606.31227.md) - audits the MCP servers and agent-skill packages this topic tracks as capability sources from a security-red-teaming angle rather than a capability-building one, using an LLM-driven agentic harness structurally similar to this topic's other agent-as-auditor designs.

# Synthesis

OpenSkill focuses on reusable skills and verification anchors, DeLM focuses on shared verified context across agents, Arbor focuses on a persistent hypothesis tree for research state, EurekAgent focuses on the environment around CLI agents, and Harness Handbook focuses on making that surrounding software layer behaviorally navigable and editable. Self-Improvements in Modern Agentic Systems formalizes this broader picture by separating the foundation model from its scaffold and requiring adaptation to persist beyond an episode before calling it self-improvement. OpenHands sits earlier in this lineage as infrastructure rather than an adaptation mechanism: it establishes the sandboxed runtime, tool-interface, and delegation primitives that later harness-engineering and self-evolution papers in this topic build capability on top of. AgentScope 1.0 occupies a similar infrastructure role at a different layer: rather than a specific agent technique, it is the general-purpose model/memory/tool/state substrate — unified provider interfaces, dual developer-/agent-controlled long-term memory, non-invasive hooks, automated state persistence — that a harness-engineering or self-evolution method in this topic could in principle be implemented on top of, without itself proposing an adaptation mechanism. Together they suggest that durable agent capability depends on external structures as much as prompting: skills, shared memory, hypothesis records, evaluators, budget controls, artifacts, maintainable behavior-to-code maps, and the underlying framework substrate those structures are built on.

# Open Questions

* What should a durable agent skill contain, and what should stay in the knowledge base?
* How should agents validate generated skills before using them on real tasks?
* How do skills, shared context, and OKF documents reinforce each other?
* When should a system improve the agent itself, and when should it improve the environment around the agent?
* When is a centralized hypothesis tree preferable to decentralized shared memory?
* What repository representation lets an agent safely evolve its own harness without treating generated documentation as more authoritative than live code?
* How should agents decide whether to store an improvement as a skill, memory, tool, control rule, or parameter update?
