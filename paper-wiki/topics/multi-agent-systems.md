---
type: Topic
title: Multi-agent systems
description: Papers about multiple agents coordinating work, state, and reasoning.
tags:
- multi-agent-systems
- coordination
- shared-state
timestamp: 2026-07-21T22:58:23Z
---

# Scope

This topic tracks papers where multiple agents coordinate reasoning, experimentation, or execution through shared state, task allocation, critique, or self-organization.

# Papers

* [Decentralized Multi-Agent Systems with Shared Context](../papers/2606.10662.md) - decentralized coordination through shared verified context and task queues.
* [AutoScientists](../papers/2605.28655.md) - self-organizing agent teams for long-running scientific experimentation.
* [Self-Evolving Multi-Agent Systems via Decentralized Memory](../papers/2605.22721.md) - per-agent dual-pool memory that outperforms centralized memory by up to 23.8% while cutting token usage by 49%.
* [SearchOS-V1](../papers/2607.15257.md) - orchestrator–worker search coordinated through shared relational coverage, evidence, failures, and continuously dispatched frontier tasks.
* [TradingAgents](../papers/2412.20138.md) - trading-firm-inspired agents coordinated through a structured-document protocol, with bull/bear research debate and risk-team debate as the only free-form dialogue stages.

# Synthesis

Two complementary decentralization strategies appear in this set: 2606.10662 (DeLM) decentralizes agents while keeping a single shared verified context, whereas 2605.22721 (DecentMem) keeps context centralized per-agent and decentralizes memory. SearchOS instead keeps a central orchestrator and decomposes the shared state by operational concern—tasks, coverage, evidence, and failures—then projects only role-relevant slices to workers. TradingAgents shows a third pattern: a fixed pipeline of role-specialized teams that communicate mostly through structured reports, reserving natural-language debate for exactly the two stages (bull/bear research, risk-stance negotiation) where deliberation is the point — a deliberate rejection of pure message-history communication to avoid its "telephone effect." The trade-off is coordination overhead vs. agent diversity: shared context enables tight coherence, per-agent memory preserves behavioral variation, structured central state makes scheduling and completion checks explicit at the cost of a write bottleneck, and structured-document-plus-scoped-debate constrains communication cost while still allowing genuine deliberation where it matters.

# Open Questions

* How should shared state be represented so agents can reuse it without creating integration bottlenecks?
* When is decentralized coordination better than a central planner?
* What safeguards are needed when multiple agents update durable knowledge artifacts?
* How do per-agent memory and shared-context approaches interact when combined in a single system?
* When does continuously updated central state improve coordination enough to justify its contention and single-orchestrator risks?
