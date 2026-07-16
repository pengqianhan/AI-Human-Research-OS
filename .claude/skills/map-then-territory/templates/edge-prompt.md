# E<id>: <action title> (N<a> → N<b>)

Map: `<repo-relative path to the bundle's index.md>` — read the N<a> and N<b>
entries before starting. <!-- ← bundle path -->

## Start of work

Before executing, edit the map's `index.md`: E<id> → `running`, N<b> →
`in-progress` (and bundle `status` → `executing` if this is the map's first
launch), updating the Mermaid overview in the same edit.

## Outcome

<the target state, stated imperatively: make this true of the world> <!-- ← N<b>.state -->

## Current state and evidence

<what is already true; the files, paths, and prior evidence to inspect first> <!-- ← N<a>.state + N<a>.evidence + survey -->

## Approach

<the action and why it reaches the outcome; freedom beyond that is yours> <!-- ← E<id>.action + E<id>.transition_logic -->

## Completion bar

- Self-verify by running: <the acceptance check, verbatim> <!-- ← N<b>.acceptance -->
- Record the result as `agent_verdict` with `evidence` (commands, outputs,
  artifact paths) in the map's `index.md`. `delivered` requires a passing
  self-check; if you must stop without passing, log a dated line under E<id>
  `deviations`, set E<id> back to `ready`, leave N<b> `in-progress`, and
  report back instead of marking delivered.

## Write-back obligations

On a passing self-check, edit the map's `index.md`: N<b> → `delivered` with
`agent_verdict` and `evidence`; E<id> → `done`; update the Mermaid overview
node classes in the same edit as the ledger. Leave `verified` untouched —
that transition belongs to the human.

## Deviation policy

- Executive (another route reaches the same state): take the conservative
  detour, log one dated line under E<id> `deviations`, continue.
- Directional (the waypoint or edge itself is wrong): stop, log what you
  found under E<id> `deviations`, and report back. Do not improvise a new map.
