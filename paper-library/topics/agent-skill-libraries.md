---
type: Topic
title: Agent skill libraries
description: Papers about building, validating, and maintaining reusable libraries of executable agent skills.
tags:
- agent-skills
- skill-libraries
- self-evolution
timestamp: 2026-06-26T00:00:00Z
---

# Scope

This topic tracks papers that treat agent capabilities as reusable, validated skill packages and that build or maintain libraries of such skills — including how skills are mined from external resources, represented (scope, inputs/outputs, steps, environment, provenance, tests), validated, and kept novel and non-redundant as the library grows.

# Papers

* [SkillFoundry](../papers/2604.03964.md) - mines heterogeneous scientific resources into validated, executable skill packages and grows the library through closed-loop expand/repair/merge/prune.
* [OpenSkill](../papers/2606.06741.md) - builds transferable skills and self-built verification anchors from open-world resources without target-task supervision.

# Synthesis

Both papers treat skills as durable, reusable artifacts rather than one-off prompts. SkillFoundry emphasizes mining and maintaining a domain-scoped *library* from heterogeneous scientific artifacts with executability and novelty checks, while OpenSkill emphasizes constructing skills and their verifiers from scratch under a no-supervision constraint. SkillFoundry's explicit skill contract (scope, I/O, steps, environment assumptions, provenance, tests) and OpenSkill's self-built verification anchors are complementary views on what makes a skill trustworthy and reusable.

# Open Questions

* What metadata makes a skill package portable across agents, models, and environments?
* How should a skill library detect and prune redundant or stale skills as it grows?
* How well do internal or self-built validation signals predict real downstream task success?
* How should mined skill libraries connect to a research OS's own skills hub and its skill contract?
