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
- cog-20260923-001 - Human-read, agent-write division of the OS: the GUI exists for human observation; agents mutate paper-wiki, skills, and projects only through skills with scripted interfaces.
- cog-20260923-002 - Recommended defaults in grilling rounds are accepted without close reading: executive decisions inside a round are effectively the agent's; directional vetoes happen separately.

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
- evidence: The human described intake from ideas, documents, papers, and partial experiments; autonomous continuation; project and hub skill learning; and parallel agent research, while stating they cannot provide detailed implementation instructions. 2026-09-23: opened the project-management design with an outcome statement only (a skill as the agents' interface to `projects-folder/`, mirroring the paper-wiki and skill-hub skills) and left the whole route — operation set, state source, contract location, tracking, verification plan — to three grilling rounds, accepting every recommended default.
- created: 2026-07-16
- last_updated: 2026-09-23
- status: active
- domain: Research OS product direction
- scope: Outcome and value-level product direction, not implementation architecture or technology selection.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-09-23
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

## cog-20260923-001 Human-read, agent-write division of the OS

- content: The human holds, and states as a standing design principle, that the Research OS GUI exists for human observation while code agents perform all mutation of the OS's managed areas (paper-wiki, skills, projects) through skills that expose scripted interfaces. A management need in an OS area is therefore met by a skill, not by a GUI action.
- source: user-confirmed
- confidence: high
- evidence: 2026-09-23, opening the project-management design: 「整个OS 图形界面是给人看，code agent 来管理paper-wiki, skill,和project，现在paper-wiki 和 skill-hub 都有对应的 skill 来添加，删除和管理，但是projects 还没有skill」. Applied consistently before: the 2026-07-22 skill-management session confined `os-ui` to a single disable/enable write slice and kept install and remove on the command line (HANDOFF "Skill-management decisions"); on 2026-09-23 the human accepted that `os-ui` stays read-only for projects with no stage toggle, and that the GUI's unregistered-project warning is only a cue for an agent to run `sync`.
- created: 2026-09-23
- last_updated: 2026-09-23
- status: active
- domain: Research OS architecture and division of labour
- scope: Where write authority sits between the GUI and agents in this Research OS; no claim about GUI design preferences in general or about other tools.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-09-23
- freshness: current
- responsibility_relevance:
  - When a request implies a GUI write action, route it to an explicit M4-style authorization decision rather than building it.
  - When the human asks to "manage" an OS area, propose a hub skill with a stdlib script and a `verify.sh` check, following `paper-wiki-manager`, `research-skill-installer`, and `research-project-manager`.
- related:
  - [cog-20260724-001](unknown_knowns.md#cog-20260724-001-agent-neutrality-as-a-veto)

## cog-20260923-002 Recommended defaults in grilling rounds are accepted without close reading

- content: The human states that in grilling rounds they accept the agent's recommended defaults without reading each one closely. Inside a round, the recommendation is therefore effectively the decision. Their directional judgement is exercised separately and has produced vetoes, so this describes the executive and mechanical layer only.
- source: user-confirmed
- confidence: high
- evidence: Raised as a hypothesis on 2026-09-23 after 16 of 16 recommended defaults were accepted across three rounds with one-line replies. Asked directly whether they read each recommendation's evidence or trusted the format, the human answered 「我基本没细看，直接接受了推荐」. Directional counter-evidence stands: the 2026-07-19 SDK route reset and the 2026-07-22 amendment of GOAL.md M3's trigger were the human's own vetoes. Later the same day, given three options without a recommendation on deleting the route map, the human chose one directly (「全部删除」), which supports withholding recommendations on directional-grade questions.
- created: 2026-09-23
- last_updated: 2026-09-23
- status: active
- domain: human-agent decision process in this repository
- scope: Executive and mechanical decisions presented inside grilling rounds with a recommendation attached; no claim about directional decisions.
- evidence_type: self-report
- last_verified: 2026-09-23
- freshness: current
- responsibility_relevance:
  - Treat a recommendation inside a round as the decision that will be taken: keep it reversible and record it in HANDOFF with a reversal path.
  - Mark each question as evidence-forced or judgment call, and flag directional-grade questions (those that change a standing decision or an OS principle) explicitly.
  - Present the one or two directional-grade questions of a round without a recommendation, as two balanced options with their costs, so the human chooses.
  - Six 2026-09-23 judgment calls were effectively agent-made: timing (Q1), Snapshot as source (Q3), archive semantics (Q8), Integrity Gate positioning (Q9), contract in TOML (Q11), Example_Project stage `probe` (Q14). Q3 and Q9 are directional-grade and stay open to a deliberate re-decision.
- related:
  - [cog-20260716-002](known_knowns.md#cog-20260716-002-outcome-level-research-os-vision)
