---
status: accepted
---

# Build the root agent as a skill over os-harness

GOAL.md H2 (adopted 2026-09-26) asks for one root agent that the Human Owner talks
to at the Research Workspace root, which hands Research Tasks to agents inside
projects and reports from project files.

The root agent is therefore not a new program. It is any code agent session
opened at the repository root that follows the
[`project-dispatch`](../../research-skills-hub/open-paper-skills/project-dispatch/SKILL.md)
skill. That skill has the root agent do five things:

- brief a task from a template;
- dispatch it with `os-harness run --detach`;
- track it with `os-harness sessions` and `show`;
- verify the result itself;
- leave acceptance to the Human Owner.

[`os-harness`](../../os-harness/README.md) gained what this needs:

- **Background turns.** `--detach` starts a worker that lives only for one
  turn. On Windows it leaves the caller's job object and opens no console
  windows.
- **Session status.** Each session reads as `running`, `ok`, `failed`, or
  `stopped`. A turn's prompt record carries the worker's process id, so a
  worker that died mid-turn shows as `stopped`.
- **`stop`.** Ends a running turn together with its CLI process.

## Considered options

- **A dedicated root-agent loop**, calling a model through the harness with its
  own tools. It would duplicate what Claude Code and Codex already do well:
  chat, tool use, and reading files.
- **Harness-specific background features**, such as Claude Code's background
  shell. These were rejected: the OS stays usable from any agent
  (human-cognition entry cog-20260724-001), and Codex has no equivalent.
- **Task contract files** (`Tasks/<id>/`) for every dispatch. These were
  deferred. The brief travels in the dispatch prompt. The durable record is the
  project's Progress Log and README, written by the project agent. Session
  traces stay local and ignored by Git.

## Consequences

- **Write Lease.** Each project has at most one running session. The root agent
  checks this before dispatching, and `resume` refuses a running session.
- **Who accepts.** The root agent verifies the run's validation commands itself
  before reporting. Acceptance stays with the Human Owner.
- **Out of scope.** Unattended queueing and parallel scheduling remain behind
  the GOAL.md M4 gate.
