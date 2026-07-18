---
status: accepted
---

# Use Pi Coding Agent as the workflow MVP shell

The Human Owner successfully ran the first embedded Pi Agent SDK session, but
the next learning step exposed a sequencing problem: learning TypeScript,
debugging an event-driven SDK, and designing the Research OS workflow at the
same time is too steep before the workflow itself has been proven useful.

The active MVP will therefore use the existing Pi Coding Agent interactive TUI
as its operator and agent shell. The Human Owner opens Pi at the Research
Workspace root, selects one Research Project and one bounded Research Task,
approves a file-based Run Contract, keeps the terminal open while Pi works,
and reviews the declared validations, Research Checkpoint, and Review Package.
Research OS files—not the Pi session or transcript—remain authoritative and
must be sufficient for a later human or agent to continue the work.

## Considered options

- Continue the embedded SDK route now: technically viable, as Phase 01 proved,
  but couples early product discovery to TypeScript and runtime engineering.
- Use Pi Coding Agent now: selected because its existing TUI, sessions, tools,
  workspace instructions, and skills are enough to test the file workflow
  without first building another agent shell.
- Return to an agent-neutral prompt-only design: smaller, but discards the
  concrete Pi operator experience that the MVP is meant to test.

## Consequences

- The current proof is a **Pi-assisted, human-supervised workflow**, not a
  custom autonomous Research OS runtime. The terminal remains open and the
  Human Owner can observe, interrupt, or take over.
- Scope stays at one Human Owner, one Research Project, one Research Task, and
  one active writer. Git remains an optional version-control enhancement.
- Run boundaries are expressed in files and reviewed after execution. The MVP
  does not claim deterministic tool permissions, budget enforcement, daemon
  recovery, proactive multi-session scheduling, or unattended continuation
  after Pi exits.
- The Human Owner successfully exercised the Phase 01 SDK spike, then deleted
  the uncommitted `os-runtime/` implementation and dependencies so they do not
  compete with the active route. Historical decision and outcome notes remain;
  SDK Phases 02–07, the custom TUI, and `PiAgentBackend` are deferred.
- The SDK route may reopen after the workflow MVP reveals a concrete need for
  hard policy enforcement, a custom TUI, durable unattended execution, or a
  workspace-level session manager. That requires a new Human Owner decision.
