# Research OS MVP Build Phases

This directory is the execution-contract slot for the active Pi Coding Agent
file-workflow MVP selected in
[ADR-0002](../../docs/adr/0002-pi-coding-agent-workflow-mvp.md).

## Current state

No live phase prompt has been compiled yet. Map waypoint N15 must be
human-verified before edge E21 creates the following three standalone prompts:

1. **Contract preparation** — inspect `Example_Project`, draft the bounded Run
   Contract, and obtain Human Owner approval before project mutation.
2. **Run and record** — keep Pi Coding Agent's terminal open, execute the
   approved multi-seed task, run declared validation, and write a Research
   Checkpoint plus Review Package.
3. **Transcript-independent takeover** — a fresh human or agent explains,
   validates, and continues the work using project files only.

`Example_Project` is only the workflow smoke test. After it passes, the first
real project is `circle_packing`, reimplemented from the EurekAgent task
specification without copying its AGPL code.

## Fixed boundary

- One Human Owner, one Research Project, one approved Research Task, one writer.
- Pi Coding Agent's existing TUI is the shell; no SDK runtime or custom TUI.
- Files and validation are authoritative; a Pi Session is disposable context.
- Git is optional; permissions, budgets, and stopping conditions are currently
  procedural and review-based rather than mechanically enforced.
- Markdown and the project's existing Python validation are sufficient.

Tracked historical launcher and SDK phase prompts were removed from the
worktree to reduce context and remain recoverable from Git for audit. The
uncommitted Phase 01 tutorial is not recoverable. Never execute restored
history as a substitute for E21.
