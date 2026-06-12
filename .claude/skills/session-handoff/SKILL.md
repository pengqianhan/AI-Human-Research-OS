---
name: session-handoff
description: Maintain task_plan.html (plan + live progress TODO table) and CHANGE_SUMMARY.html (what changed and why) as cross-session hand-off records for code agents. Use this whenever a session starts in a repository containing these files (read them before other work to resume where the previous session stopped), when the user asks what was done previously, wants to continue earlier work, plans a task that may span multiple sessions, or asks to record progress or prepare a hand-off for the next session.
---

# Session Handoff

Maintain two repository-root HTML files as the durable record of agent work, so
a brand-new session can pick up exactly where the previous one stopped:

- `task_plan.html` — forward-looking: the goal, phased steps with verification
  commands, and a **live Progress TODO table**. The TODO table is the resume
  point for the next session.
- `CHANGE_SUMMARY.html` — backward-looking: commits, what changed and why,
  deviations from the plan, decisions taken (with the default chosen and how to
  reverse it), and what was intentionally not done.

These files complement — never replace — the repository's memory files (e.g.
`Memory/MEMORY.md`) and git history: memory holds durable cross-task knowledge,
git holds the diffs, and this pair holds the state and reasoning of one task
arc in a form a cold session can absorb in a single read.

## When a session starts (resume)

1. If `task_plan.html` exists, read its Progress TODO table **before** other
   work. ⬜ rows are the remaining work; ✅ rows carry commit hashes you can
   inspect with `git show` instead of re-deriving what happened.
2. Read the decisions table in `CHANGE_SUMMARY.html` before reopening any
   settled question — defaults were chosen deliberately and each records how to
   reverse it. Re-litigate only if the user asks.
3. Trust the repository over the documents: they are snapshots. Re-verify the
   load-bearing facts behind your next steps (a short preflight: `git log`,
   `git status`, key file checks) before acting on instructions written in an
   earlier session.
4. Honor ⛔ guardrail rows: standing "do not do" rules that are never checked
   off; revisit only on explicit user request.

## During and at the end of a session (record)

1. Before starting work that may span sessions, write (or extend)
   `task_plan.html`: the goal, and phased steps concrete enough that a cold
   session could execute them — exact paths, commands, verify checks — plus one
   Progress TODO row per step.
2. Update the TODO **as you work, not in bulk at the end** — a session can be
   interrupted at any point, and the table must always reflect reality. Check
   an item off only after its verification actually ran, and put the commit
   hash in the status cell.
3. Status vocabulary: ⬜ pending · ✅ done (+ commit hash) · 🔶 partial or
   skipped, with the reason inline · ⛔ standing guardrail (never checked off).
4. When reality forces a deviation from the plan, take the sensible path and
   record it (what changed, why) in `CHANGE_SUMMARY.html`. An honest record
   beats a flattering one; never tick an unverified item.
5. At task end — or before a planned stop — update `CHANGE_SUMMARY.html`:
   commits table, what-changed-and-why, deviations, decisions,
   intentionally-not-done.
6. Follow-up work related to the same task: append new phases/rows to the
   existing plan. An unrelated new task: archive the current pair first (e.g.
   rename with a date suffix) and start a fresh pair.

## File conventions

- Self-contained HTML, no external assets; use relative `<a href>` links to
  repository files so everything stays clickable offline.
- Give every TODO status cell a stable anchor comment (`<!--st:1.1-->`) so a
  later session can update one cell with a single exact-string edit.
- Keep the Progress TODO table near the top of `task_plan.html` — it is the
  first thing a resuming session needs.
- One active pair per repository, at the repository root.

## Minimal skeletons

`task_plan.html`:

```html
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Task Plan — TASK NAME</title>
<style>body{font-family:system-ui;max-width:1000px;margin:0 auto;padding:32px;line-height:1.5}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d8dee6;padding:6px 10px;text-align:left;vertical-align:top}
th{background:#f6f8fa}code{background:#f0f2f5;padding:1px 5px;border-radius:4px}</style></head><body>
<h1>Task Plan — TASK NAME</h1>
<p><b>Generated:</b> DATE · <b>Branch:</b> BRANCH · <b>Repo state:</b> commit HASH</p>
<h2>Goal</h2><p>One paragraph: what done looks like.</p>
<h2 id="todo">Progress TODO (⬜ pending · ✅ done · 🔶 partial/skipped-with-reason · ⛔ guardrail)</h2>
<table><tr><th>Step</th><th>Item</th><th>Status</th></tr>
<tr><td>1.1</td><td>First step</td><td>⬜ <!--st:1.1--></td></tr></table>
<h2>Phases</h2><!-- per phase: concrete actions, exact paths/commands, and a verify check per step -->
<h2>Decisions</h2><!-- choices with the default taken, the alternative, and who must confirm -->
</body></html>
```

`CHANGE_SUMMARY.html`:

```html
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Change Summary — TASK NAME</title>
<style>/* same minimal style as task_plan.html */</style></head><body>
<h1>Change Summary — TASK NAME</h1>
<p>DATE · branch BRANCH · plan: <a href="task_plan.html">task_plan.html</a></p>
<h2>Commits</h2><table><tr><th>Phase</th><th>Commit</th><th>Subject</th></tr></table>
<h2>What changed and why</h2><table><tr><th>Before</th><th>After</th><th>Why</th></tr></table>
<h2>Deviations from the plan</h2><table><tr><th>Deviation</th><th>Reason</th></tr></table>
<h2>Decisions</h2><table><tr><th>Question</th><th>Default taken</th><th>To reverse</th></tr></table>
<h2>Intentionally not done</h2><ul><li>…and why.</li></ul>
</body></html>
```

A full-scale worked example of both files (multi-phase plan, deviations,
decision tables, guardrail rows) may exist at this repository's root from the
2026-06 normalization task — read those before inventing new structure.

## Scope, inputs, outputs, limitations

- **Scope**: process and record-keeping convention; domain-independent; works
  in any git repository driven by code agents.
- **Inputs**: the current repository state, the task being planned or resumed,
  and any existing `task_plan.html` / `CHANGE_SUMMARY.html`.
- **Outputs**: a created or updated `task_plan.html` and `CHANGE_SUMMARY.html`
  at the repository root.
- **Limitations**: the files are snapshots, not ground truth — always re-verify
  against the repository; they do not replace memory files, commit messages, or
  git history; one active pair per repository (archive before starting an
  unrelated task).
