Execute this task in the current workspace. Inspect verified prior artifacts,
implement this bounded slice, validate it, and create every required artifact.
Do not begin Phase 04.

# Phase 03 — Own the Run Contract and durable file state

## Outcome

Give Research OS—not Pi—durable authority over one Research Task and one Run.
Implement a validated draft → approved immutable Run Contract flow and an
atomic, Git-independent file store rooted at workspace `.research-os/`.

## Prerequisite gate

Read `INSTRUCTION.md`, `CONTEXT.md` domain terms, the ADR, the build-phase
README, Phases 01–02 and their final runtime docs. Run `git status --short` and
all current `os-runtime` typechecks/tests. Confirm both prior Human Owner
verdicts. If either is missing or tests fail, return `Status: blocked`.

## Required work and artifacts

- Add domain types and runtime validation for Project reference, Research Task,
  Run Contract, Run status, validation declarations, budget/step/timeout limits,
  writable roots, readable roots, allowed tools, stop conditions, and required
  review artifacts. Static TypeScript types alone are not input validation.
- Define the control layout in `os-runtime/docs/state-layout.md`:
  `.research-os/projects/<project-id>/tasks/` and
  `.research-os/runs/<run-id>/` containing contract, status, audit, events,
  checkpoints, and review artifacts. Runtime cache may be disposable, but
  contract/status/audit/checkpoints/review are authoritative files.
- Implement root/project discovery from a caller-provided workspace path.
  Reject paths outside the workspace and duplicate active writers.
- Draft contracts are editable. Approval writes canonical JSON, a content
  hash, Human Owner approval timestamp, and status atomically. Any later
  mutation must fail and leave the approved file unchanged.
- Append Audit Events as JSONL with stable IDs, timestamps, actor, action,
  target, outcome, and evidence references. An event is not a transcript.
- Use injected clock/ID/hash/filesystem seams where needed for deterministic
  tests. Tests must use temporary workspaces and require neither Git nor Pi.
- Add schema examples as test fixtures, not live project state. Document
  migration/version fields and honest recovery behavior for truncated writes.
- Update `os-runtime/README.md` and create the Chinese grounded tutorial
  `os-build/build_phases/tutorials/phase-03-run-contract-state.md`, comparing
  runtime validation with Python dataclasses/Pydantic and atomic writes with
  write-temp-plus-rename.

## Authority and scope

You may edit Phase 03 code/docs/tests. Do not create live root `.research-os/`
state, modify Example_Project, call a model, implement path enforcement,
execute validation commands, build a loop/TUI, require Git, or add a database.
Do not stage, commit, or push.

## Verification and completion bar

Run typecheck and offline tests for valid/invalid contracts, canonical hash,
post-approval mutation rejection, atomic replacement failure, audit append,
no-Git operation, duplicate writer rejection, and corrupted-state handling.
Run `git diff --check` and `./verify.sh`; audit local tutorial links.

## Human learning checkpoint

Leave the phase `delivered`. The Human Owner must explain why TypeScript types
do not validate JSON at runtime, approve a fixture, observe its hash, add one
invalid fixture case, and rerun the focused test.

## Stop and final response

If prior phases or a safe atomic-write primitive are missing, report
`blocked` with evidence. Otherwise report artifacts, exact checks, state
layout, durability limits, tutorial, and next phase
`phase-04-policy-validation.md` without starting it.
