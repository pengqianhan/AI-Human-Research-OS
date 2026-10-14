---
type: Method
title: Agent-World
description: Environment synthesis for general agents that mines databases from real service themes, generates and validates executable tools against them, and lets environments and policies co-evolve through continuous task generation.
resource: https://arxiv.org/abs/2604.18292
tags:
- environment-synthesis
- agent-environments
- tool-use
- agentic-rl
timestamp: 2026-10-14T00:00:00Z
---

# Definition

Agent-World (Dong et al., 2026, "Agent-World: Scaling Real-World Environment Synthesis for Evolving General Agent Intelligence", arXiv:2604.18292) builds database-backed training environments from real service themes: it mines databases from the themes, validates generated tools against them, and lets environments and policies co-evolve through continuous task generation, over 2,000 environments of controllable difficulty (as summarized by Agent-Reflex). Agent-Reflex, which follows the recipe, describes its steps: a research agent with search, browser, code, and operating-system tools mines and enriches a topic database, a coding agent generates tools with unit tests, and a tool is kept only if it compiles, passes its tests, respects state-transition constraints, and admits an executable verifier. It is distinct from Agent World Model (AWM, Wang et al., 2026), a separate environment-synthesis method that some of the same papers also cite.

# Papers

* [Agent-Reflex](../papers/2610.17953.md) - follows Agent-World's environment-construction recipe (with GPT-OSS-120B builders, matching its setting) for 557 MCP-anchored environments; Agent-World-8B, reproduced locally, is the strongest 8B baseline on the tool-use suite (53.6 overall against 58.6).
* [CompoWorld](../papers/2609.33665.md) - cites Agent-World among the environment-scaling methods it extends with typed, composable services.
* [Apodex 1.1](../papers/2608.23283.md) - cites Agent-World in the environment-construction-as-scaling-axis lineage behind its Environment Scaling surface.
* [GraphForge](../papers/2609.38923.md) - lists Agent-World and Agent World Model as general-purpose task and environment synthesis, contrasted with its own workspaces of real files.

# Notes

Agent-World comes from the same Renmin University group as [EnvScaler](envscaler.md) and Agent-Reflex. Agent-Reflex marks its Agent-World-8B row as a local reproduction because the checkpoint was not released. This page is assembled from the citing papers; the Agent-World paper itself has not been added to the wiki.
