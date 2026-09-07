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
- cog-20260908-001 - Lingua franca for shared artifacts: keeps UI chrome and skill docs in English and confines Chinese to the human's own note content.

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

## cog-20260908-001 Lingua franca for shared artifacts

- content: The human separates an artifact's chrome from its content when deciding language. Anything another person or agent could reuse — UI labels, control names, tab titles, skill documentation — stays English; the human's own note content is where Chinese belongs. Localization is confined to content and is not allowed to spread into the shared surface.
- source: inferred
- confidence: high
- evidence: While adding a timeline view to `paper-wiki/viz.html`, the human opened the request in Chinese and asked for the existing page to be named 「引用图谱」. Offered four naming options, they chose English `Graph` / `Timeline` over their own Chinese framing. One turn later they had already accepted a proposed global 中/英 switch driving both the list titles and the note body; they then pulled it back unprompted — "尽量保持全局的英文显示，只有论文笔记是可以中英文切换" — narrowing the switch to the note body alone. Neither the criterion nor its reason appeared in the cache, `INSTRUCTION.md`, or the skill beforehand.
- created: 2026-09-08
- last_updated: 2026-09-08
- status: active
- domain: Research OS artifacts and reusable skills
- scope: Language of UI text and documentation in repository artifacts and hub skills; no claim about the language of prose the human writes for themselves, or of conversation.
- evidence_type: explanation
- last_verified: 2026-09-08
- freshness: current
- responsibility_relevance:
  - Author new UI strings, control labels, and skill documentation in English by default, even when the request arrives in Chinese.
  - Treat any proposal that spreads localization into shared chrome as needing explicit approval; the human will otherwise pull it back.
- related:
  - [cog-20260724-001](#cog-20260724-001-agent-neutrality-as-a-veto)
