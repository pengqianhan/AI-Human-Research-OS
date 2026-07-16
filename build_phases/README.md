# `research-os` Build Phases

This directory contains copy-ready implementation prompts for building the thin
pi launcher agreed in the 2026-07-16 grilling session. Send each phase to a code
agent in order, preferably in a fresh session.

## Execution order

1. [Phase 01 — Governance alignment](phase-01-governance.md)
2. [Phase 02 — Thin launcher implementation](phase-02-launcher.md)
3. [Phase 03 — Offline smoke tests](phase-03-smoke-tests.md)
4. [Phase 04 — Documentation and final verification](phase-04-documentation-and-verification.md)

Each phase is independently grounded in repository files, has an explicit
completion bar, and must create a Chinese HTML tutorial after the work passes.
The tutorials are expected at:

- `build_phases/phase-01-governance-tutorial.html`
- `build_phases/phase-02-launcher-tutorial.html`
- `build_phases/phase-03-smoke-tests-tutorial.html`
- `build_phases/phase-04-final-tutorial.html`

The tutorial reader knows Python but is new to shell and TypeScript. Every local
file link in a tutorial must be a real relative link from `build_phases/`, such
as `<a href="../bin/research-os">bin/research-os</a>`, and the phase agent must
validate that each linked local target exists.

## Scope boundary

These phases build only the repo-local, read-only `bin/research-os` launcher.
They do not build a workflow CLI, pi extension, SDK integration, local server,
GUI execution surface, Electron/Tauri package, database, telemetry, or sandbox.
The existing `os-ui` remains read-only.
