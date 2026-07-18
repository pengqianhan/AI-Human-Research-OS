Execute this task in the current workspace. Inspect verified prior artifacts,
implement this bounded slice, validate it, and create every required artifact.
Do not begin Phase 06.

# Phase 05 — Run the autonomous loop with checkpoints and review

## Outcome

Implement the Research OS state machine and prove the complete autonomous loop
offline with `FakeAgentBackend`: plan → one bounded step → validate →
checkpoint → continue/adjust/pause/stop/review. A Run can never accept itself.

## Prerequisite gate

Read `INSTRUCTION.md`, `CONTEXT.md`, the ADR, build-phase README, Phases 01–04,
runtime state/policy docs, and final tests. Run `git status --short`, typecheck,
and the full offline suite. Confirm all prior Human Owner verdicts. If guarded
steps or validation are not proven, return `Status: blocked`.

## Required work and artifacts

- Implement explicit Run states and legal transitions, including ready,
  active, pausing, paused, stopping, stopped, review, failed, and blocked.
  `accepted` is a human-only domain transition outside the autonomous loop.
- Acquire one write lease before active execution and release it on every
  terminal/error path. Startup must detect an abandoned lease and require an
  explicit recovery decision rather than silently running twice.
- Each loop iteration asks the backend for one bounded step, applies only
  guarded tools, runs declared validation, appends Audit Events, and writes a
  Research Checkpoint before deciding the next transition.
- Enforce frozen max steps, wall time, validation failure limit, and available
  model-usage/cost signals. If the backend cannot provide exact cost, record
  `unknown`; never fabricate it. Stop at the first hard limit.
- Pause/stop must propagate abort to the backend, wait a bounded time, persist
  the final checkpoint/status, and remain resumable from Research OS files
  rather than transcript memory.
- A checkpoint records contract hash, step number, state, plan summary,
  changed-path hashes/diffs, validation evidence, remaining limits, backend
  session reference, and the next safe action.
- Terminal review produces machine-readable `review.json` and human-readable
  `review.md` with outcome, artifacts, validations, changes, unresolved risks,
  claims requiring human judgment, and recovery information. Never
  auto-accept or auto-publish.
- Add crash/failure injection tests with a scripted fake backend and temporary
  no-Git workspaces. Add optional Git enrichment only behind detection and
  interfaces; the no-Git suite is the completion path.
- Update docs and create the grounded Chinese tutorial
  `os-build/build_phases/tutorials/phase-05-checkpoint-loop.md`. Compare the
  loop with a PyTorch training loop, checkpoints, early stopping, and resume.

## Authority and scope

You may edit Phase 05 code/docs/tests. Do not call a live model, create live
workspace state, modify a project, implement TUI/server/GUI, add parallel Runs,
require Git, accept claims, or publish. Do not stage, commit, or push.

## Verification and completion bar

Run typecheck and offline integration tests for successful review, validation
retry then recovery, hard failure, every budget stop, pause, stop, abort
timeout, crash between write/checkpoint, abandoned lease, resume, no-Git diff
and before-image recovery, and attempted automatic acceptance rejection. Run
the full suite twice to detect leaked state, then `git diff --check` and
`./verify.sh`.

## Human learning checkpoint

Leave the phase `delivered`. The Human Owner must trace one fixture as a
PyTorch-style training loop, identify the recovery source after a simulated
crash, change one bounded fake-run default such as `maxSteps`, and rerun the
affected tests.

## Stop and final response

If a terminal path can lose status/lease/checkpoint or reach acceptance,
return `Status: blocked`. Otherwise report artifacts, exact checks, recovery
limits, tutorial, and next phase `phase-06-minimal-tui.md` without starting it.
