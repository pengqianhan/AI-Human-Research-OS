---
type: Topic
title: Personal agents
description: Papers about agents that act for one person across their accounts, devices, and files over weeks, and about where such agents run, what they remember, how their actions are approved, and who governs them.
tags:
- personal-agents
- agent-permissions
- on-device-agents
- user-trust
timestamp: 2026-10-08T00:00:00Z
---

# Scope

This topic tracks the personal agent as a kind of software: one agent that represents one person on their accounts, devices, and files, works for weeks partly while the person is away, remembers them, and answers for what it did through logs and permissions. It covers definitions and architectures (where the agent's loop runs, how devices connect), memory the person owns, approval and permission design, and evaluations of agents that live alongside a user over days. When to act without being asked is the subject of [Proactive agents](proactive-agents.md); techniques for operating screens belong in [GUI and computer-use agents](gui-computer-use-agents.md); attacks on and defenses of agents in general belong in [Agent security and red teaming](agent-security.md). A paper belongs here when the agent is defined by the person it serves rather than by a task.

# Papers

* [nanoMuse](../papers/2610.08699.md) - defines the personal agent, reads Meta's closed Muse from public documents and a copy of its production prompt with each statement source-tagged, and presents an open counterpart in which every device runs a whole agent behind its own permission gate, devices meet over an optional relay, memory is plain files, and the model is the person's choice; it reports sizes and cost estimates but no capability or safety measurements.
* [Foundations of Proactive Agents](../papers/2609.37267.md) - evaluates personal agents (a model inside OpenClaw, Claude Code, or Codex) that run alongside a simulated user for several days with access to their messages, documents, and calendar, scoring task capability, when to compute and defer, and how far to proceed without approval.

# Synthesis

The two papers approach the same object from opposite ends. nanoMuse is architecture and governance without measurement: it specifies where the agent runs, what the relay stores, and a fixed-order permission gate, and states that no success rate for its screen-operating "hands" exists yet. Foundations of Proactive Agents is measurement without a deployable system: a simulated multi-day testbed across 23 model-harness configurations. They meet on one design question, how far a personal agent may proceed on its own. nanoMuse answers it with scoped grants the person can read and revoke (once, this conversation, always for a named target; payments and passwords never remembered) and an interrupt bar the person can move. Foundations of Proactive Agents measures the cost of getting it wrong: one misaligned intervention costs more trust than an aligned one restores. Neither paper studies real people over weeks, and nanoMuse's grants have not been tested against the intervention-depth preferences the other paper measures.

# Open Questions

* On one device, the permission gate runs in the same trust domain as the agent (a policy boundary, not a privilege boundary). What is the smallest change that keeps real credentials out of the agent's reach without a per-person cloud VM?
* How should a personal agent's memory record provenance (which model wrote each line, when, and how confident it was), and what rule should re-check old lines written by weaker models?
* Can scoped, revocable grants be learned from a person's approvals without the agent widening its own permissions, and does that match the intervention depth people prefer?
* What evaluation, run on real devices, would measure screen-operating personal agents on success, take-over frequency, and refusal of harmful steps together?
* Who should hold the shared parts (a relay, synced conversation text, training data from opted-in chats), and what defaults are acceptable for training on personal conversations?
