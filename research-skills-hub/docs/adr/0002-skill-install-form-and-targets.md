---
status: accepted
---

# Install skills by symlink or copy, decided by source, into a target table

Skills lived in three byte-identical copies: the canonical
`research-skills-hub/` source and two installs (`.claude/skills/`,
`.agents/skills/`). Keeping them identical required `sync-back`, a digest
comparison, a `--force` override, and a stop-on-conflict path — machinery whose
only job was reconciling copies of a file that already had one canonical home.
The same skills were separately copied into sibling repositories the installer
could not see, so `uv-env` existed in at least five places on disk.

An installed skill is now **either a symlink back to the hub or a copy**,
decided by the source, and it is placed into any target listed in a target
table rather than two hardcoded directories.

**Symlink** when the Human Owner authors the collection and iterates on it
(`open-paper-skills`), or when the collection is a manually cherry-picked
static vendor (`collected-skills`, `science-skills`, `claude-science-skills`).
Editing the installed path *is* editing the hub, so drift becomes impossible
rather than merely detectable, and `sync-back` has nothing left to do.

**Copy** when the collection declares itself an auto-refreshed read-only
mirror. Today that is only `mattpocock-skills`, which a weekly CI job replaces
wholesale with `rsync --delete` under [ADR
0001](0001-external-skill-intake-and-sync.md). Symlinking there would break two
things at once: the installed copy is what **pins the version**, so merging a
sync PR would silently change a skill already in use instead of leaving the
change staged until a deliberate reinstall; and `rsync --delete` means an
upstream rename or removal would leave a dangling link where a working copy
used to be. ADR 0001 already forbids editing mirrored skills in place, so
symlinking them would also invite an edit that the next sync silently destroys.

Targets are table-driven: the repository's two agent directories, the global
agent directories, and each Research Project's. In-repo targets use **relative**
symlinks, which Git stores and a fresh clone resolves; targets under `~` use
**absolute** symlinks and lie outside Git anyway. Adding a target is a new table
row, never an installer change.

`sync-back` is deleted. Symlinked skills need no promotion because the
installed path is the hub; copied skills are the auto-refresh mirror, which ADR
0001 forbids editing in place. The two cases are exhaustive.

## Considered options

- **Keep three copies (status quo).** Rejected: the reconciliation machinery is
  the whole complaint, and it does not reach copies in other repositories.
  Notably there was no observed drift — the cost was the mechanism, not damage
  it had failed to prevent.
- **Copy everything, generalize only the target table** (what `asm` does for
  `asm install`). Rejected: every copy is a version pin, which is only worth
  paying for when the source can move underneath you. For collections the owner
  writes, it just reintroduces the sync problem.
- **Symlink everything.** Rejected on the `mattpocock-skills` evidence above.
- **Per-skill choice of link or copy at install time** (`asm install` vs `asm
  link`). Rejected: it makes "is this one linked or copied?" a fact to remember
  per skill instead of one derivable from the collection's declared policy.
- **Adopt `asm` as a dependency.** Rejected: it brings a Node runtime, 19
  provider definitions, and a registry for a single-repository need. Its ideas
  are reused instead. Note that `asm` does **not** install via symlink —
  `asm install` copies and `asm link` is a development-only live-reload tool —
  so the convergence here is on the copy-as-version-pin reasoning, not on
  symlinking as an install strategy.

## Disabling one location

An install can be turned off without being removed, per location. A copied
install renames `SKILL.md` to `SKILL.md.disabled`, the mechanism `asm` uses. A
symlinked install moves its **link** into a `.disabled/` directory inside the
same target.

Three alternatives were rejected for symlinks:

- **Renaming `SKILL.md` inside the install** writes through the link into the
  hub, disabling the skill at every location at once.
- **Deleting the link** loses information: "disabled here" and "never installed
  here" become the same on-disk state, so re-enabling would have to recreate
  the install, turning the toggle into an install action — outside what os-ui
  is authorized to do (GOAL.md M4).
- **Renaming the link to `<name>.disabled` in place** was implemented first and
  then disproved by testing on 2026-07-23: Claude Code re-registered the skill
  under the new directory name and it stayed callable, so the rename disabled
  nothing. Skill discovery keys on the directory name, not on frontmatter.

The link is recreated rather than moved, because `.disabled/` is one level
deeper and a relative link target would otherwise no longer resolve.

## Known risks

Whether an agent follows a **symlinked** skill directory is undocumented;
Claude Code's skills documentation does not mention symlinks at all. This was
tested on 2026-07-22 with a `filetree-simple` pilot and **both Claude Code and
Codex** discovered and executed the linked skill. Because it is implementation
behavior rather than a documented contract, it can regress on an agent upgrade
and should be re-tested after one. If an agent stops following links, set that
agent's targets to copy in the target table — the mechanism already supports it.

Whether an agent skips a leading-dot directory inside its skills folder is
undocumented too. It held for Claude Code on 2026-07-23 — the skill vanished
from the live listing when moved into `.disabled/` and returned when restored —
but that is one agent on one version, and the in-place rename it replaced
looked just as plausible before it was tested. Verify per agent, and re-test
after an agent upgrade; if an agent does list `.disabled/` entries, disabling a
symlinked install there silently does nothing.

Verified safe by inspection and then by execution: no installed skill's scripts
break under symlinking. Every `__file__` use resolves assets *inside* the skill
directory, which moves with the link; the only cross-boundary path resolution
goes through `--repo` or `Path.cwd()`. `paper-wiki-manager`'s validator — the
heaviest case, locating `assets/`, `templates/`, `vendor/`, and `static/` via
`__file__` — passes when run through the link.

A `diff -rq` between the hub and a symlinked install is **not** a valid
integrity check: it follows the link and compares the hub with itself, so it
passes unconditionally. `verify.sh` checks install *form* against the
collection's declared policy instead, and its dangling-link case is checked
before the hub-source lookup — otherwise a vanished hub source makes the lookup
fail, the install look like an orphan, and the dangling link pass silently.
