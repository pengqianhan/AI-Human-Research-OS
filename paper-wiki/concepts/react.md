---
type: Method
title: ReAct
description: Prompting a language model to interleave reasoning traces with environment actions in one loop; the default minimal agent scaffold and single-agent baseline.
resource: https://arxiv.org/abs/2210.03629
tags:
- agent-scaffolds
- tool-use
- reasoning-and-acting
- baselines
timestamp: 2026-11-06T00:00:00Z
---

# Definition

ReAct (Yao et al., arXiv:2210.03629, "ReAct: Synergizing Reasoning and Acting in Language Models") has a language model generate reasoning traces and task actions in an interleaved way. The reasoning helps it form, track, and update plans and handle exceptions, and the actions let it query external sources such as knowledge bases or environments for more information. Its paper applies this to question answering (HotpotQA) and fact verification (FEVER) through a simple Wikipedia API, reducing hallucination and error propagation relative to chain-of-thought, and to ALFWorld and WebShop, where with one or two in-context examples it beats imitation and reinforcement learning methods by 34 and 10 points of absolute success rate. In later agent work, "ReAct" usually means the plain loop of thought, tool call, and observation that agent papers use as their minimal scaffold or single-agent baseline. This description follows the paper's abstract; the full paper has not been ingested.

# Papers

* [VisSearch-Bench](../papers/2611.04894.md) - the main agent framework, run with seven multimodal backbones and five search and image tools; Kimi-K3 with ReAct solves the most tasks (26.47%), and ReAct beats DeerFlow for two of the three backbones run with both.
* [Iris](../papers/2609.04304.md) - trains single-agent ReAct search agents (Qwen3.6-35B-A3B and Qwen3.5-397B-A17B bases) with no sub-agents or test-time verification.
* [SearchOS-V1](../papers/2607.15257.md) - single-agent ReAct is a baseline for its multi-agent search with shared state.
* [HyperBrowseComp](../papers/2610.03574.md) - built-in and Exa search runs use an Inspect AI ReAct loop capped at 25 research steps.
* [From Evidence to Action (SafeActBench)](../papers/2610.07753.md) - runs models in a shared ReAct harness on Inspect AI beside their family harnesses, showing that the harness changes both success and the dominant failure mode.
* [Apodex 1.1](../papers/2608.23283.md) - uses ReAct as the minimal scaffold isolating the model's own policy, beside its Agent Team mode.
* [EvoTeam](../papers/2610.39813.md) - a ReAct single agent is the first baseline for its evolved multi-agent teams.

# Notes

Several papers here keep a ReAct run beside a richer framework to show what the extra structure adds (Apodex 1.1's Agent Team, EvoTeam's evolved teams, SearchOS-V1's shared state). The comparison does not always favor the richer framework: in VisSearch-Bench DeerFlow is below ReAct for GPT-5.5 and Qwen3.5-397B-A17B and above it only for Qwen3.6-35B-A3B. ReAct implementations also differ (tool sets, step caps, context handling), so "ReAct" scores are rarely comparable across papers.

# Related

* [ALFWorld](alfworld.md) - one of the interactive decision-making benchmarks in the original paper.
* [WebShop](webshop.md) - the other interactive benchmark in the original paper.
