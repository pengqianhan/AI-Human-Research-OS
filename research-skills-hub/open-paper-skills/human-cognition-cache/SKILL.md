---
name: human-cognition-cache
description: Scaffold human cognition with a project-local, git-trackable four-quadrant cache. Use when (1) initializing, reading, updating, or migrating the cache; (2) completing a task beyond the human's confirmed understanding, where cognition should guide agent autonomy and decision escalation; or (3) explaining a verified artifact at the human's level and recording evidence-backed cognitive growth.
---

# Human Cognition Cache

Use the human's current cognition as a **scaffold**, not a ceiling. Help the
human complete tasks beyond their present knowledge, preserve human authority
over goals and consequential choices, and turn verified delivery into durable
understanding when the task calls for it.

## Contract

Scope:
- Model the human's cognition in this project: what they can state, know they
  do not know, reveal through judgment, or may not yet realize.
- Use that model to choose when to act, ask, explain, or teach.
- Keep project facts and agent knowledge in their own project artifacts.

Inputs:
- The current request, conversation, and verified task artifacts.
- The relevant entries in the project-local cognition cache.
- Human confirmation for sensitive or durable personal claims.

Outputs:
- A maintained Markdown cognition cache with indexed, evidence-labelled entries.
- For cognition-aware tasks, an explicit allocation of agent-owned work and
  human-owned decisions.
- When understanding matters, an artifact-grounded cognitive handoff and any
  evidence-backed cognition transitions.

Limitations:
- The cache is an open-world, fallible model. Missing entries mean
  `unobserved`, not ignorance.
- Agent expertise is also fallible; verify technical claims through source,
  documentation, tests, or experiments.
- Cognitive growth requires evidence within a stated scope. One successful
  action does not establish broad mastery.

## Core Model

- `known_knowns.md`: cognition the human can state or demonstrate clearly.
- `known_unknowns.md`: questions or gaps the human recognizes.
- `unknown_knowns.md`: implicit criteria or knowledge revealed through
  reactions, corrections, examples, or repeated choices.
- `unknown_unknowns.md`: candidate blind spots, stored as questions or
  hypotheses rather than facts.
- `unobserved`: a runtime classification for relevant concepts with no adequate
  evidence. Do not persist it merely because the cache is silent.

Keep the same stable cognition ID when an entry moves between quadrants.

## Branches and Context Pointers

- **Cache maintenance**: when initializing, migrating, writing, or moving
  entries, read [references/cache-schema.md](references/cache-schema.md) before
  editing. It is the single source of truth for layout, fields, indexes, and
  transition stubs.
- **Beyond-cognition execution**: when the task may exceed the human's confirmed
  understanding or creates consequential cognitive debt, read
  [references/cognition-aware-execution.md](references/cognition-aware-execution.md)
  before deciding what to ask or execute.
- **Cognitive handoff**: when the human needs to understand, operate, review,
  maintain, or extend a delivered artifact, read
  [references/artifact-grounded-teaching.md](references/artifact-grounded-teaching.md)
  before explaining or updating cognition levels.

Load only the references reached by the active branch.

## Steps

### 1. Bound the relevant cognition

Locate the cache, skim `index.md`, then skim the frontmatter and `Active Index`
of all four quadrant files. Build a small relevance set from concepts and
decisions that materially affect the current task. Read full entries only for
that set. When initialization is the active branch and no cache exists, record
the absence and continue to the schema reference.

Classify each relevant concept as confirmed known, declared unknown, inferred
implicit, suspected blind spot, or unobserved. Preserve the entry's evidence,
scope, confidence, and freshness.

Complete when every material concept has a supported classification or is
explicitly marked unobserved.

### 2. Select and run the branch

For cache maintenance, apply the schema reference and preserve stable IDs.

For beyond-cognition execution, treat a gap as a reason for greater agent
initiative, not a reason to shrink the goal. Assign technical investigation and
reversible implementation choices to the agent. Escalate goals, values,
permissions, budgets, irreversible actions, and material risk choices to the
human, supplying the minimum background needed to decide.

For a cognitive handoff, choose the target capability and explanation depth,
then teach from the verified artifact, its evidence, and the human's existing
known knowns.

Complete when each material unknown has an owner, each required human decision
is informed, and the active branch's completion criterion is met.

### 3. Deliver both required outcomes

Verify the task artifact independently of the cognition cache. When human
understanding is part of the task, also deliver the cognitive handoff and
collect proportionate evidence of understanding through explanation,
operation, diagnosis, modification, or transfer.

Report these fields separately:

- `artifact_status`: verified, partially verified, or unverified;
- `target_capability`: awareness, operator, interpreter, modifier, builder, or
  not required;
- `cognition_evidence`: observed evidence or `not assessed`;
- `cognitive_status`: complete, partial, or not assessed;
- `remaining_debt`: unresolved assumptions and accepted cognitive debt.

Complete when every field is reported and cognitive completion is claimed only
at the scope supported by observed evidence.

### 4. Persist durable cognition

Review candidate changes at the end of the task. Persist only human-scoped,
durable cognition that will improve future collaboration. Label inferred
observations conservatively and preserve the narrowest scope supported by the
evidence. A read-only or inconclusive task may correctly produce no cache edit.

Complete when every persisted entry has a stable ID, source, confidence,
evidence, dates, status, and current index entry; every move has a transition
stub; and sensitive or long-term claims have explicit human confirmation.

## Boundaries

- Store source facts, API constraints, implementation details, and agent
  uncertainty in project documentation, plans, ADRs, or task notes.
- Store stable personal context and collaboration preferences in the project's
  human profile when one exists; use this cache for cognition state.
- Treat behavioral signals such as pauses, cursor movement, or repeated edits as
  low-confidence candidate evidence until corroborated.
- Preserve human choice over whether a low-risk delivery also needs teaching.
- Before publishing or pushing a tracked cache, warn that it may expose the
  human's cognition state.

## Privacy Guardrails

- Never record credentials, recovery material, government IDs, bank details,
  medical records, or other high-sensitivity personal data.
- Ask before recording identifying, sensitive, capability-related, or long-term
  personal claims.
- Mark agent-derived observations as `source: inferred` and keep confidence
  conservative.
- Record candidate blind spots as questions or hypotheses, never diagnoses.
