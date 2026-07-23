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

## Autonomous capture

The cache maintains itself. A map that only updates when the human remembers to
ask for an update goes stale quickly, and the interruption costs more than the
entry is worth. Two of the four quadrants cannot be filled any other way: nobody
can report their own implicit criteria or name their own blind spots.

So when a substantive task finishes, the agent reviews the conversation, records
what it durably revealed, and closes its reply with one line naming the entry —
`Recorded cognition cog-20260724-001`. No confirmation prompt, no pending queue.
One sentence from the human corrects or deletes any entry, and Git keeps the
rest of the audit trail.

Three rules keep silent writing honest:

- **Merge before appending.** An existing entry on the topic is updated, not
  duplicated. Without a size cap and without write-time review, duplicates are
  how the cache would rot.
- **Evidence sets confidence.** Autonomous entries are `source: inferred`, but a
  demonstration witnessed in conversation counts as the real thing. Overstating
  cognition makes the agent explain too little, so `known_knowns` needs
  explanation-level evidence or better.
- **Nothing is deleted on a timer.** Stale entries are flagged for
  re-confirmation or archived in place with their IDs intact.

Enabling it in another project takes one line in whatever file that project
always loads — `AGENTS.md`, `CLAUDE.md`, or the instructions they import:

```text
At the end of every substantive task, use $human-cognition-cache to record what
the conversation revealed about my cognition, without asking first, and name each
write in your closing line.
```

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

Capture is automatic, so these are for when you want a branch run on demand.

```text
Use $human-cognition-cache to initialize a cognition map for this project.
Use $human-cognition-cache to help me complete this task even though I do not understand the implementation yet.
Use $human-cognition-cache to decide what you should handle and what you need me to decide.
Use $human-cognition-cache to explain this completed artifact at the level I need to maintain it.
Use $human-cognition-cache to update my cognition map using evidence from this task.
```

## Privacy

The cache may be git-tracked and published with the repository. It excludes
credentials and high-sensitivity personal data outright, treats behavioral
inference as low-confidence evidence, and asks before recording identifying
personal claims that are not cognition.

Cognition itself — including capability and long-term observations — is recorded
without a confirmation prompt, because the human keeps control a cheaper way:
every write is announced, and one sentence revokes it.

Human Cognition Cache is an original skill by Pengqian Han and is distributed
under the repository's MIT license.
