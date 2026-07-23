---
type: HumanCognitionQuadrant
title: Unknown Knowns
description: Human criteria, assumptions, or preferences that were implicit until revealed through interaction.
quadrant: unknown_knowns
tags: [human-cognition, unknown-knowns]
timestamp: 2026-07-04T00:00:00+12:00
---

# Unknown Knowns

## Active Index

- cog-20260724-001 - Agent neutrality as a veto: rejects OS mechanisms that work in only one agent harness, even when they are the most reliable option.

## Entries

## cog-20260724-001 Agent neutrality as a veto

- content: The human applies cross-agent portability as a hard constraint on Research OS mechanisms, not as a preference to be traded off. A mechanism that works in one harness but not the others is rejected even when it offers the strongest guarantee.
- source: inferred
- confidence: high
- evidence: While designing autonomous capture for `human-cognition-cache`, the agent proposed a Claude Code Stop hook as the reliability fallback. The human rejected it unprompted, on the grounds that it would leave the OS inapplicable to codex and Pi Coding Agent, and accepted a weaker prompt-level guarantee instead. The criterion had not been stated anywhere in the cache or `INSTRUCTION.md` beforehand.
- created: 2026-07-24
- last_updated: 2026-07-24
- status: active
- domain: Research OS architecture and governance
- scope: Mechanism and tooling selection for the Research OS; no claim about portability preferences in project-level research code.
- evidence_type: explanation
- last_verified: 2026-07-24
- freshness: current
- responsibility_relevance:
  - Do not propose harness-specific machinery (Claude Code hooks, settings.json automation, provider-only APIs) for OS-level behavior; reach for `INSTRUCTION.md`, skills, and files, which `AGENTS.md` and `CLAUDE.md` both resolve to.
  - When only a harness-specific option would meet a reliability bar, surface the trade-off rather than assuming the guarantee wins.
- related:
  - [cog-20260716-002](known_knowns.md#cog-20260716-002-outcome-level-research-os-vision)
