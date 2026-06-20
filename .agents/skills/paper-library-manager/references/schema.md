# Paper Library Schema

This schema extends the bundled OKF v0.1 snapshot in [SPEC.md](SPEC.md). Treat
[SPEC.md](SPEC.md) as the base format contract for bundle structure, concept
documents, frontmatter, links, index files, and citations. Treat this
file as the stricter paper-library profile layered on top of OKF.

If this file is silent on a format question, follow [SPEC.md](SPEC.md). If this
file is stricter than [SPEC.md](SPEC.md), follow this file for `paper-library/`
content so agents can maintain papers and topics consistently.

## Paper Frontmatter

Required fields for `paper-library/papers/<arxiv_id>.md`:

```yaml
---
type: Paper
title: Paper title
description: One sentence summary for indexes and search.
resource: https://arxiv.org/abs/<arxiv_id>
arxiv_id: "<arxiv_id>"
pdf_url: https://arxiv.org/pdf/<arxiv_id>
doi: https://doi.org/10.48550/arXiv.<arxiv_id>
authors:
- Author One
submitted: YYYY-MM-DD
subjects:
- cs.AI
tags:
- short-topic-tag
status: unread
priority: normal
timestamp: YYYY-MM-DDTHH:MM:SSZ
---
```

Optional fields:

```yaml
project_url: https://example.com
code_url: https://github.com/org/repo
venue: Conference or journal name
reading_round: 1
```

## Paper Body

Paper body is user-customizable Markdown. The paper-library profile does not
make any single summarization template part of the OKF contract.

The default paper body profile is defined entirely in
[`../assets/paper-library.toml`](../assets/paper-library.toml) (relative to this
reference file). **That asset is the single source of truth for paper body
layout.** This document explains how its keys are used but deliberately does not
restate their values, so the asset and this reference cannot drift apart — read
the asset to get the current profile names and section lists.

The `[paper_body]` table defines:

- `default_profile` — the profile used for new paper bodies. Must name a profile
  defined under `[paper_body.profiles.*]`.
- `preserve_existing_layout` — whether to keep an existing paper's section layout
  when updating it.
- `required_sections` — sections the validator enforces. Empty means the layout
  is fully personalized and nothing is enforced.
- `recommended_sections` — guidance only; never a validation failure.
- `section_descriptions` — optional descriptions keyed by section title. Agents
  should use these descriptions to understand what each section is meant to
  contain when drafting or updating paper notes.

Each `[paper_body.profiles.<name>]` table defines a `sections` list. Use the
`default_profile`'s `sections` to create new paper files, or another profile's
`sections` when it fits the paper better. For a one-off paper style, derive a
temporary profile from the asset config and persist it only when the user asks.
When a profile section has a matching `section_descriptions` entry, use that
description as drafting guidance; do not copy it into the paper body unless the
user asks for visible prompts.

If the asset config is unavailable during manual drafting, infer the body
layout from existing papers before falling back to a simple research-note
layout:

```markdown
# Summary

# Key Ideas

# Method

# Experiments

# Limitations

# Notes

# Related

# Citations
```

Omit sections that do not fit the paper or the user's chosen profile. Preserve
existing body layout and user-authored notes when updating a paper unless the
user asks to reorganize them.

## Topic Frontmatter

Topic files live in `paper-library/topics/<slug>.md`:

```yaml
---
type: Topic
title: Topic Name
description: One sentence describing the topic.
tags:
- topic-tag
timestamp: YYYY-MM-DDTHH:MM:SSZ
---
```

Default topic body:

```markdown
# Scope

# Papers

# Synthesis

# Open Questions
```

Use topic files to connect papers and track open questions. Do not duplicate full paper summaries in topic files. Omit `# Synthesis` until the topic has enough related papers to support a useful cross-paper observation.

Create topic files proactively for important new themes when adding papers. Keep topic slugs lowercase and hyphenated, for example `agent-self-evolution.md` or `long-context-reasoning.md`.

## Links

Use **relative** Markdown links between concepts (for example `../topics/foo.md`
or a sibling `2606.13662.md`), not the bundle-root-absolute form recommended by
[SPEC.md](SPEC.md) §5.1. This is intentional: the bundle is distributed as a
subdirectory of a larger repository, where GitHub and common editors resolve
`/`-rooted links against the repo root rather than the bundle root, which would
break navigation. Relative links keep clicks working on GitHub, in editors, and
when the folder is copied elsewhere. Do not rewrite them to absolute paths.

## Required Bundle Outputs

`paper-library/viz.html` is a required generated artifact. Use `viz.html` as
the canonical filename; do not create `vis.html` unless a user explicitly asks
for an additional alias.

Generate the visualization after paper, topic, or index edits. Run bundled
scripts from the skill root, using paths relative to the directory that
contains `SKILL.md`.

```bash
uv run scripts/generate_viz.py /absolute/path/to/paper-library
```

The generated file must include OKF viewer `window.BUNDLE` graph data for every
paper and topic concept so the validator can detect stale or missing
visualizations.

## Validation

Validate a library with the bundled standard-library script:

```bash
uv run scripts/validate_paper_library.py /absolute/path/to/paper-library
```

The validator reads `assets/paper-library.toml` from the installed skill by
default. Pass `--config <path/to/paper-library.toml>` only for a temporary
validation profile or another repo layout. If `uv` is unavailable and the
environment already has Python 3.11+, run the scripts directly with `python`:

```bash
python scripts/generate_viz.py /absolute/path/to/paper-library
python scripts/validate_paper_library.py /absolute/path/to/paper-library
```

The script checks OKF frontmatter, paper and topic required fields, configured
paper body requirements, topic body sections, internal links, bidirectional
paper-topic links, required index files, and the required `viz.html` graph
artifact.
