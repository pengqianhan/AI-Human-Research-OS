---
type: Topic
title: Agent security and red teaming
description: Papers about assessing and defending the security of deployed AI agents and the infrastructure, protocols, and models beneath them.
tags:
- agent-security
- red-teaming
- mcp-security
- jailbreak-evaluation
timestamp: 2026-09-29T00:00:00Z
---

# Scope

This topic tracks papers whose main object is not agent *capability* but agent *security*: finding, classifying, or defending against vulnerabilities in the infrastructure an agent runs on, the MCP servers and skill packages that extend it, its own runtime behavior under adversarial interaction, and the alignment robustness of the underlying model. It is the security-assessment counterpart to this wiki's [Agent environments](agent-environments.md) topic (which tracks environments that shape agent behavior for capability and reliability) and to [LLM agents](llm-agents.md)'s coverage of MCP and agent skills as capability sources.

# Papers

* [Securing the AI Agent (AI-Infra-Guard)](../papers/2606.31227.md) - a four-layer, four-paradigm red-teaming framework (deterministic infrastructure scanning, LLM-driven MCP/agent-skill auditing, black-box multi-turn agent red-teaming, and large-scale jailbreak evaluation) plus SkillTrustBench, a new agent-skill-trustworthiness benchmark.
* [TraceDance](../papers/2609.33295.md) - measures security-relevant *model* behavior at real decision points taken from deployment traces rather than attacking the infrastructure: across nine frontier LLMs, mean pass rates are 6.9% for protecting secrets, 11.3% for preserving permissions and security checks, and 13.0% for checking scripts and dependencies before use.

# Synthesis

The two papers measure agent security at different layers. AI-Infra-Guard audits the attack surface around the agent (infrastructure, MCP servers, skill packages) and probes the model with adversarial inputs. TraceDance needs no attacker: it replays ordinary contexts in which a deployed agent actually leaked a secret, weakened a safeguard, or trusted an unverified script, and asks whether other models would do the same. Its low pass rates suggest that many security failures in deployment arise from routine task pressure, not only from adversarial prompts, though its pass rates are conditioned on contexts where the failure already happened and do not estimate how often it occurs.

# Open Questions

* How should layer-paradigm matching generalize to attack surfaces not covered by AI-Infra-Guard's four layers, such as persistent agent memory or inter-agent/multi-agent communication channels?
* How should a security auditor's own detection rules (Prompt-as-Rule criteria, fingerprint corpora, jailbreak operator libraries) stay current as the MCP and agent-skill ecosystems evolve faster than any static rule corpus can track?
* What is the right division of labor between a general-purpose agent-capability harness and a dedicated security-auditing harness, given both increasingly rely on the same agentic reason-act-tool loop?
* How should agent-security benchmarks (like SkillTrustBench) be kept adversarially fresh as skill authors adapt to known detection patterns?
* Which parts of an agent's attack surface are best assessed before deployment (static auditing) versus only observable at runtime (behavioral red-teaming), and how should that boundary shift as agents gain more autonomy?
