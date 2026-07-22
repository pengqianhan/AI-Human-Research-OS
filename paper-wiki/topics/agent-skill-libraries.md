---
type: Topic
title: Agent skill libraries
description: Papers about building, validating, and maintaining reusable libraries of executable agent skills.
tags:
- agent-skills
- skill-libraries
- self-evolution
timestamp: 2026-07-22T11:05:19Z
---

# Scope

This topic tracks papers that treat agent capabilities as reusable, validated skill packages and that build or maintain libraries of such skills — including how skills are mined from external resources, represented (scope, inputs/outputs, steps, environment, provenance, tests), validated, and kept novel and non-redundant as the library grows.

# Papers

* [SkillFoundry](../papers/2604.03964.md) - mines heterogeneous scientific resources into validated, executable skill packages and grows the library through closed-loop expand/repair/merge/prune.
* [OpenSkill](../papers/2606.06741.md) - builds transferable skills and self-built verification anchors from open-world resources without target-task supervision.
* [ResearchStudio-Idea](../papers/2607.04439.md) - packages literature search, claim-level prior-art checking, and outcome-grounded idea generation as interoperable research-agent skills.
* [SkillOpt-Lite](../papers/2607.03451.md) - optimizes existing skill files from execution trajectories using cross-task consensus, minimal patches, and a disjoint validation gate.

# Synthesis

All four papers treat skills as durable, reusable artifacts rather than one-off prompts. SkillFoundry emphasizes mining and maintaining a domain-scoped *library* from heterogeneous scientific artifacts with executability and novelty checks. OpenSkill emphasizes constructing skills and their verifiers from scratch under a no-supervision constraint. ResearchStudio-Idea emphasizes composing specialized skills into an evidence-gated research workflow whose pattern cards support both generation and audit. SkillOpt-Lite addresses a different lifecycle stage: improving an existing skill from raw task trajectories while resisting one-example fixes through consensus and independent validation. Together they foreground explicit contracts, provenance, verification, abstention, and maintenance as properties of trustworthy skill systems.

# Open Questions

* What metadata makes a skill package portable across agents, models, and environments?
* How should a skill library detect and prune redundant or stale skills as it grows?
* How well do internal or self-built validation signals predict real downstream task success?
* How should mined skill libraries connect to a research OS's own skills hub and its skill contract?
* When should several narrow skills be composed into a gated workflow instead of merged into one large skill?
* How should a library retain failed optimization attempts for audit without letting a growing rejected-edit buffer distort future updates?
