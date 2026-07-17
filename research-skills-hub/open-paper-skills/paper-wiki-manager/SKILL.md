---
name: paper-wiki-manager
description: Maintain an OKF paper wiki under `paper-wiki/` or another user-named wiki root. Use when asked to add arXiv or research-paper URLs, capture non-paper sources such as blog posts, docs, or talks, update paper notes, maintain paper/topic/concept/source indexes, automatically create or update topic summary pages for important new themes, maintain concept entity pages for methods, datasets, benchmarks, metrics, terms, or tools, link papers to research projects, normalize paper metadata, track reading status, compare papers, generate required `viz.html` visualizations, or validate the paper wiki.
---

# Paper Wiki Manager

## Overview

Maintain an OKF paper wiki as Markdown files with YAML frontmatter: one page per paper, one page per topic, and one page per recurring named entity (method, dataset, benchmark, metric, term, or tool), all cross-linked in both directions. Keep wiki content in `paper-wiki/` unless the user names another wiki root; keep `<wiki-root>/viz.html` as the required generated graph. Treat `references/SPEC.md` as the bundled OKF format snapshot and `references/schema.md` as the stricter paper-wiki profile.

This skill supersedes `paper-library-manager`, which managed the same kind of bundle under the historical root name `paper-library/`.

## Scope

Use `paper-wiki/` as the default wiki root unless the user names a different path. Treat every non-reserved `.md` file in that tree as an OKF concept. The wiki has four page collections: `papers/` (one page per arXiv paper), `topics/` (thematic synthesis pages), `concepts/` (entity pages for named methods, datasets, benchmarks, metrics, terms, and tools), and `sources/` (non-paper reading — blogs, docs, talks — as `type: Reference`).

## Workflow

When adding or updating a paper:

1. Parse the arXiv ID from the URL, user input, or PDF filename/path. For a PDF, check the filename first (e.g., `2401.00001.pdf`); if the ID is not in the filename, extract it from the PDF header or `arxiv.org` URL embedded in the document.
   **If no ID can be extracted** (user provided only a title or keyword): run `hf papers search "TITLE" --limit 5 --format agent` (or fall back to the `literature_search_arxiv` skill if HF CLI is unavailable), show the top candidates to the user, and wait for confirmation before proceeding. Do not guess the ID.
2. Read the existing paper file if `paper-wiki/papers/<arxiv_id>.md` already exists.
3. Read `assets/paper-wiki.toml` from this skill and follow its paper body profile settings.
4. Fetch metadata and paper content. Use the **HF CLI fast path** (see below) when `hf` is available — run `which hf` to check. Fall back to arXiv API or web fetch only when HF CLI is unavailable or returns no result. Prefer arXiv for bibliographic facts; use project pages, GitHub, Hugging Face paper pages, or Semantic Scholar only as additional sources.
5. Create or update one paper concept under `paper-wiki/papers/`.
6. Identify and update 1 to 3 important themes following Topic Documents.
7. Identify named entities that meet the concept-page criteria in Concept Documents; create or update pages under `paper-wiki/concepts/` and cross-link them with the paper.
8. Add concise topic and concept links under the paper body; add the paper to each affected topic's and concept's `# Papers` section.
9. If the paper is used by a project in this repository, add or update the paper's `# Used In Projects` section following Project Links.
10. Update `paper-wiki/papers/index.md`, `paper-wiki/topics/index.md`, `paper-wiki/concepts/index.md` (when concepts exist), and every affected topic or concept page; update the wiki home `paper-wiki/index.md` if a new collection appeared.
11. Preserve user-curated fields and existing body layout following Metadata Rules and Paper Documents.
12. Run the Finishing Commands after content edits.
13. Cite only sources that were actually used.

## Paper Documents

Use `references/SPEC.md` as the base OKF format reference and `references/schema.md` as the stricter paper-wiki profile.

