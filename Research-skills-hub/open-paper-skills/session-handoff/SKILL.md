---
name: session-handoff
description: Maintain task_plan.md (resume point + live progress TODO) and CHANGE_SUMMARY.md (decisions, deviations, what was intentionally not done) as cross-session hand-off records for code agents. Use when asked to record progress, prepare a hand-off for the next session, continue earlier work, recall what was done previously, or plan a task that may span multiple sessions. Read these to resume where a previous session stopped.
---

# Session Handoff

Maintain two repository-root Markdown files as the durable record of agent work, so a
brand-new session can pick up exactly where the previous one stopped:

- `task_plan.md` — forward-looking: the goal, any phased steps, and a **live Progress
  TODO table**. The TODO table is the resume point for the next session.
- `CHANGE_SUMMARY.md` — backward-looking: decisions (with the default chosen and how to
  reverse it), deviations from the plan, and what was intentionally not done.

These files complement — never replace — the repository's memory files (e.g.
`Memory/MEMORY.md`) and git history. The division of labor is strict:

- **git** holds commits and diffs. Do **not** hand-maintain a commits table — it drifts
  out of sync with the real history. Point to `git log` / `git show <hash>` instead.
- **memory files** hold durable cross-task / cross-project knowledge.
- **this pair** holds the state and reasoning of one task arc, in a form a cold session
  can absorb in a single read.

## Triggering — read this

A skill cannot run itself at session start; it activates only when the user asks something
relevant or types `/session-handoff`. So the **resume read must be wired where the agent
already looks at startup** — do not rely on this SKILL.md body, which is not in context
until the skill is invoked:

1. Add a step to `INSTRUCTION.md` (the file `AGENTS.md` / `CLAUDE.md` point to): *"If
   `task_plan.md` exists, read its Progress TODO before other work."*
2. Or add a `SessionStart` hook in `.claude/settings.json` that injects the file's contents.

## When resuming

1. Read `task_plan.md`'s Progress TODO table first. ⬜ / 🔶 rows are the remaining work;
   ✅ rows carry commit hashes — inspect with `git show` instead of re-deriving.
2. Read `CHANGE_SUMMARY.md`'s Decisions table before reopening any settled question — each
   default records how to reverse it. Re-litigate only if the user asks.
3. **Trust the repository over these files** — they are snapshots. Re-verify the
   load-bearing facts (`git log`, `git status`, key file checks) before acting on them.
4. Honor ⛔ guardrail rows: standing "do not do" rules; revisit only on explicit request.

## When recording (during and at end of a session)

1. Before work that may span sessions, write/extend `task_plan.md`: the goal and steps
   concrete enough for a cold session to execute — exact paths, commands, verify checks —
   plus one Progress TODO row per step.
2. Update the TODO **as you work, not in bulk at the end** — a session can be interrupted
   at any point. Check an item off only after its verification actually ran, and put the
   commit hash in the status cell.
3. Status vocabulary: ⬜ pending · ✅ done (+ commit hash) · 🔶 partial/skipped (reason
   inline) · ⛔ standing guardrail (never checked off).
4. When reality forces a deviation, take the sensible path and record it (what changed,
   why) in `CHANGE_SUMMARY.md`. An honest record beats a flattering one; never tick an
   unverified item.
5. At task end — or before a planned stop — update `CHANGE_SUMMARY.md`: decisions,
   deviations, intentionally-not-done. **Do not add a commits table; link to `git log`.**
6. Related follow-up work: append rows/sections to the existing pair. Unrelated new task:
   archive the current pair first (rename with a date suffix, e.g. `task_plan-YYYY-MM.md`)
   and start a fresh pair.

## File conventions

- Markdown, repository root, one active pair. Use relative links so everything stays
  clickable. Markdown is cheaper to read, edit, grep, and diff than HTML, and matches the
  rest of the repository's operating docs.
- Keep the Progress TODO table near the top of `task_plan.md` — it is the first thing a
  resuming session needs.
- Keep both files **lean**: carry only live, load-bearing content forward. Push
  finished-task detail into git history (and an archived snapshot if you want one).

## Minimal skeletons

`task_plan.md`:

```markdown
# Handoff — TASK NAME

Resume point for the next session. Record of changes: CHANGE_SUMMARY.md.
**Repo state:** branch BRANCH · last commit HASH. Trust the repo over this file.

## Resume here
Legend: ⬜ pending · ✅ done · 🔶 partial/skipped · ⛔ guardrail

| Item | Status |
|---|---|
| First step | ⬜ |

## Decisions
See CHANGE_SUMMARY.md → Decisions. Don't duplicate here.
```

`CHANGE_SUMMARY.md`:

```markdown
# Change Summary — TASK NAME

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
  existing `task_plan.md` / `CHANGE_SUMMARY.md`.
- **Outputs**: a created or updated `task_plan.md` and `CHANGE_SUMMARY.md` at the repo root.
- **Limitations**: the files are snapshots, not ground truth — always re-verify against the
  repository; they do not replace memory files, commit messages, or git history; the skill
  cannot auto-run at session start (wire that in `INSTRUCTION.md` or a `SessionStart` hook);
  one active pair per repository (archive before an unrelated task).
