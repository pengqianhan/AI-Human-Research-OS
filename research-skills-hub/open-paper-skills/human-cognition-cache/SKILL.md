---
name: human-cognition-cache
description: Scaffold human cognition with a project-local, git-trackable four-quadrant cache. Use when (1) initializing, reading, updating, or migrating the cache; (2) completing a task beyond the human's confirmed understanding, where cognition should guide agent autonomy and decision escalation; (3) explaining a verified artifact at the human's level and recording evidence-backed cognitive growth; or (4) finishing any substantive task, where the conversation revealed durable cognition that should be captured without the human having to ask.
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
- Human corrections to entries the agent recorded on its own.

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

## Autonomous Capture

Keeping the cache current is the agent's job, not the human's. Waiting to be
invoked costs continuity and starves the two quadrants the human cannot
self-report: nobody can state their own implicit criteria or blind spots.

Capture at task boundaries, not every turn. When a substantive task finishes,
review the whole conversation for what it revealed about the human's cognition
and record it in one pass. A single turn rarely carries enough evidence, and
per-turn capture manufactures low-confidence noise.

Write without asking, then say so. Record the entry, and close the reply with
one line naming the ID, such as `Recorded cognition cog-20260724-001`. Do not
interrupt the task to request permission, do not open a pending queue, and do
not stage a review ritual. The human's word alone is enough to correct or delete
any entry; version control carries the rest of the audit trail.

Persist any non-private cognition. There is no topic filter: engineering,
tooling, and workflow cognition shape agent routing at least as much as subject
knowledge does. The only gates are the privacy guardrails below and the
requirement that the observation be durable and human-scoped.

**Merge before appending.** Scan the target quadrant's `Active Index` first.
When an existing entry already covers the topic, update it — append evidence,
adjust confidence, widen or narrow scope, refresh `last_verified` — instead of
creating a new ID. This is a hard prerequisite, not a preference: silent capture
has no size cap, so unchecked duplicates are its main failure mode and the human
cannot see them accumulating.

Let observed evidence set confidence. Mark autonomous entries `source:
inferred`, but take `evidence_type` and `confidence` from what actually
happened: a demonstration witnessed in conversation is real evidence and should
not be discounted for lacking confirmation. Overstating cognition is the more
harmful error, because it makes the agent explain too little and leaves the
human silently behind, so `known_knowns` requires `explanation`-level evidence
or stronger. Inference alone never promotes an entry there.

Record blind spots, then raise them. Write `unknown_unknowns` entries as
questions or hypotheses, never diagnoses, and surface the relevant one when a
later task touches it. A blind spot the human is never told about has no value
to them.

See [references/cache-schema.md](references/cache-schema.md) for decay,
archiving, and entry fields.

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

Run this step at the end of every substantive task, whether or not the human
asked for it, following the Autonomous Capture rules above. Persist only
human-scoped, durable cognition that will improve future collaboration, and
preserve the narrowest scope supported by the evidence. A read-only or
inconclusive task may correctly produce no cache edit.

Also apply the decay rules while you are here: refresh `last_verified` on any
entry this task re-confirmed, and mark or archive entries the schema has aged
out.

Complete when every persisted entry has a stable ID, source, confidence,
evidence, dates, status, and current index entry; every move has a transition
stub; no new entry duplicates an existing one; every write is named in the
reply's closing line; and any high-sensitivity claim was withheld rather than
recorded.

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
- Record cognition claims — including capability and long-term ones — without
  asking, and disclose each write in the reply's closing line. Continuity of the
  conversation outweighs a confirmation ritual for cognition the human can
  revoke with one sentence. This exemption covers cognition only; it never
  licenses recording the high-sensitivity data listed above, which is withheld
  rather than confirmed.
- Ask before recording identifying personal claims that are not cognition, such
  as location, employer, or affiliation.
- Mark agent-derived observations as `source: inferred` and keep confidence
  conservative.
- Record candidate blind spots as questions or hypotheses, never diagnoses.
