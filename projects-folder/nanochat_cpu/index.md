# nanochat_cpu

Reproduce OpenResearch's default nanochat demo at a CPU-sized scale: an end-to-end tokenizer, pretraining, SFT, and chat baseline plus its learning-rate and vocabulary probes.

## Start here

* [AGENTS.md](AGENTS.md) - Workflow, integrity, and project-specific rules for agents working here.
* [PROJECT_MEMORY.md](PROJECT_MEMORY.md) - Durable project state, decisions, progress, and next action.
* [Code/README.md](Code/README.md) - One-command CPU run, expected results, changes from the demo, and limitations.
* [Code/README_zh.md](Code/README_zh.md) - Chinese version of the code README.

## Project areas

* [Code/](Code/) - Ported nanochat, the staged runner, logging and summary tools, and logged results.
* [Figs/](Figs/) - Training curves and probe comparison figures.
* [Baselines/](Baselines/) - Unchanged reference-run evidence from OpenResearch's nanochat demo.
* [paper/](paper/) - Paper area inherited from the template; unused, since this project is an example, not a research result.
* [log.md](log.md) - Newest-first project update log.

## Related

* [Source idea: nanochat CPU baseline](../../ideas/nanochat-cpu-baseline.md) - Promoted idea this project was created from.
* [Code/results/summary.json](Code/results/summary.json) - Validation bpb and stage timings from the logged runs.
