---
status: accepted
---

# Drive the Research OS through subscription-backed coding-agent CLIs

On 2026-09-26 the Human Owner chose a faster route to a working OS. The
Pi Coding Agent file-workflow MVP ([ADR-0002](0002-pi-coding-agent-workflow-mvp.md))
had stalled since July without a human-verified run.

The new route drives the OS with the Claude Code and Codex subscriptions the
Human Owner already pays for. It follows the adapter layering that alphaXiv
OpenResearch uses. Pi remains the intended long-term engine, but it is not on
the critical path.

The decision is implemented as [`os-harness/`](../../os-harness/README.md), a
small Python standard-library harness:

- **Claude Code.** One `claude --print --output-format stream-json` process
  per turn. The prompt goes in on stdin, and a later turn continues the
  conversation with `--resume`.
- **Codex.** One `codex app-server` process per turn, speaking JSON-RPC:
  `thread/start` or `thread/resume`, then `turn/start`, with
  `approvalPolicy: "never"`.
- **Shared layer.** One event vocabulary, three permission modes
  (`read-only`, `workspace`, `full`), and one JSONL trace per session.

## Considered options

- **Pi `/login` with a subscription.** This needs no adapter code. But Pi's
  own warning says that third-party use of a Claude subscription is billed as
  per-token extra usage. Pi also presents itself as Claude Code to make that
  login work.
- **Orca-style credential handling.** Orca reads and refreshes the CLIs'
  OAuth tokens itself. That carries the most terms-of-service risk, and a
  research OS does not need it.
- **Long-lived processes or a daemon, as in OpenResearch.** These give faster
  turns and mid-turn steering, but more machinery than a first working route
  needs.
- **Rust or TypeScript adapters.** Python fits the Human Owner's existing
  skills (see HANDOFF, human cognition).

## Consequences

- **What this supersedes.** ADR-0002 is superseded as the active route. So is
  the GOAL.md non-goal "no Codex/Claude runtime backend in the current MVP".
  GOAL.md was revised separately, on the Human Owner's approval (2026-09-26).
- **Where state lives.** Research OS files remain authoritative. Session traces
  are local working records, ignored by Git. They are not project state.
- **Billing.** Every turn runs on the CLI's own login. The harness removes
  `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` from the child environment,
  and records the auth source per turn.
- **Permissions differ by agent.**
  - Claude refuses shell commands outside `full` mode.
  - On Windows, Codex's sandboxed modes need its Windows sandbox to be ready.
    When it is not, the harness fails fast instead of stalling.
- **Next steps.** The root agent, parallel dispatch, and reflection over traces
  are the next steps. Each one waits for a Human Owner decision.
