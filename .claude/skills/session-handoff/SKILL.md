---
name: session-handoff
description: Maintain HANDOFF.md as the cross-session hand-off record for active work, decisions, deviations, and intentionally-not-done items. Use when asked to record progress, prepare a hand-off for the next session, continue earlier work, recall what was done previously, or plan a task that may span multiple sessions.
---

# Session Handoff

Maintain one lightweight repository-root Markdown hand-off record for agent work:

- `HANDOFF.md` — cross-session record for active unfinished work, decisions
  (with the default chosen and how to reverse it), deviations from the plan, and
  what was intentionally not done.

This file complements — never replaces — the repository's memory files (e.g.
`Memory/MEMORY.md`) and git history. The division of labor is strict:

- **git** holds commits and diffs. Do **not** hand-maintain a commits table — it drifts
  out of sync with the real history. Point to `git log` / `git show <hash>` instead.
- **memory files** hold durable cross-task / cross-project knowledge.
- **HANDOFF.md** holds the state and reasoning of one task arc, in a form a cold session
  can absorb quickly.

## Triggering — read this

A skill cannot run itself at session start; it activates only when the user asks something
relevant or types `/session-handoff`. So the **resume read must be wired where the agent
already looks at startup** — do not rely on this SKILL.md body, which is not in context
until the skill is invoked:

1. Add a step to `INSTRUCTION.md` (the file `AGENTS.md` / `CLAUDE.md` point to):
   *"Read HANDOFF.md Active Work and Decisions before reopening settled questions."*
2. Or add a `SessionStart` hook in `.claude/settings.json` that injects the relevant
   `HANDOFF.md` sections.

## When resuming

1. Read `HANDOFF.md`'s Active Work section first. ⬜ / 🔶 rows are remaining work;
   ✅ rows carry commit hashes — inspect with `git show` instead of re-deriving.
2. Read `HANDOFF.md`'s Decisions table before reopening any settled question — each
   default records how to reverse it. Re-litigate only if the user asks.
3. **Trust the repository over this file** — it is a snapshot. Re-verify the
   load-bearing facts (`git log`, `git status`, key file checks) before acting on them.
4. Honor ⛔ guardrail rows: standing "do not do" rules; revisit only on explicit request.

## When recording

1. Before work that may span sessions, create or extend `HANDOFF.md`'s Active Work
   section: the goal and steps concrete enough for a cold session to execute — exact
   paths, commands, verify checks — plus one row per step.
2. Update Active Work **as you work, not in bulk at the end**. A session can be
   interrupted at any point. Check an item off only after its verification actually ran,
   and put the commit hash in the status cell when a commit exists.
3. Status vocabulary: ⬜ pending · ✅ done (+ commit hash when committed) · 🔶
   partial/skipped (reason inline) · ⛔ standing guardrail (never checked off).
4. When reality forces a deviation, take the sensible path and record it in
   `HANDOFF.md` (what changed, why). An honest record beats a flattering one.
5. At task end — or before a planned stop — update `HANDOFF.md`: decisions,
   deviations, intentionally-not-done. **Do not add a commits table; link to `git log`.**
6. When no execution steps remain, set Active Work to `None` after durable decisions and
   intentionally-not-done items are captured in `HANDOFF.md` or memory.
7. Related unfinished follow-up work: append rows to Active Work. Unrelated new
   unfinished task: replace Active Work with a fresh subsection for that task after
   preserving any durable decisions in the Decisions table.

## File Conventions

- Markdown, repository root. Use relative links so everything stays clickable.
- Keep `## Active Work` near the top of `HANDOFF.md` — it is the first thing a resuming
  session needs.
- Keep `HANDOFF.md` **lean**: carry only live, load-bearing content forward. Push
  finished-task detail into git history (and an archived snapshot if you want one).

## Minimal Skeleton

`HANDOFF.md`:

```markdown
# Handoff — TASK NAME

Commits live in git: `git log` / `git show <hash>` (not duplicated here).

## Active Work

None.

## Decisions
| ID | Decision | Default taken | To reverse |
|---|---|---|---|

## Deviations from the plan

## Intentionally not done
```

## Scope, inputs, outputs, limitations

- **Scope**: a process and record-keeping convention; domain-independent; works in any git
  repository driven by code agents.
- **Inputs**: the current repository state, the task being planned or resumed, and any
  existing `HANDOFF.md`.
- **Outputs**: an updated `HANDOFF.md`.
- **Limitations**: `HANDOFF.md` is a snapshot, not ground truth — always re-verify
  against the repository; it does not replace memory files, commit messages, or git
  history; the skill cannot auto-run at session start (wire that in `INSTRUCTION.md` or
  a `SessionStart` hook).
