---
type: Topic
title: Agent sycophancy
description: Papers about LLM agents over-aligning with a user's stated or remembered beliefs, preferences, or identity at the expense of task evidence, including sycophancy induced by long-term memory.
tags:
- agent-sycophancy
- memory-induced-sycophancy
- personalization
- agent-reliability
timestamp: 2026-10-07T00:00:00Z
---

# Scope

This topic tracks when and why agents let what they know about a user (beliefs, preferences, professional identity, earlier judgments) decide questions that the current evidence should decide, and how to keep legitimate personalization (tone, framing, personal choices) while blocking that over-alignment. Its focus is agents with persistent memory or long interaction histories, where a user's influence can outlast the conversation that created it. It sits between [Agent memory](agent-memory.md), which tracks how memories are stored and retrieved, and [Agent selection bias](agent-selection-bias.md), which tracks biases in what an agent picks that come from the options (their source or position) rather than from the user.

# Papers

* [MemAdapter](../papers/2610.05162.md) - shows on 75 curated instances that even accurate, task-relevant memories lower accuracy from 96.0% to 77.3%, then calibrates each retrieved memory after retrieval with counterfactual boundary cards, task-specific use instructions, and a support-checked answer; it cuts PersistBench sycophancy failure rates by 21-31 points across five memory systems while the beneficial-memory failure rate rises in four of them.

# Open Questions

* How should an evaluation trade off suppressed sycophancy against suppressed useful personalization, given that methods which cut one failure rate can raise the other?
* Is memory-induced sycophancy mainly a property of the backbone (a general tendency to agree with users) that memory merely exposes, or does persistent memory create failure modes that single-session sycophancy tests miss?
* Can the conditions under which a memory may influence an answer be computed once when the memory is written and reused, or do they depend too much on each future task?
* Do the same calibration ideas hold for agents that take actions on remembered preferences (purchases, scheduling, code changes), where the cost of over-alignment is an action rather than an answer?
