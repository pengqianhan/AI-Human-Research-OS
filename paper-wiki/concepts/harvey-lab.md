---
type: Benchmark
title: Harvey LAB (Legal Agent Benchmark)
description: Harvey's legal-work benchmark of 1,251 tasks across 24 practice areas and four work types (analyse, draft, review, research), each scored by an LLM judge against per-task criteria with no executable check.
resource: https://github.com/harveyai/harvey-labs
tags:
- benchmarks
- legal-agents
- professional-work
- llm-as-a-judge
timestamp: 2026-10-14T00:00:00Z
---

# Definition

Harvey LAB, the Legal Agent Benchmark released by Harvey AI in 2026, evaluates agents on legal work. As described by Harness², it has 1,251 tasks across 24 practice areas and four work types (analyse, draft, review, research); each task is scored by an LLM judge against per-task criteria, and there is no executable check. Harness² reports the per-criterion pass rate ("Partial"), following the benchmark's protocol. Context sizes vary widely, with at least one matter above a million tokens in the split Harness² uses.

# Papers

* [Harness²](../papers/2610.14224.md) - evaluates on a 100-task test split (stratified by practice area, covering all four work types) taken from an earlier Meta-Harness study, judged by Claude Sonnet 4.6, reporting Partial; one improvement step adds 2.0 to 11.8 points, and Meta-Harness, searched on the 24-task dev set, is the stronger method in one of four configurations.
* [RRSI](../papers/2609.24972.md) - the agentic-workspace evolve suite: harnesses are evolved on 120 tasks and checked on 40 held-out tasks, then transferred to JobBench, GDPval, and APEX-Agents; Meta-Harness reaches the highest evolve-set score (93.0 against 89.4 for the starting harness) and RRSI ties it on held-out tasks (89.2).

# Notes

Both papers come from overlapping Google Cloud AI Research teams and both use LAB to study harness optimization, but with different splits, judges, and metrics, so their numbers are not comparable. Agent-Reflex (arXiv:2610.17953) also replays agents on Harvey LAB, but only to collect real tool-error returns for its failure taxonomy, so it is not listed above. This page's definition follows Harness²'s benchmark appendix and its reference entry.
