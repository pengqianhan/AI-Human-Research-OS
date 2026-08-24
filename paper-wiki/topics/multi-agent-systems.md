---
type: Topic
title: Multi-agent systems
description: Papers about multiple agents coordinating work, state, and reasoning.
tags:
- multi-agent-systems
- coordination
- shared-state
timestamp: 2026-08-20T00:00:00Z
---

# Scope

This topic tracks papers where multiple agents coordinate reasoning, experimentation, or execution through shared state, task allocation, critique, or self-organization.

# Papers

* [Decentralized Multi-Agent Systems with Shared Context](../papers/2606.10662.md) - decentralized coordination through shared verified context and task queues.
* [AutoScientists](../papers/2605.28655.md) - self-organizing agent teams for long-running scientific experimentation.
* [Self-Evolving Multi-Agent Systems via Decentralized Memory](../papers/2605.22721.md) - per-agent dual-pool memory that outperforms centralized memory by up to 23.8% while cutting token usage by 49%.
* [SearchOS-V1](../papers/2607.15257.md) - orchestrator–worker search coordinated through shared relational coverage, evidence, failures, and continuously dispatched frontier tasks.
* [TradingAgents](../papers/2412.20138.md) - trading-firm-inspired agents coordinated through a structured-document protocol, with bull/bear research debate and risk-team debate as the only free-form dialogue stages.
* [HarnessEval-W](../papers/2608.16859.md) - a parent agent spawns specialized sub-agents to reason over evaluation subproblems, then validates and aggregates their evidence into a final verdict.
* [ARIS](../papers/2605.03042.md) - a minimal two-role cross-family executor/reviewer pattern for research workflows, with reviewer access scope and context policy configured along two orthogonal axes to reduce correlated blind spots.
* [AgentScope 1.0](../papers/2508.16279.md) - two general-purpose composition primitives, "agent as a tool" (a primary agent invokes specialized agents as callable tools) and `Pipeline`/`MsgHub`-based agent conversation with dynamic group membership, offered as reusable infrastructure rather than a specific coordination algorithm.
* [Very Large-Scale Multi-Agent Simulation in AgentScope](../papers/2407.17789.md) - an actor-based distributed mechanism with agent-level parallelism and one-line centralized-to-distributed conversion, scaling multi-agent coordination to population size (up to 1 million agents) rather than team size.
* [AutoResearchClaw](../papers/2605.20025.md) - fixed three-role (K=3), same-model-family debate panels at two separate pipeline stages (hypothesis generation, result analysis), each closed by a synthesizer that integrates the roles' output into one structured artifact before the next stage begins.
* [OpenRath](../papers/2606.19409.md) - infrastructure rather than a coordination algorithm: a single first-class Session value every agent and workflow reads and returns, so multi-agent composition needs no second, framework-private state object regardless of which coordination pattern (shared context, per-agent memory, orchestrator-worker, debate) is layered on top.

# Synthesis

Two complementary decentralization strategies appear in this set: 2606.10662 (DeLM) decentralizes agents while keeping a single shared verified context, whereas 2605.22721 (DecentMem) keeps context centralized per-agent and decentralizes memory. SearchOS instead keeps a central orchestrator and decomposes the shared state by operational concern—tasks, coverage, evidence, and failures—then projects only role-relevant slices to workers. TradingAgents shows a third pattern: a fixed pipeline of role-specialized teams that communicate mostly through structured reports, reserving natural-language debate for exactly the two stages (bull/bear research, risk-stance negotiation) where deliberation is the point — a deliberate rejection of pure message-history communication to avoid its "telephone effect." ARIS shows a fourth, adversarial pattern distinct from the cooperative coordination above: rather than pooling agents toward a shared goal, it deliberately keeps executor and reviewer on different model families so the reviewer's critique is not correlated with the executor's own blind spots, justifying the two-role minimum by analogy to adversarial-vs-stochastic bandits rather than by a coordination-efficiency argument. The trade-off is coordination overhead vs. agent diversity: shared context enables tight coherence, per-agent memory preserves behavioral variation, structured central state makes scheduling and completion checks explicit at the cost of a write bottleneck, structured-document-plus-scoped-debate constrains communication cost while still allowing genuine deliberation where it matters, and cross-family adversarial review trades a harder optimization problem for the executor against a reduced risk of correlated, self-reinforcing errors. AgentScope 1.0 sits underneath these coordination patterns as infrastructure rather than a competing pattern: its agent-as-tool and `Pipeline`/`MsgHub` primitives are general building blocks that a decentralized, orchestrator-worker, structured-document, or adversarial-review system in this topic could each be implemented with, without the framework itself prescribing which coordination strategy to use. The earlier AgentScope large-scale-simulation paper shows what the same platform's coordination primitives look like pushed to population scale rather than team scale: rather than a richer coordination pattern, its contribution is an actor-based distributed mechanism and one-line centralized-to-distributed conversion that let a simple coordination pattern (agents responding to shared environment state) run efficiently across a million agents on a handful of devices — a reminder that "how many agents" and "how they coordinate" are separable design axes. AutoResearchClaw adds a sixth coordination pattern distinct from all of the above: same-model-family debate among fixed epistemic roles (Innovator/Pragmatist/Contrarian, then Optimist/Skeptic/Methodologist) closed by a synthesizer, used specifically to stress-test hypotheses and result interpretations rather than to divide execution labor — closer in spirit to ARIS's adversarial pattern than to the cooperative patterns above, but same-family rather than cross-family and applied at two fixed pipeline stages rather than continuously. OpenRath sits underneath all six patterns the way AgentScope 1.0 does, but answers a narrower question: not what abstractions a coordination pattern is built from, but what single value carries the state (transcripts, tool effects, memory events, branch lineage) that any of these patterns produces, so that composing coordination strategies does not require each one to invent its own private state representation.

# Open Questions

* How should shared state be represented so agents can reuse it without creating integration bottlenecks?
* When is decentralized coordination better than a central planner?
* What safeguards are needed when multiple agents update durable knowledge artifacts?
* How do per-agent memory and shared-context approaches interact when combined in a single system?
* When does continuously updated central state improve coordination enough to justify its contention and single-orchestrator risks?
* When does adversarial (reviewer-vs-executor) coordination outperform cooperative coordination, and does a fixed two-role minimum generalize to tasks harder to score than research-manuscript review?
