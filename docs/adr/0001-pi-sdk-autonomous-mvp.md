---
status: superseded by ADR-0002
---

# Use Pi Agent SDK for the autonomous Research OS MVP

> Superseded on 2026-07-19 by
> [ADR-0002](0002-pi-coding-agent-workflow-mvp.md). Phase 01 was successfully
> exercised, but its uncommitted `os-runtime/` implementation was intentionally
> deleted to keep the active route clear. This is historical context only.

The 2026-07-17 MVP route selected a pure session protocol with zero new runtime machinery and deferred Pi SDK execution until after the file-native loop had been proven. On 2026-07-18 the Human Owner explicitly reopened that directional choice: the product to prove is a root-level Research Workspace that can run one bounded, unattended research task inside one selected project. The MVP will therefore embed `@earendil-works/pi-coding-agent` behind a replaceable `PiAgentBackend` and expose a minimal local TUI. Research Project, Task, Claim, Evidence, Artifact, Audit Event, Run Contract, validation, checkpoint, and review state remain owned by Research OS files rather than by an Agent Session.

## Considered options

- Pure session protocol: smallest mechanism, but cannot itself run the approved autonomous loop.
- Pi CLI subprocess/RPC: preserves process isolation, but makes Research OS parse and control an external product rather than learn and own its runtime boundary.
- Embedded Pi Agent SDK: selected because it exposes Agent Sessions, events, tools, and lifecycle control in-process while allowing the Research OS domain to stay behind an Agent Backend seam.

## Consequences

- v1 is Pi-backed at runtime, not multi-backend; Codex and Claude Code remain valid builders and file-native participants.
- The first proof uses `projects-folder/Example_Project/`, one approved Research Task, one immutable Run Contract, and one Autonomous Research Run at a time.
- The TUI, domain core, and Pi backend run in one local Node.js process; no daemon, server, database, account system, remote access, or GUI execution surface belongs to this MVP.
- The selected project is writable; shared Paper Wiki, Memory, Ideas, Skill Hub, and other projects are read-only; proposed global contributions go to inbox for human review.
- Git is optional enhancement. Without Git, Research OS still records Audit Events, Checkpoints, hashes, text diffs, and limited recoverable before-images; it does not implement a general-purpose VCS.
- The old N4 waypoint and its incoming route remain in `os-build/map/index.md` as dead history rather than being erased.
