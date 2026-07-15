# Human Cognition Cache

Human Cognition Cache helps people complete work beyond their current knowledge
and then turn the verified result into learning.

It gives an agent a project-local model of what the human already understands,
what they know they do not understand, which criteria they use implicitly, and
which blind spots may be worth surfacing. The map is a scaffold rather than a
limit: a cognition gap should usually increase agent initiative, not shrink the
human's goal.

## Why it exists

Agent-generated artifacts can grow faster than human understanding. That gap
becomes cognitive debt when the human remains responsible for judging,
operating, maintaining, or governing a system they cannot adequately control.

This skill closes the loop:

```text
human goal
  -> relevant cognition map
  -> agent/human decision routing
  -> verified artifact
  -> artifact-grounded explanation or practice
  -> evidence-backed cognition update
```

The agent handles technical investigation and reversible implementation work.
The human retains authority over goals, values, permissions, budgets,
irreversible actions, and material risk. When understanding matters, the agent
explains the real artifact at the depth needed for the human's role.

## Example: train GPT-2 before understanding GPT-2 training

A newcomer can ask an agent to train GPT-2 without first mastering tokenizers,
backpropagation, optimizers, checkpoints, and evaluation.

The agent can prepare data, build the environment, run and debug training,
evaluate the checkpoint, and preserve reproducible evidence. It asks the human
for decisions the human must own, such as data permission, compute budget,
privacy, intended use, and acceptable outcomes.

After delivery, the agent explains tokenization, batches, loss, optimization,
checkpoints, and evaluation through the actual configuration, logs, metrics,
and model outputs. The human may target awareness, operation, interpretation,
modification, or independent rebuilding. Only demonstrated understanding is
promoted in the cognition map.

## The cognition map

The default project layout is:

```text
human/human-cognition/
  index.md
  known_knowns.md
  known_unknowns.md
  unknown_knowns.md
  unknown_unknowns.md
```

The four files capture explicit understanding, recognized gaps, implicit
knowledge, and candidate blind spots. Silence is treated as unobserved rather
than proof that the human is unfamiliar with a topic.

Entries carry stable IDs, evidence, confidence, scope, and transition history.
The cache models human cognition only; code facts, plans, logs, and agent
uncertainty remain in project artifacts.

## Skill branches

- **Cache maintenance** initializes, reads, updates, migrates, and moves entries.
- **Beyond-cognition execution** uses the map to decide when the agent should
  act, ask, or explain.
- **Cognitive handoff** teaches from a verified artifact and records cognitive
  growth only when supported by evidence.

See [SKILL.md](SKILL.md) for the agent procedure. Detailed rules live in:

- [Cache schema](references/cache-schema.md)
- [Cognition-aware execution](references/cognition-aware-execution.md)
- [Artifact-grounded teaching](references/artifact-grounded-teaching.md)

## Example requests

```text
Use $human-cognition-cache to initialize a cognition map for this project.
Use $human-cognition-cache to help me complete this task even though I do not understand the implementation yet.
Use $human-cognition-cache to decide what you should handle and what you need me to decide.
Use $human-cognition-cache to explain this completed artifact at the level I need to maintain it.
Use $human-cognition-cache to update my cognition map using evidence from this task.
```

## Privacy

The cache may be git-tracked and published with the repository. It excludes
credentials and high-sensitivity personal data, treats behavioral inference as
low-confidence evidence, and requires confirmation before sensitive or
long-term personal claims are persisted.

Human Cognition Cache is an original skill by Pengqian Han and is distributed
under the repository's MIT license.
