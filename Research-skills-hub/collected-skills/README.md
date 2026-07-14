# Collected Skills

Skills collected, adapted, or locally added for use with Open Paper and the
AI-Human Research OS. For externally sourced skills, keep upstream attribution,
inspect each `SKILL.md`, and verify license terms before redistributing or
publishing modified copies.

This README is the collected-skills split from
`/Users/pengqianhan/Documents/GitHub/Opensource/open-paper-skills/README.md`
at source commit `8f854bd`.

## Skills

| Skill | Description | Source |
| --- | --- | --- |
| [ml-paper-writing](ml-paper-writing/SKILL.md) | Write publication-ready ML/AI papers for NeurIPS, ICML, ICLR, ACL, AAAI, and COLM. | [Orchestra-Research/AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs), MIT |
| [pyzotero](pyzotero/SKILL.md) | Programmatically manage Zotero libraries: retrieve, create, update, export, and upload items. | [K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills), MIT |
| [drawio](drawio/SKILL.md) | Generate and export draw.io diagrams as `.drawio`, PNG, SVG, or PDF. | [jgraph/drawio-mcp](https://github.com/jgraph/drawio-mcp) |
| [hugging-face-paper-pages](hugging-face-paper-pages/SKILL.md) | Look up and read Hugging Face paper pages and structured AI paper metadata. | [huggingface/skills](https://github.com/huggingface/skills/blob/main/skills/hugging-face-paper-pages/SKILL.md) |
| [paper-finder](paper-finder/SKILL.md) | Find and organize ML/AI research papers into a reusable topic knowledge base with summaries and BibTeX. | [bchao1/paper-finder](https://github.com/bchao1/paper-finder/tree/main), adapted |
| [deepxiv-cli](deepxiv-cli/SKILL.md) | Access open-access academic papers via CLI with hybrid search and section-level reads. | [DeepXiv/deepxiv_sdk](https://github.com/DeepXiv/deepxiv_sdk/tree/main), adapted |
| [deepxiv-baseline-table](deepxiv-baseline-table/SKILL.md) | Build markdown baseline comparison tables from DeepXiv search and targeted section reads. | [DeepXiv/deepxiv_sdk](https://github.com/DeepXiv/deepxiv_sdk/tree/main), adapted |
| [deepxiv-trending-digest](deepxiv-trending-digest/SKILL.md) | Summarize trending papers into a concise markdown digest with deep-dive recommendations. | [DeepXiv/deepxiv_sdk](https://github.com/DeepXiv/deepxiv_sdk/tree/main), adapted |
| [grill-for-unknowns](grill-for-unknowns/SKILL.md) | Interrogate a plan against docs/source evidence, surface unknown unknowns, and avoid rushing into build mode. | [nicobailon/grill-for-unknowns](https://github.com/nicobailon/grill-for-unknowns), MIT |
| [hf-cli](hf-cli/SKILL.md) | Hugging Face Hub CLI (`hf`) for downloading, uploading, and managing models, datasets, spaces, buckets, repos, papers, jobs, and more. | [huggingface/skills](https://github.com/huggingface/skills/blob/main/skills/hf-cli/SKILL.md) |
| [explain-diff-html](explain-diff-html/SKILL.md) | Explain code changes, diffs, branches, or PRs as rich interactive HTML. | [geoffreylitt/a29df1b5f9865506e8952488eac3d524](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524) |
| [arxiv2md](arxiv2md/SKILL.md) | Convert arXiv papers to clean, LLM-ready Markdown (math, tables, sections) via a REST API. | [timf34/arxiv2md](https://github.com/timf34/arxiv2md), MIT |
| [alphaxiv-paper-lookup](alphaxiv-paper-lookup/SKILL.md) | Look up arXiv papers on AlphaXiv for structured AI-generated overviews. | Source unknown — moved from `open-paper-skills`, upstream not yet identified |
| [Deli_AutoResearch](Deli_AutoResearch/SKILL.md) | Provide state, stall-detection, and watchdog protocols for long-horizon autonomous agent tasks. | [Deli AutoResearch framework](https://victorchen96.github.io/auto_research/framework.html#fullmd) |
| [baseline-selector](baseline-selector-main/SKILL.md) | Select reproducible experimental baselines with GitHub evidence, compute-aware sets, and reviewer-risk checks. | [RyanZhou168/baseline-selector](https://github.com/RyanZhou168/baseline-selector/tree/main), MIT |

## Installation

Install a skill into both agent skill directories:

```bash
cp -R Research-skills-hub/collected-skills/<skill> .agents/skills/<skill>
cp -R Research-skills-hub/collected-skills/<skill> .claude/skills/<skill>
```

Keep `.agents/skills/` and `.claude/skills/` byte-identical.

## Prerequisites

- `ml-paper-writing`: LaTeX distribution such as TeX Live, plus optional Python
  packages `semanticscholar`, `arxiv`, `habanero`, and `requests`.
- `pyzotero`: `pyzotero` Python package and a Zotero API key.
- `drawio`: draw.io desktop app for PNG, SVG, and PDF export.
- `hugging-face-paper-pages`: no local setup for public paper pages.
- `paper-finder`: web access is recommended for current paper discovery.
- `deepxiv-cli`, `deepxiv-baseline-table`, and `deepxiv-trending-digest`:
  DeepXiv CLI via `pip install deepxiv-sdk`.
- `grill-for-unknowns`: no additional local setup required; it is a planning/interview
  workflow that reads docs, source, and existing files already in the repo.
- `hf-cli`: Hugging Face CLI via `curl -LsSf https://hf.co/cli/install.sh | bash -s`. Set `HF_TOKEN` for authenticated access.
- `explain-diff-html`: no local setup required.
- `arxiv2md`: no local setup required; calls the public `https://arxiv2md.org` REST API (30 requests/min per IP, no key).
- `alphaxiv-paper-lookup`: no local setup required; calls the public
  `https://alphaxiv.org` endpoints, no auth or key.
- `Deli_AutoResearch`: no additional local setup required; it is a self-contained
  protocol specification with no executable code.
- `baseline-selector`: no additional local setup required; Codex alone is enough
  to use the skill.

## ml-paper-writing

Drafts ML/AI papers from research repositories, enforces citation checks, and
provides templates for major venues.

Supported venues include NeurIPS, ICML, ICLR, ACL, EMNLP, NAACL, AAAI, COLM,
IEEE, and ACM formats. The skill includes templates under
[ml-paper-writing/templates/](ml-paper-writing/templates/) and writing/citation
guides under [ml-paper-writing/references/](ml-paper-writing/references/).

Example requests:

```text
/ml-paper-writing write a NeurIPS paper from this repo
/ml-paper-writing draft the related work section for ICLR
/ml-paper-writing convert this NeurIPS submission to ICML format
/ml-paper-writing verify and fix citations in main.tex
```

## pyzotero

Uses the pyzotero Python client to manage Zotero libraries through the Zotero
Web API.

Setup:

```bash
export ZOTERO_LIBRARY_ID=your_user_id
export ZOTERO_API_KEY=your_api_key
export ZOTERO_LIBRARY_TYPE=user
uv add pyzotero
```

Example requests:

```text
/pyzotero search my library for papers on transformers
/pyzotero export all items in the "NeurIPS 2025" collection as BibTeX
/pyzotero add a new journal article entry for this paper
/pyzotero upload this PDF as an attachment to item ABC123
```

## drawio

Generates native draw.io diagrams and optionally exports to PNG, SVG, or PDF.

For export, the draw.io desktop app must be installed. The skill checks common
CLI locations such as `/Applications/draw.io.app/Contents/MacOS/draw.io` on
macOS.

Example requests:

```text
/drawio create a system architecture diagram
/drawio png flowchart for the training pipeline
/drawio svg ER diagram for the database schema
/drawio pdf overview of the model architecture
```

## hugging-face-paper-pages

Fetches Hugging Face paper markdown and structured metadata such as authors,
linked models, linked datasets, Spaces, GitHub repositories, and project pages.

Example requests:

```text
/hugging-face-paper-pages summarize https://huggingface.co/papers/2602.08025
/hugging-face-paper-pages explain paper 2602.08025
/hugging-face-paper-pages find models linked to this paper
```

## paper-finder

Finds, ranks, and organizes related papers into a persistent topic workspace.

Default workspace layout:

```text
<topic-name>/
  memory-bank.md
  mind-graph.md
  references.bib
  summaries/
  discussions/
  pdfs/
```

Example requests:

```text
/paper-finder find papers on mixed-resolution diffusion transformers
/paper-finder build a literature review workspace for efficient video generation
/paper-finder compare recent CVPR and ICCV papers on 3D Gaussian splatting
```

## deepxiv-cli

Uses the DeepXiv CLI for hybrid paper search and token-efficient paper reading.

Example requests:

```text
/deepxiv-cli search papers about agent memory from this month
/deepxiv-cli read arXiv 2409.05591 with --brief
/deepxiv-cli show sections for 2409.05591 with --head
/deepxiv-cli summarize the Introduction section of 2409.05591
```

## deepxiv-baseline-table

Builds comparison-ready baseline tables by combining DeepXiv search, brief
screening, structure inspection, and targeted experiment-section reads.

Typical output columns:

| Title | arXiv | URL | Open Source | Code URL | Datasets / Benchmarks | Metrics / Scores | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |

Example requests:

```text
/deepxiv-baseline-table build a baseline table for agentic memory papers in the last 30 days
/deepxiv-baseline-table compare datasets and benchmark scores for recent multimodal reasoning papers
```

## deepxiv-trending-digest

Turns recent DeepXiv trending papers into a concise markdown digest with themes,
per-paper takeaways, and deep-dive recommendations.

Example requests:

```text
/deepxiv-trending-digest make a 7-day trending digest and highlight top 3 papers worth deeper reading
/deepxiv-trending-digest summarize this week's hottest papers and suggest next sections to read
```

## hf-cli

Uses the Hugging Face Hub CLI (`hf`) to manage models, datasets, spaces, buckets,
repos, papers, jobs, inference endpoints, and more.

Install:

```bash
curl -LsSf https://hf.co/cli/install.sh | bash -s
export HF_TOKEN=your_token   # optional but recommended
```

Example requests:

```text
/hf-cli download meta-llama/Llama-3.1-8B to ./models/
/hf-cli upload my-org/my-dataset ./data/
/hf-cli list my models
/hf-cli search datasets for image classification
/hf-cli read paper 2502.08025
/hf-cli run a GPU job with image pytorch/pytorch
/hf-cli deploy an inference endpoint for meta-llama/Llama-3.1-8B
/hf-cli create a bucket and sync checkpoints
```

## explain-diff-html

Produces a rich, self-contained HTML explanation of a code change, diff, branch,
or PR, with background, intuition, a code walkthrough, diagrams, and an
interactive quiz.

Companion blog: [Understanding is the new bottleneck](https://www.geoffreylitt.com/2026/07/02/understanding-is-the-new-bottleneck.html).

Example requests:

```text
/explain-diff-html explain the diff between HEAD and main
/explain-diff-html explain PR #123 as an HTML walkthrough
/explain-diff-html explain this branch's UI changes for a beginner reader
```

## Moved: engineering and productivity bundles

The `engineering/` and `productivity/` bundles from
[mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills) now
live in the top-level [mattpocock-skills](../mattpocock-skills/index.md)
collection (read-only vendored mirror). See
[ADR 0001](../docs/adr/0001-external-skill-intake-and-sync.md).

## arxiv2md

Converts arXiv papers into clean, LLM-ready Markdown by parsing arXiv's native
HTML (not PDFs), preserving math, tables, and section structure. Backed by the
public `https://arxiv2md.org` REST API — no auth or key.

Example requests:

```text
/arxiv2md convert 2501.11120 to markdown
/arxiv2md fetch the markdown for https://arxiv.org/abs/2501.11120
/arxiv2md get arxiv2md JSON with metadata for 2501.11120
```

## alphaxiv-paper-lookup

Fetches structured AI-generated overviews from AlphaXiv for arXiv papers. It
can fall back to AlphaXiv's full extracted paper text when the overview is not
detailed enough.

Supported inputs include arXiv URLs, AlphaXiv URLs, and raw arXiv IDs.

> Provenance note: moved here from `open-paper-skills` — the original upstream
> source (if any) hasn't been identified yet. Update the Source column above if
> it surfaces.

Example requests:

```text
/alphaxiv-paper-lookup summarize 2401.12345
/alphaxiv-paper-lookup explain https://arxiv.org/abs/2401.12345
```

## grill-for-unknowns

Interrogates a plan against docs/source evidence before implementation begins,
combining docs-grounded grilling, one-question-at-a-time interviewing, domain
modeling, and a four-quadrant known/unknown pass (known knowns, known
unknowns, unknown knowns, unknown unknowns) to find the few answers that would
materially change the plan.

Example requests:

```text
/grill-for-unknowns grill this implementation plan before I start building
/grill-for-unknowns run a blindspot pass over the new payments integration
/grill-for-unknowns pressure-test my design against the API docs before I commit
/grill-for-unknowns prepare a launch packet for the subagent that will build this
```

## Deli_AutoResearch

Provides a protocol framework for long-horizon autonomous tasks, including
file-backed state, quantitative stall detection, structural pivots, and layered
heartbeat watchdogs. It ships no executable code.

Example requests:

```text
/Deli_AutoResearch design a file-backed state protocol for this week-long research task
/Deli_AutoResearch add stall detection and structural pivot rules to this autonomous loop
/Deli_AutoResearch design a three-layer heartbeat watchdog for unattended agent work
/Deli_AutoResearch audit this orchestration plan for cognitive loops and runtime fragility
```

## baseline-selector

Selects, audits, and justifies experimental baselines for research ideas,
benchmarks, paper drafts, and experiment plans. It admits only candidates with
usable GitHub implementations, then builds compute-aware baseline sets and
checks reviewer risk.

Example requests:

```text
/baseline-selector choose baselines for my AAAI 2027 multimodal retrieval project
/baseline-selector audit this paper draft for missing reviewer-expected baselines
/baseline-selector build a minimal baseline set for a four-A100 compute budget
/baseline-selector verify whether these candidate methods have reproducible GitHub repositories
```

## Credits And License Boundary

These skills keep the provenance listed in the table above. The repository-level
MIT license covers original local skills but does not override third-party or
upstream license terms for collected skills. When an externally sourced skill has
no local license file, check the upstream project before redistributing it.
