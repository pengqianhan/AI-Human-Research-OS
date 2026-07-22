# Managing skills

How skills get from this hub into the agents and the human's view of them, who
does what, and what each interface is allowed to do. For *why* it is built this
way, see [ADR 0002](docs/adr/0002-skill-install-form-and-targets.md); for the
command reference, see the installer's
[SKILL.md](open-paper-skills/research-skill-installer/SKILL.md).

## The one rule everything rests on

**The hub is the only source.** A skill's real content lives once, under
`research-skills-hub/<collection>/<skill>/`. Every place an agent "has" a skill
is either a **symlink back to the hub** or a **copy of it** — never an
independent version. So there is nothing to keep in sync by hand, and editing a
symlinked install *is* editing the hub.

Nothing installs, moves, or deletes a skill by hand. Every write goes through
`research-skill-installer`, which refuses to touch anything outside its target
table.

## Symlink or copy — not a choice

Which form an install takes is read from the collection's `SOURCE.md`, not
decided per install:

- A collection whose `SOURCE.md` declares `` Install form: `copy` `` is
  **copied**. Today that is only `mattpocock-skills`, an auto-refreshed
  read-only mirror — the copy is what pins the version so a weekly upstream
  sync cannot silently change a skill already in use.
- Everything else is **symlinked**. Editing the installed path edits the hub,
  so the two can never drift apart.

## Where skills go — the target table

Targets live in
[`assets/targets.toml`](open-paper-skills/research-skill-installer/assets/targets.toml).
Adding a target is a table row, never a code change. Today:

| Scope | Targets |
|---|---|
| repo | `.claude/skills`, `.agents/skills` (the defaults) |
| global | `~/.claude/skills`, `~/.codex/skills`, `~/.agents/skills` |
| project | each `projects-folder/<Project>/`'s agent directories, expanded automatically |

Links inside the repository are **relative** (so a clone resolves them and Git
commits them); links to `~` targets are **absolute** (they are outside Git
anyway).

Scope is **this repository**. Other directories beside it are not Research OS
projects and stay out of the table — see the HANDOFF decision row.

## Who does what

Both the agent and the human ultimately drive the *same* installer script.
There is no second implementation. They differ only in which actions each
interface exposes.

| Action | Agent (runs the script) | Human in the GUI |
|---|---|---|
| **Install** | `install <skill> [--target …]` | Copies a command to run in a terminal — the GUI never installs |
| **Remove** (delete) | `remove <skill> --yes` | Not offered at all |
| **Disable** (reversible, keeps content) | `disable <skill> --target …` | A button, per location |
| **Enable** | `enable <skill> --target …` | A button, per location |
| **Inspect** | `status`, `list`, `targets` | The store shows install state per target |

Why the GUI is limited to disable/enable: the human authorized exactly that one
write action for `os-ui` (GOAL.md M4, 2026-07-22). It is non-destructive,
reversible, and Git-visible. Installing and deleting stay on the command line —
the GUI's write channel is a Vite dev-server middleware that itself only ever
calls the installer's `disable`/`enable`, and exists only while `start.sh` runs.

## Disable, precisely

Disable turns a skill off at **one install location** and is always reversible;
it never deletes skill content. The mechanism differs by form:

- A **copied** install renames its `SKILL.md` to `SKILL.md.disabled`. The files
  stay put; agents stop discovering it.
- A **symlinked** install moves its link into a `.disabled/` directory inside
  the same target. It is not renamed in place — Claude Code re-registers a
  renamed directory under its new name, so that does not disable anything
  (tested 2026-07-23). It is not deleted either, because then "disabled here"
  and "never installed here" would be identical on disk, and re-enabling would
  become an install — which the GUI is not allowed to do.

`status` still lists a disabled location, marked `disabled`, so it can be
re-enabled. Running `install` over a disabled location re-enables it.

Whether an agent skips a `.disabled/` directory is undocumented behaviour, like
symlink following; both were verified on Claude Code and Codex on 2026-07-23 and
should be re-checked after an agent upgrade. If an agent ever lists `.disabled/`
entries, set that agent's targets to `copy` — its `SKILL.md.disabled` rename
does not depend on directory-name behaviour.

## Checking and typical flows

```bash
S=research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py

python $S status                 # scan every target; non-zero exit if anything is wrong
python $S targets                # list install targets
python $S install <skill>        # into the repo's two agent directories
python $S install <skill> --target project-claude
python $S disable <skill> --target repo-claude
./verify.sh                      # form + integrity check across all installs
```

After any change, run `status <skill>` to confirm, then `./verify.sh` from the
repository root. `verify.sh` checks that every install matches its declared
form and resolves to its hub source, and flags dangling links and drifted
copies — a plain `diff` cannot, because it follows a symlink and compares the
hub with itself.