Paper bodies are user-customizable Markdown. Do not treat any one summarization template as part of the OKF contract. Use `assets/paper-wiki.toml` as the default paper body configuration for this skill. When reading the config, enumerate all `paper_body.profiles` entries. Use `paper_body.default_profile` by default, but choose another configured profile when the user requests it or when the paper type clearly matches it. Use the selected `paper_body.profiles.<name>.sections` list for new paper bodies. Treat `paper_body.required_sections` as validation requirements only when the user configures them.
Use `paper_body.section_descriptions` as drafting guidance for what each section should contain. Do not copy those descriptions into generated paper notes unless the user explicitly asks for visible prompts.

If a specific paper needs a different summarization style, derive a temporary profile or template from the asset config for that paper, and persist the new profile only when the user asks. Keep generated summaries concise and distinguish paper claims from personal notes. If a paper has not been read in full, avoid presenting speculative critique as established fact. Preserve existing paper body layout when updating a paper unless the user explicitly asks to reorganize it.

## Custom Paper Body Profiles

When the user asks for their own paper-note template, treat it as a custom `paper_body.profiles.<name>` profile, not a change to the OKF contract.

Use `scripts/create_paper_body_profile.py` as the profile-generation interface. The user may describe the desired reading style in natural language; convert that request into a concise profile name, an ordered section list, and optional section descriptions. If the user's description explicitly names sections, preserve those names. If it does not, either let the script infer a draft from the description or pass agent-chosen sections with repeated `--section` flags. By default, the script saves the finished profile to this skill's bundled `assets/paper-wiki.toml` so it is reusable in later paper-wiki tasks.

If the user asks for an English-only template, pass `--language english` and provide English `--description`, `--section`, and `--section-description` values. The script rejects non-ASCII profile text in that mode, so fix translated section names before saving or previewing the TOML.

Create and save a reusable profile without changing the default paper body:

```bash
python scripts/create_paper_body_profile.py \
  --name critique-card \
  --description "Short review template focused on assumptions, evidence gaps, and follow-up questions" \
  --section "Summary" \
  --section "Assumptions" \
  --section "Missing Evidence" \
  --section "Questions"
```

Preview a generated TOML template without changing the config:

```bash
python scripts/create_paper_body_profile.py \
  --name critique-card \
  --description "Short review template focused on assumptions, evidence gaps, and follow-up questions" \
  --section "Summary" \
  --section "Assumptions" \
  --section "Missing Evidence" \
  --section "Questions" \
  --preview
```

Do not change `paper_body.default_profile` after creating a custom template unless the user explicitly asks to make that template the default. If asked, rerun the script with `--set-default` for the intended profile.

For a wiki-specific template, write to a separate config and pass it to validation with `--config <path/to/paper-wiki.toml>`. Avoid overwriting global `section_descriptions` for common section names unless the user explicitly asks for a different meaning; prefer unique section names for specialized templates.

## HF CLI Fast Path

When `hf` is installed (`which hf` succeeds), use it as the primary fetch mechanism instead of browser or API calls.

| Goal | Command |
|---|---|
| Structured metadata (title, authors, date, abstract) | `hf papers info ARXIV_ID` |
| Full paper as Markdown | `hf papers read ARXIV_ID` |
| Search by keyword when no ID is known | `hf papers search "QUERY" --limit 5` |

**Input resolution:**

* **arXiv URL** (`arxiv.org/abs/2401.00001` or `arxiv.org/pdf/2401.00001`): strip to `2401.00001`.
* **HF paper URL** (`huggingface.co/papers/2401.00001`): strip to `2401.00001`.
* **Bare ID** (`2401.00001` or `2401.00001v2`): drop the version suffix before passing to `hf papers`.
* **PDF file path**: check the filename first; if no numeric ID is present, run `grep -a 'arxiv.org' "$PDF" | head -5` to extract an embedded URL.
* **Natural-language title or description only**: run `hf papers search "QUERY" --limit 5 --format agent` to get candidate IDs, then confirm with the user or pick the best match.

Use `hf papers read` output as the primary source for the paper body summary. Supplement with `hf papers info` fields to fill required frontmatter fields (`title`, `authors`, `date`, `abstract`). Do not reproduce the full `hf papers read` output verbatim in the paper note; distil it into the configured body sections.

