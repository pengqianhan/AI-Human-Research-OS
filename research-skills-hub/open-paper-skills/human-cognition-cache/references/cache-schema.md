# Cache Schema

Read this reference whenever creating, migrating, writing, or moving cognition
entries.

## Location and layout

Prefer this layout when the project has a `human/` context directory:

```text
human/human-cognition/
  index.md
  known_knowns.md
  known_unknowns.md
  unknown_knowns.md
  unknown_unknowns.md
```

Otherwise use a project-level `human-cognition/`, or another path that matches
the repository's human-context conventions. Runtime cache files belong in the
project, not inside `.agents/skills/` or `.claude/skills/`.

When initializing, create all five files. Give each file OKF frontmatter, an
`Active Index`, and an `Entries` section. Keep `index.md` limited to navigation,
current focus, recent transitions, and the privacy boundary.

## Startup read

1. Skim `index.md`.
2. Skim the frontmatter and `Active Index` of all four quadrant files.
3. Read full entries only when relevant to the current task.

Completion criterion: the agent can name every loaded entry and why it is
relevant; unrelated full entries remain unloaded.

## Stable IDs and entry fields

Prefer `cog-YYYYMMDD-NNN` unless the project already has a convention.

Required fields:

```markdown
## cog-YYYYMMDD-NNN Short title

- content:
- source: user-confirmed | inferred
- confidence: high | medium | low
- evidence:
- created: YYYY-MM-DD
- last_updated: YYYY-MM-DD
- status: active | superseded | disputed
```

Add only the optional fields supported by the task:

```markdown
- domain:
- scope:
- capability_level: awareness | operator | interpreter | modifier | builder
- evidence_type: self-report | explanation | operation | diagnosis | modification | transfer
- last_verified: YYYY-MM-DD
- freshness: current | possibly-stale
- responsibility_relevance:
  -
- next_learning_edge:
- derived_from:
  - [cog-YYYYMMDD-NNN](other_file.md#anchor)
- related:
  - [cog-YYYYMMDD-NNN](other_file.md#anchor)
```

Use `scope` to prevent overgeneralization. Evidence that the human can interpret
one GPT-2 training run does not prove broad mastery of language-model training.

## Active indexes

Keep each index short:

```markdown
## Active Index

- cog-YYYYMMDD-NNN - Short title: one-sentence, scope-aware summary.
```

List only active entries. Ensure every active full entry appears once and every
index item resolves to one full entry in the same file.

## Transitions

Common moves:

- `unknown_unknowns` -> `known_unknowns`: the human now recognizes the gap.
- `known_unknowns` -> `known_knowns`: the human can now explain or demonstrate
  the cognition within its recorded scope.
- `unknown_knowns` -> `known_knowns`: an implicit criterion became explicit.
- `known_knowns` -> `known_unknowns`: a former certainty now contains a
  recognized gap.

Move the full current entry to the destination while retaining its ID. Replace
the source entry with this stub:

```markdown
## cog-YYYYMMDD-NNN Short title

- status: superseded
- moved_to: [destination.md#anchor](destination.md#anchor)
- reason:
- last_updated: YYYY-MM-DD
```

Update both active indexes and add one line to `index.md` under
`Recent Transitions`.

Create a transition stub only when the source file already contains the active
full entry. When the human reports an earlier unrecorded state, create the
current evidence-backed entry directly and describe the history in its evidence;
leave the source file and transition log unchanged.

Completion criterion: the destination contains the only active full entry; the
source contains one resolvable stub; both indexes and the transition log agree.

## Evidence discipline

Use the narrowest claim supported by the strongest available evidence:

1. `inferred`: behavior suggests a candidate cognition state.
2. `self-report`: the human says they know or do not know it.
3. `explanation`: the human explains it in their own terms.
4. `operation`: the human uses the real artifact successfully.
5. `diagnosis` or `modification`: the human reasons about a failure or change.
6. `transfer`: the human applies the understanding in a new situation.

Keep inference confidence conservative. Ask before turning sensitive,
identifying, capability-related, or long-term inferences into durable entries.
