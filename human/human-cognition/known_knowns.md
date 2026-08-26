---
type: HumanCognitionQuadrant
title: Known Knowns
description: Human-confirmed cognition that the human can already state clearly.
quadrant: known_knowns
tags: [human-cognition, known-knowns]
timestamp: 2026-07-04T00:00:00+12:00
---

# Known Knowns

## Active Index

- cog-20260716-001 - Python and PyTorch familiarity: self-reported working familiarity with Python programming and deep-learning training in PyTorch.
- cog-20260716-002 - Outcome-level Research OS vision: can state desired human-agent research outcomes and collaboration flows without prescribing the implementation route.
- cog-20260724-002 - Branch as the containment boundary for unattended agent work: scopes recurring autonomous runs to a named branch and expects their output readable off the dev machine.

## Entries

## cog-20260716-001 Python and PyTorch familiarity

- content: The human reports familiarity with Python programming and training deep-learning models with PyTorch.
- source: user-confirmed
- confidence: high
- evidence: The human explicitly stated this capability while defining how implementation tutorials should teach unfamiliar technologies.
- created: 2026-07-16
- last_updated: 2026-07-16
- status: active
- domain: software and machine learning
- scope: Python programming and PyTorch-based deep-learning training; no claim about every Python ecosystem or training stack.
- evidence_type: self-report
- last_verified: 2026-07-16
- freshness: current
- responsibility_relevance:
  - Use Python, PyTorch, pathlib, subprocess, state-machine, and training-loop analogies when teaching new implementation mechanisms.

## cog-20260716-002 Outcome-level Research OS vision

- content: The human can articulate the desired end state and research collaboration flows, while explicitly delegating detailed technical route design beyond their current knowledge.
- source: user-confirmed
- confidence: high
- evidence: The human described intake from ideas, documents, papers, and partial experiments; autonomous continuation; project and hub skill learning; and parallel agent research, while stating they cannot provide detailed implementation instructions.
- created: 2026-07-16
- last_updated: 2026-07-16
- status: active
- domain: Research OS product direction
- scope: Outcome and value-level product direction, not implementation architecture or technology selection.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-07-16
- freshness: current
- responsibility_relevance:
  - Preserve human authority over research goals, autonomy limits, budgets, irreversible actions, and acceptance criteria.

## cog-20260724-002 Branch as the containment boundary for unattended agent work

- content: When delegating recurring work that runs without supervision, the human names a single branch as the sole write surface and states it as a hard constraint rather than a suggestion. They separately expect the resulting artifact to be readable away from the development machine, including from another country, so unattended output must land somewhere they can reach without the repo checkout.
- source: user-confirmed
- confidence: medium
- evidence: Setting up a daily Hugging Face agent-paper reading routine, the human specified that every operation must happen only on the `autoreadpaper` branch, and in the same request asked that `paper-wiki/viz.html` be published to the internet so they could read the notes from abroad.
- created: 2026-07-24
- last_updated: 2026-07-24
- status: active
- domain: autonomy governance and delivery of agent output
- scope: Unattended or scheduled agent work in this repository; no claim about branch discipline in interactive sessions the human is watching.
- evidence_type: explanation
- last_verified: 2026-07-24
- freshness: current
- responsibility_relevance:
  - For any scheduled or long-running autonomous task, verify the working branch before the first write and never touch `main` or open a PR without being asked.
  - Treat "the agent produced files in the repo" as incomplete delivery when the human is away from the machine; pair unattended runs with a reachable published view.
- related:
  - [cog-20260724-001](unknown_knowns.md#cog-20260724-001-agent-neutrality-as-a-veto)
