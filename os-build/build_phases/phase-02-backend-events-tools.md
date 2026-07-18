Execute this task in the current workspace. Inspect Phase 01 evidence,
implement this bounded slice, validate it, and create every required artifact.
Do not begin Phase 03.

# Phase 02 — Isolate Pi behind a backend and bounded tool events

## Outcome

Introduce a provider-neutral `AgentBackend` contract and a Pi-backed
implementation that converts Pi session events into Research OS runtime
events, supports prompt and abort, and exposes only an explicit read-only tool
set. Domain code and tests must not import Pi types.

## Prerequisite gate

Read `INSTRUCTION.md`, the ADR, `os-build/build_phases/README.md`, Phase 01's
prompt/tutorial, and final `os-runtime/` files. Run `git status --short` and
Phase 01 typecheck/tests. Confirm its live SDK evidence and Human Owner verdict
are recorded. If not, return `Status: blocked` and point to Phase 01.

Re-check the installed package's type declarations and the current official
SDK event/tool documentation; installed code wins over remembered APIs.

## Required work and artifacts

- Add a minimal domain-neutral backend contract under
  `os-runtime/src/backend/` with session start, run/prompt, normalized event
  subscription, abort, and dispose behavior.
- Implement `PiAgentBackend` in a Pi-only module. Keep imports of
  `@earendil-works/pi-coding-agent` inside the adapter boundary.
- Normalize stable facts needed by later layers: backend session ID, timestamp,
  run/turn/message lifecycle, text delta, tool name/call ID, tool end/error,
  abort, and terminal outcome. Preserve unknown Pi events safely rather than
  crashing.
- Configure the live slice with only `read`, `grep`, `find`, and `ls`; do not
  expose Pi's `bash`, `edit`, or `write` tools. Prove the configured list in a
  test.
- Add a deterministic `FakeAgentBackend` for all later offline tests. It must
  replay scripted events, controlled failures, and abort without a model.
- Add an event recorder that writes JSONL only to a caller-provided temporary
  path; event logs are observational and never authoritative domain state.
- Update `os-runtime/README.md` with the seam, event vocabulary, live smoke
  command, and failure behavior.
- Create `os-build/build_phases/tutorials/phase-02-backend-events-tools.md` in
  Chinese. Use Python `Protocol`/adapter and callback analogies and trace one
  real Pi event into one normalized event.

## Authority and scope

You may edit only Phase 02-owned runtime/docs/tests and make one small,
read-only, approved live model smoke call if needed. Do not add write/shell
tools, Run Contract, persisted workspace state, autonomous loop, TUI, server,
or project changes. Do not stage, commit, push, or alter credentials/settings.

## Verification and completion bar

Run typecheck and offline tests proving adapter isolation, event ordering,
unknown-event tolerance, fake failure, abort, and exact read-only tools. Run a
gated live prompt that causes at least one read-only tool event and show the
normalized record. Run `git diff --check` and `./verify.sh`. No test may call a
model unless its name explicitly says live.

## Human learning checkpoint

Leave the phase `delivered`. The Human Owner must explain why an Agent Session
and an Agent Backend are not project state, trace one event through the
adapter, add one assertion to the unknown-event or abort test, and rerun it.

## Stop and final response

If Phase 01, installed API, or live-call authority is missing, report
`blocked`; never fake event evidence. Otherwise report files, exact checks,
tool list, live/offline boundary, tutorial, and next phase
`phase-03-run-contract-state.md` without starting it.
