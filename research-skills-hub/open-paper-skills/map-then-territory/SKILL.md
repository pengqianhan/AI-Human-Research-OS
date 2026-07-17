---
name: map-then-territory
description: Map scattered ideas into a human-approved DAG of verifiable states, then drive fresh agents through it edge by edge. Use when the user has a destination or idea fragments but lacks the domain knowledge to identify or sequence the route; when revising a map bundle; when compiling approved edges into launch prompts; or when recording execution evidence, deviations, and human verification.
---

# Map Then Territory

Turn human intent into a map before changing the territory. The human owns the
intent, values, directional choices, and final verification. The agent surveys
the unfamiliar domain, preserves the human's idea fragments, proposes the
missing points and lines, and executes approved lines. A point is ready only
when the human can verify it without understanding the implementation.

## Core model

- **Idea fragment** — the human's original input, preserved verbatim until the
  map records its disposition.
- **Waypoint** — a verifiable state of the world, phrased as what is true rather
  than work to perform. A
  **directional** waypoint can redraw the route and requires an informed human
  choice before execution; an **executive** waypoint allows any implementation
  that passes its human-runnable acceptance check.
- **Edge** — one clean agent session of action, with transition logic explaining
  why it moves the territory from one waypoint to another.
- **Map** — the human-approved Markdown and Mermaid DAG; its `index.md` is the
  single source of route state.
- **Territory** — the repository, documents, or environment changed by agents
  traversing approved edges.

## Branches

- **Mapping ideas or revising a route** → read
  [references/map-schema.md](references/map-schema.md) before editing.
- **Compiling an edge prompt** → read
  [references/edge-prompt-assembly.md](references/edge-prompt-assembly.md)
  before assembling.
- **Traversing an edge or writing back its result** → read
  [references/execution-loop.md](references/execution-loop.md) before changing
  territory or route state.

For an existing bundle, enter at the requested branch and treat completed
earlier steps as repository evidence. Treat each branch as one session arc:
mapping ends with an approved map, compilation ends with ready prompts, and
traversal ends with one edge's write-back or one human verdict.

## Map

### 1. Capture intent and survey the territory

Establish the territory, known start, desired destination, and every idea
fragment the human supplies. Preserve each fragment verbatim in the idea ledger
before interpreting it. Treat the destination as provisional until the human
confirms that it describes success. Survey the relevant code, documents, and
prior art; answer from territory evidence before asking the human. Use
`grilling` one question at a time for intent, preferences, or directional
ambiguity that evidence cannot resolve.

Complete when the draft map names the territory, start, and destination; every
supplied fragment has a stable ledger row; and the evidence needed to propose a
route is gathered or its absence is explicit.

### 2. Draw and approve the route

Convert the idea ledger and survey evidence into a trunk route. Propose the
missing waypoints as well as the edges between them, including both when the
human supplies only fragments. Give every ledger row a disposition to the
destination, one or more waypoint or edge IDs, or a human-approved out-of-scope
rationale.

For each directional waypoint, present two or three contrasting options with
real trade-offs and a recommended default, then resolve them one at a time with
`grilling`. When the human lacks the concepts needed to choose, teach from
territory evidence in `tutorials/` via `human-cognition-cache` before asking.

Complete when every idea has a final disposition; every waypoint has a state,
human-runnable acceptance check, type, and status; every edge has an action and
transition logic; every in-scope waypoint lies on a coherent route; the DAG
contains a complete start-to-destination trunk; and the human approves the
route. Record approval as bundle status `approved`, then end the mapping arc.

## Territory

### 3. Compile ready edges

For the requested approved edge—or each currently reachable edge when the user
requests a batch—assemble a provenance-annotated prompt with
`writing-great-prompt` according to
[references/edge-prompt-assembly.md](references/edge-prompt-assembly.md).

Complete when every requested edge has a prompt under `prompts/` that a fresh
session can execute without the authoring conversation, and each prompt is
`ready` after any required human review. End the compilation arc before
territory execution.

### 4. Traverse, verify, and learn

Run one edge through [references/execution-loop.md](references/execution-loop.md).
Let the executing agent self-verify and write evidence; reserve `verified` for
the human's acceptance run. Pre-teach directional choices and offer executive
explanation after delivery on demand; record delivered cognition growth through
`human-cognition-cache`.

Complete the execution arc when the selected edge reaches `done` and its target
is `delivered`, or when it returns to `ready` with the blocker or deviation
recorded. Complete a human-verdict arc when the verdict, resulting statuses, and
calibration entry agree. Repeat through fresh sessions until the destination is
`verified` or the map is explicitly `paused` or `abandoned` with its record.

## Boundaries

- Write map, tutorial, and prompt prose in the human's working language; keep
  field names and statuses in English for stable tooling.
- Keep dead waypoints, deviations, and post-mortems: map history is cognition
  history.
- Before publishing a bundle, warn that tutorials and post-mortems can expose
  the human's cognition state.

_Original, Pengqian Han. Inspired by Thariq Shihipar's "A Field Guide to Claude
Fable 5: Finding Your Unknowns" (the map–territory framing)._
