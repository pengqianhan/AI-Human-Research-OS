---
name: paper-library-manager
description: Manage an OKF paper library under `paper-library/` or another user-named library root. Use when asked to add arXiv or research-paper URLs, update paper notes, maintain paper/topic indexes, automatically create or update topic summary pages for important new themes, normalize paper metadata, track reading status, compare papers, generate required `viz.html` visualizations, or validate the paper library.
---

# Paper Library Manager

## Overview

Maintain an OKF paper library as Markdown files with YAML frontmatter. Keep paper content in `paper-library/` unless the user names another library root; keep `<library-root>/viz.html` as the required generated graph. Treat `references/SPEC.md` as the bundled OKF format snapshot and `references/schema.md` as the stricter paper-library profile.

## Scope

Use `paper-library/` as the default library root unless the user names a different path. Treat every non-reserved `.md` file in that tree as an OKF concept.

## Workflow

When adding or updating a paper:

1. Parse the arXiv ID from the URL or user input.
2. Read the existing paper file if `paper-library/papers/<arxiv_id>.md` already exists.
3. Read `assets/paper-library.toml` from this skill and follow its paper body profile settings.
4. Fetch or verify metadata from authoritative sources when network access is available. Prefer arXiv for bibliographic facts; use project pages, GitHub, Hugging Face paper pages, or Semantic Scholar only as additional sources.
5. Create or update one paper concept under `paper-library/papers/`.
6. Identify 1 to 3 important themes from the paper's title, abstract, method, benchmarks, and contributions.
7. Reuse existing topic pages when they cover those themes; otherwise create new `paper-library/topics/<slug>.md` topic summary pages without waiting for an explicit user request.
8. Add concise topic links under the paper body and add the paper to each affected topic's `# Papers` section.
9. Update `paper-library/papers/index.md`, `paper-library/topics/index.md`, and every affected `paper-library/topics/*.md`.
10. Preserve user notes, reading status, priority, body layout, and manually curated tags unless the user explicitly asks to change them.
11. Regenerate `paper-library/viz.html` with the bundled visualization script.
12. Cite only sources that were actually used.

## Paper Documents

Use `references/SPEC.md` as the base OKF format reference and `references/schema.md` as the stricter paper-library profile.

Paper bodies are user-customizable Markdown. Do not treat any one summarization template as part of the OKF contract. Use `assets/paper-library.toml` as the default paper body configuration for this skill. When reading the config, enumerate all `paper_body.profiles` entries. Use `paper_body.default_profile` by default, but choose another profile when the user requests it or when the paper clearly fits that profile better, such as implementation-focused papers, survey papers, benchmark papers, method papers, or future profile types added to the config. Use the selected `paper_body.profiles.<name>.sections` list for new paper bodies. Treat `paper_body.required_sections` as validation requirements only when the user configures them.
Use `paper_body.section_descriptions` as drafting guidance for what each section should contain. Do not copy those descriptions into generated paper notes unless the user explicitly asks for visible prompts.

If a specific paper needs a different summarization style, derive a temporary profile or template from the asset config for that paper, and persist the new profile only when the user asks. Keep generated summaries concise and distinguish paper claims from personal notes. If a paper has not been read in full, avoid presenting speculative critique as established fact. Preserve existing paper body layout when updating a paper unless the user explicitly asks to reorganize it.

## Topic Documents

Use topic concepts for stable themes such as `multi-agent-systems`, `llm-agents`, `ai-for-science`, `agent-self-evolution`, `benchmarks`, or named methods. A topic page should list related papers and open questions, not duplicate each paper's full summary.

Create or update topic pages proactively whenever a new paper introduces an important theme. Important themes usually satisfy at least two of these conditions:

* The theme appears in the title, abstract, method name, benchmark name, or central contribution.
* The theme could group multiple current or future papers.
* The theme is useful for retrieval, comparison, or literature-review synthesis.
* The theme is more specific than a broad field label such as `ai` or `machine-learning`.

Do not create a topic for every tag. Tags can be granular; topic pages should represent durable synthesis nodes. Prefer reusing an existing topic when the new theme is semantically equivalent to one already present.

Every topic page should include `# Scope`, `# Papers`, and `# Open Questions`. When a topic has two or more papers, optionally add `# Synthesis` with concise cross-paper observations.

When adding a new topic, update `paper-library/topics/index.md`. Ensure links are bidirectional: the paper links to the topic, and the topic links back to the paper.

## Indexes

Maintain index files as plain Markdown without frontmatter. Sort paper entries by arXiv ID or submitted date when the user does not specify a preference. Keep descriptions one sentence.

## Metadata Rules

Preserve these user-curated fields when updating a paper:

* `status`
* `priority`
* `tags`
* `# Notes`
* any custom frontmatter keys not defined in `references/schema.md`

Use `status: unread` for newly added papers unless the user says otherwise. Recommended status values are `unread`, `skimmed`, `read`, and `summarized`.

## Validation

Before finishing paper-library edits:

* Check that every paper has `type: Paper`, `title`, `description`, `resource`, `arxiv_id`, `pdf_url`, `doi`, `authors`, `submitted`, `tags`, `status`, `priority`, and `timestamp`.
* Check configured paper body sections only when `assets/paper-library.toml` sets `paper_body.required_sections`.
* Check that internal Markdown links resolve within `paper-library/`.
* Check that index entries point to existing files.
* Regenerate the required graph artifact after content edits. Run bundled scripts from this skill's root directory, using paths relative to the directory that contains this `SKILL.md`. Pass the library root as an absolute path when the target repo is not the current working directory:
  Do not run validation in parallel with graph generation; the validator reads `viz.html`, so generate the graph first and validate only after that command completes.

```bash
uv run scripts/generate_viz.py /absolute/path/to/paper-library
```

* Run the bundled paper-library validator after content edits:

```bash
uv run scripts/validate_paper_library.py /absolute/path/to/paper-library
```

If `uv` is unavailable and the environment already has Python 3.11+, run the scripts directly with `python`:

```bash
python scripts/generate_viz.py /absolute/path/to/paper-library
python scripts/validate_paper_library.py /absolute/path/to/paper-library
```

Use `--config <path/to/paper-library.toml>` only for a temporary validation profile or another repo layout.

If your environment provides a skill validator, run it against this skill folder after editing the skill itself.

## Visualization

`paper-library/viz.html` is required. Use `viz.html` as the canonical filename; treat `vis.html` as a typo unless the user explicitly asks for a separate alias.

Generate the graph view with the bundled self-contained script:

```bash
uv run scripts/generate_viz.py /absolute/path/to/paper-library
```

`scripts/generate_viz.py` renders the same Cytoscape graph + detail-pane viewer as the OKF reference (`enrichment_agent.viewer`) by injecting `scripts/templates/viz.html`, `scripts/static/viz.css`, and `scripts/static/viz.js`. Keep those sibling asset files alongside the script so the generated `viz.html` stays format-consistent with okf bundle viewers; only the bundle name and graph data differ.

The final bundle must pass the bundled validator. This skill carries its own schema references and visualization script.

## Comparison Tasks

When comparing papers, write the comparison as a separate note only if the user asks for a durable artifact. Otherwise answer in chat and reference the paper files. Compare along concrete axes such as problem framing, method, evidence, assumptions, failure modes, reusable artifacts, and relevance to the user's research direction.
