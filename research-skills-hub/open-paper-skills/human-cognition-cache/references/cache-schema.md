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

There is no cap on entry count. Length is governed by merging and decay instead,
so that growth costs nothing and no observation is lost to a quota.

## Merge before appending

Read the target quadrant's `Active Index` before writing anything new. When an
entry already covers the topic, update that entry — append to `evidence`, adjust
`confidence`, widen or narrow `scope`, refresh `last_updated` and
`last_verified` — and keep its ID. Create a new ID only for a genuinely new
topic.

This matters most under autonomous capture: with no size cap and no
write-time confirmation, near-duplicate entries are the main way the cache
degrades, and the human has no natural moment to notice them. Decay runs on a
scale of months and will not catch same-week duplicates.

Completion criterion: no two active entries in a quadrant describe the same
cognition.

## Decay and archiving

Aging is about staleness of evidence, not age of the entry, and cognition does
not spoil uniformly. Apply per quadrant, measured from `last_verified`:

| Quadrant | Rule |
|---|---|
| `known_knowns` with `operation`, `diagnosis`, `modification`, or `transfer` evidence | Never expires. A demonstrated capability is not forgotten on a timer. |
| `known_knowns` with `self-report` or `explanation` evidence only | Mark `freshness: possibly-stale` after 180 days. |
| `known_unknowns` | Mark `freshness: possibly-stale` after 90 days. A recognized gap may have closed, and treating a closed gap as open underestimates the human. |
| `unknown_knowns` | Never expires; implicit criteria are stable. Set `status: disputed` the moment the human contradicts one. |
| `unknown_unknowns` | Archive an unconfirmed hypothesis after 60 days. It was only ever a guess. |

Never delete on a timer. Marking `possibly-stale` keeps the entry active and
flags it for confirmation during the next related task. Archiving moves the full
entry, ID intact, to an `## Archive` section at the end of its quadrant file and
removes it from the `Active Index`; the entry stays readable and Git keeps the
history. Restore an archived entry to active status if it becomes relevant
again, rather than writing a duplicate.

Completion criterion: the `Active Index` holds only entries still worth loading
at session startup, and nothing was removed from the repository.

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

Keep inference confidence conservative, but derive it from the evidence actually
observed rather than from whether the human confirmed it. A demonstration
witnessed in conversation is level 3 or higher even though nobody was asked
about it.

Record capability and long-term cognition inferences without asking, and name
each write in the reply's closing line. Overstating cognition is the more
harmful error, so `known_knowns` requires level 3 evidence or stronger;
`inferred` behavior alone belongs in another quadrant. High-sensitivity personal
data is withheld entirely, never confirmed and recorded.
