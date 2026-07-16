# Execution Loop

The loop that keeps the map alive once territory work starts. A beautiful map
abandoned two days into implementation is the failure mode this reference
exists to prevent.

## The loop

1. **Take an edge.** The human or the map session picks a `ready` edge and
   starts a fresh session with its prompt file. Edge → `running`, target
   waypoint → `in-progress`.
2. **Execute and self-verify.** The executing agent does the work, runs the
   target waypoint's `acceptance` itself, and writes back: waypoint →
   `delivered` with `agent_verdict` (pass/fail + one line) and `evidence`
   (commands, outputs, artifact paths). Edge → `done`.
3. **Human verification.** The human runs the same `acceptance` check
   personally and records `human_verdict`; waypoint → `verified` — a
   transition only the human may make. If the human wants to understand what
   they just verified, generate the tutorial now (artifact-grounded teaching
   via `human-cognition-cache`) and record the cognition growth.
4. **Calibrate.** Append the agent-vs-human agreement to the calibration
   ledger. When a waypoint type shows sustained agreement, the human may
   explicitly downgrade that type to `spot-check`; the agent never downgrades
   on its own.

## Deviation tiers

When the territory contradicts the map mid-edge:

- **Executive deviation** — another implementation route still reaches the
  same waypoint state: take the conservative detour, log one dated line under
  the edge's `deviations`, continue.
- **Directional deviation** — the waypoint or edge itself is wrong: the state
  is unreachable, the transition logic is false, or the tech stack cannot do
  it. Stop executing. Log what was found, report back, and let the map session
  redraw before any further territory work. Mark casualties `dead` with a
  `post-mortem` — the death record is the human's learning; keep it.

## Disagreement rule

If `human_verdict` contradicts `agent_verdict`, the waypoint returns to
`in-progress`, the disagreement is logged in the calibration ledger, and the
acceptance check itself is reviewed — a check two parties read differently is
underspecified.
