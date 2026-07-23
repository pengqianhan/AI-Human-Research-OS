# External skill intake and sync

We ingest external skills two ways. A whole trusted upstream repo becomes its own
top-level, **read-only vendored mirror** collection (e.g. `mattpocock-skills`),
refreshed wholesale from upstream by a weekly GitHub Action that opens a PR and
merges it automatically (see the 2026-07-24 amendment below); individually
chosen skills are **cherry-picked vendors** under
`collected-skills/`. Discovery from open registries (skills.sh) and social media
runs through a **discovery scout** (`discover-academic-skills`) that only emits a
gated, scored report — ingestion always stays human-gated.

## Considered options

- **git submodule / subtree** for the upstream repo — rejected: a submodule shows
  only a gitlink (files aren't browsable in this repo), and neither fits the
  installer, which discovers skills at most three levels below the hub root
  (`<collection>/<bundle>/<skill>/SKILL.md`).
- **Nesting `mattpocock-skills/` inside `collected-skills/`** — rejected: that puts
  skills four levels deep
  (`collected-skills/mattpocock-skills/engineering/<skill>`), where the installer
  can no longer find them.
- **Fully automatic sync / auto-collection** (auto-merge upstream, auto-import from
  skills.sh) — originally rejected: it lands unreviewed third-party code in the
  repo, violating the constitution's "review a skill's scripts before installing"
  and basic supply-chain safety. **Partly adopted on 2026-07-24 — see the
  amendment below.**

## Amendment 2026-07-24: mirror sync auto-merges

The weekly `mattpocock-skills` refresh now squash-merges its own PR instead of
waiting for review. Rationale: the mirror tracks a single maintained upstream
repo we have already chosen to trust wholesale, and a gate nobody clears is not
a gate — the 2026-07-20 refresh sat unmerged and unnoticed on the sync branch.

This narrows, but does not remove, the human gate:

- It applies **only** to the `mattpocock-skills` mirror. `collected-skills/`
  intake and the `discover-academic-skills` scout stay human-gated.
- Landing in the mirror is not installation. Installing a mirrored skill into any
  agent directory remains a deliberate `research-skill-installer` action, and the
  constitution's "review a third-party skill's scripts before installing" still
  governs that step.

Accepted risk: upstream compromise reaches `main` unreviewed. Mitigation is the
PR trail (every refresh is a reviewable squash commit) and the fact that mirrored
code is inert until installed.

## Consequences

- `mattpocock-skills` is read-only. To adapt a mirrored skill, cherry-pick it into
  `collected-skills/` under a new name; edits made in place are overwritten on the
  next refresh.
- The weekly PR is the single human gate for upstream updates; nothing lands
  unreviewed.
- "Academic relevance" is enforced by the scout as a strict gate. The intake
  vocabulary is defined in [../../CONTEXT.md](../../CONTEXT.md).
