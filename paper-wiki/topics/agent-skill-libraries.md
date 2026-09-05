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
* [COLLEAGUE.SKILL](../papers/2605.31264.md) - distills heterogeneous human traces (not agent trajectories) into versioned, correctable, capability/behavior-split skill packages via a colleague/celebrity/relationship preset pipeline.
* [SkillOpt](../papers/2605.23904.md) - a deep-learning-style text-space optimizer (rollout/reflection batches, bounded textual learning rate, held-out validation gate, rejected-edit buffer, epoch-wise slow/meta update) that trains one compact skill document per domain, best-or-tied on 52 of 52 evaluated (model, benchmark, harness) cells.
* [Repo-To-Skill (DisCo)](../papers/2609.02749.md) - formalizes "operational knowledge" as a third component alongside model and harness, then distills it from 1,000 ML repositories and 153 papers into the 5,000+-skill AREX-Skill Library, improving a fixed GPT-5.5 Codex agent by 134.3% on MLE-bench, 34.4% on PaperBench, 9.2% on FrontierCS, and 14.0% on PassNet under matched with/without-skills ablations.

# Synthesis

These papers treat skills as durable, reusable artifacts rather than one-off prompts. SkillFoundry emphasizes mining and maintaining a domain-scoped *library* from heterogeneous scientific artifacts with executability and novelty checks. OpenSkill emphasizes constructing skills and their verifiers from scratch under a no-supervision constraint. ResearchStudio-Idea emphasizes composing specialized skills into an evidence-gated research workflow whose pattern cards support both generation and audit. SkillOpt-Lite addresses a different lifecycle stage: improving an existing skill from raw task trajectories while resisting one-example fixes through consensus and independent validation. COLLEAGUE.SKILL applies the same "durable, versioned, correctable package" framing to a different input class entirely — human traces about a person or role, rather than an agent's own execution history — and adds an explicit correction-and-rollback lifecycle over natural-language feedback. SkillOpt pushes the "improve an existing skill" stage furthest toward a literal training loop: it names its edit budget a textual learning rate with schedules, its validation split a held-out gate, its failed proposals a negative-feedback buffer, and its cross-epoch consolidation a slow/meta update — and demonstrates the resulting artifact transfers across models, harnesses, and nearby benchmarks. Repo-To-Skill (DisCo) targets a different lifecycle stage again, and at a different scale: rather than improving one existing skill document (SkillOpt, SkillOpt-Lite) or mining a domain-scoped set from scientific artifacts (SkillFoundry), it anchors a single four-stage distillation pipeline (scope/ground/construct/verify) on 1,000 versioned software repositories plus 153 papers, producing 5,000+ skills organized by an LLM-induced taxonomy, and is the first paper in this topic to isolate skill contribution via a matched with/without-skills ablation across four independent, pre-existing third-party benchmarks rather than a custom in-house one. Together they foreground explicit contracts, provenance, verification, abstention, and maintenance as properties of trustworthy skill systems.

# Open Questions

* What metadata makes a skill package portable across agents, models, and environments?
* How should a skill library detect and prune redundant or stale skills as it grows?
* How well do internal or self-built validation signals predict real downstream task success?
* How should mined skill libraries connect to a research OS's own skills hub and its skill contract?
* When should several narrow skills be composed into a gated workflow instead of merged into one large skill?
* How should a library retain failed optimization attempts for audit without letting a growing rejected-edit buffer distort future updates?
* Does a deep-learning training analogy (learning rate, schedule, validation gate, momentum) generalize to optimizing skill *libraries*, not just a single skill document?
* Repo-To-Skill distills skills ahead of time from declarative sources (repos, papers) while SkillOpt trains one skill document from execution trajectories after the fact — would seeding a SkillOpt-style optimization loop from an AREX-Skill-constructed starting skill compose the two approaches' gains, or does either method already capture most of what the other would add?
