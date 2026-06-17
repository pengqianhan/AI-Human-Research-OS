# Handoff — AI-Human Research OS

Forward-looking hand-off for the next session: **where to resume**, what is deliberately
deferred, and where decisions live. Backward-looking record (what changed and why):
[CHANGE_SUMMARY.md](CHANGE_SUMMARY.md). Maintained by the `session-handoff` skill.

**Repo state:** branch `forfable` · last hand-off commit `31fca35` (2026-06-17).
**Trust the repository over this file** — it is a snapshot. Re-verify with `git log` /
`git status` and a quick file check before acting on anything written here.

> Full detail of the completed 2026-06 normalization task lives in git history and in the
> archived [task_plan-2026-06.html](task_plan-2026-06.html) /
> [CHANGE_SUMMARY-2026-06.html](CHANGE_SUMMARY-2026-06.html). Don't re-derive it.

## Resume here

Status legend: ⬜ pending · ✅ done · 🔶 partial/skipped (reason inline) · ⛔ standing guardrail (never checked off)

The **2026-06 normalization** task and its **2026-06-17 follow-up** (project/template indexes +
`Paper_Initial_template → ai_research_template` rename) are **complete and committed**
(`31fca35`). No execution steps are pending — only standing items remain:

| Item | Status |
|---|---|
| Create a root `Templates/` container **only when a second project template is added** (premature today — one template needs no container) | 🔶 deferred by design |
| Do **not** add a plugin manager, manifest format, versioning, auto-update, CLI, or git submodules for plugins — plugins stay "a directory with a contract" (skills = `SKILL.md`; templates = the 4-point contract in [INSTRUCTION.md](INSTRUCTION.md)) | ⛔ guardrail |
| Do **not** bulk-rename `Paper_Initial_template` in the historical task docs (`task.md`, `task_en.md`, the archived plan/summary) — those strings are quotes, not live references | ⛔ guardrail |

**Starting a new task?** Add a `## <task name>` section below with its own Progress TODO table,
update the TODO **as you work** (not in bulk at the end), record choices in
[CHANGE_SUMMARY.md](CHANGE_SUMMARY.md), and put the commit hash in the status cell once a step's
verification has actually run.

## Decisions

Decisions (the default taken + **how to reverse** each) live in one place:
[CHANGE_SUMMARY.md → Decisions](CHANGE_SUMMARY.md#decisions). Durable cross-project decisions are
also summarized in [Memory/MEMORY.md → Key Decisions](Memory/MEMORY.md). Don't duplicate them here —
link instead.

## Standing ground rules

- **Occam's razor** — no new entities (databases, services, CLIs, frameworks) without necessity.
- **No invented evidence** — never fabricate citations, data, or results; cite only live-fetched
  metadata, or cite nothing.
- **Preservation** — never delete or substantially rewrite user research material; preserve verbatim.
- **Small, reversible steps** — commit per logical step; record deviations in CHANGE_SUMMARY.md.
