---
type: Topic
title: Agent security and red teaming
description: Papers about assessing and defending the security of deployed AI agents and the infrastructure, protocols, and models beneath them.
tags:
- agent-security
- red-teaming
- mcp-security
- jailbreak-evaluation
timestamp: 2026-11-23T00:00:00Z
---

# Scope

This topic tracks papers whose main object is not agent *capability* but agent *security*: finding, classifying, or defending against vulnerabilities in the infrastructure an agent runs on, the MCP servers and skill packages that extend it, its own runtime behavior under adversarial interaction, and the alignment robustness of the underlying model. It is the security-assessment counterpart to this wiki's [Agent environments](agent-environments.md) topic (which tracks environments that shape agent behavior for capability and reliability) and to [LLM agents](llm-agents.md)'s coverage of MCP and agent skills as capability sources.

# Papers

* [Securing the AI Agent (AI-Infra-Guard)](../papers/2606.31227.md) - a four-layer, four-paradigm red-teaming framework (deterministic infrastructure scanning, LLM-driven MCP/agent-skill auditing, black-box multi-turn agent red-teaming, and large-scale jailbreak evaluation) plus SkillTrustBench, a new agent-skill-trustworthiness benchmark.
* [TraceDance](../papers/2609.33295.md) - measures security-relevant *model* behavior at real decision points taken from deployment traces rather than attacking the infrastructure: across nine frontier LLMs, mean pass rates are 6.9% for protecting secrets, 11.3% for preserving permissions and security checks, and 13.0% for checking scripts and dependencies before use.
* [nanoMuse](../papers/2610.08699.md) - a defense design for an open personal agent rather than an assessment: every tool call passes a fixed-order gate (denied tools, the person's rules, allow and ask lists, taint after private data is read, risk against mode, and warnings no setting can override), approvals are scoped grants the person can list and revoke, and the paper contrasts this policy boundary with Muse's privilege boundary (credentials swapped in outside the agent, kernel-level taint tracking); none of it is red-teamed.
* [SPILLWAY](../papers/2611.07222.md) - a deterministic defense against indirect prompt injection: a call's target is admitted only if it was returned in a typed identity field of a read-only tool or named by the user, a rule-based sanitizer removes injected instructions before the model reads them, and a local judge may restore only refused targets outside the removed text; zero in-scope attack success on all 12 AgentDojo backbone-by-suite cells at the highest mean utility under attack of the defenses run.
* [PIPETTE](../papers/2611.24362.md) - shows RL red-teamers with higher attack success can yield less robust agents after adversarial training, then couples a red-teamer rewarded for attack strategies a rolling dictionary cannot explain with an on-policy defender trained by task-alignment reasoning and a contrastive token-level reward; 0% to 10% attack success under adaptive search on 40 AgentDojo pairs.
* [Intent Contracts](../papers/2611.24025.md) - takes tools away from the planning model: it submits a logged contract (goal, verbatim user quotation, scope) that code validates and a small trusted model checks before writing the one tool call itself; on AmPermBench every changed object is declared beforehand and bundled unrequested work no longer blocks the user's task, but unauthorized actions do not fall, because no trusted role can see the environment to check which objects the planner chose.

# Synthesis

The two papers measure agent security at different layers. AI-Infra-Guard audits the attack surface around the agent (infrastructure, MCP servers, skill packages) and probes the model with adversarial inputs. TraceDance needs no attacker: it replays ordinary contexts in which a deployed agent actually leaked a secret, weakened a safeguard, or trusted an unverified script, and asks whether other models would do the same. Its low pass rates suggest that many security failures in deployment arise from routine task pressure, not only from adversarial prompts, though its pass rates are conditioned on contexts where the failure already happened and do not estimate how often it occurs.

nanoMuse is the first defense-side paper here, and its main lesson is a distinction it draws itself. A *policy* boundary (rules the model cannot edit, enforced in the agent's own process) can stop a persuaded model from acting, but a compromise of the device is a compromise of the agent. A *privilege* boundary, as in Meta's Muse, keeps real credentials and permission decisions on a host the agent cannot reach, so even a persuaded agent cannot misuse them. TraceDance's finding that models rarely protect secrets or preserve security checks under ordinary task pressure argues for the second kind: a defense that depends on the model's cooperation inherits the failures TraceDance measures.

[SPILLWAY](../papers/2611.07222.md) adds a third position between nanoMuse's policy gate and Muse's privilege boundary. Like a policy gate it runs in the agent's process, but it does not ask whether a call is allowed in general; it asks only whether the call's *target* came from a source the attacker cannot write (the user's task or a typed identity field of a read-only tool return), which a set lookup can answer without trusting the model. That narrows the guarantee: injected content sent to a legitimate recipient, or an attacker who controls a typed field, falls outside it, as the paper states. Read against TraceDance, it is an example of a defense whose core does not depend on the model's cooperation, with the model confined to recovering refused calls under a bound set by removed evidence.

[PIPETTE](../papers/2611.24362.md) adds the trained-defense side to this topic's prompt-injection papers. SPILLWAY bounds what an injected instruction can reach with a deterministic egress rule outside the model; PIPETTE changes the model so it ignores the instruction, and reports lower attack success with higher utility than the non-training defenses it compares. The two fail differently: a trained policy has no guarantee and is measured only up to the attacker's budget (here 250 attempts with a 4B attacker on 40 pairs), while a target-admission rule is exact inside its scope and silent outside it. PIPETTE's first finding also generalizes beyond its method: attack success during red-teaming measured how many tasks were broken, not how many different ways, and only the second predicted robustness after training.

[Intent Contracts](../papers/2611.24025.md) adds a measured limit to intent-based gating. Showing a reviewer the planner's stated intent cut unauthorized actions on original AmPermBench prompts (2/96 vs. 10/96), but once a benchmark ambiguity was clarified the gap closed, and every condition that acted, gated or not, changed a wrong target in 40-49% of the runs where it changed anything. All of those errors fell on ambiguous range references and none on exact IDs. A trusted model that sees only the user's words and the planner's claim can check consistency, not whether the named objects are the ones the user meant; that needs the environment.

# Open Questions

* How should layer-paradigm matching generalize to attack surfaces not covered by AI-Infra-Guard's four layers, such as persistent agent memory or inter-agent/multi-agent communication channels?
* How should a security auditor's own detection rules (Prompt-as-Rule criteria, fingerprint corpora, jailbreak operator libraries) stay current as the MCP and agent-skill ecosystems evolve faster than any static rule corpus can track?
* What is the right division of labor between a general-purpose agent-capability harness and a dedicated security-auditing harness, given both increasingly rely on the same agentic reason-act-tool loop?
* How should agent-security benchmarks (like SkillTrustBench) be kept adversarially fresh as skill authors adapt to known detection patterns?
* Which parts of an agent's attack surface are best assessed before deployment (static auditing) versus only observable at runtime (behavioral red-teaming), and how should that boundary shift as agents gain more autonomy?
* How much protection does a same-process policy gate (nanoMuse's Sentinel) give against prompt injection compared with a privilege boundary that holds credentials outside the agent, and can a phone or laptop provide the latter without a per-person cloud VM?
* SPILLWAY's floor relies on tools returning identities in typed fields. How many real MCP servers do so, and what happens to a target-admission defense when addresses arrive in free-form strings or when the attacker can write a typed field by being a sender or contact?
* PIPETTE's coverage measure rests on an LLM grader that has not been checked against human labels, and its red-teamers differ in dataset size as well as coverage. With size held equal, how much of the robustness gain does strategy coverage explain, and does a trained defender combined with a deterministic egress rule block the adaptive attacks that either one alone misses?
* Intent Contracts shows that a trusted executor which cannot see the environment cannot catch a planner's over-broad reading of "my jobs" or "this range". Can read-only environment queries on the trusted side resolve such references before execution without reopening the channels the design closes?
