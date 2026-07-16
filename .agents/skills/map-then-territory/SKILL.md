---
name: map-then-territory
description: Draw and maintain a directed route map — waypoints as human-verifiable states, edges carrying transition logic — from a known start to a desired destination, then drive agents through the territory edge by edge. Use when (1) the user knows the start and destination of an endeavor but cannot draw the path between them, or asks to create or revise a map bundle (maps/<slug>/ or a project's map/); (2) turning an approved map into per-edge launch prompts; (3) writing execution results, deviations, or verification verdicts back into a map.
---

# Map Then Territory

The map is the human's representation of the work to be done; the territory is where the work actually happens. This skill serves the human who knows the start and the destination but — because the route crosses tech stacks they do not know — cannot draw the directed lines between them. Division of labor: **the human owns the points, the agent owns the lines**, and every line must end at a state the human can verify without understanding the implementation.

## Contract

Scope:
- Survey a territory and co-draw a route map: a DAG of verifiable-state waypoints joined by edges that carry transition logic.
- Assemble each approved edge into a launch prompt a fresh session can run.
- Keep the map alive during execution: write-backs, tiered deviations, dual verification, and trust calibration.
- Grow the human's cognition along the way: pre-teach directional choices, post-teach executive ones on demand.

Inputs:
- The human's start, destination, and any waypoints they can already name.
- The territory: the codebase, documents, or environment where the work must happen.
- The existing map bundle when revising, prompting, or writing back.

Outputs:
- A map bundle at the territory root — `index.md` (Mermaid overview plus waypoint and edge ledgers), `tutorials/`, `prompts/` — per [references/map-schema.md](references/map-schema.md).
- One provenance-annotated launch prompt per assembled edge.
- Execution records: evidence, `agent_verdict`/`human_verdict` pairs, deviations, post-mortems, and a calibration ledger.

Limitations:
- Not for trivial or single-session tasks with an obvious path — do those directly.
- A waypoint whose acceptance check the human cannot run is not thought through; split or rework it rather than weaken the check.
- Requires the `grilling`, `human-cognition-cache`, and `writing-great-prompt` skills.

## Core Model

- **Waypoint** — a verifiable state of the world ("paper-wiki exists: the agent can store, retrieve, and classify papers; the human can read them"), never a task. Each carries an **acceptance check** the human can run without knowing the tech stack, and a type:
  - **directional** — choosing wrong redraws the map (architecture, irreversible moves, taste). Requires an informed human choice, pre-taught.
  - **executive** — any competent implementation that passes the check is fine. Agent-autonomous.
- **Edge** — the action that moves the territory from one waypoint to another, carrying its **transition logic** (why this action reaches that state) and sized to one clean agent session.
- **Map** — a Markdown + Mermaid DAG bundle, the single source of truth. Any rendered HTML view is generated and disposable.

## Branches

- **Drawing or revising a map** → read [references/map-schema.md](references/map-schema.md) before editing.
- **Assembling edge prompts** → read [references/edge-prompt-assembly.md](references/edge-prompt-assembly.md) first.
- **Execution write-back and verification** → read [references/execution-loop.md](references/execution-loop.md) first.

Load only the reference the active branch reaches.

## Steps

### 1. Survey before drawing

Elicit the start (what exists now), the destination (what must become true), and every waypoint the human can already name — record them verbatim before improving them. Then survey the territory: read the relevant code, documents, and prior art the route must cross. Complete when the start, destination, and known waypoints are written down and the territory evidence needed to propose a route has been gathered — without asking the human anything the territory can answer.

### 2. Propose the trunk map

Propose one trunk map: the missing waypoints and directed edges, each edge with its transition logic. At every **directional** waypoint, present 2–3 contrasting options with real trade-offs — never silently pick one — and resolve them one at a time using `grilling`'s single-question format (question, why it matters, evidence, recommended default). Where the human cannot yet make an informed choice, write a tutorial into `tutorials/` (artifact-grounded teaching via `human-cognition-cache`) before asking them to choose. Escalate to multiple full candidate maps only when the survey shows the whole approach is contested, and declare why.

Complete when every waypoint has a state description, an acceptance check the human confirmed they can run, a type, and a status; every edge has transition logic; and the human has approved the map — record that as bundle status `approved`.

### 3. Assemble edge prompts

For each edge on the approved map whose source waypoint is `verified` (or is the start), assemble a launch prompt with `writing-great-prompt`, annotating every section with the map field that produced it, per [references/edge-prompt-assembly.md](references/edge-prompt-assembly.md). Complete when each such edge has a prompt file under `prompts/` that a fresh session can execute without access to this conversation, and — after human review for edges into directional waypoints — is marked `ready`.

### 4. Drive the territory, keep the map alive

Run the loop of [references/execution-loop.md](references/execution-loop.md): launch `ready` edges into fresh sessions, collect write-backs and dual verdicts, and redraw when the territory contradicts a directional choice. Complete when the destination waypoint is `verified`, or the map has been consciously redrawn or set to `paused`/`abandoned` with its record — an abandoned map with no record is the only failure state.

### 5. Grow the human

At verification time, offer the executive-tier tutorial on demand; record evidence-backed cognition growth through `human-cognition-cache`. Complete when every directional choice the human made has an evidence-backed cognition entry recorded via `human-cognition-cache`, and every executive tutorial offered at verification was either delivered into `tutorials/` or explicitly declined.

## Boundaries

- Write map, tutorial, and prompt content in the human's working language; keep field names and statuses in English so tooling stays stable.
- `verified` is a human-only transition; the agent never flips it.
- Map history is cognition history: keep dead waypoints, deviations, and post-mortems in the map — they record what the human learned.
- Before publishing a map bundle outside the repository, warn that tutorials and post-mortems expose the human's cognition state.

_Original, Pengqian Han. Inspired by Thariq Shihipar's "A Field Guide to Claude Fable 5: Finding Your Unknowns" (the map–territory framing)._
