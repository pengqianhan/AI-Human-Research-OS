---
name: human-cognition-cache
description: Maintain a project-local, git-trackable human cognition cache, preferably in Human/human-cognition/ when the project has a Human context folder, with OKF Markdown files for known_knowns, known_unknowns, unknown_knowns, and unknown_unknowns. Use when the user asks to initialize, read, update, migrate, or use their cognition cache; record durable human background, understanding state, preferences, blind spots, or unstated criteria; reduce repeated context in future prompts; or work explicitly with known knowns, known unknowns, unknown knowns, or unknown unknowns.
---

# Human Cognition Cache

Install: no local setup required.

## Scope

Maintain a cache of the human's cognition, not the agent's knowledge. Record
what the human has stated, realized, is unsure about, or appears to use as an
unstated judgment criterion in this project. Do not use this as a general
project knowledge base, chat log, or private personal profile.

Inputs:
- Current user request and relevant conversation context.
- Existing files under the selected cognition cache path, usually
  `Human/human-cognition/`, when present.
- User confirmation for sensitive, inferred, or long-term personal claims.

Outputs:
- A project-local Markdown cache under the selected cognition cache path.
- Updated active indexes, entries, links, and transition stubs when cognition
  moves between quadrants.

Limitations:
- The cache is only as accurate as the human-provided evidence.
- The cache may be git-tracked; treat it as potentially publishable unless the
  repository says otherwise.
- Do not record secrets or high-sensitivity personal data.

## File Layout

Use this preferred layout when a project has a `Human/` context directory:

```text
Human/human-cognition/
  index.md
  known_knowns.md
  known_unknowns.md
  unknown_knowns.md
  unknown_unknowns.md
```

If the project has no `Human/` or equivalent human-context directory, use a
project-level fallback such as `human-cognition/`, or `cache/human-cognition/`
only when that matches the repository's conventions. Never store runtime
cognition files inside a skill installation directory such as
`.agents/skills/human-cognition-cache/` or
`.claude/skills/human-cognition-cache/`; those directories hold tool code and
may be overwritten during skill updates.

If the directory is missing and the user asks to initialize or use this cache,
create the five files with OKF frontmatter, an `Active Index`, and empty
entries. Default to English. Use another language only when the user explicitly
requests it.

## Startup Read

When a project has a cognition cache, first skim its `index.md`. Then skim the
frontmatter and `Active Index` sections of the four quadrant files. Read full
entries only when they are relevant to the current task.

Reusable startup snippet for project instruction files:

```markdown
At session start, if `Human/human-cognition/index.md` exists, skim it first.
Then skim the frontmatter and `Active Index` sections of:
- `Human/human-cognition/known_knowns.md`
- `Human/human-cognition/known_unknowns.md`
- `Human/human-cognition/unknown_knowns.md`
- `Human/human-cognition/unknown_unknowns.md`

Read full entries only when relevant to the current task. Before finishing,
update the cache only for durable human-cognition changes likely to help future
sessions, while respecting the privacy rules of the `human-cognition-cache`
skill.
```

## Quadrants

- `known_knowns.md`: Human-confirmed cognition the human can state clearly.
- `known_unknowns.md`: Questions or gaps the human knows they have.
- `unknown_knowns.md`: Human criteria or assumptions that were unstated until
  revealed through reaction, correction, examples, or repeated choices.
- `unknown_unknowns.md`: Candidate blind spots the human may not yet realize.
  Store these as questions or hypotheses, not facts.

## Example Patterns

Use [Know your unknowns examples](https://thariqs.github.io/html-effectiveness/unknowns/)
as external inspiration for unknown-discovery workflows. Treat it as a reference,
not vendored source: do not copy full HTML artifacts or long prompts into this
skill or a public cache unless the project has permission.

Map common workflows into the cache this way:
- Blindspot pass: add candidate hypotheses to `unknown_unknowns.md`.
- Teach or explainer pass: turn vague unfamiliarity into explicit questions in
  `known_unknowns.md`; move understood concepts to `known_knowns.md`.
- Brainstorm or prototype pass: capture the human's reactions, taste, and
  unstated selection criteria in `unknown_knowns.md`.
- Interview: record unresolved answers in `known_unknowns.md` and confirmed
  decisions in `known_knowns.md`.
- Reference pass: record the examples the human recognizes as relevant in
  `known_knowns.md`, and note unresolved semantic gaps in `known_unknowns.md`.
- Implementation plan: record high-impact decisions likely to change as
  `known_unknowns.md` entries.
- Implementation notes: record real constraints that force cognition transitions.
- Pitch or explainer: consolidate reviewer-facing shared understanding in
  `known_knowns.md` and leave remaining objections in `known_unknowns.md`.
- Quiz: use correct answers as evidence that a prior known unknown has become a
  known known.

## Entry Format

Use stable IDs. Prefer `cog-YYYYMMDD-NNN` unless the project already has a
different convention.

```markdown
## cog-YYYYMMDD-NNN Short title

- content:
- source: user-confirmed | inferred
- confidence: high | medium | low
- evidence:
- created: YYYY-MM-DD
- last_updated: YYYY-MM-DD
- status: active | superseded | disputed
- derived_from:
  - [cog-YYYYMMDD-NNN](other_file.md#cog-yyyymmdd-nnn-short-title)
- related:
  - [cog-YYYYMMDD-NNN](other_file.md#cog-yyyymmdd-nnn-short-title)
```

Keep each file's `Active Index` short:

```markdown
## Active Index

- cog-YYYYMMDD-NNN - Short title: one-sentence summary.
```

## Updating Workflow

1. Read `index.md`, then skim the four active indexes.
2. Read full entries only when they matter for the task.
3. During work, track possible cognition changes mentally or in task notes.
4. Before finishing, update only durable changes likely to help future sessions.
5. Ask before solidifying inferred claims about identity, long-term preference,
   capability, private life, health, finances, or other sensitive areas.
6. Keep `index.md` current only at the navigation level: current focus, recent
   transitions, links, and privacy reminders. Do not duplicate full entries.

## Transitions

Treat the cache as a lightweight cognition graph. When cognition moves between
quadrants, keep the same stable ID.

Common transitions:
- `unknown_unknowns.md` -> `known_unknowns.md`: the human now sees the gap.
- `known_unknowns.md` -> `known_knowns.md`: the human can now state the concept.
- `unknown_knowns.md` -> `known_knowns.md`: an implicit criterion became explicit.
- `known_knowns.md` -> `known_unknowns.md`: a former certainty now has a gap.

When moving an entry, keep the full current entry in the new file. In the old
file, leave only a short stub:

```markdown
## cog-YYYYMMDD-NNN Short title

- status: superseded
- moved_to: [known_unknowns.md#cog-yyyymmdd-nnn-short-title](known_unknowns.md#cog-yyyymmdd-nnn-short-title)
- reason:
- last_updated: YYYY-MM-DD
```

Update both files' `Active Index` sections and add a one-line note to
`index.md` under `Recent Transitions`.

## Privacy Rules

Hard rules:
- Do not record API keys, passwords, tokens, private keys, recovery codes, or
  credentials.
- Do not record government IDs, bank details, medical records, or other
  high-sensitivity personal data.
- Do not turn one-off emotions, casual remarks, or unconfirmed personality
  judgments into durable facts.
- Mark agent-derived observations as `source: inferred` and keep confidence
  conservative.
- Ask before recording sensitive, identifying, or long-term personal claims.
- Remind the user that this cache may expose their cognition state before
  publishing or pushing it to a public repository.
