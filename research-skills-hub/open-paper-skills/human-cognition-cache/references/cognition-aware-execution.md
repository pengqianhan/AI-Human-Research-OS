# Cognition-Aware Execution

Read this reference when a task may exceed the human's confirmed understanding
or create cognitive debt that matters to their responsibilities.

## Goal

Use the cognition map to expand what the human can accomplish. Preserve the
requested outcome unless a material goal, risk, permission, budget, or
irreversible choice requires human judgment.

## Build the task-cognition gap

1. Extract the concepts and decisions required to complete, verify, operate,
   maintain, or govern the task.
2. Compare only those items with relevant cache evidence.
3. Classify each item as confirmed known, declared unknown, inferred implicit,
   suspected blind spot, or unobserved.
4. Identify the minimum cognition the human needs for their actual role. The
   human need not understand every implementation detail.

Use evidence first: inspect source, documentation, tests, logs, and existing
artifacts before asking the human to supply a fact the agent can verify.

## Route unknowns by owner

| Unknown | Owner | Default action |
| --- | --- | --- |
| Execution unknown | Agent | Investigate, choose a reversible default, execute, verify, and log material assumptions. |
| Governance unknown | Human | Explain the minimum background, ask one material question, and preserve the decision. |
| Learning unknown | Agent with human participation | Finish safe work, then resolve through an artifact-grounded handoff when understanding matters. |

Governance unknowns include goals, values, permissions, privacy, budget,
irreversible actions, acceptance criteria, and material risk tolerance.

## Ask, act, or explain

- **Act** when the issue is technical, evidence-retrievable, low-risk,
  reversible, or covered by an approved default.
- **Ask** when different answers materially change a human-owned decision.
  Supply evidence, consequences, and a recommended default; ask one decision at
  a time.
- **Explain** before the decision when prerequisite understanding is required
  for informed consent. Explain after delivery when understanding is needed to
  verify, operate, maintain, or extend the artifact.

Use a checkpoint before destructive, externally visible, high-cost,
security-sensitive, privacy-sensitive, or otherwise irreversible action.

## Cognitive debt

Cognitive debt exists when the human is responsible for a system or decision
but lacks the understanding needed to control, verify, maintain, or govern it.
Ignorance outside the human's responsibility is not automatically debt.

Record accepted debt with:

- the missing capability;
- why the task can proceed safely;
- the human responsibility affected;
- the planned handoff or verification;
- the consequence of leaving it unresolved.

## Preserve teaching evidence during execution

Keep an evidence trail sufficient to reconstruct the actual work:

- decisions and alternatives;
- commands, tests, metrics, and artifacts;
- failures and recoveries;
- assumptions and deviations;
- risks and unresolved limitations.

Store these in project artifacts or task notes, not in the cognition cache.

## Relationship to grilling

Borrow evidence-first investigation, material questions, decision ownership,
labeled defaults, blind-spot passes, and verification from planning grills.
Keep task/project unknowns in the task ledger. Promote only durable,
human-scoped cognition into this cache.

A grill seeks shared understanding before implementation. Cognition-aware
execution permits implementation before full human understanding when the
agent can proceed safely and the unresolved cognition is not required for a
human-owned decision.

## Completion criterion

Execution routing is complete when every material unknown has an owner, every
human-owned decision is informed, every agent-owned assumption is visible, the
artifact has an independent verification path, and accepted cognitive debt has
a disposition.
