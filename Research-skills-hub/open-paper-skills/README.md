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
| [explain-anything-html](explain-anything-html/SKILL.md) | Produce a rich, self-contained interactive HTML explanation (background, intuition, walkthrough, quiz) of a paper, blog post, or hard concept. | Adapted from `explain-diff-html`, based on [Geoffrey Litt's original skill](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524) |
| [karpathy-coding-rules](karpathy-coding-rules/SKILL.md) | Apply a concise coding-discipline checklist before coding tasks: read first, plan narrowly, keep diffs small, verify behavior, and communicate clearly. | Original skill, Pengqian Han; uses Andrej Karpathy's *CLAUDE.md* notes as attributed reference material |
| [paper-wiki-manager](paper-wiki-manager/SKILL.md) | Maintain an OKF paper wiki with paper, topic, and concept pages, project links, graph visualization, and validation. | Original, Pengqian Han; supersedes `paper-library-manager` |
| [research-skill-installer](research-skill-installer/SKILL.md) | Install, sync back, inspect, update, or remove Research-skills-hub skills in both Codex and Claude Code. | Repo-local support skill |
| [task-file-builder](task-file-builder/SKILL.md) | Draft context-rich `task.md` briefs for fresh Claude Code sessions. | Original, Pengqian Han |
| [uv-env](uv-env/SKILL.md) | Set up and manage uv-based Python environments for research projects. | Repo-local support skill |
| [discover-academic-skills](discover-academic-skills/SKILL.md) | Discover and strictly filter research/academic skills from skills.sh, scoring survivors with reasons for human-gated intake. | Original, Pengqian Han |
| [codex-paper-figure-skill](codex-paper-figure-skill/SKILL.md) | Turn paper text or figure concepts into editable draw.io academic figures, using an image-generation pass for composition reference. | [Original, Pengqian Han](https://github.com/pengqianhan/codex-paper-figure-skill) |

## Installation

Install a skill into both agent skill directories:

```bash
cp -R Research-skills-hub/open-paper-skills/<skill> .agents/skills/<skill>
cp -R Research-skills-hub/open-paper-skills/<skill> .claude/skills/<skill>
```

Keep `.agents/skills/` and `.claude/skills/` byte-identical.

The [research-skill-installer](research-skill-installer/SKILL.md) skill can do
this deterministically:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install <skill>
```

## Prerequisites

- `research-bible`, `alphaxiv-paper-lookup`, `explain-anything-html`,
  `karpathy-coding-rules`, and `task-file-builder`: no additional local setup
  required.
- `paper-wiki-manager`: runs bundled scripts with `uv` or Python 3.11+; the
  `hf` CLI is optional for faster paper fetching.
- `uv-env`: requires or installs the `uv` Python package manager.
- `research-skill-installer`: no additional local setup required.
- `discover-academic-skills`: Node/npx for `npx skills find`, and an
  authenticated `gh` for the license gate and repo metadata.
- `drawio-paper`: requires Python with `matplotlib`, `numpy`, and `pillow` for
  plots. Before first use, download the PaperBananaBench reference dataset as
  described in [drawio-paper/SKILL.md](drawio-paper/SKILL.md).
- `codex-paper-figure-skill`: no additional local setup required; relies on
  Codex's built-in `image_gen` and `Browser` tools. The draw.io desktop CLI is
  optional, needed only to export `.png`/`.svg`/`.pdf` previews.

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

## explain-anything-html

Produces a single self-contained HTML file that deeply explains a paper, blog
post, article, documentation, or hard concept. The output is one long,
responsive page with a table of contents and four sections: **Background**
(deep for beginners, then narrow), **Intuition** (core idea with toy examples
and HTML diagrams), **Walkthrough** (methods, arguments, results), and an
interactive multiple-choice **Quiz**.

The file is written outside the code repo with a `YYYY-MM-DD-` filename prefix
so explanations stay time-sorted and out of version control (e.g.
`/tmp/2026-01-12-explanation-<slug>.html`).

Example requests:

```text
/explain-anything-html explain this paper: https://arxiv.org/abs/2401.12345
help me understand this blog post
break down the intuition behind diffusion models
```

## karpathy-coding-rules

Applies a compact coding-discipline checklist before coding work so agents read
the relevant files first, state assumptions, keep diffs small, avoid premature
dependencies or abstractions, verify behavior, and report uncertainty precisely.

The skill packaging, trigger design, and operating workflow are original to this
repository. The bundled reference notes preserve attribution to Andrej
Karpathy's *CLAUDE.md* field notes.

Example requests:

```text
/karpathy-coding-rules
add input validation to the signup endpoint
fix this null pointer crash in the parser
refactor the auth middleware to support API keys
```

## research-skill-installer

Installs skills from `Research-skills-hub/` into both `.agents/skills/` and
`.claude/skills/` so Codex and Claude Code see the same skill set.

Example commands:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py list
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py status research-bible
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install research-bible
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install research-bible --update
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py sync-back research-bible --from agents
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

## paper-wiki-manager

Maintains an OKF paper wiki (default root `paper-wiki/`): one Markdown page
per paper, topic pages for research themes, and concept pages for named
methods, datasets, benchmarks, metrics, terms, and tools — all bidirectionally
linked, with optional links from papers to the repo projects that use them, a
generated `viz.html` knowledge graph, and an executable validator. Supersedes
`paper-library-manager`.

Example requests:

```text
/paper-wiki-manager add https://arxiv.org/abs/2606.13662 to the paper wiki
/paper-wiki-manager create a concept page for MLE-Bench Lite and link the papers that use it
/paper-wiki-manager mark 2604.03964 as read and refresh its topic links
/paper-wiki-manager validate the paper wiki and regenerate viz.html
```

## discover-academic-skills

Scouts the skills.sh registry (and candidates you paste from social media) for
research/academic skills, runs them through deterministic hard gates and a strict
academic-relevance gate, scores the survivors with a four-part rubric, and hands
back a ranked report with reasons. It only reports — accepting a skill stays a
manual, human-gated step. Uses the unauthenticated `skills` CLI, so no skills.sh
token is needed.

Prerequisites: Node/npx and an authenticated `gh`.

Example requests:

```text
/discover-academic-skills find new academic skills worth adding
/discover-academic-skills scout skills.sh for literature-review tools
/discover-academic-skills score this one I saw on X: owner/repo@skill
```

## codex-paper-figure-skill

Turns paper text, a methods/results section, or a figure concept into a
publication-style **editable** diagram. First generates a raster reference
image with Codex's `image_gen` tool to explore composition and visual style,
then recreates the figure as native draw.io `.drawio` mxGraphModel XML so every
label, shape, connector, and icon stays editable. Can pull icons via Codex's
built-in `Browser` plugin (defaulting to Flaticon) when licensing and
attribution are clear. Self-contained — it embeds its own draw.io generation
rules rather than depending on another skill.

Example requests:

```text
/codex-paper-figure-skill turn this methods paragraph into a mechanism figure
/codex-paper-figure-skill create a model architecture diagram from this section
/codex-paper-figure-skill draft a graphical abstract for this paper's workflow
/codex-paper-figure-skill build a multi-panel figure comparing these two conditions
```

## License

Original content in this collection follows the repository-level
[MIT License](../../LICENSE), unless a skill states otherwise. External
services, datasets, and bundled reference material used by a skill keep their
own terms.
