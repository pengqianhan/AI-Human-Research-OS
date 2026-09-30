#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["truststore>=0.10"]
# ///
"""Search papers across every literature source the human has switched on.

One command, one result shape, and a per-source on/off switch: the design of
alphaXiv OpenResearch's `orx discover` (MIT), reimplemented here and extended
with Hugging Face Papers and the Papers with Code MCP server. The switches live
in `memory/paper-sources.json`; os-ui's agent windows flip them through the
`sources` command, and a source switched off refuses to run.

Standard library plus the optional `truststore`, which `uv run paper_search.py`
installs from the header above.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

try:
    # Verify TLS with the OS, as browsers and curl do. Windows holds some roots
    # only on demand: paperswithcode.co's Let's Encrypt chain fails against
    # Python's snapshot of the store (checked 2026-09-30).
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

CONFIG_NAME = Path("memory") / "paper-sources.json"
USER_AGENT = "research-os-paper-search/1.0"
TIMEOUT = 30
MAX_AUTHORS = 8

# Order matters: it is the display order and, when two sources return the same
# paper, the first source keeps the record (alphaXiv carries full-text snippets).
SOURCES: dict[str, tuple[str, str]] = {
    "alphaxiv": ("alphaXiv", "arXiv full text and semantic search: CS, math, physics, stats"),
    "openalex": ("OpenAlex", "Scholarly graph across all disciplines, with citation counts"),
    "biorxiv": ("bioRxiv", "Biology preprints, searched through OpenAlex"),
    "pubmed": ("PubMed", "Biomedical and life-science journals via NCBI E-utilities"),
    "huggingface": ("Hugging Face", "Hugging Face Papers: arXiv ML papers with upvotes and code links"),
    "pwc": ("Papers with Code", "Papers with Code catalog via its MCP server: code and citation counts"),
}

ALPHAXIV_API = "https://api.alphaxiv.org"
OPENALEX_API = "https://api.openalex.org"
PUBMED_API = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
HF_API = "https://huggingface.co"
PWC_MCP = os.environ.get("PWC_MCP_URL", "https://paperswithcode.co/mcp")
# bioRxiv's id in OpenAlex's source index; bioRxiv itself has no search API.
BIORXIV_OPENALEX_SOURCE = "S4306402567"
MONTHS = ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")


class SourceError(Exception):
    """One source failed; the others still answer."""


class UsageError(Exception):
    """The call itself is invalid (exit 2)."""


@dataclass(frozen=True)
class Options:
    limit: int = 10
    mode: str = "semantic"
    after: str | None = None
    before: str | None = None


# --- switches --------------------------------------------------------------


def find_config(explicit: Path | None) -> Path | None:
    """The switch file: --config, else the nearest memory/paper-sources.json
    above the working directory, else above this script."""
    if explicit is not None:
        return explicit
    for start in (Path.cwd(), Path(__file__).resolve().parent):
        for folder in (start, *start.parents):
            if (folder / CONFIG_NAME).is_file():
                return folder / CONFIG_NAME
    return None


def read_config(path: Path | None) -> dict[str, Any]:
    if path is None or not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        raise UsageError(f"{path}: not valid JSON ({err})") from None
    if not isinstance(data, dict):
        raise UsageError(f"{path}: expected a JSON object of source switches")
    return data


def load_switches(path: Path | None) -> dict[str, bool]:
    """Every source is on unless the file says `false` for it."""
    data = read_config(path)
    return {source: data.get(source, True) is not False for source in SOURCES}


def save_switches(path: Path, changes: dict[str, bool]) -> dict[str, bool]:
    data = read_config(path)
    data.update(changes)
    ordered = {source: data.get(source, True) is not False for source in SOURCES}
    ordered.update({k: v for k, v in data.items() if k not in SOURCES})
    path.write_text(json.dumps(ordered, indent=2) + "\n", encoding="utf-8", newline="\n")
    return load_switches(path)


# --- HTTP ------------------------------------------------------------------


def http(url: str, data: bytes | None = None, headers: dict[str, str] | None = None) -> bytes:
    request = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT, **(headers or {})})
    for attempt in (1, 2):
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
                return response.read()
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", "replace")
            retry = err.headers.get("Retry-After", "")
            # Keyless NCBI allows 3 requests/s; one short wait absorbs a burst.
            if err.code == 429 and attempt == 1 and retry.isdigit() and int(retry) <= 5:
                time.sleep(int(retry) + 0.5)
                continue
            raise SourceError(f"HTTP {err.code}: {clip(error_message(body), 300)}") from None
        except (urllib.error.URLError, TimeoutError) as err:
            raise SourceError(f"unreachable: {getattr(err, 'reason', err)}") from None
    raise AssertionError("unreachable")


def error_message(body: str) -> str:
    """The human-readable part of an error body (OpenAlex sends JSON)."""
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return body
    if isinstance(data, dict):
        return str(data.get("message") or data.get("error") or body)
    return body


def get_json(url: str) -> Any:
    try:
        return json.loads(http(url))
    except json.JSONDecodeError as err:
        raise SourceError(f"invalid JSON from {url.split('?')[0]}: {err}") from None


# --- shared hit shape ------------------------------------------------------


def clip(text: str, limit: int) -> str:
    flat = re.sub(r"\s+", " ", text or "").strip()
    return flat if len(flat) <= limit else flat[: limit - 1] + "…"


def day(value: Any) -> str | None:
    return str(value)[:10] if value else None


def make_hit(source: str, id: Any, title: Any, **fields: Any) -> dict[str, Any]:
    """One result. Fields a source lacks are left out rather than set to null."""
    authors = [a for a in fields.get("authors") or [] if a]
    if len(authors) > MAX_AUTHORS:
        authors = authors[:MAX_AUTHORS] + ["et al."]
    fields["authors"] = authors
    hit: dict[str, Any] = {"source": source, "id": str(id or ""), "title": clip(str(title or ""), 500)}
    for key in ("abstract", "publication_date", "authors", "url", "doi", "venue",
                "votes", "citations", "code", "code_repos", "official_code", "snippets"):
        value = fields.get(key)
        if value not in (None, "", []):
            hit[key] = value
    return hit


ARXIV_ID = re.compile(r"(?:10\.48550/arxiv\.|arxiv:)?(\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?/\d{7})(?:v\d+)?", re.I)


def paper_keys(hit: dict[str, Any]) -> set[str]:
    """Identities under which two sources' hits are the same paper."""
    keys = set()
    for value in (hit["id"], hit.get("doi")):
        value = str(value or "").lower()
        match = ARXIV_ID.fullmatch(value)
        if match:
            keys.add("arxiv:" + match.group(1))
        elif value.startswith("10."):
            keys.add("doi:" + value)
    title = re.sub(r"[^a-z0-9]+", " ", hit["title"].lower()).strip()
    if len(title) > 20:  # short titles ("Introduction") collide by accident
        keys.add("title:" + title)
    return keys


