# Paper Library Schema

This schema extends the bundled OKF v0.1 snapshot in [SPEC.md](SPEC.md). Treat
[SPEC.md](SPEC.md) as the base format contract for bundle structure, concept
documents, frontmatter, links, index files, and citations. Treat this
file as the stricter paper-library profile layered on top of OKF.

If this file is silent on a format question, follow [SPEC.md](SPEC.md). If this
file is stricter than [SPEC.md](SPEC.md), follow this file for `paper-library/`
content so Codex can maintain papers and topics consistently.

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

The default paper body profile lives at
[`../assets/paper-library.toml`](../assets/paper-library.toml), relative to
this reference file. That asset controls the preferred paper body layout for
this repo-local paper-library manager:

```toml
[paper_body]
default_profile = "research-note"
preserve_existing_layout = true
required_sections = []
recommended_sections = [
  "Summary",
  "Key Ideas",
  "Notes",
  "Related",
  "Citations",
]

[paper_body.profiles.research-note]
sections = [
  "Summary",
  "Key Ideas",
  "Method",
  "Experiments",
  "Limitations",
  "Notes",
  "Related",
  "Citations",
]

[paper_body.profiles.implementation]
sections = [
  "What To Reproduce",
  "Algorithm",
  "Data",
  "Metrics",
  "Engineering Notes",
  "Failure Modes",
]

[paper_body.profiles.survey-card]
sections = [
  "One-line Takeaway",
  "Research Context",
  "Method Family",
  "Compared With",
  "Useful For",
  "Open Questions",
]
```

Use profile `sections` to create new paper files. Use `required_sections` only
for validation. `recommended_sections` are guidance, not validation failures.
Set `required_sections = []` when section layout should remain fully
personalized. For a one-off paper style, derive a temporary profile from the
asset config and persist it only when the user asks.

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

## Required Bundle Outputs

`paper-library/viz.html` is a required generated artifact. Use `viz.html` as
the canonical filename; do not create `vis.html` unless a user explicitly asks
for an additional alias.

Generate the visualization after paper, topic, or index edits. The bundled
script is a paper-library wrapper around the OKF reference viewer in `okf/src`;
it is not a separate viewer implementation.

```bash
python .agents/skills/paper-library-manager/scripts/generate_viz.py paper-library
```

The generated file must include OKF viewer `window.BUNDLE` graph data for every
paper and topic concept so the validator can detect stale or missing
visualizations.

## Validation

Validate a library with the bundled standard-library script:

```bash
python .agents/skills/paper-library-manager/scripts/validate_paper_library.py paper-library
```

The validator reads
`.agents/skills/paper-library-manager/assets/paper-library.toml` by default.
Pass `--config <path/to/paper-library.toml>` only for a temporary validation
profile or another repo layout.

The script checks OKF frontmatter, paper and topic required fields, configured
paper body requirements, topic body sections, internal links, bidirectional
paper-topic links, required index files, and the required `viz.html` graph
artifact.
