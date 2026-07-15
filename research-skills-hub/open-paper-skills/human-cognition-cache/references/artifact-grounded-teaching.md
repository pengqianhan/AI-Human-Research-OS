# Artifact-Grounded Teaching

Read this reference when the human needs to understand, operate, review,
maintain, or extend a delivered artifact.

## Set the learning contract

Separate artifact completion from cognitive completion. Choose the minimum
capability needed for the human's role:

| Capability | Human can |
| --- | --- |
| Awareness | State the purpose, outcome, major limits, and risks. |
| Operator | Run, stop, resume, and inspect the artifact safely. |
| Interpreter | Explain key mechanisms, metrics, and common failures. |
| Modifier | Change bounded parameters and predict likely effects. |
| Builder | Recreate or redesign the approach in a new context. |

The human may choose a lower target for a low-risk, one-off delegation. Require
the cognition needed for informed control when the human owns consequential
decisions or ongoing maintenance.

Complete this stage when the target capability, scope, and reason are explicit.

## Choose explanation depth

Use a separate abstraction axis:

- **Overview**: purpose, components, boundaries, data flow, risks, and outcome.
- **Mechanism**: state changes, interactions, causal logic, metrics, and failure
  behavior.
- **Implementation**: source, algorithms, configuration, memory, concurrency,
  and performance details.

Start from relevant known knowns and traverse the shortest prerequisite path to
the target capability. Use diagrams, comparisons, traces, or simulations only
when they make the mechanism materially easier to understand.

## Ground the explanation

Teach from the delivered artifact and its verified evidence:

1. Reconstruct what the agent actually built or changed.
2. Connect each important concept to a file, command, log, metric, test, or
   observed behavior.
3. Explain material decisions, alternatives, failures, and remaining limits.
4. Give the human the controls required by the target capability.

For a GPT-2 training task, connect tokenization, batches, loss, optimization,
checkpoints, and evaluation to the actual dataset, configuration, logs, and
model outputs rather than presenting a generic tutorial.

## Verify cognition proportionately

Use the lightest evidence that supports the target:

- Awareness: the human can restate purpose, result, and risk.
- Operator: the human can run or recover the artifact with the handoff.
- Interpreter: the human can explain a metric or diagnose a representative
  failure.
- Modifier: the human can make a bounded change and anticipate its effect.
- Builder: the human can transfer the mechanism to a new problem.

A quiz is optional. Prefer real explanation, operation, diagnosis,
modification, or transfer when those actions are safe and affordable.

## Update cognition without overclaiming

Record the exact capability and scope demonstrated. Use the evidence hierarchy
from [cache-schema.md](cache-schema.md). A single guided success normally
supports operation in that context, not broad independent mastery.

Move an entry only when the destination quadrant is supported. Otherwise update
its evidence, confidence, scope, `next_learning_edge`, or leave it unchanged.

## Completion criterion

The handoff is complete when the human has the controls and explanation needed
for the agreed capability, each important claim points to verified task
evidence, remaining cognitive debt is explicit, and any cache transition stays
within the demonstrated scope.

End the handoff by reporting the target capability, the cognition evidence
actually observed, and `cognitive_status` as `complete`, `partial`, or
`not assessed`. A clear explanation without human response normally leaves the
status `not assessed`.
