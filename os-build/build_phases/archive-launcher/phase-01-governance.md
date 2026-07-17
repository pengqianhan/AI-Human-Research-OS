Execute this task in the current workspace. Inspect the repository evidence, perform the authorized edits, validate the result, and create every required artifact. Do not stop after proposing a plan.

# Phase 01 — Align governance for the thin `research-os` launcher

## Outcome

Make the repository governance internally consistent with the human-approved narrow exception for a repo-local `bin/research-os` launcher. The launcher is read-only and stateless; workflow CLI features, resident services, and GUI execution remain gated. Do not implement launcher code in this phase.

## Evidence to inspect

Read before editing:

- `INSTRUCTION.md`
- `GOAL.md`
- `HANDOFF.md`, especially Active Work, D5, Direction decisions, and the 2026-07-16 pi product-shell decisions
- `FILETREE.md`
- `README.md`
- `.agents/skills/filetree-simple/SKILL.md`

Run `git status --short --branch`. Preserve all pre-existing changes and untracked content, including `resource/openscience/`; do not stage, delete, or rewrite unrelated work.

## Required work

1. Update `GOAL.md` M4 so it records one narrow, human-approved exception:
   - a repo-local, read-only, stateless launcher that invokes native pi is allowed;
   - this exception does not authorize workflow subcommands, a custom agent runtime, resident services, GUI execution, a database, or a machine-readable manifest;
   - the GUI execution gate remains one real project stage, concrete OS Feedback, and renewed human confirmation.
2. Update D5 in `HANDOFF.md` so it no longer says an absolute “No CLI.” Mark the old absolute default as superseded and distinguish the authorized thin launcher from the still-gated workflow CLI.
3. Reconcile nearby wording only where required to remove direct contradictions. Do not broaden product scope and do not claim `bin/research-os` exists yet.
4. After validation succeeds, mark only the Governance checklist item in the `research-os` Active Work subsection complete using the repository’s checked-and-struck-through convention. Leave implementation, tests, documentation, final verification, and real-project validation unchecked.
5. Create `build_phases/phase-01-governance-tutorial.html` as the required tutorial described below.
6. Refresh `FILETREE.md` with the local filetree-simple skill after all indexed files and the tutorial are final.

## Authority and scope

You may edit `GOAL.md`, `HANDOFF.md`, `FILETREE.md`, and create the required HTML tutorial. Make the smallest reversible edits. Do not modify source code, `README.md`, pi settings, skills, `memory/MEMORY.md`, or `os-ui`. Do not commit, push, install dependencies, or access the network.

## HTML tutorial contract

Create a detailed, self-contained Chinese tutorial for a reader who knows Python but is new to shell, TypeScript, pi internals, and repository governance.

The tutorial must:

- explain why D5 and M4 conflicted with the approved launcher;
- explain “thin adapter,” “source of truth,” “narrow exception,” and “execution gate” using concrete Python-friendly analogies;
- show the actual before/after governance meaning without inventing implementation details;
- include a section titled `本阶段实际修改`;
- include a section titled `如何验证这些约束没有被扩大`;
- link to real files using relative clickable links from `build_phases/`, including at least `../GOAL.md`, `../HANDOFF.md`, `../INSTRUCTION.md`, and `../build_phases/phase-01-governance.md`;
- use code excerpts copied from the final files and label each excerpt with its real source path;
- use no CDN or external JavaScript; embed readable CSS in the HTML;
- avoid fabricated line numbers, files, commands, or results.

After generating the tutorial, run a Python standard-library link audit that parses local `href` values, resolves them relative to the HTML file, and fails if any local target is missing. External `http:`, `https:`, and fragment-only links may be skipped. Report the exact audit command and result.

## Verification and completion bar

Run at minimum:

- targeted `rg` searches for D5, M4, “CLI,” and `research-os` to inspect remaining wording;
- `python .agents/skills/filetree-simple/scripts/filetree.py lint`;
- `./verify.sh`;
- the HTML local-link audit.

Status is `complete` only when governance is consistent, the tutorial exists and passes its link audit, FILETREE is current, and all required checks pass. If repository facts conflict with this prompt, trust the repository, make no speculative broadening edit, and return `blocked` with the exact conflict and smallest decision needed.

## Final response

Report:

- `Status: complete | incomplete | blocked`;
- files changed;
- the exact governance exception now recorded;
- verification commands and results;
- tutorial path and link-audit result;
- intentionally untouched scope;
- next phase: `build_phases/phase-02-launcher.md`.
