---
type: Term
title: Model Context Protocol (MCP)
description: A standard for how a language-model application discovers and invokes external tools, exposed by MCP servers as named, schema-described capabilities.
resource: https://modelcontextprotocol.io
tags:
- mcp
- tool-use
- agent-infrastructure
timestamp: 2026-09-22T00:00:00Z
---

# Definition

The Model Context Protocol (MCP) standardizes how a language-model application discovers and invokes external tools: an MCP server advertises a set of tools, each with a name, a natural-language description, and an input schema, and a client (the AI assistant/agent) selects and calls these tools as needed. This decoupling makes MCP a convenient way to extend an agent's capabilities beyond its host application, but it also introduces attack-surface classes with no analogue in traditional software — because the tool *description* is consumed by the model as trusted context, a maliciously crafted description can steer agent behavior (tool poisoning, tool shadowing, "rug pulls") independent of whatever the tool's implementation actually does.

# Papers

* [Securing the AI Agent (AI-Infra-Guard)](../papers/2606.31227.md) - treats MCP servers as a distinct attack-surface layer, auditing them with an LLM-driven agentic harness in both static (source-available) and dynamic (black-box, protocol-only) modes, and extends the same auditing paradigm to the agent-skill supply chain that increasingly surrounds MCP-using agents.
* [AgentScope 1.0](../papers/2508.16279.md) - provides fine-grained MCP client support (stateful and stateless clients) as one of its core tool-abstraction primitives, exposing remote MCP functions as ordinary local callables a developer can compose with other tools.
* [MAI-UI](../papers/2512.22047.md) - adds `mcp_call` as a first-class action in a GUI agent's action space, letting the agent invoke external MCP tools (e.g., a maps or GitHub server) to compress long UI-operation sequences or reach tasks that pure GUI manipulation cannot.
* [VibeWorlding](../papers/2608.15265.md) - exposes all five of its 3D sandbox operations (asset_retrieve, asset_add, asset_delete, asset_rotate, asset_translate) as MCP tools, using the protocol to unify what the paper describes as an otherwise fragmented landscape of incompatible 3D asset interfaces.
* [Paper2Agent](../papers/2509.06917.md) - MCP is not one feature among several here but the paper's central technique: its entire contribution is systematically constructing an MCP server (Tools/Resources/Prompts) from a paper and its codebase, validating each tool against the reference implementation's own reported results before locking it, then deploying the server for any MCP-compatible chat agent — a more direct, load-bearing use of the protocol than this concept's other entries, each of which treats MCP as one integration surface within a larger agent rather than as the artifact being built.
* [EvoOntology](../papers/2609.15779.md) - encapsulates an entire self-evolving ontology (schema, content, and tool layers) as one MCP server exposing `browse` and `resolve` tools plus a compact session manifest, using the protocol's selective, on-demand retrieval as the mechanism that outperforms injecting the same ontology content as static prompt text.
* [RecreationWorld](../papers/2609.22000.md) - exposes every platform action (GUI control and coding tools alike) as direct MCP tool calls in its standard benchmark interface across five operating-system and web environments, and separately studies replacing that per-primitive MCP round-trip pattern with a persistent programmable SDK runtime for efficiency.

# Related

* [Agent security and red teaming](../topics/agent-security.md) - covers MCP as an attack surface requiring dedicated auditing.
