---
type: Benchmark
title: GAIA2
description: Benchmark of general-assistant tasks in a simulated smartphone environment with dynamic, asynchronous events, organized into persona-specific Universes; used in this wiki as a harness-optimization testbed with Universe-disjoint splits.
resource: https://arxiv.org/abs/2602.11964
tags:
- benchmarks
- agent-harness-engineering
- general-assistant-agents
timestamp: 2026-10-02T00:00:00Z
---

# Definition

GAIA2 (Froger et al., arXiv:2602.11964) benchmarks LLM agents on dynamic and asynchronous environments: assistant tasks in a simulated smartphone with apps such as email, calendar, contacts, messaging, and shopping, where events can arrive while the agent works and some tasks require clarification or timed actions. Tasks are grouped into 10 Universes, each a distinct persona with its own simulated digital environment (this description follows the citing papers below; the original GAIA2 paper has not been ingested). Harness-optimization papers split train, dev, and test by Universe, so test results measure transfer to unseen personas rather than to unseen tasks from the same persona. Its default ReAct-based agent serves as the base harness.

# Papers

* [AutoSaddler](../papers/2608.23041.md) - one of three primary benchmarks, with test Universes of 107-112 tasks; with Claude Opus 4.6 the default agent's 53.0% rises to 62.0%, above GEPA (54.6%) and Meta-Harness (53.2%).
* [ActiveSaddler](../papers/2610.00906.md) - the same Universe split (29 train, 30 dev, 21/22/27 test, 300 test tasks); with gpt-5.5, adaptive scenario selection reaches 59.8% against 55.4% for AutoSaddler with a fixed order, and 35 failure-pattern arms are induced during optimization.

# Notes

The two papers' numbers are not comparable across papers: they use different backbones (Claude Opus 4.6 versus gpt-5.5), and AutoSaddler's own gain on GAIA2 is 9.0 points in its paper but 1.8 points in ActiveSaddler's rerun. Several failure patterns ActiveSaddler induces on GAIA2 concern matching the checker's expected output format (null versus empty strings, canonical subjects, oracle-style wording), so gains from harness optimization on this benchmark may partly reflect learning its grader's conventions, which persona-disjoint splits do not remove.
