---
name: paper-search
description: Search and read research papers across alphaXiv, OpenAlex, bioRxiv, PubMed, Hugging Face Papers, Papers with Code, and arXiv, honouring the human's per-source on/off switches and full-text read order. Use when finding papers, related work, prior art, or code for a method; when reading a paper's full text or record from its id; or when the human asks to switch a source on or off or reorder where papers are read from.
---

# Paper search

`scripts/paper_search.py` in this skill's directory (`$PS` below) searches every
literature source the human has switched on, in parallel, and returns one JSON
shape; `fetch` reads one paper through the human's read order. The switches and
the read order live in the repository's
[`memory/paper-sources.json`](../../../memory/paper-sources.json); the human
flips the switches from the **Papers** button in os-ui's agent windows.

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
through `biorxiv` and `pubmed`; an exact title, author, or arXiv category
through `arxiv` with a fielded query such as `ti:"context language models"`.

| Source | Covers | Extra fields |
|---|---|---|
| `alphaxiv` | arXiv full text: CS, math, physics, stats | `votes`, full-text `snippets` |
| `openalex` | all disciplines, journals and conferences | `citations` |
| `biorxiv` | biology preprints, via OpenAlex's bioRxiv index | `citations` |
| `pubmed` | biomedical and life-science journals | `doi`, `venue` |
| `huggingface` | arXiv ML papers on Hugging Face Papers | `votes` (upvotes), `code` (GitHub) |
| `pwc` | Papers with Code catalog, through its MCP server | `citations`, `code_repos`, `official_code`; no abstract |
| `arxiv` | all of arXiv, through its own API; `ti:` `au:` `abs:` `cat:` queries pass through | `doi`, `venue` (journal reference) |

Controls, applied to every source that supports them:

- `--mode semantic` (default) or `keyword`: alphaXiv embedding vs full-text
  keyword search, PwC hybrid vs keyword, arXiv all-words vs exact phrase. Use
  `keyword` for exact method names, acronyms, benchmarks, and title phrases.
  Other sources ignore it.
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
- arXiv's terms allow one request every three seconds; the script waits out
  the gap, so back-to-back arXiv calls are slow rather than refused.

## Keys

Every user brings their own optional keys: `OPENALEX_API_KEY` (OpenAlex and
bioRxiv), `NCBI_API_KEY` (PubMed), and `HF_TOKEN` (Hugging Face). The script
reads them from the environment, else from the repository's gitignored `.env`
(template: [`.env.example`](../../../.env.example)); `uv run $PS keys` shows
which are set. alphaXiv and PwC need none.

A rate-limited source (`HTTP 429`) comes back with the key that lifts the
limit. Relay that next step to the human: they paste the key under **Keys** in
os-ui's Papers panel, which runs `keys --set NAME` with the value on stdin, or
edit `.env` themselves. Keep key values out of commits, prompts, and logs.

## Read a paper

`fetch` takes an arXiv id or URL, a DOI, an OpenAlex `W…` id, or a PubMed id
and routes it by shape:

```bash
uv run $PS fetch 2609.37725                    # full text through the read order
uv run $PS fetch 2609.37725 --via arxiv        # one source only
uv run $PS fetch 2609.37725 --report           # alphaXiv's ~10 KB overview, for skimming
uv run $PS fetch 10.1038/nature14539           # a DOI or PMID: its record, no full text
```

An arXiv paper is read from each source in the read order (default
`huggingface`, `alphaxiv`, `arxiv`), skipping switched-off sources, until one
returns a complete text: at least 5,000 characters with a heading such as
Introduction or Method. A cut-short text, such as the lone figure caption
Hugging Face serves for some fresh submissions, falls through to the next
source. The text goes to a file (`--out`, default under the system temp
directory); stdout is a JSON report with `tried` (each source's outcome),
`source`, `url`, `file`, `chars`, and `metadata` from arXiv, else Hugging Face.
Read the file in parts and cite the `source` and `url` the report names.

Exit 1 means no source returned a complete text: report the `tried` outcomes
and the `pdf` link, and let the human decide; `--via` or `--report` through a
switched-off source exits 2. A DOI, OpenAlex id, or PMID returns its record
from OpenAlex, bioRxiv, or PubMed under that source's switch; follow its
`url` or `doi` for the text.

When the harness has a logged-in alphaXiv connector (Claude Code's, for
instance), use it to put questions to a paper's PDF. It belongs to the
`alphaxiv` source, so it follows that switch.

## Switch a source

bioRxiv and PubMed start switched off and every other source starts on; a
source the switch file leaves out keeps that default. Change a switch only on
the human's word, since the switches are the human's choice:

```bash
uv run $PS sources --disable pubmed
uv run $PS sources --enable pubmed --json
```

The read order is the human's choice too: `sources --read-order
alphaxiv,huggingface,arxiv` sets it, and leaving a source out of it keeps
`fetch` from reading through it while search still uses it.

Both rewrite `memory/paper-sources.json`, a tracked file; commit it with the
change that motivated it.

_Adapted from [alphaXiv OpenResearch](https://github.com/alphaXiv/OpenResearch)
(MIT): its `orx discover` source switches and shared result shape, and its
`orx paper` id routing and alphaXiv reads, are reimplemented here, and Hugging
Face Papers and the
[Papers with Code MCP server](https://github.com/huggingface/pwc-cli#mcp-server)
are added as sources. The arXiv source reimplements the query syntax and
rate limit of
[science-skills' `literature_search_arxiv`](https://github.com/google-deepmind/science-skills)
(Apache-2.0)._
