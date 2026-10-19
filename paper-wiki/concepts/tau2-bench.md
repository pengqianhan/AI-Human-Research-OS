---
type: Benchmark
title: τ²-Bench
description: Benchmark for conversational tool-using agents in a dual-control environment, where both the agent and a simulated user can act on shared state, across Airline, Retail, and Telecom domains, scored by an environment verifier (Pass^k).
resource: https://arxiv.org/abs/2506.07982
tags:
- benchmarks
- tool-calling
- conversational-agents
- simulated-users
timestamp: 2026-10-19T00:00:00Z
---

# Definition

τ²-Bench (Barres et al., 2025) evaluates conversational agents that must follow domain policies and use tools while interacting with an LLM-simulated user. It extends τ-bench to a *dual-control* setting in which the user can also act on the shared environment state, so the agent must coordinate with the user as well as call tools. Domains are Airline, Retail, and Telecom. Success is judged by an environment verifier on the final state, with Pass¹ (single-trial) or Pass^k (all of k trials succeed) as the headline metric. Because the user is simulated and trajectories are long and multi-turn, scores vary more across runs than single-turn function-calling benchmarks such as [BFCL](bfcl.md).

# Papers

* [SLCA-GRPO](../papers/2609.29050.md) - robustness test (overall Pass¹ across Airline/Retail/Telecom) where segment-locked credit assignment shows its largest gains over matched GRPO: +1.09 / +9.15 / +10.03 pp at 3B / 7B / 8B (7B: 41.02% vs. 31.87%).
* [Recuris](../papers/2608.24876.md) - uses τ²-Bench Retail (114 tasks) and Airline (50 tasks) as long-horizon benchmarks for recursive memory evolution, scoring full reward with read-action and required-write recall reported separately.
* [NeoHorse-1](../papers/2609.08183.md) - τ²-Bench across Airline/Retail/Telecom is one of its tool-use and interactive-completion benchmarks, and part of its 5-benchmark ablation subset.
* [AI-Trader](../papers/2512.10971.md) - cites Tau2Bench as an example of the "static task bank plus dynamic execution" family of agent benchmarks that it contrasts with fully live evaluation.
* [TerminalHorizon](../papers/2610.13166.md) - transfer benchmark on the v1.0.1 base split: after terminal-only fine-tuning Qwen3.5-27B goes from 79.0 to 84.5 on Airline (50 tasks) and from 84.9 to 87.5 on Retail (114 tasks), mean task success over four runs with DeepSeek-V4-Pro-0813 as user simulator and assertion judge.
* [Agent-Reflex](../papers/2610.17953.md) - main-suite benchmark for an 8B policy trained on noisy synthetic environments: 62.1 averaged over Retail, Airline, and Telecom against 54.6 for Agent-World-8B (mean of three runs; most baseline rows quoted from their papers); also the base of AgentNoiseBench's τ² setting, where it averages 45.9 under tool and user noise.
* [ActionOPD](../papers/2610.19820.md) - transfer benchmark and the testbed for its KD/OPD comparison, ablations, and Self-ActionOPD, with a Qwen3.5-9B user and natural-language assertions disabled; Qwen3-4B distilled from Qwen3-32B reaches 40.0 test pass¹ against 29.2 for the base, with pass⁴ as four-trial all-success.
* [FDE-Gym](../papers/2610.22350.md) - cited through XYEval, which turns τ²-bench and other tasks into XY problems (the user asks about an attempted solution rather than the real problem) with relative drops of up to 46.7%; FDE-Gym's leading models lose only 0.04 more when the sponsor's request is misdirected.
* [BizBench](../papers/2610.20424.md) - extends the τ family's policy-governed, user-simulated setting with versioned guidance, workflows linked by shared resources and deadlines, and deterministic process checks over execution histories; its runner follows τ-Knowledge's rule for context overflow.

# Notes

Reported τ²-Bench numbers differ in domain coverage (all three domains vs. Retail/Airline only), metric (Pass¹ vs. full-reward success), and agent harness, so they are not directly comparable across papers.
