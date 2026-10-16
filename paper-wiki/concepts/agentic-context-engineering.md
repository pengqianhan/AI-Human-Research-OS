---
type: Method
title: Agentic Context Engineering (ACE)
description: Treats an LLM system's context (system prompts or agent memory) as an evolving playbook updated by separate generation, reflection, and curation steps with incremental, structured edits that avoid brevity bias and context collapse; cited here as a reference method for context adaptation without weight updates.
resource: https://arxiv.org/abs/2510.04618
aliases:
- ACE
tags:
- context-engineering
- agent-self-evolution
- prompt-optimization
timestamp: 2026-10-16T00:00:00Z
---

# Definition

Agentic Context Engineering (Zhang, Hu, Upasani, Ma, Hong, Kamanuru, Rainton, Wu, and others, arXiv:2510.04618; ICLR 2026 per the citing papers) adapts an LLM application by changing its inputs rather than its weights. It treats a context as a *playbook* of strategies that accumulates, is refined, and is organized through three modular roles: generation, reflection, and curation. Its abstract names two failure modes of earlier context adaptation: *brevity bias*, where summaries drop domain insights, and *context collapse*, where repeated rewriting erodes detail. ACE avoids them with structured, incremental updates instead of whole rewrites. It works offline (optimizing a system prompt) and online (as agent memory), and can learn from natural execution feedback without labels. It builds on the adaptive memory of Dynamic Cheatsheet. The abstract reports +10.6% on agent benchmarks and +8.6% on finance, and parity with the top production agent on the AppWorld leaderboard overall average.

# Papers

* [Self-evolving Agent Harness](../papers/2610.18813.md) - cited as playbook revision that turns execution feedback into reusable procedures in personal workspaces; in that paper's taxonomy a playbook edit is an interpreted-state update around a fixed model (reader mapping).
* [Mosaic](../papers/2610.22174.md) - cited among the context-management techniques that let agents handle longer, more complex tasks, the trend that produces multi-session trajectories.
* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - connects its context-assembly criteria to MemGPT and ACE as prior context-management work.
* [ScienceBuddy](../papers/2609.17523.md) - listed under persistent procedural adaptation with Reflexion, GEPA, Meta-Harness, and PILOT, as work that predates its recursive loop.
* [SoL-Pi](../papers/2609.20519.md) - listed among single context-management techniques (with ACON, Context-Folding, AgentFold, Context as a Tool); SoL-Pi instead discovers and selects mechanisms across several harness components.

# Notes

The citing papers use ACE as a reference point rather than a baseline; none reports a rerun. It sits between prompt optimizers such as GEPA, which search a prompt against a validation signal, and memory systems, which store experience without a curation step.

# Related

* [Context engineering](../topics/context-engineering.md)
* [Agent self-evolution](../topics/agent-self-evolution.md)
* [GEPA](gepa.md) - reflective prompt evolution with Pareto selection, the other context-side optimizer cited beside ACE.
* [Reflexion](reflexion.md) - stores verbal lessons in an episodic memory, an earlier and simpler form of learned context.
