---
name: arxiv2md
description: Convert arXiv papers to clean Markdown. Use when the user wants to read, fetch, or summarize an arXiv paper.
---

# arxiv2md

Convert arXiv papers to LLM-ready Markdown. Parses arXiv's native HTML (not PDFs) for clean output with proper math, tables, and section structure.

## REST API (preferred for agents)

Base URL: `https://arxiv2md.org`

No auth, no key, no SDK. Rate limit: 30 requests/minute per IP. Results are cached server-side for 24h.

> **Don't just swap the hostname.** Visiting `https://arxiv2md.org/abs/2501.11120`
> (replacing `arxiv.org` → `arxiv2md.org`) returns the **HTML web app** for humans,
> not Markdown. For programmatic use always call `/api/markdown` or `/api/json` below.

### Get markdown

```bash
curl "https://arxiv2md.org/api/markdown?url=2501.11120"
```

Returns raw markdown as plain text.

### Get JSON (with metadata)

```bash
curl "https://arxiv2md.org/api/json?url=2501.11120"
```

Returns `{ "arxiv_id", "title", "source_url", "content" }`.

### Parameters

All optional query params for both endpoints:

| Param | Default | Description |
|-------|---------|-------------|
| `url` | required | arXiv URL or ID (e.g. `2501.11120v1` or `https://arxiv.org/abs/2501.11120`) |
| `remove_refs` | `true` | Remove references section |
| `remove_toc` | `true` | Remove table of contents |
| `remove_citations` | `true` | Remove inline citations |
| `frontmatter` | `false` | Prepend YAML metadata (`/api/markdown` only) |

### Examples

```bash
# Plain markdown for a paper
curl "https://arxiv2md.org/api/markdown?url=2501.11120"

# Keep references and citations intact
curl "https://arxiv2md.org/api/markdown?url=2501.11120&remove_refs=false&remove_citations=false"

# JSON with metadata
curl "https://arxiv2md.org/api/json?url=https://arxiv.org/abs/2501.11120v1"

# With frontmatter (title, authors, date as YAML header)
curl "https://arxiv2md.org/api/markdown?url=2501.11120&frontmatter=true"
```

## CLI

```bash
pip install arxiv2markdown

# Output to file
arxiv2md 2501.11120v1 -o paper.md

# Output to stdout
arxiv2md 2501.11120v1 -o -

# Only specific sections
arxiv2md 2501.11120v1 --section-filter-mode include --sections "Abstract,Introduction" -o -

# Strip refs and TOC
arxiv2md 2501.11120v1 --remove-refs --remove-toc -o -

# With YAML frontmatter
arxiv2md 2501.11120v1 --frontmatter -o paper.md
```

Section filtering (`--section-filter-mode` + `--sections`) is available in the CLI and
Python library, not the REST API.

## Python library

Import name is `arxiv2md`:

```python
from arxiv2md import ingest_paper_sync

result = ingest_paper_sync("2501.11120v1")
print(result.content)

# Async variant
from arxiv2md import ingest_paper
result = await ingest_paper("2501.11120v1")
```

Optional kwargs (same for both): `remove_refs`, `remove_toc`, `remove_inline_citations`
(all `True`), `section_filter_mode` (`"exclude"`), `sections` (`None` = all),
`include_frontmatter` (`False`).

> The REST API names the citation flag `remove_citations`; the CLI and Python library
> name it `remove_inline_citations`. Same behavior.

## Links

- Web app: https://arxiv2md.org
- Machine-readable guide: https://arxiv2md.org/llms.txt
- Source: https://github.com/timf34/arxiv2md
- PyPI: https://pypi.org/project/arxiv2markdown/
