---
type: Tool
title: AgentScope
description: An open-source, Alibaba-developed multi-agent LLM platform providing model/memory/tool abstractions, a ReAct-based agent core, and infrastructure for both population-scale simulation and developer-facing agentic application deployment.
resource: https://github.com/modelscope/agentscope
tags:
- multi-agent-systems
- agent-frameworks
- llm-agents
timestamp: 2026-08-23T00:00:00Z
---

# Definition

AgentScope is an open-source, user-friendly multi-agent LLM platform developed by Alibaba, providing unified model, memory, and tool abstractions plus an actor-based distributed execution mechanism. Two wiki papers each cover a distinct stage of the platform's development: an earlier extension focused on scaling multi-agent *simulation* to population size (up to 1 million agents) through agent-level parallelism, agent-environment interaction, and heterogeneous population configuration; and a later, major-version (1.0) revision that repositions the platform around building general-purpose, production-grade *agentic applications*, adding a ReAct-centered agent core with real-time steering and state persistence, built-in agents (Deep Research, Browser-use, Meta Planner), and production tooling (Evaluation, Studio, Runtime/Sandbox).

# Papers

* [Very Large-Scale Multi-Agent Simulation in AgentScope](../papers/2407.17789.md) - the platform's original large-scale-simulation extension: an actor-based distributed mechanism, agent-environment interaction support, heterogeneous population configuration with automatic background generation, and a web-based Agent-Manager, demonstrated on a 1-million-agent classic game simulation.
* [AgentScope 1.0](../papers/2508.16279.md) - the platform's developer-centric, production-oriented major-version revision: unified model/memory/tool abstractions, a ReAct core with interruption-as-observable-event steering and automated state persistence, three built-in agents, two multi-agent composition primitives, and an Evaluation/Studio/Runtime tooling stack.

# Related

* [Multi-agent systems](../topics/multi-agent-systems.md) - AgentScope's agent-as-tool and `Pipeline`/`MsgHub` composition primitives are offered as general-purpose coordination infrastructure rather than a specific coordination algorithm.
* [Model Context Protocol (MCP)](model-context-protocol.md) - AgentScope 1.0 provides fine-grained stateful/stateless MCP client support, exposing remote MCP tools as ordinary local callables.
