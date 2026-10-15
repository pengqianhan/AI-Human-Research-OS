---
type: Method
title: Agent World Model (AWM)
description: Synthesis of executable tool environments with persistent backend state for agentic reinforcement learning, and the pool of environments and tasks built that way; used in this wiki as training data and as an environment-scaling baseline.
tags:
- environment-synthesis
- agent-environments
- tool-use
- agentic-rl
timestamp: 2026-10-15T00:00:00Z
---

# Definition

Agent World Model (AWM; Wang et al., "Agent World Model: Infinity Synthetic Environments for Agentic Reinforcement Learning", ICML 2026) synthesizes tool-use environments for training agents with RL. ActionOPD describes its environments as providing executable tools and persistent backend state, with tasks that come with database and verifier code. It belongs to the same environment-scaling line as [EnvScaler](envscaler.md) and [Agent-World](agent-world.md).

# Papers

* [ActionOPD](../papers/2610.19820.md) - the main training source: 5,942 tasks from 794 environments, kept from 10,000 source tasks after a 16,000-token context cut, deterministic scenario/database/verifier audits, and static feasibility screening; 59 of every 64 task starts per training step.
* [Agent-Reflex](../papers/2610.17953.md) - an environment-scaling baseline (AWM) among the Qwen3-8B methods it compares against, beside EnvScaler and Agent-World.
* [GraphForge](../papers/2609.38923.md) - listed with Agent-World as general-purpose environment synthesis; GraphForge instead keeps real files and moves verification into an evidence graph.

# Notes

This page is assembled from the citing papers; the AWM paper itself has not been added to the wiki, and its arXiv identifier was not looked up. ActionOPD's screening funnel (10,000 to 9,380 to 7,562 to 5,942 tasks) shows that a sizeable share of synthesized tasks fail integrity or feasibility checks before use; static screening does not rule out runtime defects.

# Related

* [EnvScaler](envscaler.md) - the second training source in ActionOPD, adding a simulated user.
* [Agent-World](agent-world.md)
* [Agent environments](../topics/agent-environments.md)
