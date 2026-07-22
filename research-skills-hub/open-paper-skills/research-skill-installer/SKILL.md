---
name: research-skill-installer
description: Install, remove, disable, enable, list, or check the status of skills from this repository's Research-skills-hub across every registered agent directory — the repository's own, the global ones, and each Research Project's. Use when the user wants an agent to be able to use a hub skill, wants a skill installed into or removed from a specific project or globally, wants to turn a skill off in one place without deleting it, wants to know which research skills are installed where, or wants to check that installs still match the hub.
---

# Research Skill Installer

Manages skills stored under `research-skills-hub/`. The hub is canonical; an
install is a pointer to it or a pinned copy of it, never an independent version.

Run from the repository root unless you pass `--repo`. In the examples below,
`$S` stands for
`research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py`.

## Two rules that are not yours to choose

**Install form is decided by the source, not per skill.** A collection whose
`SOURCE.md` declares ``Install form: `copy` `` is copied; everything else is
symlinked back to the hub. Today only `mattpocock-skills` declares `copy`,
because weekly CI replaces it wholesale with `rsync --delete` — there the copy
is what pins the version. Never hand-place a skill to get the other form; if a
form looks wrong, the fix is the collection's `SOURCE.md`, not the install.

**Targets come from `assets/targets.toml`.** Adding a target is a table row.
Never hardcode a directory or copy a skill by hand.

See [ADR 0002](../../docs/adr/0002-skill-install-form-and-targets.md).

## Commands

Show the target table (`*` marks the defaults that `install` writes to):

```bash
python $S targets
python $S targets --json
```

List hub skills with the install form each one gets:

```bash
python $S list
python $S list --json
```

Check what is installed where. With no argument it scans **every** target and
exits non-zero if anything is wrong; this is the command to run when you want
to know whether reality still matches the hub:

```bash
python $S status
python $S status paper-wiki-manager
python $S status --target repo-claude --all   # --all also lists what is absent
python $S status --json
```

Install. With no `--target` this writes to the default targets (the
repository's `.claude/skills` and `.agents/skills`):

```bash
python $S install paper-wiki-manager
python $S install uv-env --target project-claude --target project-codex
python $S install uv-env --all-targets
python $S install uv --collection science-skills   # when the name is ambiguous
python $S install paper-wiki-manager --update      # replace an already-correct install
python $S install paper-wiki-manager --dry-run
```

Remove, disable, and enable. `disable` stops one agent seeing the skill at one
location while keeping the content; it is the reversible option and should be
preferred over `remove` when the intent is "not here, for now":

```bash
python $S disable uv-env --target repo-claude
python $S enable  uv-env --target repo-claude
python $S remove  uv-env --target project-claude --yes
```

## How disable works, and why it differs by form

A **symlinked** install is disabled by moving its link into the target's
`.disabled/` directory. Three alternatives are wrong: renaming `SKILL.md`
inside it edits the hub and disables the skill everywhere at once; deleting the
link makes "disabled here" indistinguishable from "never installed here", so
re-enabling would have to create the install; and renaming the link in place to
`<name>.disabled` does not disable anything — Claude Code re-registers it under
the new directory name (tested 2026-07-23).

A **copied** install is the only place its content exists, so it is disabled by
renaming `SKILL.md` to `SKILL.md.disabled`; the files stay put.

Either way disable is per location: turning a skill off in one project leaves
every other install untouched, and `status` still lists the location, marked
`disabled`. Running `install` over a disabled location re-enables it.

## Workflow

1. Use `list` or `status` first when the skill name or its current state is uncertain.
2. Use `install <skill>` for a new install; it is idempotent and reports
   `present` when the install is already correct.
3. Use `--target` to reach a project or the global directories; without it only
   the repository's own agent directories are written.
4. Use `disable` rather than `remove` when the skill should come back later.
5. After any change, run `status <skill>` to confirm, then `./verify.sh` from
   the repository root.
6. If public top-level entrypoints changed in the same task, run
   `filetree-simple generate`, then `filetree-simple lint`.

## Guardrails

- Do not copy, link, move, or delete a hub skill by hand; every install path is
  written through this script, which refuses to touch anything outside the
  target table.
- Do not edit a skill inside `mattpocock-skills` or any other collection
  declaring `Install form: copy` — the next upstream sync overwrites it. Adapt
  by cherry-picking into `collected-skills/` under a new name (ADR 0001).
- Editing a **symlinked** install edits the hub. That is intended and is why no
  `sync-back` command exists, but it means an edit under `.claude/skills/` is a
  real change to `research-skills-hub/` and will show up in `git status` there.
- Review a third-party skill's `SKILL.md`, scripts, provenance, and license
  before installing it from `collected-skills` or another vendored collection.
- `remove` requires `--yes`. Do not remove a skill without an explicit request.
