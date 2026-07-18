Execute this task in the current workspace. Inspect verified prior artifacts,
implement this bounded slice, validate it, and create every required artifact.
Do not begin Phase 05.

# Phase 04 — Enforce write policy and validation boundaries

## Outcome

Make one bounded agent step safe enough to execute: Pi receives guarded
Research OS file/proposal tools rather than unrestricted shell/write tools,
and the host runs only validation commands frozen in the approved Run Contract.

## Prerequisite gate

Read `INSTRUCTION.md`, `CONTEXT.md`, the ADR, build-phase README, Phases 01–03,
`os-runtime/docs/state-layout.md`, and installed Pi tool APIs. Run current
typecheck/tests and confirm prior Human Owner verdicts. If the approved contract
store is not proven, return `Status: blocked`.

## Required work and artifacts

- Implement canonical real-path policy with symlink-aware containment. The
  selected project is writable; root Paper Wiki, Memory, Ideas, Skill Hub, and
  other projects are read-only. Only a dedicated proposal tool may append a
  new record to root inbox. Deny absolute escapes, `..`, symlink escapes,
  writes through read paths, overwrite of authoritative Run files, and a
  second writer.
- Give `PiAgentBackend` only custom guarded read/list/search, write/patch, and
  finish-step/propose-global capabilities needed by the slice. Disable Pi's
  unrestricted `bash`, `edit`, and `write` tools in unattended mode.
- Record every attempted mutation as an Audit Event, including deterministic
  denials. Use atomic writes and capture before/after hashes plus bounded text
  diff or recoverable before-image metadata.
- Implement Executable Validation as exact argv arrays, fixed cwd, explicit
  environment allowlist, timeout, output cap, and exit/result capture. Never
  interpolate a shell command string. Only commands frozen in the approved
  Run Contract may run.
- Implement Review Validation for declared file presence, hashes, structured
  result fields, and human-review checklist items. It must not pretend to
  establish scientific truth.
- Document the residual boundary honestly: a Human Owner-approved executable
  runs with the current user's host permissions; this MVP does not provide an
  OS/container sandbox. No arbitrary agent-generated command is allowed.
- Add temporary-workspace integration tests, update runtime docs, and create
  `os-build/build_phases/tutorials/phase-04-policy-validation.md` in Chinese.
  Explain capability security, path canonicalization, argv vs shell strings,
  and validation using Python `pathlib`, `subprocess.run`, and allowlist
  analogies.

## Authority and scope

You may edit Phase 04 code/docs/tests. Do not run a live model, create live
workspace state, modify a research project, add a container/sandbox, expose
arbitrary shell, build the autonomous scheduler/TUI, or claim protection
against a malicious approved executable. Do not stage, commit, or push.

## Verification and completion bar

Run typecheck and offline tests covering allowed project write, every path
escape class, shared-root denial, other-project denial, inbox append-only,
authoritative-state protection, second writer, exact-command allowlist,
timeout/nonzero/output cap, and both validation modes. Include a deterministic
attempted outside write through a guarded tool and prove no target changed.
Run `git diff --check` and `./verify.sh`.

## Human learning checkpoint

Leave the phase `delivered`. The Human Owner must explain why cwd alone is not
a permission boundary, add one path/symlink escape fixture, and rerun the
focused denial test.

## Stop and final response

If canonicalization, command freezing, or authoritative-state protection
cannot be proven, return `Status: blocked` and do not weaken the policy. Report
files, exact checks, enforced and residual boundaries, tutorial, and next
phase `phase-05-checkpoint-loop.md` without starting it.
