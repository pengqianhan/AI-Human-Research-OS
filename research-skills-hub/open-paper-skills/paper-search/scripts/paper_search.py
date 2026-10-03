#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["truststore>=0.10"]
# ///
"""Search papers across every literature source the human has switched on,
and read one paper through the sources in the human's read order.

One command, one result shape, and a per-source on/off switch: the design of
alphaXiv OpenResearch's `orx discover` and `orx paper` (MIT), reimplemented here
and extended with Hugging Face Papers, the Papers with Code MCP server, and
arXiv's own API (the query and rate-limit rules of google-deepmind
science-skills' `literature_search_arxiv`, Apache-2.0). The switches and the
read order live in `memory/paper-sources.json`; os-ui's agent windows change
them through the `sources` command, and a source switched off refuses to run.

Standard library plus the optional `truststore`, which `uv run paper_search.py`
installs from the header above.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from html.parser import HTMLParser
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
    "arxiv": ("arXiv", "arXiv's own API: fielded queries (ti:, au:, abs:, cat:) and official metadata"),
}
# Off until the human switches them on: biology sources outside the fields the
# OS ships for. Every other source starts on.
DEFAULT_OFF = {"biorxiv", "pubmed"}
# The sources `fetch` can read a full text from, in the default read order.
READERS = ("huggingface", "alphaxiv", "arxiv")

# Optional per-user keys, each raising one source's limits. Every user brings
# their own: a key shipped with the OS would pool all users' traffic into one
# budget and expose it in a public repository. Values come from the
# environment, else from the repository's gitignored `.env`.
CREDENTIALS: dict[str, tuple[str, str]] = {
    "openalex": ("OPENALEX_API_KEY", "a free key from https://openalex.org/settings/api raises the "
                 "daily budget 10x ($0.10 to $1, about 100 to 1,000 searches)"),
    "biorxiv": ("OPENALEX_API_KEY", "bioRxiv is searched through OpenAlex; a free key from "
                "https://openalex.org/settings/api raises the daily budget 10x"),
    "pubmed": ("NCBI_API_KEY", "a free key from your NCBI account settings raises the limit "
               "from 3 to 10 requests per second"),
    "huggingface": ("HF_TOKEN", "a read token from https://huggingface.co/settings/tokens raises "
                    "the anonymous rate limit"),
}
# Each key once: who issues it and where the user gets one (os-ui links there).
KEY_INFO: dict[str, tuple[str, str]] = {
    "OPENALEX_API_KEY": ("OpenAlex", "https://openalex.org/settings/api"),
    "NCBI_API_KEY": ("NCBI", "https://account.ncbi.nlm.nih.gov/settings/"),
    "HF_TOKEN": ("Hugging Face", "https://huggingface.co/settings/tokens"),
}
# One token, no whitespace or quotes, so the `.env` line needs no escaping.
KEY_VALUE = re.compile(r"[A-Za-z0-9._~+/=:-]{8,256}")
KEYS: dict[str, str] = {}

ALPHAXIV_API = "https://api.alphaxiv.org"
ALPHAXIV_WEB = "https://www.alphaxiv.org"
ARXIV_API = "https://export.arxiv.org/api/query"
ARXIV_WEB = "https://arxiv.org"
ATOM = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
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
    """A source the file leaves out keeps its default: on, except DEFAULT_OFF."""
    data = read_config(path)
    return {source: data.get(source, source not in DEFAULT_OFF) is not False for source in SOURCES}


def save_switches(path: Path, changes: dict[str, Any]) -> dict[str, bool]:
    data = read_config(path)
    data.update(changes)
    ordered = {source: data.get(source, source not in DEFAULT_OFF) is not False for source in SOURCES}
    ordered.update({k: v for k, v in data.items() if k not in SOURCES})
    path.write_text(json.dumps(ordered, indent=2) + "\n", encoding="utf-8", newline="\n")
    return load_switches(path)


def check_read_order(order: Any, where: str) -> list[str]:
    if (not isinstance(order, list) or not order or len(set(order)) != len(order)
            or any(reader not in READERS for reader in order)):
        raise UsageError(f"{where}: read_order takes distinct readers from {', '.join(READERS)}, got {order!r}")
    return order


def load_read_order(path: Path | None) -> list[str]:
    """The sources `fetch` tries for a full text, first tried first."""
    return check_read_order(read_config(path).get("read_order", list(READERS)), str(path))


# --- credentials -----------------------------------------------------------


def env_file_for(config: Path | None) -> Path | None:
    """The repository's `.env`, beside the `memory/` that holds the switches."""
    if config is None or config.parent.name != "memory":
        return None
    return config.parent.parent / ".env"


