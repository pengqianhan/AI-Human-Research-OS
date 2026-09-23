---
name: research-project-manager
description: Create, inspect, validate, update, sync, or archive Research Projects under `projects-folder/`. Use when asked to start a project from a template or promote an idea into a project, list the project portfolio or check that projects still match the template contract, change a project's stage, status, owner, priority, or next action, archive a project, rewrite the Active Projects table from project memory, or fix a `project contract` failure reported by `./verify.sh`.
---

# Research Project Manager

Manages the projects under `projects-folder/`. One rule carries the skill:
**the `## Snapshot` in a project's `PROJECT_MEMORY.md` is the source of its
state, and its row in the `## Active Projects` table of `memory/MEMORY.md` is
a projection of that Snapshot.** The script writes the row; a row is changed
by changing the Snapshot and running `sync`.

Run from the repository root unless you pass `--repo`. Below, `$S` stands for
`research-skills-hub/open-paper-skills/research-project-manager/scripts/manage_research_project.py`.

## Definitions

- **Project**: a directory directly under `projects-folder/` (never
  `templates/`) that contains `PROJECT_MEMORY.md`.
- **Registered**: the project has a row in the Active Projects table.
- **Unregistered**: a project without a row. **Phantom**: a row without a
  project. **Stray**: a directory under `projects-folder/` with no
  `PROJECT_MEMORY.md`. All three are `validate` errors.
- **Contract**: `assets/project-contract.toml` lists the required files, the
  Snapshot fields and the table column each one projects to, and the stage and
  owner vocabularies. Changing the project layout is an edit there plus the
  matching edit in the template; `validate` fails while the two disagree.

## Commands

```bash
python $S status                    # every project, its Snapshot, unregistered/phantom/stray
python $S status --json             # keys match os-ui state.json: portfolio, projects, unregistered_projects
python $S validate                  # all projects; exit 1 on any error (what ./verify.sh runs)
python $S validate circle_packing   # one project
python $S new circle_packing --from-idea ideas/circle-packing-os-shakedown.md \
    --owner human-led --stage probe --priority P1 --goal "Reimplement circle packing as the OS shakedown."
python $S new demo --dry-run        # print the plan, write nothing
python $S set circle_packing --stage develop --next-action "run round 3"
python $S sync                      # rewrite every row from its Snapshot
python $S archive circle_packing --status "results in paper/main.pdf"
```

## Workflow

### Start a project

1. When the project comes from an idea, locate its concept file under `ideas/`.
2. Run `new <Name> [--from-idea <idea.md>] [--template] [--owner] [--stage]
   [--priority] [--goal] [--origin]`. It copies the template, fills Project
   name, Started (today, linked to the idea), Owner, Stage, Priority, Goal, and
   Origin, adds the portfolio row, adds a bullet under `# Projects` in
   `projects-folder/index.md`, and sets `status: promoted` plus a `project:`
   back-link in the idea's frontmatter. Names match `^[A-Za-z][A-Za-z0-9_-]*$`.
3. Fill by hand what needs research judgement: the remaining Snapshot fields
   (Status, Evaluator status, Current question, Next action), the Snapshot in
   `paper_skeleton.md`, and the title and abstract in `paper/main.tex`.
4. Run `validate <Name>`. Done when it reports no error; empty fields stay
   warnings until filled.

### Change project state

- `set` changes stage, status, owner, priority, next action, evaluator status,
  current question, goal, or origin: it rewrites the Snapshot bullet and
  re-projects the row in one step. Editing the Snapshot by hand is equally
  valid; run `sync` afterwards so the row follows.
- Write the dated Progress Log line and any Key Decisions row yourself; the
  script only ever touches Snapshot bullets and portfolio rows.
- `archive` sets Stage to `archived`. The directory and the row stay, so the
  project remains navigable and the GUI keeps showing it. Deleting a project is
  a Human Owner git operation recorded in `HANDOFF.md`; there is no `remove`.

### Repair a validate failure

Each finding carries a code; the fix follows from it:

| Code | Fix |
|---|---|
| `unregistered`, `row_drift` | `sync` |
| `snapshot_missing_label` | add the labelled bullet from the template's Snapshot, then `sync` |
| `stage_vocabulary`, `owner_vocabulary` | `set --stage` or `set --owner` with a listed value |
| `phantom_row` | delete the row by hand, or restore the directory it names |
| `stray_directory` | move the directory out, or give it a `PROJECT_MEMORY.md` |
| `idea_*`, `promoted_idea_without_project` | fix the idea's frontmatter: `status: promoted`, `project:` pointing at the project |
| `template_*` | edit the contract and the template together |

Warnings never fail `./verify.sh`.

## What `new` leaves to others

Agent directories (`.claude/`, `.agents/`) are created by
`research-skill-installer` on the first project-level install; the Python
environment by `uv-env` when code starts; evaluator-protection rules in
`.claude/settings.json` are per-project decisions; commits happen at session
end. Importing an external repository as a project is out of scope.

## Position in the OS

`validate` is the structural slice of the Project Integrity Gate defined in
`CONTEXT.md`: file layout, Snapshot fields, vocabularies, portfolio projection,
and idea back-links. Write Lease semantics are not implemented. `./verify.sh`
runs `validate` for every project, so run it before finishing any change under
`projects-folder/`. The read-only `os-ui` renders the same files this script
maintains; its "unregistered project" warning is the human's cue to have an
agent run `sync`.

## Guardrails

- Change a row through its Snapshot and `sync`; a hand-edited row is reported
  as `row_drift` and overwritten by the next `sync`.
- `sync` never deletes a row: phantom rows are reported, and removing one is a
  deliberate manual edit.
- `new` refuses an existing directory, a name outside the pattern, a file
  without `type: Idea`, and an idea already promoted to another project.
- Run `./verify.sh` after any command that writes.

---

_Original skill, Pengqian Han. Part of the AI-Human Research OS._
