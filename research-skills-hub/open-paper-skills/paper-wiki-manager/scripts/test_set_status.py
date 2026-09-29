#!/usr/bin/env python3
"""Focused tests for the human reading-status writer."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import set_status

NOTE = "---\r\ntype: Paper\r\ntitle: A\r\nstatus: unread\r\ntimestamp: 2026-09-30T00:00:00Z\r\n---\r\n\r\nstatus: body text\r\n"


class SetStatusTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "papers").mkdir()
        (self.root / "sources").mkdir()
        (self.root / "topics").mkdir()
        self.paper = self.root / "papers" / "2401.00001.md"
        self.paper.write_bytes(NOTE.encode("utf-8"))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_rewrites_only_the_frontmatter_status_line(self) -> None:
        result = set_status.set_status(self.root, "papers/2401.00001", "read")
        self.assertEqual(result, {"note": "papers/2401.00001", "from": "unread", "to": "read", "changed": True})
        self.assertEqual(
            self.paper.read_bytes(),
            NOTE.replace("status: unread", "status: read").encode("utf-8"),
        )

    def test_same_status_leaves_the_file_untouched(self) -> None:
        before = self.paper.stat().st_mtime_ns
        result = set_status.set_status(self.root, "2401.00001", "unread")
        self.assertFalse(result["changed"])
        self.assertEqual(self.paper.stat().st_mtime_ns, before)

    def test_bare_name_resolves_to_a_source(self) -> None:
        source = self.root / "sources" / "some-post.md"
        source.write_text("---\ntype: Reference\nstatus: 'unread'\n---\n", encoding="utf-8")
        result = set_status.set_status(self.root, "some-post.md", "skimmed")
        self.assertEqual(result["note"], "sources/some-post")
        self.assertEqual(result["from"], "unread")
        self.assertIn("status: skimmed\n", source.read_text(encoding="utf-8"))

    def test_rejects_other_collections_unknown_values_and_paths(self) -> None:
        (self.root / "topics" / "x.md").write_text("---\nstatus: unread\n---\n", encoding="utf-8")
        for note, status in [
            ("topics/x", "read"),
            ("papers/2401.00001", "summarized"),
            ("papers/../topics/x", "read"),
            ("papers/9999.99999", "read"),
        ]:
            with self.subTest(note=note, status=status), self.assertRaises(ValueError):
                set_status.set_status(self.root, note, status)

    def test_missing_status_line_is_an_error(self) -> None:
        self.paper.write_text("---\ntype: Paper\n---\n\nstatus: read\n", encoding="utf-8")
        with self.assertRaises(ValueError):
            set_status.set_status(self.root, "papers/2401.00001", "read")


if __name__ == "__main__":
    unittest.main()
