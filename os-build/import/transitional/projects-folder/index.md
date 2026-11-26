# Projects

The transitional workspace's projects (until step 3's PR 9): the example the app ships.

* [nanochat_cpu](nanochat_cpu/index.md) - Reproduce OpenResearch's default nanochat demo at a CPU-sized scale: an end-to-end tokenizer, pretraining, SFT, and chat baseline plus its learning-rate and vocabulary probes.

# Templates

* [AI Research Template](templates/index.md) - Reusable project templates copied into a project folder to start a new project.

# Managing projects

Agents manage this directory through the `research-project-manager` skill
(`new`, `status`, `validate`, `set`, `sync`, `archive`). A project's
`PROJECT_MEMORY.md` Snapshot is the source of its state; its row in
[memory/MEMORY.md](../memory/MEMORY.md) is a projection written by `sync`.
