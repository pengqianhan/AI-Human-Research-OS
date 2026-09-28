# nanochat_cpu

Reproduce OpenResearch's default nanochat demo at a CPU-sized scale: an end-to-end tokenizer, pretraining, SFT, and chat baseline plus its learning-rate and vocabulary probes.

## Start here

* [AGENTS.md](AGENTS.md) - Workflow, integrity, and project-specific rules for agents working here.
* [PROJECT_MEMORY.md](PROJECT_MEMORY.md) - Durable project state, decisions, progress, and next action.
* [paper_skeleton.md](paper_skeleton.md) - Claims, sources, and figures of the short paper, each traced to its evidence.
* [Code/README.md](Code/README.md) - One-command CPU run, expected results, changes from the demo, and limitations.
* [Code/README_zh.md](Code/README_zh.md) - Chinese version of the code README.

## Project areas

* [Code/](Code/) - Ported nanochat, the staged runner, logging and summary tools, and logged results.
* [Figs/](Figs/) - Training curves and probe comparison figures.
* [paper/](paper/) - Short paper on the example: LaTeX source, bibliography, and compiled PDF.
* [Baselines/](Baselines/) - Unchanged reference-run evidence from OpenResearch's nanochat demo.
* [log.md](log.md) - Newest-first project update log.

## Related

* [Source idea: nanochat CPU baseline](../../ideas/nanochat-cpu-baseline.md) - Promoted idea this project was created from.
* [paper/main.pdf](paper/main.pdf) - Compiled short paper, generated from paper/main.tex.
* [Code/results/summary.json](Code/results/summary.json) - Validation bpb and stage timings from the logged runs.