## Topic Documents

Use topic concepts for stable themes such as `multi-agent-systems`, `llm-agents`, `ai-for-science`, `agent-self-evolution`, or `benchmarks`. A topic page should list related papers and open questions, not duplicate each paper's full summary.

Create or update topic pages proactively whenever a new paper introduces an important theme. Important themes usually satisfy at least two of these conditions:

* The theme appears in the title, abstract, method name, benchmark name, or central contribution.
* The theme could group multiple current or future papers.
* The theme is useful for retrieval, comparison, or literature-review synthesis.
* The theme is more specific than a broad field label such as `ai` or `machine-learning`.

Do not create a topic for every tag. Tags can be granular; topic pages should represent durable synthesis nodes. Prefer reusing an existing topic when the new theme is semantically equivalent to one already present.

Every topic page should include `# Scope`, `# Papers`, and `# Open Questions`. When a topic has two or more papers, optionally add `# Synthesis` with concise cross-paper observations.

When adding a new topic, update `paper-wiki/topics/index.md`. Ensure links are bidirectional: the paper links to the topic, and the topic links back to the paper.

## Concept Documents

Concept pages live in `paper-wiki/concepts/<slug>.md` and are the wiki's entity pages: one page per concrete named thing, as opposed to a topic's thematic grouping. Use one of these `type` values: `Method`, `Dataset`, `Benchmark`, `Metric`, `Term`, or `Tool`.

Create a concept page when a named entity satisfies at least one of:

* Two or more papers in the wiki reference it — the strongest signal (e.g., a benchmark that several papers report results on).
* It is a durable, field-level entity likely to recur in future reading (e.g., a widely used technique such as LLM-as-a-judge).
* The user asks to track it.

Do not create a concept page for a method that only its own paper describes — the paper page already covers it. Add that method page later, when a second paper builds on or compares against the method.

Every concept page should include `# Definition` (what the entity is, in a few sentences) and `# Papers` (links to wiki papers that use or reference it, each with a one-line note on how). Optional sections: `# Notes`, `# Related`.

Ensure links are bidirectional: the paper links to the concept (typically in its `# Related` section), and the concept lists the paper under `# Papers`. When adding a new concept, update `paper-wiki/concepts/index.md`.

## Source Documents

When the input is a non-paper source (a blog post, documentation page, or talk) with no arXiv ID, add it under `paper-wiki/sources/<slug>.md` instead of `papers/`. Fetch it with a web request (the HF CLI / arXiv fast path does not apply). Use `type: Reference` and the source frontmatter in `references/schema.md`: `resource` is the source URL (its identity), `authors`/`published`/`medium` are optional, and the filename is a lowercase hyphenated slug derived from the title.

For a blog, survey, or tutorial that organizes others' work rather than presenting one contribution, use the `synthesis-source` body profile from `assets/paper-wiki.toml` (Overview / Framework / Key Techniques / Case Studies / Takeaways / Open Questions / Related / Citations). That profile keys on the content type (synthesis), so an arXiv **survey paper** can use it too — do not treat it as blog-specific.

Sources are a lighter tier than papers. Link a source to the topics and concepts it covers, but these links are **one-way**: do not add the source to a topic's `# Papers` list, and the validator does not require a backlink. When a new source is added, update `paper-wiki/sources/index.md` and, if `sources/` is new, add a `Sources` line to the wiki home. A source that references many methods is a natural hub — the techniques it surveys may later become their own paper or concept pages.

## Project Links

Papers can record where they are used in this repository's research projects, keeping the two reference layers distinct: shared paper understanding lives in the wiki; project-specific use of a paper (BibTeX entries, claims, experiments) stays inside the project.

When a repo project cites or builds on a paper, add a `# Used In Projects` section to the paper body with a relative link to the project folder and a one-line note on how the project uses it:

```markdown
# Used In Projects

* [my-project](../../projects-folder/my-project/index.md) - baseline method for the packing experiments.
```

