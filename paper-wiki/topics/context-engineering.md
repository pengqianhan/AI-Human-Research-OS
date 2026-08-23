---
type: Topic
title: Context engineering
description: Papers about assembling, measuring, and governing the information environment in which AI agents reason and act.
tags:
- context-engineering
- llm-agents
- agent-reliability
timestamp: 2026-07-21T22:58:23Z
---

# Scope

This topic tracks the design and runtime management of agent context: instructions, tools, retrieved evidence, memory, prior turns, policies, untrusted inputs, compression, ordering, trust boundaries, and the mechanisms used to assess whether the assembled context supports reliable action.

# Papers

* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - defines seven context-quality criteria and tests whether their isolated scores predict corresponding agent behaviors under controlled context variation.
* [MemoHarness](../papers/2607.14159.md) - treats context assembly and retrieval as two editable parts of a broader harness and adds retrieved execution experience when adapting each test case.
* [Recursive Language Models](../papers/2512.24601.md) - removes the prompt from the context entirely, keeping it as a REPL variable the model queries through code instead of compacting it.
* [SearchOS-V1](../papers/2607.15257.md) - externalizes search progress and evidence into SOCM and regenerates role-specific context projections from the latest shared state.
* [LongHorizon-Harness](../papers/2608.01964.md) - keeps only an externally maintained, audited task state across rounds and discards each executor's raw interaction trajectory, so a fresh-context executor never inherits a growing, self-assessed history.
* [GenericAgent](../papers/2604.17091.md) - reframes long-horizon agent performance around "context information density" rather than context length, maintained through a minimal nine-tool interface, hierarchical on-demand memory, and a four-stage truncation/compression pipeline targeting a sub-30k-token working context.

# Synthesis

AI Agents Do Not Fail Alone treats the assembled context as a diagnostic object whose clarity, grounding, consistency, tool descriptions, safety boundaries, trust separation, and efficiency can be scored before behavioral evaluation. MemoHarness treats context construction as one controllable stage in an adaptive execution policy and uses retrieved experience to decide when a case needs richer instructions, evidence, tools, memory, or workflow. Recursive Language Models takes the opposite move from compaction: rather than deciding what to keep in context, it keeps the prompt out of context altogether as a REPL variable and lets the model query it through code. SearchOS adds a state-centric route: task progress, evidence, coverage, and failures live outside conversation, while each role receives a fresh projection of only the state it needs. LongHorizon-Harness pushes this state-centric route further by making the auditor, not the executor, the only source that can write to persistent state — discarding each round's raw trajectory outright rather than compacting or filtering it, so context rot and self-assessment propagation are avoided by construction rather than by scoring or retrieval. GenericAgent takes yet another route: rather than deciding what external state to keep or discard, it treats the *density* of the agent's own default working context as the design target, combining a deliberately small tool surface (fewer tools to describe in-context in the first place) with staged, lossy compression (truncation, tag-level summarization, FIFO eviction) bounded by continuously-reinjected anchor prompts — a within-context compaction strategy that sits at the opposite end of this topic's spectrum from Recursive Language Models' out-of-context REPL-variable approach. Together they motivate measuring not only whether context is well formed, but whether the material selected for a particular case is current, relevant, trustworthy, and worth its token cost.

# Open Questions

* Which context-quality dimensions are causally distinct rather than correlated consequences of a generally better harness?
* How should context assembly represent source authority, freshness, trust, and precedence across files, retrieval, tools, memory, and user input?
* What information can be compressed or discarded without losing safety constraints, evidence, or resumability?
* Can context-quality judgments be calibrated against human experts and predict failures on unseen tasks, models, and domains?
* How should capability, safety, latency, and token cost be optimized when hardening improves specification quality but reduces task completion?
* How should retrieved execution experience be validated for relevance, freshness, and leakage before it enters a new case's context?
* Which shared-state facts belong in every role's context, and which should remain queryable to avoid overload or stale snapshots?
