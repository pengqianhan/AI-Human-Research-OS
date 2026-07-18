Execute this task in the current workspace. Inspect verified prior artifacts,
implement this bounded slice, validate it, and create every required artifact.
Do not begin Phase 07.

# Phase 06 — Add the minimal root-level TUI

## Outcome

Create a local terminal control surface that lets the Human Owner select one
project/task, inspect and approve an immutable Run Contract, start one Run,
observe summarized progress, pause/stop it, and inspect checkpoints and the
Review Package without reading the Agent Session transcript.

## Prerequisite gate

Read `INSTRUCTION.md`, `CONTEXT.md`, the ADR, build-phase README, Phases 01–05,
runtime operational docs, and current tests. Run `git status --short`,
typecheck, and the offline suite. Confirm every prior Human Owner verdict. If
the autonomous loop is not independently usable through a programmatic API,
return `Status: blocked`; do not hide missing domain behavior in UI code.

## Required work and artifacts

- Implement the smallest TUI with Node terminal primitives unless an already
  installed dependency is demonstrably simpler. Keep UI, application command,
  domain, and backend layers separable. Do not reuse the existing browser
  `os-ui/` execution surface.
- Start from the Research Workspace root and discover projects under
  `projects-folder/`. MVP may permit only one selected project and one draft
  task at a time, but must not hard-code Example_Project into domain code.
- Provide screens/states for preflight, project/task selection, contract
  summary, explicit approval, running summary, pause/stop confirmation,
  checkpoint list/detail, and review detail. Display write/read boundaries,
  limits, validation commands, Git availability, and native-permission warning
  before approval.
- Approval must call the same contract service tested in Phase 03; controls
  must call the Phase 05 command API. UI state is a projection, never a second
  source of truth.
- Summarize normalized events and validation results; transcript/thinking is
  not required for acceptance. Redact values classified as credentials.
- Closing the TUI must request pause/stop, persist a checkpoint, release or
  truthfully preserve the lease, and exit. No background daemon survives.
- Add scripted input/output tests using fake backend and temporary workspace,
  including narrow terminal width and interrupted input. Add `npm` run scripts
  and an operational section to `os-runtime/README.md`.
- Create the grounded Chinese tutorial
  `os-build/build_phases/tutorials/phase-06-minimal-tui.md`. Trace one keypress
  through application command to file-state change, comparing it with a
  Python CLI controller calling pure functions.

## Authority and scope

You may edit Phase 06 code/docs/tests and run the fake-backed TUI locally. Do
not call a model, modify a real project, create a server, browser GUI, desktop
wrapper, account system, daemon, multi-project concurrency, or duplicate
domain rules in UI code. Do not stage, commit, or push.

## Verification and completion bar

Run typecheck, the full offline suite, scripted TUI flows for approve/run/review
and pause/resume/stop, close-during-run, denied second Run, missing/corrupt
state, no-Git preflight, and narrow rendering. Manually run the fake TUI and
inspect each required screen. Run `git diff --check` and `./verify.sh`; report
manual rendering as passed or unrun.

## Human learning checkpoint

Leave the phase `delivered`. The Human Owner must operate the fake TUI, trace
one input to an Audit Event/checkpoint, change one label or summary field, and
rerun its scripted test.

## Stop and final response

If UI closure can orphan an active writer or if approval bypasses the domain
service, return `Status: blocked`. Otherwise report screens, files, exact
checks, manual inspection, tutorial, and next phase
`phase-07-example-project-pilot.md` without starting it.
