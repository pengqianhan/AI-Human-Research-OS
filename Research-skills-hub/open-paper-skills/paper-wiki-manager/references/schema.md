# Paper Wiki Schema

This schema extends the bundled OKF v0.1 snapshot in [SPEC.md](SPEC.md). Treat
[SPEC.md](SPEC.md) as the base format contract for bundle structure, concept
documents, frontmatter, links, index files, and citations. Treat this
file as the stricter paper-wiki profile layered on top of OKF.

If this file is silent on a format question, follow [SPEC.md](SPEC.md). If this
file is stricter than [SPEC.md](SPEC.md), follow this file for `paper-wiki/`
content so agents can maintain papers, topics, and concept entity pages
consistently. The default wiki bundle root is `paper-wiki/`.

## Paper Frontmatter

Required fields for `paper-wiki/papers/<arxiv_id>.md`:

```yaml
---
type: Paper
title: Paper title
description: One sentence summary for indexes and search.
resource: https://arxiv.org/abs/<arxiv_id>
arxiv_id: "<arxiv_id>"
authors:
- Author One
submitted: YYYY-MM-DD
tags:
- short-topic-tag
status: unread
priority: normal
timestamp: YYYY-MM-DDTHH:MM:SSZ
---
```

Keep the frontmatter lean: `arxiv_id` is the paper's key, and `resource`
(`https://arxiv.org/abs/<arxiv_id>`) is the one canonical link kept because the
viewer and generic OKF tools consume it. Do not store `pdf_url` or `doi` — both
are pure functions of `arxiv_id`, so derive them on demand instead of
denormalizing them into every file. `subjects` (arXiv categories) is likewise
omitted by default; add it only if a task needs category filtering.

Optional fields (add only when they carry real information):

```yaml
project_url: https://example.com
code_url: https://github.com/org/repo
venue: Conference or journal name
reading_round: 1
```

## Paper Body

Paper body is user-customizable Markdown. The paper-wiki profile does not
make any single summarization template part of the OKF contract.

The default paper body profile is defined entirely in
[`../assets/paper-wiki.toml`](../assets/paper-wiki.toml) (relative to this
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
`default_profile`'s `sections` to create new paper files when no better match is
clear. Agents should enumerate all configured profiles and may choose another
profile when the user requests it or when the paper clearly fits that profile
better. For a one-off paper style, derive a temporary profile from the asset
config and persist it only when the user asks. A profile may also define an
optional `description` string so agents can choose among user-defined profiles
without guessing from the profile name alone.
When a profile section has a matching `section_descriptions` entry, use that
description as drafting guidance; do not copy it into the paper body unless the
user asks for visible prompts.

Use `scripts/create_paper_body_profile.py` to create a profile from a user's
plain-language template request. By default, the script writes the finished
profile into the bundled `assets/paper-wiki.toml` so the profile is reusable
later; use `--preview` only when the user wants a draft without saving. Use
`--config` for wiki-specific configs. Do not change
`paper_body.default_profile` unless the user explicitly asks; use `--set-default`
only in that case. Use `--language english` when a user requires an English-only
template; the script will reject non-ASCII profile descriptions, section names,
and section guidance before any TOML is written.

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

Topic files live in `paper-wiki/topics/<slug>.md`:

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

## Concept Frontmatter

Concept (entity) pages live in `paper-wiki/concepts/<slug>.md`:

```yaml
---
type: Benchmark
title: Entity Name
description: One sentence describing the entity.
tags:
- entity-tag
timestamp: YYYY-MM-DDTHH:MM:SSZ
---
```

`type` must be one of `Method`, `Dataset`, `Benchmark`, `Metric`, `Term`, or
`Tool`. Optional fields: `resource` (canonical URL for the entity) and
`aliases` (a list of alternative names).

Default concept body:

```markdown
# Definition

# Papers
```

`# Definition` states what the entity is in a few sentences. `# Papers` lists
wiki papers that use or reference the entity, each with a one-line note on how.
Optional sections: `# Notes`, `# Related`.

Concept pages are entity pages, not themes: a topic groups papers around a
research theme, while a concept names one concrete thing (a method, dataset,
benchmark, metric, term, or tool). Create a concept page when two or more
papers reference the entity, when it is a durable field-level entity likely to
recur, or when the user asks to track it. Do not create a concept page for a
method that only its own paper describes. Keep concept slugs lowercase and
hyphenated, for example `mle-bench-lite.md` or `llm-as-a-judge.md`.

Links must be bidirectional: a paper that links to a concept must appear in
that concept's `# Papers` section, and vice versa.

## Used In Projects

A paper may record where it is used in the surrounding repository's research
projects with an optional `# Used In Projects` body section:

```markdown
# Used In Projects

* [my-project](../../projects-folder/my-project/index.md) - baseline method for the packing experiments.
```

Link a Markdown file such as the project's `index.md`, not the bare directory —
the validator only checks link targets ending in `.md`. These links
intentionally point outside the wiki bundle. The validator accepts an
outside-bundle link when its target exists on disk and reports it as an error
when it does not. No backlink from the project is required.
Project-specific use of a paper (BibTeX entries, claims, experiments) stays in
the project; the wiki only records the pointer.

## Links

Use **relative** Markdown links between concepts (for example `../topics/foo.md`
or a sibling `2606.13662.md`), not the bundle-root-absolute form recommended by
[SPEC.md](SPEC.md) §5.1. This is intentional: the bundle is distributed as a
subdirectory of a larger repository, where GitHub and common editors resolve
`/`-rooted links against the repo root rather than the bundle root, which would
break navigation. Relative links keep clicks working on GitHub, in editors, and
when the folder is copied elsewhere. Do not rewrite them to absolute paths.

## Required Bundle Outputs

`paper-wiki/viz.html` is a required generated artifact. Use `viz.html` as
the canonical filename; do not create `vis.html` unless a user explicitly asks
for an additional alias.

Generate the visualization after paper, topic, concept, or index edits. Run bundled
scripts from the skill root, using paths relative to the directory that
contains `SKILL.md`.

```bash
uv run scripts/generate_viz.py /absolute/path/to/paper-wiki
```

The generated file must include OKF viewer `window.BUNDLE` graph data for every
paper and topic concept so the validator can detect stale or missing
visualizations.

## Validation

Validate a library with the bundled standard-library script:

```bash
uv run scripts/validate_paper_wiki.py /absolute/path/to/paper-wiki
```

The validator reads `assets/paper-wiki.toml` from the installed skill by
default. Pass `--config <path/to/paper-wiki.toml>` only for a temporary
validation profile or another repo layout. If `uv` is unavailable and the
environment already has Python 3.11+, run the scripts directly with `python`:

```bash
python scripts/generate_viz.py /absolute/path/to/paper-wiki
python scripts/validate_paper_wiki.py /absolute/path/to/paper-wiki
```

The script checks OKF frontmatter; paper, topic, and concept required fields;
configured paper body requirements; topic and concept body sections; internal
links; outside-bundle project links; bidirectional paper-topic and
paper-concept links; required index files (`concepts/index.md` is required once
any concept page exists); and the required `viz.html` graph artifact.
