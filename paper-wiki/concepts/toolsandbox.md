---
type: Benchmark
title: ToolSandbox
description: Stateful, conversational, interactive benchmark for LLM tool use, scored against ordered milestones rather than only end states; papers in this wiki report it on different scenario subsets and with a similarity metric.
resource: https://arxiv.org/abs/2408.04682
tags:
- benchmarks
- tool-calling
- conversational-agents
- stateful-environments
timestamp: 2026-10-15T00:00:00Z
---

# Definition

ToolSandbox (Lu et al., "ToolSandbox: A Stateful, Conversational, Interactive Evaluation Benchmark for LLM Tool Use Capabilities", Findings of NAACL 2025, arXiv:2408.04682) evaluates tool-using LLMs in multi-turn conversational scenarios whose tools read and change a shared state, as its title states. In SafeActBench's comparison of benchmarks, its addition over outcome-only scoring is milestone DAGs with ordering constraints. Papers here report a *similarity* score rather than binary success, over a subset of scenarios.

# Papers

* [ActionOPD](../papers/2610.19820.md) - transfer benchmark on 490 strictly local scenarios, four scheduled trials each and at most 30 messages, averaging similarity over all 1,960 trials: Qwen3-4B rises from 55.5 to 63.3 and Qwen3-8B from 57.7 to 62.5 after distillation.
* [Agent-Reflex](../papers/2610.17953.md) - a stratified 200-task subset in its five-benchmark tool-use suite.
* [From Evidence to Action (SafeActBench)](../papers/2610.07753.md) - related work: placed with AgentBench, AppWorld, and τ-bench among interactive tool-use benchmarks, as the one that adds milestone ordering; ToolSandbox's authors are named among the closest critics.

# Notes

ActionOPD's 490 local-only scenarios and Agent-Reflex's 200-task stratified subset are different slices, so their ToolSandbox numbers are not comparable with each other or with the original paper's.

# Related

* [τ²-Bench](tau2-bench.md) - the conversational tool-use benchmark both papers report beside it.
* [BFCL](bfcl.md)
