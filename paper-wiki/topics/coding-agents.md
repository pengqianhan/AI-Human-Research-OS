---
type: Topic
title: Coding agents
description: Papers about LLM agents that change real software, including the platforms they run in and benchmarks that test what they deliver beyond a single stated patch.
tags:
- coding-agents
- software-engineering
- agent-benchmarks
timestamp: 2026-11-17T00:00:00Z
---

# Scope

This topic tracks agents whose job is to change software: fixing, extending, or speeding up real repositories and applications. It covers coding-agent platforms and scaffolds, and benchmarks that move past "one issue, one patch" toward what software work needs around the code: recovering requirements from people and records, optimizing a whole application, or working in scientific code. Benchmarks whose main subject is agents in general belong in [Agent benchmarks and evaluation](agent-benchmarks.md); papers about the harness around any agent belong in [Agent harness engineering](agent-harness-engineering.md). A paper belongs here when the coding agent and the software it changes are the object of study.

# Papers

* [OpenHands](../papers/2407.16741.md) - an open platform for coding agents: event-stream protocol, sandboxed bash, IPython, and browser runtime, agent skills, and delegation, kept competitive across software, web, and assistance benchmarks with one system prompt.
* [SWE-bench Science](../papers/2608.19799.md) - 119 repository-level tasks in scientific software, where the best agent scores under 50% pass@1 and added scientific guidance does not uniformly help.
* [SWE-CoWork](../papers/2611.20218.md) - 101 assignments in which the agent must recover requirements from 26 simulated colleagues and versioned records; leaders pass about 63% of F2P tests but finish under 8% of assignments, and full specifications raise F2P without raising complete delivery.
* [Accelerate Bench](../papers/2611.20882.md) - 32 workload-defined CPU optimization tasks from scientific applications; nearly all programs are correct, speedup size separates 16 agents (Score@1 25.5% to 67.4%), and gains depend on build, runtime, and other code changes.

# Synthesis

The two 2026-11 benchmarks here make the same move from different directions: both keep correctness checkable by executable tests and find that passing individual checks is no longer what separates agents. In SWE-CoWork, the leaders pass most F2P tests yet rarely complete an assignment, and handing them the full specification raises partial delivery without adding a single completed task. In Accelerate Bench, almost every program is correct and the ranking comes from how much runtime is removed. Both locate the remaining difficulty in work around the code (tracking requirements to the end, coordinating build and runtime settings with code changes), and both report rows as model-plus-harness pairs evaluated once, so small gaps between neighbors are not resolved.

# Open Questions

* Does explicit per-requirement tracking (owner, status, verification, handoff claim) close SWE-CoWork's gap between F2P and complete delivery, or does it only shift where requirements are lost?
* How much of each benchmark's ranking is the harness? Both run most models in Claude Code and OpenAI models in Codex; running the same model in both would separate the two.
* Accelerate Bench's agents rarely tune the build although replays show it can halve or double runtime. Would a harness that exposes build and runtime settings as first-class search dimensions change what agents optimize?
