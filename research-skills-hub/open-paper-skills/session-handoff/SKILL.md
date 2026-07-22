---
name: session-handoff
description: Maintain or resume repository-root HANDOFF.md for cross-session work. Use when recording a task arc that may span sessions, preparing its next-session handoff, or continuing and verifying an earlier arc.
---

# Session Handoff

Keep one compact repository-root `HANDOFF.md` that transfers control to a cold session without
requiring the prior conversation. Treat it as a snapshot: repository evidence always wins.

Keep each fact in its authoritative layer:

- Git stores commits and diffs; link `git log` or `git show`, never mirror a commit table.
- Memory files store durable cross-task or cross-project knowledge.
- Project memory stores project-local state.
- A dedicated map or tracker stores its own execution status; link it instead of mirroring it.
- `HANDOFF.md` stores the current task arc: active work, settled decisions, deviations, and
  intentional omissions.

If `HANDOFF.md` is missing or needs structural repair, read [references/format.md](references/format.md)
before recording.

## Resume

1. Read `Active Work`, then `Decisions`, guardrails, blockers, and any suggested skills relevant
   to the next action.
2. Re-verify load-bearing facts with `git status`, `git log`, referenced artifacts, and targeted
   checks. Prefer current repository evidence over the snapshot.
3. Continue the recorded next action. Preserve settled defaults unless the user explicitly
   reopens them.

Complete when the next action, its authority, its prerequisites, and the evidence supporting the
current state are all known without relying on the previous transcript.

## Record ongoing work

1. Create or update the active task arc before work may cross a session boundary. Give every open
   item an exact next action and a checkable acceptance condition; add paths or commands when useful.
2. Update the record as state changes. Keep blocked or partial items unchecked with the blocker;
   check and strike through an item only after its verification passes.
3. Record settled choices as `Decision | Default taken | To reverse`. Record material route changes
   under `Deviations` and deliberately deferred scope under `Intentionally not done`.
4. Reference existing specs, plans, ADRs, issues, maps, commits, and diffs by path or URL. Add only
   the context needed to understand why they matter and what happens next.
5. Keep sensitive values out of the handoff. Record a safe location or handling instruction for
   credentials and private data, never the secret or personal detail itself.

Complete when a cold agent can identify the current state, next action, acceptance check, blocker,
and governing decision from repository artifacts alone.

## Prepare the next session

1. Compact finished detail into links to authoritative artifacts and Git evidence. Keep only live,
   load-bearing context in `HANDOFF.md`.
2. If the user names the next session's focus, tailor the next action to it. Add `Suggested skills`
   only when naming them changes tool or workflow routing.
3. Audit the handoff: verify factual claims, resolve local links, remove duplicated artifact content,
   and confirm that no credentials or sensitive personal information appear.
4. When the task arc has no remaining execution work, write `No active tasks.` after preserving
   durable decisions and intentional omissions in their authoritative layers.

Complete when a fresh agent can resume safely from `HANDOFF.md` and its links, with no transcript
and no hidden prerequisite.

## Conventions and limitations

- Keep `HANDOFF.md` in the repository root, with relative links and `Active Work` near the top.
- Keep it lean; Git history and linked artifacts carry completed detail.
- This skill does not run automatically at session start. Repository startup instructions must
  explicitly direct agents to read `HANDOFF.md`.
