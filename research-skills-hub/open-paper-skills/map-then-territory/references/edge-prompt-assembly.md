# Edge Prompt Assembly

How an approved edge becomes a launch prompt a fresh session can run.
Skeleton: [../templates/edge-prompt.md](../templates/edge-prompt.md).

## Field mapping

Assemble the prompt with the `writing-great-prompt` skill. The map supplies
the prompt contract's raw material — if a contract element has no map source,
the map is missing a field, not the prompt:

| Prompt-contract element | Map source |
| --- | --- |
| Outcome / destination | target waypoint `state` |
| Evidence to inspect | source waypoint `state` + `evidence`, territory paths from the survey |
| Route freedom and constraints | edge `action` + `transition_logic` (the *why* bounds the *how* loosely) |
| Verification and completion bar | target waypoint `acceptance`, plus the self-verification duty |
| Required artifacts and final response | write-back obligations (below) |
| Stop / fallback rules | deviation policy (below) |

## Provenance annotations

Mark every assembled section with the map field that produced it, as a
trailing HTML comment: `<!-- ← N7.acceptance -->`. The annotations teach the
human the map→prompt correspondence by example; keep them in the stored file —
they are inert when the prompt is pasted into a session.

## Packet requirements

A prompt file is complete only when a fresh session, with no access to the
authoring conversation, can:

1. Locate the map bundle — the repo-relative path to `index.md` is stated, and
   the packet says to read the source and target waypoint entries first.
2. Execute the edge within one session.
3. Self-verify against the target waypoint's `acceptance` and record
   `agent_verdict` plus `evidence` in the map.
4. Write back status per the execution-loop reference, including the tiered
   deviation policy.
5. Leave `verified` untouched — that transition belongs to the human.

## Review rule

Prompts for edges into **directional** waypoints go to the human for review
before launch. Prompts into **executive** waypoints may launch directly.