Link a Markdown file such as the project's `index.md`, not the bare directory — the validator only checks link targets ending in `.md`. These links point outside the wiki bundle; the validator checks that the target exists in the repository but does not require a backlink from the project. If the wiki bundle is copied to another repository, these links may break — that is acceptable per OKF's tolerance for broken links; prune or update them in the copy.

## Indexes

Maintain index files as plain Markdown without frontmatter. The wiki root `index.md` is the wiki home: it lists the `papers/`, `topics/`, and `concepts/` collections and may carry a short current-focus section. Sort paper entries by arXiv ID or submitted date when the user does not specify a preference. Keep descriptions one sentence.

## Metadata Rules

Preserve these user-curated fields when updating a paper:

* `status`
* `priority`
* `tags`
* `# Notes`
* any custom frontmatter keys not defined in `references/schema.md`

Use `status: unread` for newly added papers unless the user says otherwise. Recommended status values are `unread`, `skimmed`, `read`, and `summarized`.

## Finishing Commands

Before finishing paper-wiki edits:

* Check required metadata fields from `references/schema.md`; the bundled validator is the executable check.
* Check configured paper body sections only when `assets/paper-wiki.toml` sets `paper_body.required_sections`.
* Check that internal Markdown links resolve within the wiki root, and that project links resolve within the repository.
* Check that index entries point to existing files.
* Run bundled scripts from this skill's root directory, using paths relative to the directory that contains this `SKILL.md`. Pass the wiki root as an absolute path when the target repo is not the current working directory. Generate `viz.html` before validation because the validator reads the generated graph file.

```bash
uv run scripts/generate_viz.py /absolute/path/to/paper-wiki
uv run scripts/validate_paper_wiki.py /absolute/path/to/paper-wiki
```

If `uv` is unavailable or blocked by sandbox/cache access and the environment already has Python 3.11+, run the scripts directly with `python`:

```bash
python scripts/generate_viz.py /absolute/path/to/paper-wiki
python scripts/validate_paper_wiki.py /absolute/path/to/paper-wiki
```

Use `--config <path/to/paper-wiki.toml>` only for a temporary validation profile or another repo layout.

If your environment provides a skill validator, run it against this skill folder after editing the skill itself.

## Visualization

`paper-wiki/viz.html` is required. Use `viz.html` as the canonical filename; treat `vis.html` as a typo unless the user explicitly asks for a separate alias.

`scripts/generate_viz.py` renders a self-contained Cytoscape graph + detail-pane viewer by injecting `scripts/templates/viz.html`, `scripts/static/viz.css`, `scripts/static/viz.js`, and the vendored libraries in `scripts/vendor/`. Keep all of these alongside the script; the generated `viz.html` inlines the vendored libraries so it works fully offline (no CDN). Papers, topics, and each concept type get distinct node colors. The viewer UI and text are English.

The viewer is a paper-wiki knowledge map, not a flat force graph:

* **Collapsed by default.** It opens showing only topics and concepts on a deterministic grid (same layout every time), each labelled with its paper count. Papers stay hidden until a topic is opened, so the first view is a readable index rather than a hairball.
* **Expand on demand.** Double-clicking a topic (or the "Expand N papers" button in the detail pane) fans that topic's papers around it without moving the other topics. "Expand all" runs the fcose force layout to lay out the whole clustered map; "Collapse all" and "Reset view" return to the grid.
* **Focus.** Clicking any node highlights it and its direct neighbors and dims the rest; the type legend (top-left) filters to one type; search reveals matching hidden papers.

These are viewer behaviors baked into the bundled assets — regenerating `viz.html` is all that is needed to pick up viewer changes; no per-paper edits are involved.

## Comparison Tasks

When comparing papers, write the comparison as a separate note only if the user asks for a durable artifact. Otherwise answer in chat and reference the paper files. Compare along concrete axes such as problem framing, method, evidence, assumptions, failure modes, reusable artifacts, and relevance to the user's research direction.
