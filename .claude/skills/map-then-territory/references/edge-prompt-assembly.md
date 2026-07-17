# Edge Prompt Assembly

How an approved edge becomes a launch prompt a fresh session can run.
Skeleton: [../templates/edge-prompt.md](../templates/edge-prompt.md).

## Field mapping

Assemble the prompt with the `writing-great-prompt` skill. The map supplies
the prompt contract's raw material — if a contract element has no map source,
the map is missing a field, not the prompt. Before assembly, confirm that every
idea-ledger row disposed to this edge is represented in its `action` or
`transition_logic`:

| Prompt-contract element | Map source |
| --- | --- |
| Outcome / destination | target waypoint `state` |
| Evidence to inspect | source waypoint `state` + `evidence`, territory paths from the survey |
| Route freedom and constraints | edge `action` + `transition_logic` (the *why* bounds the *how* loosely) |
| Verification and completion bar | target waypoint `acceptance`, plus the self-verification duty |
| Required artifacts and final response | the template's Start-of-work and Write-back obligations sections |
| Stop / fallback rules | the template's Deviation policy section |

The template's Start-of-work, Completion bar, Write-back obligations, and
Deviation policy sections are the canonical packet text — copy them with the
IDs filled in rather than rewording them; they carry the execution loop's
rules to a session that never loads [execution-loop.md](execution-loop.md).

## Provenance annotations

Mark every assembled section with the map field that produced it, as a
trailing HTML comment: `<!-- ← N7.acceptance -->`. The annotations teach the
human the map→prompt correspondence by example; keep them in the stored file —
they are inert when the prompt is pasted into a session.

## Recompile rule

A prompt file is a compiled artifact of the map, never a second source. The
compilation chain is: map ledger fields → (assembly) → prompt → (agent
execution) → territory code. When an edge's fields or either endpoint's
`state`/`acceptance` change, reassemble the prompt from the map — set the edge
back to `drafted`, regenerate the file, and repeat human review when the
target is directional. Hand-editing a prompt away from the map falsifies its
provenance annotations; if the prompt needs different content, the map needs
the edit first. Territory work already compiled from a superseded prompt is
re-run under the new one (the execution-loop reference governs how its
verdicts are superseded).

## Packet requirements

A prompt file is complete only when a fresh session, with no access to the
authoring conversation, can:

1. Locate the map bundle — the repo-relative path to `index.md` is stated, and
   the packet says to read the source and target waypoint entries first.
2. Mark the start of work in the map (edge → `running`, target waypoint →
   `in-progress`) before executing.
3. Execute the edge within one session.
4. Self-verify against the target waypoint's `acceptance` and record
   `agent_verdict` plus `evidence` in the map — `delivered` only on a passing
   self-check, with the fail path stated.
5. Write back statuses and tiered deviations per the template text, updating
   the Mermaid overview in the same edit as the ledger.
6. Leave `verified` untouched — that transition belongs to the human.

## Review rule

Prompts for edges into **directional** waypoints go to the human for review
before launch. Prompts into **executive** waypoints may launch directly.
