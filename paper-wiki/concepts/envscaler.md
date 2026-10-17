---
type: Method
title: EnvScaler
description: Programmatic synthesis of tool-interactive training environments for LLM agents, producing executable tools and verifiable tasks, together with the released environments and RL task pool built that way.
resource: https://arxiv.org/abs/2601.05808
tags:
- environment-synthesis
- agent-environments
- tool-use
- agentic-rl
timestamp: 2026-10-17T00:00:00Z
---

# Definition

EnvScaler (Song et al., 2026, "EnvScaler: Scaling Tool-Interactive Environments for LLM Agent via Programmatic Synthesis", arXiv:2601.05808) builds training environments for tool-using agents by synthesizing executable tools and tasks whose outcomes can be checked, as opposed to simulating tool feedback with a language model. Papers in this wiki use it in three ways: as a method in the environment-scaling lineage, as a trained 8B baseline, and as a source of ready-made environments and RL tasks. Agent-Reflex reports that EnvScaler's RL tasks are built over more than 100 environments.

# Papers

* [Agent-Reflex](../papers/2610.17953.md) - EnvScaler-8B is the strongest environment-scaling baseline on AgentNoiseBench (18.2 against Agent-Reflex's 29.1) and scores 50.9 on the five-benchmark tool-use suite; ORPO reuses 2.5K EnvScaler RL tasks, and evaluation follows the EnvScaler protocol.
* [From Traces to Agentic Worlds (Trace2Env)](../papers/2610.06100.md) - three EnvScaler environments (Food, Shopping, Benefits) are among its seven single-step fidelity testbeds, with a few reserved successful trajectories each used for construction.
* [CompoWorld](../papers/2609.33665.md) - cited with AgentScaler, ScaleEnv, and Agent-World as the environment-scaling line it extends by composing services into cross-service tasks.
* [ActionOPD](../papers/2610.19820.md) - the second training source: 755 tasks from 49 environments (of 2,550 source tasks) after integrity and static-feasibility screening, with a simulated user in the loop; 5 of every 64 task starts per step.
* [MAI-Gym](../papers/2610.20939.md) - cited among the verifiable environments behind RL progress in tool use, which the paper argues GUI agents lack because every attempt needs its own reset device.

# Notes

EnvScaler and [Agent-World](agent-world.md) come from the same Renmin University group as Agent-Reflex. This page is assembled from the citing papers; the EnvScaler paper itself has not been added to the wiki.
