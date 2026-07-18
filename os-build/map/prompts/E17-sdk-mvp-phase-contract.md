<!-- ← N13.state -->
<!-- ← N13.acceptance -->
<!-- → N5.state -->
<!-- → N5.acceptance -->

Execute this task in the current workspace. Inspect the repository evidence,
perform the authorized documentation edits, validate the result, and create
every required artifact. Do not start runtime implementation.

# E17 — Compile the Pi SDK MVP into learning-oriented build phases

## Outcome

Replace the obsolete pure-session `os-build/build_phases/` route with a
new-session-ready sequence of small vertical-slice prompts. Following the
sequence must build the verified N13 design into the N14 Example_Project
pilot while teaching a Python/PyTorch user the necessary TypeScript and Pi SDK
concepts from real artifacts.

## Evidence to inspect

- `INSTRUCTION.md`
- `CONTEXT.md`
- `docs/adr/0001-pi-sdk-autonomous-mvp.md`
- `os-build/GOAL.md`
- `HANDOFF.md`, especially the Pi product-shell and route-map decisions
- `os-build/map/index.md`, especially N5, N13, N14, E17, and E18
- `human/human-cognition/index.md` and the Active Index of all four quadrants
- `projects-folder/Example_Project/index.md`, `PROJECT_MEMORY.md`, and
  `Code/README.md`
- the current official Pi SDK documentation and package metadata

Treat `os-build/references/` as read-only evidence. Run `git status --short`
and preserve unrelated work.

## Required work

1. Rewrite `os-build/build_phases/README.md` as the live phase index. Keep
   `archive-launcher/` explicitly frozen and off-route.
2. Create seven standalone phase prompts:
   Pi SDK session; backend/events/tools; Run Contract/file state;
   permissions/validation; checkpoint/autonomous loop; minimal TUI; and the
   Example_Project pilot.
3. Give every phase one bounded outcome, stable prerequisites, exact artifact
   anchors, offline tests, any live-model/environment gate, a human learning
   checkpoint, and an explicit handoff. A future code agent must be able to
   execute one phase in a fresh task without reading this conversation.
4. Use `os-runtime/` as the implementation package and root `.research-os/`
   as the Research Workspace control-state root. Project research artifacts
   remain inside the selected project.
5. Preserve these invariants in the phase chain:
   - one local Node.js process, one Human Owner, one Project, one Task, one
     active writer, one Run at a time;
   - embedded `@earendil-works/pi-coding-agent` behind a replaceable backend;
   - files own domain state; an Agent Session does not;
   - Git is optional enhancement, not a default requirement;
   - no unrestricted shell tool in unattended mode;
   - shared roots and other projects are read-only; global proposals append
     only to inbox;
   - the Run stops at review and never self-accepts;
   - no daemon, server, GUI execution, account system, remote access,
     multi-project concurrency, or Codex/Claude runtime backend.
6. Require a Chinese Markdown learning note based on the final real code in
   every implementation phase. Before human verification, the Human Owner
   must run the acceptance check, explain the slice using a Python analogy,
   and make one small tested change. Agents may mark a phase delivered but
   never human-verified.
7. Update N5 and E17 in `os-build/map/index.md` only after the complete phase
   contract passes validation. Update directly stale GOAL wording if needed;
   do not duplicate changing route status into HANDOFF.

## Authority and scope

You may edit the E17 prompt, `os-build/build_phases/`, the N5/E17 route-map
records, and directly stale nearby route wording. Do not create `os-runtime/`,
`.research-os/`, project experiment artifacts, dependencies, sessions, or
model calls. Do not modify, delete, or unfreeze `archive-launcher/`. Do not
stage, commit, push, publish, or install packages.

## Verification and completion bar

- Every phase link resolves and every prompt contains outcome, prerequisite
  gate, authority/scope, required artifacts/work, verification, human learning
  checkpoint, stop rules, and final response.
- The live route contains no pure-session default, Pi CLI subprocess, Git
  prerequisite, launcher revival, server, or GUI execution step.
- The chain covers every N5 state clause and ends exactly at N14 acceptance.
- Run `git diff --check` and `./verify.sh`.

Mark N5 `delivered`, not `verified`, with an agent verdict and evidence. Mark
E17 `done`. Completion means the phase contracts exist and checks pass; it
does not mean runtime implementation has begun.

## Final response

Report status, created phase chain, evidence and exact checks, important
assumptions, and the human action required to verify N5. State explicitly that
E18 remains unstarted.
