---
name: session-handoff
description: Maintain HANDOFF.md and, only when unfinished work must survive a session boundary, an active task_plan.md with a live Progress TODO. Use when asked to record progress, prepare a hand-off for the next session, continue earlier work, recall what was done previously, or plan a task that may span multiple sessions. Read task_plan.md only when it exists.
---

# Session Handoff

Maintain lightweight repository-root Markdown hand-off records for agent work:

- `HANDOFF.md` — cross-session record: decisions (with the default chosen and how to
  reverse it), deviations from the plan, and what was intentionally not done.
- `task_plan.md` — optional and forward-looking: the goal, any phased steps, and a
  **live Progress TODO table** for unfinished work that must survive a session boundary.
  Delete the active file when no execution steps remain.

These files complement — never replace — the repository's memory files (e.g.
`Memory/MEMORY.md`) and git history. The division of labor is strict:

- **git** holds commits and diffs. Do **not** hand-maintain a commits table — it drifts
  out of sync with the real history. Point to `git log` / `git show <hash>` instead.
- **memory files** hold durable cross-task / cross-project knowledge.
- **these hand-off files** hold the state and reasoning of one task arc, in a form a cold
  session can absorb quickly. `HANDOFF.md` may persist after the active plan is
  deleted.

## Triggering — read this

A skill cannot run itself at session start; it activates only when the user asks something
relevant or types `/session-handoff`. So the **resume read must be wired where the agent
already looks at startup** — do not rely on this SKILL.md body, which is not in context
until the skill is invoked:

1. Add a step to `INSTRUCTION.md` (the file `AGENTS.md` / `CLAUDE.md` point to): *"If
   an active `task_plan.md` exists, read its Progress TODO before other work."*
2. Or add a `SessionStart` hook in `.claude/settings.json` that injects the file's contents.

## When resuming

1. If `task_plan.md` exists, read its Progress TODO table first. ⬜ / 🔶 rows are the
   remaining work; ✅ rows carry commit hashes — inspect with `git show` instead of
   re-deriving.
2. Read `HANDOFF.md`'s Decisions table before reopening any settled question — each
   default records how to reverse it. Re-litigate only if the user asks.
3. **Trust the repository over these files** — they are snapshots. Re-verify the
   load-bearing facts (`git log`, `git status`, key file checks) before acting on them.
4. Honor ⛔ guardrail rows: standing "do not do" rules; revisit only on explicit request.

## When recording (during and at end of a session)

1. Before work that may span sessions, create or extend `task_plan.md`: the goal and
   steps concrete enough for a cold session to execute — exact paths, commands, verify
   checks — plus one Progress TODO row per step.
2. Update the TODO **as you work, not in bulk at the end** — a session can be interrupted
   at any point. Check an item off only after its verification actually ran, and put the
   commit hash in the status cell.
3. Status vocabulary: ⬜ pending · ✅ done (+ commit hash) · 🔶 partial/skipped (reason
   inline) · ⛔ standing guardrail (never checked off).
4. When reality forces a deviation, take the sensible path and record it (what changed,
   why) in `HANDOFF.md`. An honest record beats a flattering one; never tick an
   unverified item.
5. At task end — or before a planned stop — update `HANDOFF.md`: decisions,
   deviations, intentionally-not-done. **Do not add a commits table; link to `git log`.**
6. When no execution steps remain, remove the active `task_plan.md` after durable
   decisions and intentionally-not-done items are captured in `HANDOFF.md` or
   memory.
7. Related unfinished follow-up work: append rows/sections to the existing active plan.
   Unrelated new unfinished task: archive the current plan first (rename with a date
   suffix, e.g. `task_plan-YYYY-MM.md`) and start a fresh plan.

## File conventions

- Markdown, repository root, at most one active `task_plan.md`. Use relative links so
  everything stays clickable. Markdown is cheaper to read, edit, grep, and diff than
  HTML, and matches the rest of the repository's operating docs.
- Keep the Progress TODO table near the top of `task_plan.md` when the file exists — it
  is the first thing a resuming session needs.
- Keep hand-off files **lean**: carry only live, load-bearing content forward. Push
  finished-task detail into git history (and an archived snapshot if you want one).

## Minimal skeletons

`task_plan.md`:

```markdown
# Handoff — TASK NAME

Resume point for the next session. Record of decisions and deviations: HANDOFF.md.
**Repo state:** branch BRANCH · last commit HASH. Trust the repo over this file.

## Resume here
Legend: ⬜ pending · ✅ done · 🔶 partial/skipped · ⛔ guardrail

| Item | Status |
|---|---|
| First step | ⬜ |

## Decisions
See HANDOFF.md → Decisions. Don't duplicate here.
```

`HANDOFF.md`:

```markdown
# Handoff — TASK NAME

Commits live in git: `git log` / `git show <hash>` (not duplicated here).

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
  existing `task_plan.md` / `HANDOFF.md`.
- **Outputs**: an updated `HANDOFF.md`, plus an optional `task_plan.md` at the repo
  root only while unfinished work needs a resume point.
- **Limitations**: the files are snapshots, not ground truth — always re-verify against the
  repository; they do not replace memory files, commit messages, or git history; the skill
  cannot auto-run at session start (wire that in `INSTRUCTION.md` or a `SessionStart`
  hook); one active task plan per repository when a plan exists.