def merge(per_source: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Interleave the sources rank by rank and fold duplicates into the first
    record, which lists the other sources in `also_in` and takes any field it
    lacked (a code link, a citation count) from them."""
    merged: list[dict[str, Any]] = []
    index: dict[str, int] = {}
    for rank in range(max((len(hits) for hits in per_source), default=0)):
        for hits in per_source:
            if rank >= len(hits):
                continue
            hit = hits[rank]
            keys = paper_keys(hit)
            seen = next((index[k] for k in keys if k in index), None)
            if seen is None:
                seen = len(merged)
                merged.append(dict(hit))
            else:
                first = merged[seen]
                also = first.setdefault("also_in", [])
                if hit["source"] != first["source"] and hit["source"] not in also:
                    also.append(hit["source"])
                for key, value in hit.items():
                    first.setdefault(key, value)
            index.update(dict.fromkeys(keys, seen))
    return merged


# --- sources ---------------------------------------------------------------


def search_alphaxiv(query: str, opts: Options) -> list[dict[str, Any]]:
    strategy = "keyword" if opts.mode == "keyword" else "embedding"
    params = {"q": query, "prioritize": "default"}
    if opts.after:
        params["publishedAfter"] = opts.after
    if opts.before:
        params["publishedBefore"] = opts.before
    url = f"{ALPHAXIV_API}/search/v2/paper/discover/{strategy}?{urllib.parse.urlencode(params)}"
    return parse_alphaxiv(get_json(url))[: opts.limit]


def parse_alphaxiv(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        make_hit(
            "alphaxiv",
            row.get("paperId"),
            row.get("title"),
            abstract=row.get("abstract"),
            publication_date=day(row.get("publicationDate")),
            url=f"https://www.alphaxiv.org/abs/{row.get('paperId')}",
            votes=row.get("votes"),
            snippets=[clip(s.get("snippet", ""), 300) for s in (row.get("snippets") or [])[:2]],
        )
        for row in rows
    ]


OPENALEX_SELECT = "id,doi,title,publication_date,cited_by_count,abstract_inverted_index,authorships"


def search_openalex(query: str, opts: Options, biorxiv: bool = False) -> list[dict[str, Any]]:
    filters = []
    if biorxiv:
        filters.append(f"primary_location.source.id:{BIORXIV_OPENALEX_SOURCE}")
    if opts.after:
        filters.append(f"from_publication_date:{opts.after}")
    if opts.before:
        filters.append(f"to_publication_date:{opts.before}")
    params = {"search": query, "per_page": str(min(opts.limit, 200)), "select": OPENALEX_SELECT}
    if filters:
        params["filter"] = ",".join(filters)
    # Anonymous search is throttled under load; a free key lifts that.
    for env, name in (("OPENALEX_API_KEY", "api_key"), ("OPENALEX_MAILTO", "mailto")):
        if os.environ.get(env):
            params[name] = os.environ[env]
    data = get_json(f"{OPENALEX_API}/works?{urllib.parse.urlencode(params)}")
    return parse_openalex(data, "biorxiv" if biorxiv else "openalex")


def inverted_abstract(index: dict[str, list[int]] | None) -> str:
    words = sorted((pos, word) for word, positions in (index or {}).items() for pos in positions)
    return " ".join(word for _, word in words)


def parse_openalex(data: dict[str, Any], source: str) -> list[dict[str, Any]]:
    hits = []
    for work in data.get("results") or []:
        doi = re.sub(r"^https?://doi\.org/", "", work.get("doi") or "", flags=re.I)
        work_id = (work.get("id") or "").rsplit("/", 1)[-1]
        hits.append(
            make_hit(
                source,
                doi or work_id,
                work.get("title"),
                abstract=inverted_abstract(work.get("abstract_inverted_index")),
                publication_date=day(work.get("publication_date")),
                authors=[(a.get("author") or {}).get("display_name") for a in work.get("authorships") or []],
                url=f"https://doi.org/{doi}" if doi else work.get("id"),
                citations=work.get("cited_by_count"),
            )
        )
    return hits


def search_pubmed(query: str, opts: Options) -> list[dict[str, Any]]:
    params = {"db": "pubmed", "term": query, "retmax": str(opts.limit), "retmode": "json",
              "sort": "relevance", "tool": "research-os-paper-search"}
    if opts.after or opts.before:  # E-utilities needs both ends of a window
        params.update(datetype="pdat",
                      mindate=(opts.after or "1800-01-01").replace("-", "/"),
                      maxdate=(opts.before or "3000-12-31").replace("-", "/"))
    found = get_json(f"{PUBMED_API}/esearch.fcgi?{urllib.parse.urlencode(params)}")["esearchresult"]
    if found.get("ERROR"):
        raise SourceError(str(found["ERROR"]))
    ids = found.get("idlist") or []
    if not ids:
        return []
    fetch = {"db": "pubmed", "id": ",".join(ids), "retmode": "xml", "tool": "research-os-paper-search"}
    return parse_pubmed(http(f"{PUBMED_API}/efetch.fcgi?{urllib.parse.urlencode(fetch)}"))


def xml_text(node: ET.Element | None) -> str:
    return clip("".join(node.itertext()), 100_000) if node is not None else ""


def pubmed_date(node: ET.Element | None) -> str | None:
    if node is None:
        return None
    year = node.findtext("Year") or (node.findtext("MedlineDate") or "")[:4]
    if not year.isdigit():
        return None
    month = (node.findtext("Month") or "").lower()[:3]
    month_no = int(month) if month.isdigit() else (MONTHS.index(month) + 1 if month in MONTHS else 0)
    if not month_no:
        return year
    day_no = node.findtext("Day") or ""
    return f"{year}-{month_no:02d}" + (f"-{int(day_no):02d}" if day_no.isdigit() else "")


def parse_pubmed(xml: bytes) -> list[dict[str, Any]]:
    hits = []
    for record in ET.fromstring(xml).iter("PubmedArticle"):
        pmid = record.findtext("MedlineCitation/PMID")
        article = record.find("MedlineCitation/Article")
        if not pmid or article is None:
            continue
        parts = []
        for part in article.findall("Abstract/AbstractText"):
            label = part.get("Label")
            parts.append(f"{label}: {xml_text(part)}" if label else xml_text(part))
        authors = []
        for author in article.findall("AuthorList/Author"):
            name = " ".join(filter(None, (author.findtext("LastName"), author.findtext("Initials"))))
            authors.append(name or author.findtext("CollectiveName"))
        doi = next((xml_text(e) for e in record.findall("PubmedData/ArticleIdList/ArticleId")
                    if e.get("IdType") == "doi"), None)
        hits.append(
            make_hit(
                "pubmed",
                pmid,
                xml_text(article.find("ArticleTitle")),
                abstract=" ".join(parts),
                publication_date=pubmed_date(article.find("ArticleDate"))
                or pubmed_date(article.find("Journal/JournalIssue/PubDate")),
                authors=authors,
                url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                doi=doi,
                venue=article.findtext("Journal/Title"),
            )
        )
    return hits


def search_huggingface(query: str, opts: Options) -> list[dict[str, Any]]:
    # The API has no date filter, so a window is applied to a wider pool.
    windowed = bool(opts.after or opts.before)
    pool = min(opts.limit * 4, 100) if windowed else opts.limit
    rows = get_json(f"{HF_API}/api/papers/search?{urllib.parse.urlencode({'q': query, 'limit': pool})}")
    hits = parse_huggingface(rows)
    if windowed:
        hits = [h for h in hits if in_window(h.get("publication_date"), opts)]
    return hits[: opts.limit]


def in_window(date: str | None, opts: Options) -> bool:
    if not date:
        return False
    return (not opts.after or date >= opts.after) and (not opts.before or date <= opts.before)


def parse_huggingface(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    hits = []
    for row in rows:
        paper = row.get("paper") or {}
        paper_id = paper.get("id")
        hits.append(
            make_hit(
                "huggingface",
                paper_id,
                paper.get("title") or row.get("title"),
                abstract=row.get("summary") or paper.get("summary"),
                publication_date=day(paper.get("publishedAt") or row.get("publishedAt")),
                authors=[a.get("name") for a in paper.get("authors") or [] if not a.get("hidden")],
                url=f"https://huggingface.co/papers/{paper_id}",
                votes=paper.get("upvotes"),
                code=paper.get("githubRepo"),
            )
        )
    return hits


def mcp_call(url: str, tool: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """One MCP `tools/call` over Streamable HTTP. The PwC server is stateless,
    so it needs no initialize handshake first (checked 2026-09-30)."""
    body = {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": tool, "arguments": arguments}}
    raw = http(url, json.dumps(body).encode("utf-8"), {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-11-25",
    })
    message = parse_mcp_message(raw.decode("utf-8", "replace"))
    if "error" in message:
        raise SourceError(f"MCP error: {message['error'].get('message', message['error'])}")
    result = message.get("result") or {}
    if result.get("isError"):
        text = " ".join(c.get("text", "") for c in result.get("content") or [])
        raise SourceError(clip(text, 300) or "tool reported an error")
    return result.get("structuredContent") or {}


def parse_mcp_message(text: str) -> dict[str, Any]:
    """The JSON-RPC response, sent either as plain JSON or as an SSE stream."""
    if text.lstrip().startswith("{"):
        return json.loads(text)
    for line in reversed(text.splitlines()):
        if line.startswith("data:"):
            message = json.loads(line[5:])
            if "result" in message or "error" in message:
                return message
    raise SourceError("MCP server sent no JSON-RPC response")


def search_pwc(query: str, opts: Options) -> list[dict[str, Any]]:
    arguments: dict[str, Any] = {
        "query": query,
        "limit": min(opts.limit, 25),
        "mode": "keyword" if opts.mode == "keyword" else "hybrid",
    }
    if opts.after:
        arguments["published_after"] = opts.after
    if opts.before:
        arguments["published_before"] = opts.before
    return parse_pwc(mcp_call(PWC_MCP, "search_papers", arguments))


def parse_pwc(result: dict[str, Any]) -> list[dict[str, Any]]:
    hits = []
    for item in result.get("items") or []:
        paper_id = item.get("arxiv_id") or item.get("id")
        hits.append(
            make_hit(
                "pwc",
                paper_id,
                item.get("title"),
                publication_date=day(item.get("published")),
                authors=item.get("authors"),
                url=item.get("url") or f"https://paperswithcode.co/paper/{paper_id}",
                citations=item.get("citation_count"),
                code_repos=item.get("code_repository_count"),
                official_code=item.get("has_official_implementation") or None,
            )
        )
    return hits


SEARCHERS: dict[str, Callable[[str, Options], list[dict[str, Any]]]] = {
    "alphaxiv": search_alphaxiv,
    "openalex": search_openalex,
    "biorxiv": lambda query, opts: search_openalex(query, opts, biorxiv=True),
    "pubmed": search_pubmed,
    "huggingface": search_huggingface,
    "pwc": search_pwc,
}


def run_search(query: str, sources: list[str], opts: Options,
               searchers: dict[str, Callable[..., list[dict[str, Any]]]] = SEARCHERS
               ) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Query the sources in parallel; a failing source is reported, not fatal."""
    with ThreadPoolExecutor(max_workers=len(sources)) as pool:
        futures = {source: pool.submit(searchers[source], query, opts) for source in sources}
    answered, errors = [], {}
    for source, future in futures.items():
        try:
            answered.append(future.result())
        except SourceError as err:
            errors[source] = str(err)
        except Exception as err:  # a malformed response must not sink the other sources
            errors[source] = f"{type(err).__name__}: {err}"
    return merge(answered), errors


# --- CLI -------------------------------------------------------------------

DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def cmd_search(args: argparse.Namespace, config: Path | None) -> int:
    switches = load_switches(config)
    for flag, value in (("--published-after", args.published_after), ("--published-before", args.published_before)):
        if value and not DATE.fullmatch(value):
            raise UsageError(f"{flag} takes YYYY-MM-DD, got {value}")
    if args.published_after and args.published_before and args.published_after > args.published_before:
        raise UsageError("--published-after is later than --published-before")
    if args.limit < 1 or args.limit > 100:
        raise UsageError("--limit takes 1 to 100")

    requested = list(dict.fromkeys(args.source or []))
    off = [s for s in requested if not switches[s]]
    if off:
        names = ", ".join(SOURCES[s][0] for s in off)
        raise UsageError(
            f"{names} is switched off in {config}. The human turns sources on in os-ui's agent "
            f"window or with `sources --enable`; search the sources that are on instead."
        )
    sources = requested or [s for s in SOURCES if switches[s]]
    if not sources:
        raise UsageError(f"every source is switched off in {config}")

    opts = Options(args.limit, args.mode, args.published_after, args.published_before)
    results, errors = run_search(args.query, sources, opts)
    report = {
        "query": args.query,
        "searched": sources,
        "disabled": [s for s in SOURCES if not switches[s]],
        "errors": errors,
        "results": results,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if len(errors) == len(sources) else 0


def cmd_sources(args: argparse.Namespace, config: Path | None) -> int:
    changes = {s: True for s in args.enable} | {s: False for s in args.disable}
    if set(args.enable) & set(args.disable):
        raise UsageError("a source cannot be both enabled and disabled")
    if changes:
        if config is None:
            raise UsageError(f"no {CONFIG_NAME.as_posix()} above the working directory; pass --config")
        switches = save_switches(config, changes)
    else:
        switches = load_switches(config)
    rows = [{"id": s, "name": name, "about": about, "enabled": switches[s]} for s, (name, about) in SOURCES.items()]
    if args.json:
        print(json.dumps({"config": str(config) if config else None, "sources": rows}, ensure_ascii=False, indent=2))
    else:
        for row in rows:
            print(f"{row['id']:<12} {'on ' if row['enabled'] else 'off'}  {row['name']}: {row['about']}")
        print(f"switches: {config or 'none found (every source on)'}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--config", type=Path, help="switch file (default: the nearest memory/paper-sources.json)")
    commands = parser.add_subparsers(dest="command", required=True)

    search = commands.add_parser("search", help="search the sources that are switched on")
    search.add_argument("query")
    search.add_argument("--source", action="append", choices=list(SOURCES),
                        help="search only this source (repeatable); default: every source that is on")
    search.add_argument("--limit", type=int, default=10, help="results per source (default 10; PwC caps at 25)")
    search.add_argument("--mode", choices=("semantic", "keyword"), default="semantic",
                        help="alphaXiv embedding vs full-text keyword; PwC hybrid vs keyword")
    search.add_argument("--published-after", metavar="YYYY-MM-DD")
    search.add_argument("--published-before", metavar="YYYY-MM-DD")

    sources = commands.add_parser("sources", help="list the sources, or switch them on or off")
    sources.add_argument("--enable", action="append", default=[], choices=list(SOURCES))
    sources.add_argument("--disable", action="append", default=[], choices=list(SOURCES))
    sources.add_argument("--json", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    args = build_parser().parse_args(argv)
    try:
        config = find_config(args.config)
        return cmd_search(args, config) if args.command == "search" else cmd_sources(args, config)
    except UsageError as err:
        print(f"paper_search: {err}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
