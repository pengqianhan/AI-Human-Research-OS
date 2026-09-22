---
type: Topic
title: Search agents
description: Papers about agents trained or built to search the live web and synthesize retrieved evidence into verified answers or structured outputs.
tags:
- search-agents
- information-seeking
- web-agents
- reinforcement-learning
timestamp: 2026-09-08T00:00:00Z
---

# Scope

This topic tracks agents whose core task is searching external sources (the live web, or a local corpus standing in for it) and synthesizing the retrieved evidence into a final answer, report, or structured table. It covers training recipes (RL against live search, data-synthesis pipelines for hard-but-verifiable questions), single-agent versus multi-agent architectures for search, and the benchmarks used to measure search-and-synthesis capability, as distinct from [Multi-agent systems](multi-agent-systems.md)'s broader coordination-mechanism focus and [Agent fine-tuning](agent-fine-tuning.md)'s broader weight-update-method focus.

# Papers

* [SearchOS-V1](../papers/2607.15257.md) - formalizes open-domain information seeking as relational schema completion, coordinating orchestrator, explore, search, and writer agents through durable shared state (task, evidence, coverage, failure) rather than training the agents' weights.
* [WideSeek-R1](../papers/2602.04634.md) - a lead-agent–subagent system trained end-to-end via multi-agent RL to decompose a broad information-seeking task into parallel subtasks, letting a 4B model match single-agent DeepSeek-R1-671B by scaling parallel subagents ("width") rather than sequential turns ("depth").
* [Iris](../papers/2609.04304.md) - a single-agent ReAct search policy trained via an SFT-RL "climbing" loop on reverse-constructed, dual-criteria-verified multi-hop web questions, reporting the strongest open-source results on BrowseComp, BrowseComp-ZH, DeepSearchQA, and HLE while explicitly separating intrinsic policy capability from context-management gains.

# Synthesis

These three papers attack the same underlying problem — an agent must decide what to search, when to stop, and how to integrate evidence — from three different angles on where the intelligence should live. SearchOS keeps the underlying models fixed and puts durable, typed shared state (a coverage map, an evidence graph, a failure memory) at the center, arguing that open-domain search fails when progress, evidence, and dead ends are buried in an ever-growing conversation history rather than tracked as first-class system state. WideSeek-R1 instead trains the *coordination* itself: rather than SearchOS's fixed orchestrator-worker roles, its lead agent and subagents are jointly optimized via multi-agent RL so that task decomposition and parallel execution are learned together, with an explicit width-versus-depth framing (more parallel subagents rather than more sequential turns) as the paper's central scaling claim. Iris stays single-agent altogether — one ReAct loop, no subagents, no test-time verification — and instead pushes all of its novelty into training-data construction (reverse-constructing hard-but-solvable questions from real web-graph structure) and an SFT-RL "climbing" curriculum, while explicitly separating how much of its benchmark score comes from the policy itself versus from inference-time context management. Between WideSeek-R1 and Iris, the two systems disagree implicitly about where scaling should come from: WideSeek-R1's central claim is that width (parallel subagents) scales where single-agent depth plateaus, while Iris achieves comparable or stronger headline numbers with a single agent and no parallelism at all, suggesting that at least some of what width scaling buys can also be reached through better training data and a training-time curriculum — the two papers do not evaluate each other's mechanism, so it remains open whether they are complementary (a width-scaled system built from Iris-quality subagents) or substitutable at a given compute budget.

# Open Questions

* SearchOS's shared-state coordination and WideSeek-R1's trained multi-agent coordination both address the same context-pollution/serial-execution problem for broad search — does combining durable, system-maintained state (SearchOS's approach) with jointly-trained orchestration (WideSeek-R1's approach) outperform either alone, or does trained coordination make explicit state tracking partly redundant?
* Iris reports that width scaling (WideSeek-R1's framing) and better training data plus curriculum (Iris's own framing) can each independently push search-agent capability — at a matched training and inference compute budget, which investment yields more headroom, and do the two combine additively or does one dominate?
* Iris's dual-criteria verification (closed-book fails, open-book solves) is used to certify training questions; SearchOS's coverage map and failure memory are used to track live search progress at inference time — could Iris-style verification be applied inside SearchOS's evidence graph to catch unresolvable or ill-posed sub-goals before they consume search budget, rather than only at training-data-construction time?
* None of these three papers reports results on the same benchmark under the same protocol (SearchOS uses WideSearch and GISA; WideSeek-R1 uses WideSearch; Iris uses BrowseComp, BrowseComp-ZH, DeepSearchQA, and HLE) — a head-to-head comparison across a shared benchmark suite would clarify whether the reported gains come from architecture, training recipe, or benchmark-specific tuning.
