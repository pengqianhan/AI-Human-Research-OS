# Projects

Active research projects and reusable project templates.

* [Example Project](Example_Project/index.md) - Worked example that walks one idea through the full loop: idea capture, runnable code, generated figure, local bibliography, LaTeX source, and compiled PDF.

# Templates

* [AI Research Template](templates/index.md) - Reusable project templates copied into a project folder to start a new project.

# Managing projects

Agents manage this directory through the `research-project-manager` skill
(`new`, `status`, `validate`, `set`, `sync`, `archive`); the read-only
[os-ui](../os-ui/index.md) renders the same files for the human. A project's
`PROJECT_MEMORY.md` Snapshot is the source of its state; its row in
[memory/MEMORY.md](../memory/MEMORY.md) is a projection written by `sync`.

| Action | Agent | Human |
|---|---|---|
| Create or register a project | `new`, `sync` | Reads the portfolio in the GUI or in `memory/MEMORY.md` |
| Change stage, status, next action | `set`, or edit the Snapshot and run `sync` | Edits the Snapshot in Markdown, then asks an agent to `sync` |
| Check the contract | `validate` (also run by `./verify.sh`) | Sees unregistered-project warnings in the GUI |
| Archive | `archive` (directory and row stay) | Decides when |
| Delete | not offered | `git rm` plus a decision row in [HANDOFF.md](../HANDOFF.md) |
