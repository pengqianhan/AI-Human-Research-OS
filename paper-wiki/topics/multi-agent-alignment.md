---
type: Topic
title: Multi-agent alignment
description: Papers about whether the alignment of individual LLM agents carries over to cooperative teams of them, the mechanisms that make teams choose differently from a single aligned agent, and team designs that restore single-agent behavior.
tags:
- multi-agent-alignment
- multi-agent-systems
- ai-safety
- agent-teams
timestamp: 2026-11-16T00:00:00Z
---

# Scope

This topic tracks papers that compare a team of individually alignment-trained agents with a single agent on the same model and ask whether the team's choices stay aligned. It covers cooperative teams, not adversarial agents or attacks on agent infrastructure (those belong to [Agent security and red teaming](agent-security.md)), and not honesty failures of a single agent (see [Agent deception and honesty](agent-deception.md)). In scope: measured single-versus-team gaps, organizational mechanisms such as diffusion of responsibility, and interventions such as role assignment, review, shared specifications, and communication structure.

# Papers

* [Aligning AI Teams](../papers/2611.17820.md) - same-model Claude teams pick less safe trade-offs than one agent on sepsis triage, a news recommender, and consulting proposals; the gap does not track capability, review and group chat do not reliably close it, testing, discovery, and fix behavior mediate most of the sepsis gap, and a designated safety lead plus a safety document restores single-agent behavior on most models.

# Open Questions

* Does the single-versus-team gap appear with other model families, and in teams that mix models?
* Single-agent behavior is the target here. Which tasks have a clear aligned trade-off, and how should a team be judged when the single agent's choice is itself contestable?
* Does a designated safety lead keep working over long, multi-session deployments where the safety goal is implicit rather than stated in the brief?
