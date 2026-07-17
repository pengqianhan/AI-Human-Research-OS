---
name: okf-repo-organizer
description: Organize a repository, folder, or knowledge corpus into generic Open Knowledge Format (OKF) bundles. Use when you are asked to convert or normalize repo files and folders to OKF, add OKF index/log/concept frontmatter, choose bundle boundaries, migrate idea/project/doc folders into OKF-style structure, or validate generic OKF conformance.
---

# OKF Repo Organizer

## Overview

Use this skill to make an existing repo or folder easier for humans and agents to traverse as OKF. Keep the skill generic: OKF is markdown plus YAML frontmatter, not a domain-specific taxonomy.

## Reference

Read `references/SPEC.md` from this skill before changing files. Treat it as the only OKF format reference. Do not assume the target repository contains an `okf/` directory or its own copy of the spec.

Do not invent stricter required fields than the spec. For generic OKF conformance, every non-reserved `.md` concept document needs parseable YAML frontmatter with a non-empty `type`. `title`, `description`, `resource`, `tags`, and `timestamp` are recommended, not mandatory.

Add frontmatter minimally and let content drive it. Always include `type`; add a recommended field only when it carries information the document body and the file's location do not already make obvious. Prefer the smallest frontmatter that satisfies OKF over a complete one.

## Workflow

1. Establish scope and bundle boundaries.
   - Use the path the user names. If none is named, inspect the repo and choose the smallest sensible scope.
   - Prefer treating knowledge-oriented folders as OKF bundles. Do not force a whole software repo to be one OKF bundle unless the user asks for that or the repo is already markdown-first.
   - A nested folder can be its own bundle when it has independent context, for example an `ideas/idea_example/` folder with its own `index.md`, `log.md`, and concept files.

2. Inventory before editing.
   - Use `rg --files` to inspect Markdown, source, asset, generated, and vendor paths.
   - Preserve user content and existing frontmatter keys. Move or rename files only when it improves OKF traversal and does not break obvious project conventions.
   - Ignore generated and dependency folders such as `.git/`, `node_modules/`, `.venv/`, `dist/`, and `build/` unless the user explicitly wants them modeled.

3. Organize the bundle.
   - Add or update `index.md` at the bundle root and important subdirectories for progressive disclosure. Keep index files as plain Markdown; only a bundle-root `index.md` may use frontmatter, and only for `okf_version`.
   - Add or update `log.md` when the folder needs chronological history. Use `## YYYY-MM-DD` date headings, newest first.
   - For each non-reserved `.md` concept file, add or normalize frontmatter. Only `type` is required; add the other keys only when they earn their place:

```markdown
---
type: <self-explanatory type>        # required
title: <human-readable title>        # recommended
description: <one-sentence summary>   # recommended
tags: [optional, tags]                # optional
# add resource, timestamp, or other keys only when they carry non-redundant information
---
```

   - Keep frontmatter minimal and content-driven. Do not add a field that merely duplicates the body or the file's position. For example, omit `timestamp` on a chronological, newest-first log whose top `## YYYY-MM-DD` heading already states the last-change date, and omit `created` when the oldest in-body entry already states it.
   - Keep `type` short and descriptive, such as `Idea`, `Project`, `Template`, `Reference`, `Runbook`, `Dataset`, `Note`, or `Decision`. Do not create a central type registry.
   - Leave code, data, images, PDFs, and other non-Markdown assets in normal project locations. When useful, create a concept `.md` that describes or links to the asset instead of modifying the asset.
   - Prefer bundle-relative Markdown links that begin with `/` when links should survive file moves. Relative links are fine for local neighbors.
   - For repeatable project workflows, keep templates and instances semantically distinct. A useful generic pattern is `projects-folder/templates/<TemplateName>/` for reusable templates and `projects-folder/<ProjectName>/` for instantiated projects.

4. Validate.
   - Run bundled scripts from this skill's root directory, using paths relative to the directory that contains this `SKILL.md`. Pass the bundle root as an absolute path when the target repo is not the current working directory.
   - Run the bundled validator on every OKF bundle root you changed. Prefer `uv run` so the script can install its declared Python dependency from the inline PEP 723 metadata:

```bash
uv run scripts/validate_okf_bundle.py /absolute/path/to/bundle-root
```

   - If `uv` is unavailable and the environment already has Python 3.11+ plus PyYAML, run it directly:

```bash
python scripts/validate_okf_bundle.py /absolute/path/to/bundle-root
```

   - If an OKF reference implementation is available and you want to reuse its parser, pass it explicitly. This is optional; the validator also works with PyYAML when the reference implementation is unavailable.

```bash
uv run scripts/validate_okf_bundle.py /absolute/path/to/bundle-root --okf-src /path/to/okf/src
```

   - The validator reuses `enrichment_agent.bundle.document.OKFDocument.parse` from `okf/src` when available, then applies the generic conformance rules from this skill's bundled `references/SPEC.md`. It does not call the stricter enrichment-agent document validator because that validator requires recommended fields that generic OKF does not require.

5. Finish with a concise report.
   - List the bundle root(s), important files changed, and validator result.
   - If validation fails, fix the OKF format issues before finishing unless the user explicitly asks you to stop.
   - Call out deliberate non-OKF areas, such as source-only directories or a top-level README kept outside the selected bundle.
