#!/usr/bin/env python3
"""Offline tests for the unified paper search: switches, parsers, and merging."""

from __future__ import annotations

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import paper_search as ps

ALPHAXIV = [{
    "paperId": "2601.18005",
    "title": "Flow-based Extremal Mathematical Structure Discovery",
    "abstract": "We introduce FlowBoost.",
    "publicationDate": "2026-01-25T21:41:47.000Z",
    "votes": 3,
    "snippets": [{"pageNumber": 1, "snippet": "Flow\nBoost   packs circles"}],
}]

HUGGINGFACE = [{
    "paper": {
        "id": "2601.18005",
        "title": "Flow-based Extremal Mathematical Structure Discovery",
        "publishedAt": "2026-01-25T21:41:47.000Z",
        "upvotes": 2,
        "githubRepo": "https://github.com/berczig/FlowBoost",
        "authors": [{"name": "Gergely Bérczi", "hidden": False}, {"name": "Hidden", "hidden": True}],
    },
    "summary": "The discovery of extremal structures.",
}, {
    "paper": {"id": "2509.19349", "title": "ShinkaEvolve: Open-Ended Program Evolution", "publishedAt": "2025-09-17"},
    "summary": "Evolution.",
}]

OPENALEX = {"results": [{
    "id": "https://openalex.org/W1",
    "doi": "https://doi.org/10.48550/arXiv.1706.03762",
    "title": "Attention Is All You Need",
    "publication_date": "2017-06-12",
    "cited_by_count": 100000,
    "abstract_inverted_index": {"sequence": [1], "The": [0], "models": [2]},
    "authorships": [{"author": {"display_name": "Ashish Vaswani"}}],
}, {"id": "https://openalex.org/W2", "doi": None, "title": "No DOI Work", "publication_date": None}]}

PUBMED = b"""<?xml version="1.0"?>
<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>111</PMID><Article>
<Journal><JournalIssue><PubDate><Year>2024</Year><Month>Jun</Month></PubDate></JournalIssue><Title>Nature reviews</Title></Journal>
<ArticleTitle>CRISPR in <i>E. coli</i>.</ArticleTitle>
<Abstract><AbstractText Label="BACKGROUND">Why.</AbstractText><AbstractText>What.</AbstractText></Abstract>
<AuthorList><Author><LastName>Doe</LastName><Initials>J</Initials></Author><Author><CollectiveName>CRISPR Group</CollectiveName></Author></AuthorList>
<ArticleDate DateType="Electronic"><Year>2024</Year><Month>02</Month><Day>02</Day></ArticleDate>
</Article></MedlineCitation>
<PubmedData><ArticleIdList><ArticleId IdType="pubmed">111</ArticleId><ArticleId IdType="doi">10.1/own</ArticleId></ArticleIdList>
<ReferenceList><Reference><ArticleIdList><ArticleId IdType="doi">10.1/ref</ArticleId></ArticleIdList></Reference></ReferenceList></PubmedData>
</PubmedArticle><PubmedArticle><MedlineCitation><PMID>222</PMID><Article>
<Journal><JournalIssue><PubDate><MedlineDate>1998 Jan-Feb</MedlineDate></PubDate></JournalIssue><Title>J</Title></Journal>
<ArticleTitle>Old</ArticleTitle></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>"""

PWC = {"items": [{
    "id": "123", "arxiv_id": "1706.03762", "title": "Attention Is All You Need", "authors": ["A. Vaswani"],
    "published": "2017-06-12", "citation_count": 90000, "url": "https://paperswithcode.co/paper/1706.03762",
    "has_official_implementation": True, "code_repository_count": 42,
}, {"id": "456", "arxiv_id": None, "title": "Catalog-only paper", "has_official_implementation": False,
    "code_repository_count": 0}]}


