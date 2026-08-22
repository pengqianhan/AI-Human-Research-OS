---
type: Topic
title: Agent security and red teaming
description: Papers about assessing and defending the security of deployed AI agents and the infrastructure, protocols, and models beneath them.
tags:
- agent-security
- red-teaming
- mcp-security
- jailbreak-evaluation
timestamp: 2026-08-22T00:00:00Z
---

# Scope

This topic tracks papers whose main object is not agent *capability* but agent *security*: finding, classifying, or defending against vulnerabilities in the infrastructure an agent runs on, the MCP servers and skill packages that extend it, its own runtime behavior under adversarial interaction, and the alignment robustness of the underlying model. It is the security-assessment counterpart to this wiki's [Agent environments](agent-environments.md) topic (which tracks environments that shape agent behavior for capability and reliability) and to [LLM agents](llm-agents.md)'s coverage of MCP and agent skills as capability sources.

# Papers

* [Securing the AI Agent (AI-Infra-Guard)](../papers/2606.31227.md) - a four-layer, four-paradigm red-teaming framework (deterministic infrastructure scanning, LLM-driven MCP/agent-skill auditing, black-box multi-turn agent red-teaming, and large-scale jailbreak evaluation) plus SkillTrustBench, a new agent-skill-trustworthiness benchmark.

# Open Questions

* How should layer-paradigm matching generalize to attack surfaces not covered by AI-Infra-Guard's four layers, such as persistent agent memory or inter-agent/multi-agent communication channels?
* How should a security auditor's own detection rules (Prompt-as-Rule criteria, fingerprint corpora, jailbreak operator libraries) stay current as the MCP and agent-skill ecosystems evolve faster than any static rule corpus can track?
* What is the right division of labor between a general-purpose agent-capability harness and a dedicated security-auditing harness, given both increasingly rely on the same agentic reason-act-tool loop?
* How should agent-security benchmarks (like SkillTrustBench) be kept adversarially fresh as skill authors adapt to known detection patterns?
* Which parts of an agent's attack surface are best assessed before deployment (static auditing) versus only observable at runtime (behavioral red-teaming), and how should that boundary shift as agents gain more autonomy?
