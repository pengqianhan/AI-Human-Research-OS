---
name: paper-search
description: Search research papers across alphaXiv, OpenAlex, bioRxiv, PubMed, Hugging Face Papers, and Papers with Code in one command that honours the human's per-source on/off switches. Use when finding papers, related work, prior art, or code for a method, or when the human asks to switch a literature source on or off.
---

# Paper search

`scripts/paper_search.py` in this skill's directory (`$PS` below) searches every
literature source the human has switched on, in parallel, and returns one JSON
shape. The switches live in the repository's
[`memory/paper-sources.json`](../../../memory/paper-sources.json); the human
flips them from the **Papers** button in os-ui's agent windows.

A source that is off is off on every route. Reach literature through `$PS`, and
leave a switched-off source alone through other routes as well: MCP connectors,
other skills, and web fetches. When the evidence needs a source that is off,
say so and let the human decide.

## Search

Run from anywhere inside the repository; the script finds the switch file by
walking up from the working directory.

```bash
uv run $PS sources                                   # which sources are on
uv run $PS search "sparse autoencoder feature splitting"
uv run $PS search "KV cache compression" --source alphaxiv --source huggingface --published-after 2025-01-01
uv run $PS search "ImageNet top-1" --mode keyword --limit 5
```

Without `--source`, every source that is on is searched. Pick the sources that
fit the field: machine learning reads best through `alphaxiv`, `huggingface`,
and `pwc`; journal and cross-disciplinary work through `openalex`; biology
through `biorxiv` and `pubmed`.

| Source | Covers | Extra fields |
|---|---|---|
| `alphaxiv` | arXiv full text: CS, math, physics, stats | `votes`, full-text `snippets` |
| `openalex` | all disciplines, journals and conferences | `citations` |
| `biorxiv` | biology preprints, via OpenAlex's bioRxiv index | `citations` |
| `pubmed` | biomedical and life-science journals | `doi`, `venue` |
| `huggingface` | arXiv ML papers on Hugging Face Papers | `votes` (upvotes), `code` (GitHub) |
| `pwc` | Papers with Code catalog, through its MCP server | `citations`, `code_repos`, `official_code`; no abstract |

Controls, applied to every source that supports them:

- `--mode semantic` (default) or `keyword`: alphaXiv embedding vs full-text
  keyword search, PwC hybrid vs keyword. Use `keyword` for exact method names,
  acronyms, benchmarks, and title phrases. Other sources ignore it.
- `--published-after` / `--published-before YYYY-MM-DD`: inclusive window.
  Supply one only when the question asks for a period.
- `--limit N`: results per source (default 10; PwC caps at 25).

## Read the result

The script prints `{query, searched, disabled, errors, results}`. Each result
has `source`, `id`, `title`, `url`, and, when its source provides them,
`abstract`, `publication_date`, `authors`, and the extra fields above. `id` is
an arXiv id, a DOI, an OpenAlex `W…` id, a PMID, or a PwC catalog id.

- Results interleave the sources rank by rank. A paper several sources found
  appears once, under the first source, with the others in `also_in`; it keeps
  that source's `votes` and takes missing fields such as `code` from the rest.
- `errors` names each source that failed. Report a failed source as unsearched
  rather than as evidence that no such literature exists; the same holds for
  an empty result. Exit 0 means at least one source answered, 1 means every
  searched source failed, 2 means invalid use, including asking for a source
  that is off.
- Cite only papers the results or a follow-up read actually returned.

Known source behaviour:

- PwC allows 10 hybrid searches per minute per IP; bursts need `--mode keyword`.
  `PWC_MCP_URL` points at another server, such as a local `pwc-mcp`.
- Hugging Face has no date filter, so a window is applied to a wider pool
  afterwards and can return fewer results than `--limit`.
- A PubMed window matches print or electronic dates, while `publication_date`
  shows the electronic one, so a hit can predate the window.

## Keys

Every user brings their own optional keys: `OPENALEX_API_KEY` (OpenAlex and
bioRxiv), `NCBI_API_KEY` (PubMed), and `HF_TOKEN` (Hugging Face). The script
reads them from the environment, else from the repository's gitignored `.env`
(template: [`.env.example`](../../../.env.example)); `sources` shows which are
set. alphaXiv and PwC need none.

A rate-limited source (`HTTP 429`) comes back with the key that lifts the
limit. Relay that next step to the human; they create and paste the key. Keep
key values out of commits, prompts, and logs.

## Reading an alphaXiv paper

When the harness has a logged-in alphaXiv connector (Claude Code's, for
instance), use it to read an alphaXiv hit's full text or put questions to its
PDF. It belongs to the `alphaxiv` source, so it follows that switch. Search
itself stays with `$PS`, which needs no login and works in every harness.

## Switch a source

Only on the human's word, since the switches are the human's choice:

```bash
uv run $PS sources --disable pubmed
uv run $PS sources --enable pubmed --json
```

This rewrites `memory/paper-sources.json`, a tracked file; commit it with the
change that motivated it.

_Adapted from [alphaXiv OpenResearch](https://github.com/alphaXiv/OpenResearch)
(MIT): its `orx discover` source switches and shared result shape are
reimplemented here, and Hugging Face Papers and the
[Papers with Code MCP server](https://github.com/huggingface/pwc-cli#mcp-server)
are added as sources._
