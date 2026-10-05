---
type: Topic
title: Agent benchmarks and evaluation
description: Papers whose main contribution is a benchmark, an evaluation protocol, or a method for constructing benchmarks that measure how LLM agents perform and behave.
tags:
- agent-benchmarks
- agent-evaluation
- behavioral-evaluation
timestamp: 2026-10-05T00:00:00Z
---

# Scope

This topic tracks papers where the main object is *measurement* of LLM agents: new benchmarks, evaluation protocols, grading methods, and systems that build benchmarks automatically. It covers both outcome-level evaluation (did the task get done?) and process-level evaluation (did the agent behave appropriately along the way?). Benchmarks that mainly serve one application area may also sit in that area's topic, for example [Game-playing agents](game-agents.md) or [Agentic robot manipulation](robot-manipulation-agents.md); environments built mainly for training belong in [Agent environments](agent-environments.md).

# Papers

* [TraceDance](../papers/2609.33295.md) - builds behavior benchmarks on demand from deployment traces: a user names an undesirable behavior, programmable anchors plus a cheap LLM find confirmed occurrences in 252,557 Claude Code and OpenClaw sessions, and each instance grades an LLM's single next turn at the recorded decision point with a behavior-specific rubric. Nine frontier LLMs pass 26.7% on average and only 8.1% when a check is required before acting.
* [Source Preference in the Wild](../papers/2610.03195.md) - a behavioral measurement protocol rather than a task benchmark: requirement-matched item pairs from live search results, every cyclic position rotation, and a Bradley-Terry-Davidson score with cluster bootstrap and FDR control, used to show that 12 agent models favor or avoid specific sites (110 of 144 model-source cells significant).
* [HyperBrowseComp](../papers/2610.03574.md) - an outcome benchmark for web-browsing agents: 423 natively authored questions in 13 languages, most needing non-text evidence, screened with seven no-internet models; best accuracy 31.68%, with self-grading checked against three other judges (at most 0.80 points of change).

# Synthesis

TraceDance and Source Preference in the Wild both measure *how* an agent behaves rather than whether it finished, but they control for confounds differently. TraceDance fixes the context by replaying one recorded decision point and grading the next turn with a rubric. Source Preference keeps the agent's own searches and controls the confounds statistically: it compares only items with the same judged satisfaction and rotates every list through all positions, so a selection difference can be attributed to the source. HyperBrowseComp is an outcome benchmark, and its main methodological lesson is the same one several harness papers in this wiki report: the score belongs to a model-plus-tool combination, since swapping built-in search for Exa moves accuracy by 7.3-9.5 points in opposite directions for different providers.

# Open Questions

* When does grading one next turn at a recorded decision point agree with executing the agent to the end? TraceDance's authors note that a planning-first response may act well later, and no paper here yet measures that gap.
* How should benchmark-construction pipelines control for bias when the same frontier models both build instances and are evaluated on them?
* Which behavior metrics (secret handling, checking before acting, honest claims) should be reported next to task success as standard columns, and how should their pass thresholds be set given that absolute rates depend on the rule?
* Can benchmarks built from one organization's private traces be validated or replicated by others when the traces cannot be released?
* HyperBrowseComp screens questions with no-internet models that include two of the models it later evaluates, but none from the other evaluated family. Should difficulty filters use a fixed, disjoint model panel, or every evaluated model, so the filter does not favor or penalize particular families?
* Live-web benchmarks (HyperBrowseComp) and live-search behavior studies (Source Preference in the Wild) cannot be rerun exactly. Are preserved traces enough for auditing, or should such benchmarks ship a frozen snapshot of the evidence pages, as BrowseComp-Plus does for its corpus?
