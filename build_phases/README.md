# Research OS MVP Build Phases

> **Status: redesign required — do not execute the current phase prompts.**
>
> `Research OS MVP` now means the smallest end-to-end system that accepts partial
> research state, places and understands it, continues bounded research, produces
> traceable artifacts, and returns control to the human. The four current prompts
> cover only the native-pi launcher bootstrap slice and are not a complete MVP plan.
> They will be replaced after the MVP autonomy and acceptance boundaries are confirmed.

This directory is the execution-contract layer for building the Research OS MVP.
Each final phase must be directly executable by a code agent in a fresh session.

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

## Current gap

The existing launcher phases remain useful evidence for one bootstrap slice, but they
omit the MVP's intake, project continuation, research tools, evaluation, experience
promotion, bounded autonomy, and human handoff. Do not treat successful launcher
construction as successful Research OS MVP delivery.
