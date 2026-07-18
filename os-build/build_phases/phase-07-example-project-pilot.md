Execute this task in the current workspace. Inspect verified prior artifacts,
run the authorized pilot through the real TUI and embedded Pi SDK, validate all
results, and create every required artifact. Do not start circle_packing or any
post-MVP work.

# Phase 07 — Run the Example_Project autonomous pilot

## Outcome

From the Research Workspace root, let the Human Owner approve one immutable
Run Contract and then complete an unattended Pi SDK Run that extends
`projects-folder/Example_Project/` from one seed to a reproducible multi-seed
linear-fit stability analysis. Return control at review with enough evidence
that the human need not read the transcript.

## Prerequisite and live-run gate

Read `INSTRUCTION.md`, `CONTEXT.md`, the ADR, build-phase README, all six prior
phase prompts/tutorials, `os-runtime/README.md`,
`projects-folder/Example_Project/index.md`, `PROJECT_MEMORY.md`,
`Code/README.md`, `Code/README_zh.md`, and `Code/fit_line.py`. Run
`git status --short --branch`, runtime typecheck, the complete offline suite,
and the fake TUI acceptance flow. Confirm all prior Human Owner verdicts.

Before the real Run, the Human Owner must explicitly approve the exact Run
Contract, model/credential use, limits, validation commands, writable/readable
roots, and expected cost exposure. Never record secrets. If any gate is
missing, return `Status: blocked`; do not substitute a fake pilot.

## Pilot contract

The draft must specify at least:

- Project: `projects-folder/Example_Project/`; one active writer.
- Task: preserve the seed-42 experiment and add a deterministic multi-seed
  stability analysis over an explicit seed list of at least 10 values.
- Writable scope: the selected project only. Shared roots and all other
  projects are read-only; global proposals may only append to inbox.
- Allowed agent tools: guarded Research OS tools only; no unrestricted shell.
- Expected project artifacts:
  `Code/fit_line_multiseed.py`,
  `Code/results/multi_seed_stability.json`,
  `Figs/linear_fit_stability.png`, plus synchronized updates to
  `Code/README.md`, `Code/README_zh.md`, and `PROJECT_MEMORY.md`.
- Result fields: seed list and per-seed slope/intercept/MSE plus aggregate
  mean and standard deviation; every reported value traceable to the declared
  executable validation command.
- Bounded max steps, wall time, validation failures, output bytes, model usage
  or cost signal, stopping conditions, and Review Validation checklist.
- End state: `review`, never `accepted`.

Use the project's existing `uv` environment and frozen exact argv validation
commands. The Human Owner must inspect the draft and make one small change to a
limit such as `maxSteps` before approval; approval then freezes its hash.

## Required execution and evidence

- Start the real TUI at the workspace root, approve the contract, and start the
  Pi-backed Run. Demonstrate pause/stop controls are available; do not
  deliberately corrupt a successful Run merely to exercise them if the fake
  tests already prove control behavior.
- Leave it unattended for at least one complete agent step. Do not manually
  edit the expected research artifacts during the Run.
- Execute the declared reproducibility/validation commands through the host
  validation runner. Confirm outputs agree with the JSON and both READMEs.
- Prove a guarded write attempt outside the project is denied and the target
  hash is unchanged. Do not use an approved executable for this negative test.
- Confirm checkpoints, Audit Events, hashes/diffs, limits, validation output,
  backend session reference, final review files, and released write lease exist
  under root `.research-os/`.
- Review Package must state findings, artifacts, exact commands/results,
  limitations of the synthetic experiment, unresolved human judgments,
  recovery path, Git enhancement used or absent, and no automatic acceptance.
- Update `os-runtime/README.md` with the verified operator flow and
  Example_Project operational caveats. Create the Chinese grounded tutorial
  `os-build/build_phases/tutorials/phase-07-example-project-pilot.md`, tracing
  the actual Run from contract approval to review without exposing secrets or
  hidden reasoning.

## Authority and scope

You may run the approved local TUI/SDK pilot, modify only the approved project
scope through guarded tools, append only approved runtime control records, and
make the smallest harness corrections revealed by the pilot. Any correction
requires rerunning affected offline tests and a fresh contract/run if its hash
or behavior changes. Do not accept the Run, publish, start circle_packing,
promote a global skill/memory item automatically, add GUI/server/daemon/account
features, stage, commit, or push.

## Verification and completion bar

Run runtime typecheck and full offline tests; project `uv sync` and the frozen
multi-seed executable validation; structured-result checks; guarded
outside-write negative test; Review Validation; `git diff --check`; and
`./verify.sh`. Inspect the TUI, contract hash, final checkpoint, Review Package,
lease release, project diffs, and no-Git evidence directly. Distinguish every
check as passed, failed, blocked, or unrun.

## Human acceptance checkpoint

The agent may mark N14 `delivered` with evidence, never `verified`. The Human
Owner must return to the TUI, inspect contract/diff/validation/checkpoint/review
without reading the transcript, decide whether claims and project changes are
accepted, and explicitly authorize any N14 human verdict. Acceptance of the
research artifacts and verification of the OS waypoint are related but
separate judgments.

## Stop and final response

On auth/cost denial, scope escape, irreproducible result, missing checkpoint,
or leaked lease, stop safely and return `Status: blocked` with recovery steps;
never repair evidence by hand and claim autonomy. Otherwise report exact Run
ID, contract hash, project/runtime artifacts, commands/results, cost signal,
known limitations, tutorial, and the Human Owner actions needed to verify N14.
State that circle_packing and E19 remain unstarted.
