---
type: Dataset
title: Toucan
description: Public tool-agent dataset of 1.5 million trajectories synthesized from nearly 500 real-world MCP servers with real tool execution, used in this wiki as a training corpus, a comparison dataset, and an in-domain test set.
resource: https://arxiv.org/abs/2510.01179
tags:
- datasets
- tool-use
- mcp
- agent-training-data
timestamp: 2026-11-05T00:00:00Z
---

# Definition

Toucan (Xu et al., 2025) is a permissively licensed tool-agent dataset of 1.5 million trajectories synthesized from nearly 500 real [Model Context Protocol](model-context-protocol.md) servers. Its pipeline produces tool-use queries with five models, filters them with a model, and generates trajectories with three teacher models under two agent frameworks, validating outputs by rules and by models; three extension mechanisms diversify tasks and simulate multi-turn conversations. The queries are synthetic but the tools execute for real, which is the property later work relies on when it treats the corpus as execution evidence. This description follows the Toucan abstract; the full paper has not been ingested.

# Papers

* [ToolSpace](../papers/2611.05036.md) - ranks Toucan-1.5M as a high-authenticity source because its executions are real (495 MCP servers, 2,000+ tools by its count), and mines data, state, and retry edges from its adjacent calls.
* [NeoHorse-1](../papers/2609.08183.md) - public comparison dataset: under matched initialization, schedule, optimizer, seed, and budget, routing-harness trajectories beat it on all five benchmarks by 6.26 points on average (70.57 against 64.32).
* [SLCA-GRPO](../papers/2609.29050.md) - in-domain evaluation on Toucan-Test (tool-name F1, argument match, process score, and strict Success@0.9), with a gain of +2.53 points over matched GRPO at 7B.

# Notes

The three papers use Toucan differently (raw material for a graph, a rival training set, a test set), so its numbers here do not measure one thing.
