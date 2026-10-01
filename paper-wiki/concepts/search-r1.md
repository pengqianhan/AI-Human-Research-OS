---
type: Method
title: Search-R1
description: Outcome-reward reinforcement learning that trains an LLM to interleave its reasoning with search-engine calls, masking retrieved tokens out of the loss; a standard baseline and starting point for RL-trained search agents.
resource: https://arxiv.org/abs/2503.09516
tags:
- search-agents
- reinforcement-learning
- tool-use
timestamp: 2026-10-01T00:00:00Z
---

# Definition

Search-R1 (Jin et al., 2025) extends R1-style reinforcement learning for reasoning to multi-turn search: during step-by-step reasoning the model emits search queries, real-time retrieval results are inserted into the trajectory, and the policy is optimized with a simple outcome-based reward. Retrieved tokens are masked out of the policy-gradient loss to keep training stable. The original paper reports gains on seven question-answering datasets. Later search-agent papers use it in two ways: as the reference recipe that RL-trained search agents build on, and as a reproduced baseline, usually on the open-domain QA suite of Natural Questions, TriviaQA, PopQA, HotpotQA, 2WikiMultiHopQA, MuSiQue, and Bamboogle.

# Papers

* [False Frontiers](../papers/2609.39102.md) - reproduced on Qwen3.5-4B and 9B as an external baseline on that seven-benchmark suite (average Cover-EM 0.401/0.434); self-evolution with cross-fitted proposer feedback (CrossFit), trained without human QA data, exceeds it by 8.7/7.8 points.
* [WideSeek-R1](../papers/2602.04634.md) - Search-R1-7B is a single-agent baseline on WideSearch, and Search-R1 is named as the single-agent RL precedent for its multi-agent training; it also reports the same seven QA benchmarks as a generalization check.
* [Iris](../papers/2609.04304.md) - names Search-R1 and ASearcher as the search-agent RL lineage it builds on, before adding reverse-constructed training questions and an SFT-RL "climbing" loop.

# Notes

Reproduced Search-R1 numbers are protocol-dependent: they change with the backbone, the retriever or search API, the turn and token budget, and the metric (exact match versus Cover-EM versus an LLM judge), so compare them only within one paper. Dr. Zero, the self-evolution framework that False Frontiers audits, shares two authors with Search-R1 (Zhenrui Yue and Dong Wang).

# Related

* [Search agents](../topics/search-agents.md) - the topic whose RL-trained systems most often start from or compare against this recipe.
* [GRPO](grpo.md) - the policy optimizer WideSeek-R1 extends to multiple agents when it moves search RL from one agent to a lead agent with parallel subagents.
