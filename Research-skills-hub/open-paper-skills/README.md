# Open Paper Skills

Original or repo-maintained academic skills for Open Paper and the AI-Human
Research OS. Skills here are treated as local canonical copies and can be
edited directly in this repository.

This README is the original-skills split from
`/Users/pengqianhan/Documents/GitHub/Opensource/open-paper-skills/README.md`
at source commit `8f854bd`.

## Skills

| Skill | Description | Source |
| --- | --- | --- |
| [research-bible](research-bible/SKILL.md) | Turn research-practice principles into concrete ML/AI research plans, experiment loops, logs, and debugging habits. | Original, Pengqian Han |
| [drawio-paper](drawio-paper/SKILL.md) | Generate publication-quality academic diagrams and statistical plots using a PaperBanana-inspired pipeline. | Original; uses PaperBananaBench as an external reference dataset |
| [alphaxiv-paper-lookup](alphaxiv-paper-lookup/SKILL.md) | Look up arXiv papers on AlphaXiv for structured AI-generated overviews. | Original workflow using AlphaXiv public endpoints |
| [task-file-builder](task-file-builder/SKILL.md) | Draft context-rich `task.md` briefs for fresh Claude Code sessions. | Original, Pengqian Han |
| [uv-env](uv-env/SKILL.md) | Set up and manage uv-based Python environments for research projects. | Repo-local support skill |

## Installation

Install a skill into both agent skill directories:

```bash
cp -R Research-skills-hub/open-paper-skills/<skill> .agents/skills/<skill>
cp -R Research-skills-hub/open-paper-skills/<skill> .claude/skills/<skill>
```

Keep `.agents/skills/` and `.claude/skills/` byte-identical.

## Prerequisites

- `research-bible`, `alphaxiv-paper-lookup`, and `task-file-builder`: no
  additional local setup required.
- `uv-env`: requires or installs the `uv` Python package manager.
- `drawio-paper`: requires Python with `matplotlib`, `numpy`, and `pillow` for
  plots. Before first use, download the PaperBananaBench reference dataset as
  described in [drawio-paper/SKILL.md](drawio-paper/SKILL.md).

## research-bible

Turns research-practice notes into operational workflows for ML/AI research.

Use it for:

- Choosing research problems from desired outcomes, falsifiable bets, and
  plausible attacks.
- Designing tight experiment loops with forecasts, cheap first runs,
  reproducible configs, and small-case validation.
- Debugging with data inspection, single-batch overfit checks, failure-pile
  analysis, strong baselines, and ablations.
- Keeping research honest with structured logs and contrary-evidence capture.

Example requests:

```text
/research-bible help me choose between these research directions
/research-bible design an experiment loop for this model idea
/research-bible turn my failed evals into a debugging plan
/research-bible make a research log template for this project
```

## drawio-paper

Generates publication-quality academic paper diagrams and statistical plots
using a PaperBanana-inspired multi-stage pipeline.

Use it for:

- Framework, architecture, method, module, and pipeline diagrams.
- Bar charts, line charts, scatter plots, heatmaps, radar charts, box plots,
  and other academic result plots.
- Turning methodology text, figure captions, or tabular data into polished
  paper-ready visualizations.

Setup summary:

```bash
curl -L -o .claude/skills/drawio-paper/PaperBananaBench.zip \
  https://huggingface.co/datasets/dwzhu/PaperBananaBench/resolve/main/PaperBananaBench.zip
python .claude/skills/drawio-paper/scripts/extract_bench.py
pip install matplotlib numpy pillow
```

Example requests:

```text
/drawio-paper create a framework overview diagram from the methodology section
/drawio-paper generate a bar chart comparing model performance from results.csv
/drawio-paper pipeline diagram for the training workflow described in Section 3
```

## alphaxiv-paper-lookup

Fetches structured AI-generated overviews from AlphaXiv for arXiv papers. It
can fall back to AlphaXiv's full extracted paper text when the overview is not
detailed enough.

Supported inputs include arXiv URLs, AlphaXiv URLs, and raw arXiv IDs.

Example requests:

```text
/alphaxiv-paper-lookup summarize 2401.12345
/alphaxiv-paper-lookup explain https://arxiv.org/abs/2401.12345
```

## task-file-builder

Drafts a focused `task.md` brief for starting a clean Claude Code session with
enough context to execute well.

Use it to capture:

- Objective.
- Acceptance criteria.
- Relevant files.
- Constraints.
- Background and known context.
- Open questions for the next session.

Example requests:

```text
/task-file-builder help me draft a task for refactoring the paper search pipeline
/task-file-builder turn this bug report into a task.md
/task-file-builder prepare a brief for a fresh Claude Code session
```

## License

Original content in this collection follows the repository-level
[MIT License](../../LICENSE), unless a skill states otherwise. External
services and datasets used by a skill keep their own terms.