class ParserTests(unittest.TestCase):
    def test_alphaxiv_keeps_votes_and_flattened_snippets(self) -> None:
        [hit] = ps.parse_alphaxiv(ALPHAXIV)
        self.assertEqual(hit["id"], "2601.18005")
        self.assertEqual(hit["publication_date"], "2026-01-25")
        self.assertEqual(hit["votes"], 3)
        self.assertEqual(hit["snippets"], ["Flow Boost packs circles"])
        self.assertEqual(hit["url"], "https://www.alphaxiv.org/abs/2601.18005")

    def test_huggingface_drops_hidden_authors_and_keeps_code(self) -> None:
        hit = ps.parse_huggingface(HUGGINGFACE)[0]
        self.assertEqual(hit["authors"], ["Gergely Bérczi"])
        self.assertEqual(hit["code"], "https://github.com/berczig/FlowBoost")
        self.assertEqual(hit["votes"], 2)
        self.assertEqual(hit["abstract"], "The discovery of extremal structures.")

    def test_openalex_rebuilds_abstract_and_prefers_the_doi(self) -> None:
        first, second = ps.parse_openalex(OPENALEX, "openalex")
        self.assertEqual(first["id"], "10.48550/arXiv.1706.03762")
        self.assertEqual(first["abstract"], "The sequence models")
        self.assertEqual(first["citations"], 100000)
        self.assertEqual(first["url"], "https://doi.org/10.48550/arXiv.1706.03762")
        self.assertEqual(second["id"], "W2")
        self.assertNotIn("abstract", second)  # absent fields are left out, not null

    def test_pubmed_reads_labels_dates_authors_and_own_doi(self) -> None:
        first, second = ps.parse_pubmed(PUBMED)
        self.assertEqual(first["title"], "CRISPR in E. coli.")
        self.assertEqual(first["abstract"], "BACKGROUND: Why. What.")
        self.assertEqual(first["authors"], ["Doe J", "CRISPR Group"])
        self.assertEqual(first["publication_date"], "2024-02-02")
        self.assertEqual(first["doi"], "10.1/own")
        self.assertEqual(first["venue"], "Nature reviews")
        self.assertEqual(second["publication_date"], "1998")

    def test_pwc_uses_the_arxiv_id_and_code_counts(self) -> None:
        first, second = ps.parse_pwc(PWC)
        self.assertEqual(first["id"], "1706.03762")
        self.assertEqual((first["citations"], first["code_repos"], first["official_code"]), (90000, 42, True))
        self.assertEqual(second["id"], "456")
        self.assertNotIn("official_code", second)

    def test_long_author_lists_are_cut(self) -> None:
        hit = ps.make_hit("x", "1", "t", authors=[f"A{i}" for i in range(20)])
        self.assertEqual(len(hit["authors"]), ps.MAX_AUTHORS + 1)
        self.assertEqual(hit["authors"][-1], "et al.")


class McpTests(unittest.TestCase):
    def test_plain_json_and_sse_responses(self) -> None:
        message = {"jsonrpc": "2.0", "id": 1, "result": {"structuredContent": PWC}}
        self.assertEqual(ps.parse_mcp_message(json.dumps(message)), message)
        sse = f"event: message\ndata: {json.dumps(message)}\n\n"
        self.assertEqual(ps.parse_mcp_message(sse), message)

    def test_tool_errors_become_source_errors(self) -> None:
        body = {"jsonrpc": "2.0", "id": 1, "result": {"isError": True, "content": [{"type": "text", "text": "upstream_error"}]}}
        with mock.patch.object(ps, "http", return_value=json.dumps(body).encode()):
            with self.assertRaisesRegex(ps.SourceError, "upstream_error"):
                ps.mcp_call("https://example/mcp", "search_papers", {"query": "q"})

    def test_search_pwc_sends_the_documented_arguments(self) -> None:
        with mock.patch.object(ps, "mcp_call", return_value=PWC) as call:
            hits = ps.search_pwc("q", ps.Options(limit=50, mode="keyword", after="2020-01-01"))
        self.assertEqual(len(hits), 2)
        self.assertEqual(call.call_args.args[2], {"query": "q", "limit": 25, "mode": "keyword", "published_after": "2020-01-01"})


class MergeTests(unittest.TestCase):
    def test_same_arxiv_paper_is_one_record_with_the_gaps_filled(self) -> None:
        merged = ps.merge([ps.parse_alphaxiv(ALPHAXIV), ps.parse_huggingface(HUGGINGFACE)])
        self.assertEqual([h["id"] for h in merged], ["2601.18005", "2509.19349"])
        first = merged[0]
        self.assertEqual(first["source"], "alphaxiv")
        self.assertEqual(first["also_in"], ["huggingface"])
        self.assertEqual(first["votes"], 3)  # the first source keeps its own value
        self.assertEqual(first["code"], "https://github.com/berczig/FlowBoost")  # a gap it lacked

    def test_arxiv_doi_matches_the_bare_arxiv_id(self) -> None:
        merged = ps.merge([ps.parse_openalex(OPENALEX, "openalex"), ps.parse_pwc(PWC)])
        attention = [h for h in merged if h["title"] == "Attention Is All You Need"]
        self.assertEqual(len(attention), 1)
        self.assertEqual(attention[0]["also_in"], ["pwc"])
        self.assertEqual(attention[0]["code_repos"], 42)

    def test_sources_interleave_rank_by_rank(self) -> None:
        a = [ps.make_hit("a", f"a{i}", f"Paper number {i} from source alpha") for i in range(2)]
        b = [ps.make_hit("b", f"b{i}", f"Paper number {i} from source beta") for i in range(2)]
        self.assertEqual([h["id"] for h in ps.merge([a, b])], ["a0", "b0", "a1", "b1"])


class SwitchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.config = Path(self.tmp.name) / "paper-sources.json"
        self.config.write_text(json.dumps({"pubmed": False, "note": "kept"}), encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_cli(self, *argv: str) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = ps.main(["--config", str(self.config), *argv])
        return code, out.getvalue(), err.getvalue()

    def test_missing_keys_mean_on(self) -> None:
        switches = ps.load_switches(self.config)
        self.assertFalse(switches["pubmed"])
        self.assertTrue(all(on for source, on in switches.items() if source != "pubmed"))
        self.assertTrue(all(ps.load_switches(None).values()))

    def test_sources_command_flips_switches_and_keeps_other_keys(self) -> None:
        code, out, _ = self.run_cli("sources", "--enable", "pubmed", "--disable", "pwc", "--json")
        self.assertEqual(code, 0)
        rows = {row["id"]: row["enabled"] for row in json.loads(out)["sources"]}
        self.assertEqual((rows["pubmed"], rows["pwc"]), (True, False))
        saved = json.loads(self.config.read_text(encoding="utf-8"))
        self.assertEqual(list(saved)[: len(ps.SOURCES)], list(ps.SOURCES))
        self.assertEqual(saved["note"], "kept")

    def test_asking_for_a_disabled_source_is_refused(self) -> None:
        with mock.patch.object(ps, "run_search") as run:
            code, _, err = self.run_cli("search", "q", "--source", "pubmed")
        self.assertEqual(code, 2)
        self.assertIn("PubMed is switched off", err)
        run.assert_not_called()

    def test_default_search_skips_disabled_sources_and_reports_failures(self) -> None:
        def fake(source: str):
            def search(query: str, opts: ps.Options) -> list:
                if source == "pwc":
                    raise ps.SourceError("upstream down")
                return [ps.make_hit(source, f"{source}-1", f"A paper found through {source}")]
            return search

        searchers = {source: fake(source) for source in ps.SOURCES}
        with mock.patch.dict(ps.SEARCHERS, searchers):
            code, out, _ = self.run_cli("search", "q", "--limit", "1")
        report = json.loads(out)
        self.assertEqual(code, 0)
        self.assertNotIn("pubmed", report["searched"])
        self.assertEqual(report["disabled"], ["pubmed"])
        self.assertEqual(report["errors"], {"pwc": "upstream down"})
        self.assertEqual(len(report["results"]), len(ps.SOURCES) - 2)

    def test_every_searched_source_failing_exits_1(self) -> None:
        def down(query: str, opts: ps.Options) -> list:
            raise ps.SourceError("down")

        with mock.patch.dict(ps.SEARCHERS, {"alphaxiv": down}):
            code, out, _ = self.run_cli("search", "q", "--source", "alphaxiv")
        self.assertEqual(code, 1)
        self.assertEqual(json.loads(out)["errors"], {"alphaxiv": "down"})

    def test_bad_date_window_is_a_usage_error(self) -> None:
        code, _, err = self.run_cli("search", "q", "--published-after", "2025-02-01", "--published-before", "2025-01-01")
        self.assertEqual(code, 2)
        self.assertIn("later than", err)

    def test_huggingface_window_filters_after_retrieval(self) -> None:
        with mock.patch.object(ps, "get_json", return_value=HUGGINGFACE):
            hits = ps.search_huggingface("q", ps.Options(limit=5, after="2026-01-01"))
        self.assertEqual([h["id"] for h in hits], ["2601.18005"])


class CredentialTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "memory").mkdir()
        self.config = self.root / "memory" / "paper-sources.json"
        self.config.write_text("{}", encoding="utf-8")
        self.env = self.root / ".env"
        self.env.write_text(
            "# comment\n"
            "export OPENALEX_API_KEY='oa-secret'\n"
            "NCBI_API_KEY=ncbi-secret # inline comment\n"
            "HF_TOKEN=\n"
            "UNRELATED_SECRET=never-read\n",
            encoding="utf-8",
        )
        self.saved = dict(ps.KEYS)

    def tearDown(self) -> None:
        ps.KEYS.clear()
        ps.KEYS.update(self.saved)
        self.tmp.cleanup()

    def use(self, **keys: str) -> None:
        ps.KEYS.clear()
        ps.KEYS.update(keys)

    def test_env_file_sits_beside_memory(self) -> None:
        self.assertEqual(ps.env_file_for(self.config), self.env)
        self.assertIsNone(ps.env_file_for(self.root / "paper-sources.json"))
        self.assertIsNone(ps.env_file_for(None))

    def test_only_known_keys_are_read_and_the_environment_wins(self) -> None:
        with mock.patch.dict(ps.os.environ, {"NCBI_API_KEY": "from-env", "HF_TOKEN": ""}, clear=True):
            keys = ps.load_credentials(self.env)
        self.assertEqual(keys, {"OPENALEX_API_KEY": "oa-secret", "NCBI_API_KEY": "from-env"})

    def test_each_key_reaches_only_its_source(self) -> None:
        self.use(OPENALEX_API_KEY="oa-secret", NCBI_API_KEY="ncbi-secret", HF_TOKEN="hf-secret")
        with mock.patch.object(ps, "get_json", return_value={"results": []}) as get:
            ps.search_openalex("q", ps.Options())
        self.assertIn("api_key=oa-secret", get.call_args.args[0])

        search = {"esearchresult": {"idlist": ["111"]}}
        with mock.patch.object(ps, "get_json", return_value=search) as get, \
                mock.patch.object(ps, "http", return_value=PUBMED) as fetch:
            ps.search_pubmed("q", ps.Options())
        self.assertIn("api_key=ncbi-secret", get.call_args.args[0])
        self.assertIn("api_key=ncbi-secret", fetch.call_args.args[0])

        with mock.patch.object(ps, "get_json", return_value=[]) as get:
            ps.search_huggingface("q", ps.Options())
        self.assertEqual(get.call_args.args[1], {"Authorization": "Bearer hf-secret"})

        with mock.patch.object(ps, "get_json", return_value=[]) as get:
            ps.search_alphaxiv("q", ps.Options())
        self.assertNotIn("secret", get.call_args.args[0])

    def test_rate_limit_names_the_next_step(self) -> None:
        self.use()
        self.assertIn("set OPENALEX_API_KEY in the repository's .env", ps.with_hint("biorxiv", "HTTP 429: slow down"))
        self.assertIn("--mode keyword", ps.with_hint("pwc", "HTTP 429: slow down"))
        self.assertEqual(ps.with_hint("openalex", "HTTP 500: boom"), "HTTP 500: boom")
        self.use(OPENALEX_API_KEY="oa-secret")
        self.assertIn("daily budget may be used up", ps.with_hint("openalex", "HTTP 429: slow down"))

    def test_keys_never_reach_error_messages(self) -> None:
        self.use(OPENALEX_API_KEY="oa-secret")

        def leaky(query: str, opts: ps.Options) -> list:
            raise ps.SourceError("HTTP 403: bad key oa-secret")

        _, errors = ps.run_search("q", ["openalex"], ps.Options(), {"openalex": leaky})
        self.assertEqual(errors, {"openalex": "HTTP 403: bad key [REDACTED]"})

    def test_sources_reports_whether_each_key_is_set(self) -> None:
        out = io.StringIO()
        with mock.patch.dict(ps.os.environ, {}, clear=True), contextlib.redirect_stdout(out):
            ps.main(["--config", str(self.config), "sources", "--json"])
        rows = {row["id"]: row for row in json.loads(out.getvalue())["sources"]}
        self.assertEqual((rows["openalex"]["credential"], rows["openalex"]["credential_set"]), ("OPENALEX_API_KEY", True))
        self.assertEqual((rows["huggingface"]["credential"], rows["huggingface"]["credential_set"]), ("HF_TOKEN", False))
        self.assertIsNone(rows["alphaxiv"]["credential"])
        self.assertNotIn("oa-secret", out.getvalue())


if __name__ == "__main__":
    unittest.main()
