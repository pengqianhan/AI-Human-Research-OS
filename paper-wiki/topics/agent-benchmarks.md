---
type: Topic
title: Agent benchmarks and evaluation
description: Papers whose main contribution is a benchmark, an evaluation protocol, or a method for constructing benchmarks that measure how LLM agents perform and behave.
tags:
- agent-benchmarks
- agent-evaluation
- behavioral-evaluation
timestamp: 2026-09-29T00:00:00Z
---

# Scope

This topic tracks papers where the main object is *measurement* of LLM agents: new benchmarks, evaluation protocols, grading methods, and systems that build benchmarks automatically. It covers both outcome-level evaluation (did the task get done?) and process-level evaluation (did the agent behave appropriately along the way?). Benchmarks that mainly serve one application area may also sit in that area's topic, for example [Game-playing agents](game-agents.md) or [Agentic robot manipulation](robot-manipulation-agents.md); environments built mainly for training belong in [Agent environments](agent-environments.md).

# Papers

* [TraceDance](../papers/2609.33295.md) - builds behavior benchmarks on demand from deployment traces: a user names an undesirable behavior, programmable anchors plus a cheap LLM find confirmed occurrences in 252,557 Claude Code and OpenClaw sessions, and each instance grades an LLM's single next turn at the recorded decision point with a behavior-specific rubric. Nine frontier LLMs pass 26.7% on average and only 8.1% when a check is required before acting.

# Open Questions

* When does grading one next turn at a recorded decision point agree with executing the agent to the end? TraceDance's authors note that a planning-first response may act well later, and no paper here yet measures that gap.
* How should benchmark-construction pipelines control for bias when the same frontier models both build instances and are evaluated on them?
* Which behavior metrics (secret handling, checking before acting, honest claims) should be reported next to task success as standard columns, and how should their pass thresholds be set given that absolute rates depend on the rule?
* Can benchmarks built from one organization's private traces be validated or replicated by others when the traces cannot be released?
