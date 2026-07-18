# Research OS MVP Build Phases

This is the live execution contract for the embedded Pi SDK MVP selected in
[ADR-0001](../../docs/adr/0001-pi-sdk-autonomous-mvp.md). It takes the route
from verified map waypoint N13 to the N14 Example_Project pilot. The prompts
build the product one runnable vertical slice at a time; they are not a record
that implementation already exists.

## Fixed destination

- Implementation package: `os-runtime/`, a local Node.js/TypeScript program.
- Workspace control state: root `.research-os/`; research outputs remain in
  the selected project.
- Runtime: embedded `@earendil-works/pi-coding-agent` behind a replaceable
  backend seam; never a parsed Pi CLI subprocess.
- Product slice: one Human Owner, one Project, one approved Research Task, one
  active writer, and one Run in one local process.
- Autonomy: plan → one bounded step → validate → checkpoint → continue,
  adjust, pause, stop, or enter review. Only the human can accept.
- Default mode: works without Git. Git may add richer diff and recovery later.

The official SDK currently requires Node.js `>=22.19.0`; Phase 01 must re-check
the installed package metadata instead of assuming this remains unchanged.
The authoritative upstream references are the
[Pi SDK guide](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
and [`@earendil-works/pi-coding-agent` package metadata](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/package.json).

## Phase chain

| Phase | Runnable outcome | Human learning checkpoint | Handoff |
|---|---|---|---|
| [01 — Pi SDK session](phase-01-pi-sdk-session.md) | TypeScript package plus one real, observable SDK session | Trace `prompt → events → completion`; make one tested text-output change | SDK lifecycle proven |
| [02 — backend, events, tools](phase-02-backend-events-tools.md) | Replaceable backend seam with normalized events and bounded tools | Explain adapter vs domain state; add one event assertion | Pi isolated behind backend |
| [03 — Run Contract and file state](phase-03-run-contract-state.md) | Immutable approved contract and root file store | Explain runtime types vs validation; add one invalid fixture | Durable domain state proven |
| [04 — permissions and validation](phase-04-policy-validation.md) | Deterministic path policy plus executable/review validation | Explain capability boundary; add one escape test | Safe step execution proven |
| [05 — checkpoint loop](phase-05-checkpoint-loop.md) | Fake-backed autonomous loop, checkpoints, pause/stop, review package | Trace one state transition; change one bounded policy default | Loop proven offline |
| [06 — minimal TUI](phase-06-minimal-tui.md) | Root-level terminal control surface for approval and control | Trace one keypress to domain command; change one label | Operator path proven |
| [07 — Example_Project pilot](phase-07-example-project-pilot.md) | Unattended multi-seed line-fit Run and Review Package | Edit one draft limit before approval; verify immutable hash afterward | N14 ready for human verdict |

## How to execute

Run exactly one phase in a fresh code-agent task. Paste or point the agent to
that phase file; each prompt is standalone. Do not start the next phase merely
because the agent says `complete`.

For every phase:

1. The agent inspects repository evidence, implements the bounded slice, runs
   its checks, writes the Chinese learning note, and reports `delivered`.
2. The Human Owner runs the same acceptance check, explains the slice using
   the requested Python analogy, and makes the specified small tested change.
3. Only the Human Owner authorizes marking the phase human-verified and moving
   to the next prompt.

Live model calls, credential use, package installation, and meaningful cost
are explicit gates inside the relevant phase. Secrets never enter tracked
files. If an environment gate fails, the phase preserves offline evidence and
reports `blocked`; it does not invent a successful SDK or research Run.

## Evidence and completion rules

- Real files, test output, Run artifacts, and validation records outrank
  transcripts or summaries.
- Tests use a fake backend unless the phase explicitly calls for a gated live
  smoke test.
- Every phase records exact commands as passed, failed, blocked, or unrun.
- A phase may make the smallest correction to its own prerequisites, but it
  may not absorb a later phase or broaden the MVP.
- Generated runtime data must be inspectable and must not depend on Git.

## Explicitly outside this chain

No daemon, local server, database, GUI execution surface, account system,
remote access, multi-project scheduler, multi-worker execution, autonomous
acceptance, unrestricted unattended shell, general-purpose version control,
or Codex/Claude runtime backend belongs to these phases. Existing `os-ui/`
remains read-only.

## Historical archive

[archive-launcher/](archive-launcher/) contains the frozen 2026-07-17 thin Pi
CLI launcher prompts. They are retained as route history only. Do not execute,
edit, or use them as prerequisites for this SDK route.
