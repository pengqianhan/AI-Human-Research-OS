---
type: Topic
title: Context engineering
description: Papers about assembling, measuring, and governing the information environment in which AI agents reason and act.
tags:
- context-engineering
- llm-agents
- agent-reliability
timestamp: 2026-07-18T23:48:25Z
---

# Scope

This topic tracks the design and runtime management of agent context: instructions, tools, retrieved evidence, memory, prior turns, policies, untrusted inputs, compression, ordering, trust boundaries, and the mechanisms used to assess whether the assembled context supports reliable action.

# Papers

* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - defines seven context-quality criteria and tests whether their isolated scores predict corresponding agent behaviors under controlled context variation.
* [MemoHarness](../papers/2607.14159.md) - treats context assembly and retrieval as two editable parts of a broader harness and adds retrieved execution experience when adapting each test case.
* [Recursive Language Models](../papers/2512.24601.md) - removes the prompt from the context entirely, keeping it as a REPL variable the model queries through code instead of compacting it.

# Synthesis

AI Agents Do Not Fail Alone treats the assembled context as a diagnostic object whose clarity, grounding, consistency, tool descriptions, safety boundaries, trust separation, and efficiency can be scored before behavioral evaluation. MemoHarness treats context construction as one controllable stage in an adaptive execution policy and uses retrieved experience to decide when a case needs richer instructions, evidence, tools, memory, or workflow. Recursive Language Models takes the opposite move from compaction: rather than deciding what to keep in context, it keeps the prompt out of context altogether as a REPL variable and lets the model query it through code. Together they motivate measuring not only whether context is well formed, but whether the material selected for a particular case is relevant, trustworthy, and worth its token cost.

# Open Questions

* Which context-quality dimensions are causally distinct rather than correlated consequences of a generally better harness?
* How should context assembly represent source authority, freshness, trust, and precedence across files, retrieval, tools, memory, and user input?
* What information can be compressed or discarded without losing safety constraints, evidence, or resumability?
* Can context-quality judgments be calibrated against human experts and predict failures on unseen tasks, models, and domains?
* How should capability, safety, latency, and token cost be optimized when hardening improves specification quality but reduces task completion?
* How should retrieved execution experience be validated for relevance, freshness, and leakage before it enters a new case's context?
