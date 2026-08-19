---
type: Topic
title: Agent memory
description: Papers about architectures for extracting, consolidating, and retrieving long-term memory in AI agents.
tags:
- agent-memory
- long-term-memory
- retrieval
timestamp: 2026-08-19T00:00:00Z
---

# Scope

This topic tracks papers about persistent memory systems for LLM agents: how salient information is extracted from ongoing interaction, consolidated against existing memory (added, updated, or invalidated), structured (flat text vs. relational graph), and retrieved at query time, and the accuracy/cost trade-offs that follow from those design choices.

# Papers

* [Mem0](../papers/2504.19413.md) - an incremental extraction/update pipeline where an LLM tool-call decides ADD/UPDATE/DELETE/NOOP per candidate fact against top-k similar memories, plus a graph-structured variant (Mem0^g) for relational and temporal queries; beats a six-category baseline sweep on LOCOMO's LLM-as-judge metric while cutting p95 latency by 91% versus full-context.

# Open Questions

* How do accuracy and cost change under a stronger backbone than GPT-4o-mini for both the extraction/update pipeline and the LLM-judge?
* How should NOOP/DELETE decisions be audited or made reversible when an LLM tool-call misjudges whether new information contradicts an existing memory?
* When does graph-structured (relational) memory pay for its extra token and latency cost, versus when does dense natural-language memory alone suffice?
* How does per-agent or per-session long-term memory interact with the per-agent and shared-context memory designs this wiki already tracks under [Multi-agent systems](multi-agent-systems.md) (e.g. decentralized dual-pool memory) when a system needs both cross-session personalization and multi-agent coordination?
* How should a memory system's own state (which facts were kept, updated, or discarded, and why) be made externally auditable, similar to how [Agent harness engineering](agent-harness-engineering.md) tracks externally verified task state for execution?
