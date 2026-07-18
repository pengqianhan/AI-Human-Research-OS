Execute this task in the current workspace. Inspect the evidence, implement the
bounded slice, validate it, and create every required artifact. Do not stop at
a plan and do not begin Phase 02.

# Phase 01 — Run one observable Pi SDK Agent Session

## Outcome

Create `os-runtime/` as the smallest TypeScript package that imports
`@earendil-works/pi-coding-agent`, starts an in-memory `AgentSession`, records
typed lifecycle events, sends one prompt, exits cleanly, and can abort. This is
an SDK application, not a Pi CLI wrapper.

## Prerequisite and environment gate

Read `INSTRUCTION.md`, `CONTEXT.md`, `docs/adr/0001-pi-sdk-autonomous-mvp.md`,
`os-build/build_phases/README.md`, and the current official
[SDK guide](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
plus [package metadata](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/package.json).
Run `git status --short --branch`, `node --version`, and `npm --version`.

Record the current upstream package version and Node engine requirement. If
Node does not satisfy it, return `Status: blocked` with the exact probe. If
dependencies are absent, request approval before the networked `npm install`;
pin the resolved versions in `package-lock.json`. Before any live model call,
confirm the Human Owner authorizes credential use and the small external cost.
Never print or persist credentials. Offline package/type/test work may proceed
before that gate, but the phase is not complete without one authorized live
session.

## Required work and artifacts

- Create `os-runtime/package.json`, `package-lock.json`, `tsconfig.json`,
  `index.md`, `README.md`, `src/pi/hello.ts`, and focused tests under
  `os-runtime/test/`.
- Use ESM, strict TypeScript, the Node built-in test runner, and the smallest
  runner needed for `.ts` development. Avoid a framework or monorepo.
- Use the current documented SDK factory and an in-memory session manager.
  Subscribe before prompting; normalize at least agent start/end, text delta,
  tool start/end, and error/abort observations into a simple local display.
- Dispose/unsubscribe in `finally`; handle SIGINT by aborting the session and
  returning a truthful nonzero/interrupted status.
- Add scripts for typecheck, offline test, and the gated live hello. The live
  prompt must be short and read-only; do not expose write or shell tools.
- Document setup, exact commands, package version, model/auth prerequisites,
  outputs, failure paths, and the fact that a session is not Research OS
  domain state.
- Create `os-build/build_phases/tutorials/phase-01-pi-sdk-session.md` in
  Chinese, grounded in final code. Explain TypeScript types, `async/await`,
  event subscription, `try/finally`, and abort using Python/PyTorch analogies.

## Authority and scope

You may create the Phase 01 artifacts, install only necessary local npm
dependencies after approval, and make read-only live model calls after the
separate cost/credential gate. Do not create `.research-os/`, a backend
interface, custom write tools, domain state, TUI, server, GUI, or modify a
research project. Do not stage, commit, push, or alter global Pi settings.

## Verification and completion bar

Run the package's typecheck and offline tests, then the authorized live hello.
The live evidence must show one SDK-created session, event flow, completion,
and clean disposal without invoking a `pi` executable. Run `git diff --check`
and `./verify.sh`. Report exact commands and passed/failed/blocked/unrun state.

## Human learning checkpoint

Leave the slice `delivered`, not human-verified. The Human Owner must run the
hello, explain `prompt → event stream → completion` using a Python generator or
PyTorch callback analogy, change one user-visible event label, and rerun the
offline test. Record only the human's explicit verdict.

## Stop and final response

If Node, install approval, auth, model availability, or live-call approval is
missing, preserve safe work and return `Status: blocked` with the smallest next
probe. Otherwise report status, files, package/API version, exact checks, live
call cost caveat, tutorial path, and next phase
`phase-02-backend-events-tools.md` without starting it.