def env_key(line: str) -> str:
    return line.strip().removeprefix("export ").partition("=")[0].strip()


def load_credentials(env_file: Path | None) -> dict[str, str]:
    """The known keys only; the environment wins over `.env`."""
    names = set(KEY_INFO)
    found: dict[str, str] = {}
    if env_file is not None and env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.strip().removeprefix("export ").partition("=")
            value = value.strip()
            if value[:1] in ("'", '"'):
                value = value[1:].split(value[0], 1)[0]
            else:
                value = value.split(" #", 1)[0].strip()
            if sep and key.strip() in names:
                found[key.strip()] = value
    for name in names:
        if os.environ.get(name, "").strip():
            found[name] = os.environ[name].strip()
    return {name: value for name, value in found.items() if value}


def ensure_ignored(env_file: Path) -> None:
    """Refuse to store a key where a commit could publish it."""
    try:
        result = subprocess.run(["git", "check-ignore", "-q", env_file.name], cwd=env_file.parent,
                                capture_output=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return  # no Git, so no commit to leak through
    if result.returncode == 1:  # 0 = ignored; 128 = not a repository
        raise UsageError(f"{env_file} is not ignored by Git; add `.env` to .gitignore before storing keys in it")


def save_key(env_file: Path, name: str, value: str | None) -> None:
    """Set or remove one `NAME=value` line, keeping every other line as it was."""
    lines = env_file.read_text(encoding="utf-8").splitlines() if env_file.is_file() else []
    new = f"{name}={value}" if value is not None else None
    kept: list[str] = []
    for line in lines:
        if env_key(line) != name:
            kept.append(line)
        elif new is not None:  # in place, under the template's comment
            kept.append(new)
            new = None
    if new is not None:
        kept.append(new)
    if not any(line.strip() for line in kept):
        env_file.unlink(missing_ok=True)
        return
    env_file.touch(mode=0o600, exist_ok=True)  # owner-only where the OS has modes
    env_file.write_text("\n".join(kept) + "\n", encoding="utf-8", newline="\n")


def key_rows() -> list[dict[str, Any]]:
    """Which keys are set and where from; never their values."""
    rows = []
    for name, (label, url) in KEY_INFO.items():
        origin = "environment" if os.environ.get(name, "").strip() else ".env" if name in KEYS else None
        rows.append({
            "name": name,
            "label": label,
            "sources": [s for s, (key, _) in CREDENTIALS.items() if key == name],
            "set": name in KEYS,
            "from": origin,
            "get_url": url,
        })
    return rows


def redact(text: str) -> str:
    for value in KEYS.values():
        text = text.replace(value, "[REDACTED]")
    return text


def with_hint(source: str, message: str) -> str:
    """Tell the user the next step when a rate limit is what failed."""
    if not message.startswith("HTTP 429"):
        return message
    if source == "pwc":
        return f"{message} Next step: hybrid search allows 10 calls a minute; retry with --mode keyword."
    if source not in CREDENTIALS:
        return message
    name, benefit = CREDENTIALS[source]
    if name in KEYS:
        return f"{message} ({name} is set, so its daily budget may be used up; it resets daily.)"
    return f"{message} Next step: add {name} under Keys in os-ui's Papers panel, or in the repository's .env; {benefit}."


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
    """The human-readable part of an error body (OpenAlex sends JSON, arXiv Atom)."""
    summary = re.search(r"<summary>(.*?)</summary>", body, re.S)
    if summary:
        return summary.group(1)
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return body
    if isinstance(data, dict):
        return str(data.get("message") or data.get("error") or body)
    return body


def get_json(url: str, headers: dict[str, str] | None = None) -> Any:
    try:
        return json.loads(http(url, headers=headers))
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
    if "OPENALEX_API_KEY" in KEYS:
        params["api_key"] = KEYS["OPENALEX_API_KEY"]
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
    key = {"api_key": KEYS["NCBI_API_KEY"]} if "NCBI_API_KEY" in KEYS else {}
    found = get_json(f"{PUBMED_API}/esearch.fcgi?{urllib.parse.urlencode(params | key)}")["esearchresult"]
    if found.get("ERROR"):
        raise SourceError(str(found["ERROR"]))
    ids = found.get("idlist") or []
    if not ids:
        return []
    fetch = {"db": "pubmed", "id": ",".join(ids), "retmode": "xml", "tool": "research-os-paper-search"} | key
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
    auth = {"Authorization": f"Bearer {KEYS['HF_TOKEN']}"} if "HF_TOKEN" in KEYS else None
    rows = get_json(f"{HF_API}/api/papers/search?{urllib.parse.urlencode({'q': query, 'limit': pool})}", auth)
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


ARXIV_GAP = 3.0  # arXiv's terms: at most one request every three seconds
_arxiv_last = [0.0]


def arxiv_http(url: str, headers: dict[str, str] | None = None) -> bytes:
    wait = _arxiv_last[0] + ARXIV_GAP - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    try:
        return http(url, headers=headers)
    finally:
        _arxiv_last[0] = time.monotonic()


ARXIV_FIELD = re.compile(r"\b(?:ti|au|abs|co|jr|cat|rn|id|all|submittedDate):", re.I)


def arxiv_query(query: str, opts: Options) -> str:
    """A query in arXiv's syntax. Plain words would be OR-ed, so they are AND-ed;
    keyword mode searches the exact phrase; a fielded query passes through."""
    if ARXIV_FIELD.search(query):
        q = query
    elif opts.mode == "keyword":
        q = 'all:"{}"'.format(query.replace('"', ""))
    else:
        q = " AND ".join(f"all:{word}" for word in query.split())
    if opts.after or opts.before:
        low = (opts.after or "1991-01-01").replace("-", "") + "0000"
        high = (opts.before or "2999-12-31").replace("-", "") + "2359"
        q = f"({q}) AND submittedDate:[{low} TO {high}]"
    return q


def search_arxiv(query: str, opts: Options) -> list[dict[str, Any]]:
    params = {"search_query": arxiv_query(query, opts), "max_results": str(opts.limit), "sortBy": "relevance"}
    return parse_arxiv(arxiv_http(f"{ARXIV_API}?{urllib.parse.urlencode(params)}"))


def parse_arxiv(xml: bytes) -> list[dict[str, Any]]:
    hits = []
    for entry in ET.fromstring(xml).findall("a:entry", ATOM):
        url = entry.findtext("a:id", "", ATOM)
        if url.endswith("/api/errors"):  # arXiv reports a bad query as an entry
            raise SourceError(clip(entry.findtext("a:summary", "", ATOM), 300))
        paper_id = re.sub(r"v\d+$", "", url.split("/abs/", 1)[-1])
        hits.append(
            make_hit(
                "arxiv",
                paper_id,
                entry.findtext("a:title", "", ATOM),
                abstract=clip(entry.findtext("a:summary", "", ATOM), 100_000),
                publication_date=day(entry.findtext("a:published", "", ATOM)),
                authors=[a.findtext("a:name", "", ATOM) for a in entry.findall("a:author", ATOM)],
                url=f"{ARXIV_WEB}/abs/{paper_id}",
                doi=entry.findtext("arxiv:doi", None, ATOM),
                venue=entry.findtext("arxiv:journal_ref", None, ATOM),
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
    "arxiv": search_arxiv,
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
            errors[source] = with_hint(source, redact(str(err)))
        except Exception as err:  # a malformed response must not sink the other sources
            errors[source] = redact(f"{type(err).__name__}: {err}")
    return merge(answered), errors


# --- reading one paper -----------------------------------------------------

DOI = re.compile(r"10\.\d{4,9}/[^\s?#]+", re.I)
NEW_ARXIV = re.compile(r"\d{4}\.\d{4,5}")
OLD_ARXIV = re.compile(r"[a-z-]+(?:\.[a-z]{2})?/\d{7}", re.I)


def classify(raw: str) -> tuple[str, str]:
    """Which source a paper id belongs to, from its shape, in the manner of
    `orx paper`: (kind, id) with kind arxiv, biorxiv, openalex, or pubmed."""
    text = raw.strip()
    lower = text.lower()
    pmid = re.fullmatch(r"(?:pmid:)?\s*(\d{1,9})", lower) or re.search(r"pubmed\.ncbi\.nlm\.nih\.gov/(\d+)", lower)
    if pmid:
        return "pubmed", pmid.group(1)
    doi = DOI.search(text)
    if doi:
        value = doi.group(0).rstrip("/.")
        if value.lower().startswith("10.48550/arxiv."):
            return "arxiv", value.split(".", 2)[2]
        return ("biorxiv" if value.startswith("10.1101/") else "openalex"), f"doi:{value}"
    work = re.fullmatch(r"(?:https?://openalex\.org/)?(W\d+)", text, re.I)
    if work:
        return "openalex", work.group(1).upper()
    found = NEW_ARXIV.search(text) or OLD_ARXIV.search(text)
    if found:
        return "arxiv", found.group(0)
    raise UsageError(f"{raw!r} is not an arXiv id or URL, a DOI, an OpenAlex W id, or a PubMed id")


class HtmlText(HTMLParser):
    """arXiv's LaTeXML page as plain text: headings marked with #, math kept as
    its TeX source, page chrome and scripts dropped."""

    SKIP = {"script", "style", "nav", "header", "footer", "button", "form"}
    BLOCK = {"p", "div", "section", "article", "li", "tr", "br", "figcaption",
             "table", "blockquote", "dt", "dd", "caption", "figure"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip = 0
        self.math = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.SKIP:
            self.skip += 1
        elif self.skip:
            return
        elif tag == "math":
            if not self.math:
                self.parts.append(f" ${dict(attrs).get('alttext') or ''}$ ")
            self.math += 1
        elif re.fullmatch(r"h[1-6]", tag):
            self.parts.append("\n\n" + "#" * int(tag[1]) + " ")
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP:
            self.skip = max(self.skip - 1, 0)
        elif tag == "math":
            self.math = max(self.math - 1, 0)
        elif not self.skip and re.fullmatch(r"h[1-6]", tag):
            self.parts.append("\n\n")

    def handle_data(self, data: str) -> None:
        if not self.skip and not self.math:
            self.parts.append(data)


def html_text(html: str) -> str:
    parser = HtmlText()
    parser.feed(html)
    parser.close()
    lines = (re.sub(r"\s+", " ", line).strip() for line in "".join(parser.parts).splitlines())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip() + "\n"


MIN_CHARS = 5000
SECTION = re.compile(r"(?:#+\s*)?(?:[0-9IVX]+\.?\s*)?(?:introduction|background|related work|preliminaries|"
                     r"methods?|methodology|approach|experiments?|evaluation|results|discussion|conclusions?)\b", re.I)


def incomplete(text: str) -> str | None:
    """Why a full text looks cut short, or None when it reads as a paper. Hugging
    Face sometimes serves only a figure's alt text for a fresh submission."""
    size = len(text.strip())
    if size < MIN_CHARS:
        return f"only {size} characters"
    if not any(len(line) <= 80 and SECTION.match(line.strip()) for line in text.splitlines()):
        return "no section heading such as Introduction or Method"
    return None


def get_text(url: str, headers: dict[str, str] | None = None,
             fetch: Callable[..., bytes] = http) -> str | None:
    """A page as text, or None when the source has no such paper."""
    try:
        return fetch(url, headers=headers).decode("utf-8", "replace")
    except SourceError as err:
        if str(err).startswith("HTTP 404"):
            return None
        raise


def hf_auth() -> dict[str, str] | None:
    return {"Authorization": f"Bearer {KEYS['HF_TOKEN']}"} if "HF_TOKEN" in KEYS else None


def read_huggingface(paper_id: str, report: bool) -> str | None:
    return get_text(f"{HF_API}/papers/{paper_id}.md", hf_auth())


def read_alphaxiv(paper_id: str, report: bool) -> str | None:
    return get_text(f"{ALPHAXIV_WEB}/{'overview' if report else 'abs'}/{paper_id}.md")


def read_arxiv(paper_id: str, report: bool) -> str | None:
    html = get_text(f"{ARXIV_WEB}/html/{paper_id}", fetch=arxiv_http)
    return html_text(html) if html is not None else None


READ: dict[str, Callable[[str, bool], str | None]] = {
    "huggingface": read_huggingface,
    "alphaxiv": read_alphaxiv,
    "arxiv": read_arxiv,
}
READ_URL = {
    "huggingface": HF_API + "/papers/{}",
    "alphaxiv": ALPHAXIV_WEB + "/abs/{}",
    "arxiv": ARXIV_WEB + "/html/{}",
}


def arxiv_metadata(paper_id: str, switches: dict[str, bool]) -> dict[str, Any] | None:
    """Bibliographic facts from arXiv itself, else from Hugging Face."""
    if switches["arxiv"]:
        query = urllib.parse.urlencode({"id_list": paper_id})
        hits = parse_arxiv(arxiv_http(f"{ARXIV_API}?{query}"))
        if hits:
            return hits[0]
    if switches["huggingface"]:
        data = get_json(f"{HF_API}/api/papers/{paper_id}", hf_auth())
        return parse_huggingface([{"paper": data}])[0]
    return None


def lookup(kind: str, paper_id: str) -> dict[str, Any] | None:
    """Metadata for a DOI, OpenAlex id, or PMID; these sources hold no full text."""
    if kind == "pubmed":
        params = {"db": "pubmed", "id": paper_id, "retmode": "xml", "tool": "research-os-paper-search"}
        if "NCBI_API_KEY" in KEYS:
            params["api_key"] = KEYS["NCBI_API_KEY"]
        hits = parse_pubmed(http(f"{PUBMED_API}/efetch.fcgi?{urllib.parse.urlencode(params)}"))
    else:
        params = {"select": OPENALEX_SELECT}
        if "OPENALEX_API_KEY" in KEYS:
            params["api_key"] = KEYS["OPENALEX_API_KEY"]
        try:
            work = get_json(f"{OPENALEX_API}/works/{paper_id}?{urllib.parse.urlencode(params)}")
        except SourceError as err:
            if str(err).startswith("HTTP 404"):
                return None
            raise
        hits = parse_openalex({"results": [work]}, kind)
    return hits[0] if hits else None


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


def cmd_fetch(args: argparse.Namespace, config: Path | None) -> int:
    switches = load_switches(config)
    kind, paper_id = classify(args.paper)
    report: dict[str, Any] = {"paper": args.paper, "id": paper_id, "kind": kind}

    if kind != "arxiv":
        if args.via or args.report:
            raise UsageError("--via and --report read arXiv papers; a DOI or PubMed id has metadata only")
        if not switches[kind]:
            raise UsageError(f"{SOURCES[kind][0]} is switched off in {config}; it holds this id's record")
        try:
            report["metadata"] = lookup(kind, paper_id)
        except SourceError as err:
            report["errors"] = {kind: with_hint(kind, redact(str(err)))}
            report["metadata"] = None
        report["note"] = "no full text from this source; follow the record's url or doi"
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0 if report["metadata"] else 1

    if args.report and args.via not in (None, "alphaxiv"):
        raise UsageError("--report reads alphaXiv's overview; it cannot come through another source")
    order = ["alphaxiv"] if args.report else [args.via] if args.via else load_read_order(config)
    off = [r for r in order if not switches[r]]
    if (args.via or args.report) and off:
        raise UsageError(
            f"{SOURCES[off[0]][0]} is switched off in {config}. The human turns sources on in os-ui's "
            f"agent window or with `sources --enable`; read through the sources that are on instead."
        )
    report["read_order"] = order

    tried: list[dict[str, str]] = []
    text = source = None
    for reader in order:
        if not switches[reader]:
            tried.append({"source": reader, "outcome": "switched off"})
            continue
        try:
            found = READ[reader](paper_id, args.report)
        except SourceError as err:
            tried.append({"source": reader, "outcome": "error: " + with_hint(reader, redact(str(err)))})
            continue
        if found is None:
            problem = "not found"
        else:
            cut = None if args.report else incomplete(found)
            problem = f"incomplete: {cut}" if cut else None
        if problem:
            tried.append({"source": reader, "outcome": problem})
            continue
        tried.append({"source": reader, "outcome": "ok"})
        text, source = found, reader
        break
    report["tried"] = tried

    try:
        report["metadata"] = arxiv_metadata(paper_id, switches)
    except SourceError as err:
        report["metadata"] = None
        report["metadata_error"] = redact(str(err))

    if text is None:
        report["pdf"] = f"{ARXIV_WEB}/pdf/{paper_id}"
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1
    out = args.out or Path(tempfile.gettempdir()) / "paper-search" / (
        f"{paper_id.replace('/', '_')}.{source}.{'report' if args.report else 'full'}.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    report.update(source=source, url=READ_URL[source].format(paper_id), file=str(out), chars=len(text))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


def cmd_sources(args: argparse.Namespace, config: Path | None) -> int:
    changes: dict[str, Any] = {s: True for s in args.enable} | {s: False for s in args.disable}
    if set(args.enable) & set(args.disable):
        raise UsageError("a source cannot be both enabled and disabled")
    if args.read_order is not None:
        changes["read_order"] = check_read_order(
            [r.strip() for r in args.read_order.split(",") if r.strip()], "--read-order")
    if changes:
        if config is None:
            raise UsageError(f"no {CONFIG_NAME.as_posix()} above the working directory; pass --config")
        switches = save_switches(config, changes)
    else:
        switches = load_switches(config)
    payload = status(config, switches)
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for row in payload["sources"]:
            key = f"  [{row['credential']} {'set' if row['credential_set'] else 'not set'}]" if row["credential"] else ""
            print(f"{row['id']:<12} {'on ' if row['enabled'] else 'off'}  {row['name']}: {row['about']}{key}")
        print(f"read order: {' -> '.join(payload['read_order'])}")
        print(f"switches: {config or 'none found (defaults)'}")
    return 0


def status(config: Path | None, switches: dict[str, bool]) -> dict[str, Any]:
    """What os-ui's Papers panel shows: the switches and which keys are set."""
    rows = []
    for source, (name, about) in SOURCES.items():
        credential = CREDENTIALS.get(source, (None, ""))[0]
        rows.append({"id": source, "name": name, "about": about, "enabled": switches[source],
                     "credential": credential, "credential_set": credential in KEYS})
    return {"config": str(config) if config else None, "sources": rows,
            "read_order": load_read_order(config), "keys": key_rows()}


def cmd_keys(args: argparse.Namespace, config: Path | None) -> int:
    name = args.set_key or args.clear
    if name:
        env_file = env_file_for(config)
        if env_file is None:
            raise UsageError(f"no {CONFIG_NAME.as_posix()} above the working directory, so no repository .env")
        ensure_ignored(env_file)
        if args.set_key:
            # stdin, not argv: a command line is visible to every local process.
            value = sys.stdin.read().strip()
            if not KEY_VALUE.fullmatch(value):
                raise UsageError(f"{name}: expected one token of 8 to 256 letters, digits, or ._~+/=:- on stdin")
            save_key(env_file, name, value)
        else:
            save_key(env_file, name, None)
        KEYS.clear()
        KEYS.update(load_credentials(env_file))
    if args.json:
        print(json.dumps(status(config, load_switches(config)), ensure_ascii=False, indent=2))
    else:
        for row in key_rows():
            state = f"set ({row['from']})" if row["set"] else "not set"
            print(f"{row['name']:<17} {state:<18} {', '.join(row['sources'])}  get one: {row['get_url']}")
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

    fetch = commands.add_parser("fetch", help="read one paper: the full text through the read order, "
                                "or the record of a DOI, OpenAlex id, or PubMed id")
    fetch.add_argument("paper", help="arXiv id or URL, DOI, OpenAlex W id, or PubMed id")
    fetch.add_argument("--via", choices=READERS, help="read through this source only")
    fetch.add_argument("--report", action="store_true",
                       help="alphaXiv's ~10 KB overview of the paper instead of its full text")
    fetch.add_argument("--out", type=Path, help="file for the text (default: under the system temp directory)")

    sources = commands.add_parser("sources", help="list the sources, or switch them on or off")
    sources.add_argument("--enable", action="append", default=[], choices=list(SOURCES))
    sources.add_argument("--disable", action="append", default=[], choices=list(SOURCES))
    sources.add_argument("--read-order", metavar="A,B,C",
                         help=f"readers `fetch` tries, first tried first (default: {','.join(READERS)})")
    sources.add_argument("--json", action="store_true")

    keys = commands.add_parser("keys", help="show which per-user keys are set, or store or clear one in .env")
    change = keys.add_mutually_exclusive_group()
    change.add_argument("--set", dest="set_key", choices=list(KEY_INFO), help="store the value read from stdin")
    change.add_argument("--clear", choices=list(KEY_INFO))
    keys.add_argument("--json", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    args = build_parser().parse_args(argv)
    try:
        config = find_config(args.config)
        KEYS.clear()
        KEYS.update(load_credentials(env_file_for(config)))
        command = {"search": cmd_search, "fetch": cmd_fetch, "sources": cmd_sources, "keys": cmd_keys}[args.command]
        return command(args, config)
    except UsageError as err:
        print(f"paper_search: {err}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
