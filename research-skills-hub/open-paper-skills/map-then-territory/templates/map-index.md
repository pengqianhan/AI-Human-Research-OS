---
map: <slug>
territory: <path or one-line description of where the work happens>
status: drafting
created: <YYYY-MM-DD>
---

# Map: <title>

**Start:** <what exists now>
**Destination:** <what must become true>

## Idea ledger

| ID | Idea (verbatim) | Disposition |
| --- | --- | --- |
| I1 | <preserve the human's original wording> | unresolved |

## Overview

```mermaid
flowchart LR
  classDef proposed fill:#eeeeee,stroke:#999999,color:#333333
  classDef approved fill:#e3f2fd,stroke:#1e88e5
  classDef inprogress fill:#fff8e1,stroke:#f9a825
  classDef delivered fill:#f3e5f5,stroke:#8e24aa
  classDef verified fill:#e8f5e9,stroke:#2e7d32
  classDef dead fill:#fafafa,stroke:#bdbdbd,color:#9e9e9e,stroke-dasharray:4 4
  N0["N0: <start>"]:::verified --> N1["N1: <waypoint>"]:::proposed
  N1 --> N2["N2: <destination>"]:::proposed
```

## Waypoints

### N0 — <start state title>
- state: <what is already true>
- acceptance: <how the human confirmed it>
- type: executive
- status: verified

### N1 — <state title>
- state:
- acceptance:
- type: directional | executive
- status: proposed
- tutorial:
- agent_verdict:
- human_verdict:
- evidence:

### N2 — <destination state title>
- state:
- acceptance:
- type: directional | executive
- status: proposed
- tutorial:
- agent_verdict:
- human_verdict:
- evidence:

## Edges

### E1 — N0 → N1
- action:
- transition_logic:
- prompt:
- status: drafted
- deviations:

### E2 — N1 → N2
- action:
- transition_logic:
- prompt:
- status: drafted
- deviations:

## Calibration ledger

| type | checks compared | agreements | delegation |
| --- | --- | --- | --- |
| directional | 0 | 0 | human-verifies-all |
| executive | 0 | 0 | human-verifies-all |
