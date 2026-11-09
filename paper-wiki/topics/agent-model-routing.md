---
type: Topic
title: Model routing and handoff in agents
description: Papers about dividing one agent task between models of different cost and capability, by routing requests or turns, handing a task from one model to another mid-trajectory, or assigning roles, and about when that saves cost without losing accuracy.
tags:
- model-routing
- model-handoff
- cost-efficiency
- long-horizon-agents
timestamp: 2026-11-09T00:00:00Z
---

# Scope

This topic tracks how agent systems split work between expensive capable models and cheaper efficient ones within long-horizon tasks: query-level routing, per-turn routing, one-time handoffs with workspace and history transfer, and role-level allocation (for example a strong model for planning or diagnosis and a small model inside components). It covers the decision signals (task progress, uncertainty, learned detectors), the transfer of state between models, and the cost accounting used to claim savings. Spending more compute on one model belongs to [Agent test-time scaling](agent-test-time-scaling.md); teams of agents with distinct roles but no cost motive belong to [Multi-agent systems](multi-agent-systems.md).

# Papers

* [AgentBaton](../papers/2610.35959.md) - one-time handoffs inside DeepSWE and Terminal-Bench tasks: capable-to-efficient handoffs after a working artifact and real feedback keep most accuracy, efficient-to-capable ones rarely save money, and a Qwen3.5-2B detector picks the handoff turn online, cutting API cost by 65.9% on average over 11 model pairs.

# Open Questions

* AgentBaton counts its locally run receiver as free. Under a cost model that charges local inference and the detector, which handoff configurations still sit on the accuracy-cost frontier?
* Readiness signs for handing off (an artifact exists, feedback was obtained, remaining work is local) come from coding tasks. Do the same signs hold for tool-agent-user, web, or GUI tasks, or does each domain need its own detector?
* Turn-level handoff and role-level allocation (a strong model only for diagnosis or coordination, as in HEELO's Dev-Primitives) are two ways to use a cheap model. Which gives the better trade-off on the same tasks, and do they combine?
