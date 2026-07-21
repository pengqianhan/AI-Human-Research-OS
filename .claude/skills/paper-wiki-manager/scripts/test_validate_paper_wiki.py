#!/usr/bin/env python3
"""Focused tests for optional paper-body contracts."""

from __future__ import annotations

import unittest
from pathlib import Path

import validate_paper_wiki as validator


class ReadingHistoryValidationTests(unittest.TestCase):
    def test_missing_history_is_valid(self) -> None:
        self.assertEqual(
            validator._validate_reading_history(
                Path("papers/2401.00001.md"), "# Summary\n\nText."
            ),
            [],
        )

    def test_valid_history_accepts_nested_change_summary(self) -> None:
        body = """# Summary

Text.

# Reading History

- 2026-07-22 · arXiv v2 · local-note · merged
  - Updated: Q6, Q8
  - Input: `notes/second-pass.md`
"""
        self.assertEqual(
            validator._validate_reading_history(Path("papers/2401.00001.md"), body),
            [],
        )

    def test_empty_history_is_rejected(self) -> None:
        errors = validator._validate_reading_history(
            Path("papers/2401.00001.md"), "# Summary\n\nText.\n\n# Reading History\n"
        )
        self.assertTrue(any("must contain at least one entry" in error for error in errors))

    def test_no_op_history_entry_is_rejected(self) -> None:
        body = """# Reading History

- 2026-07-22 · arXiv v2 · paper-url · no-op
"""
        errors = validator._validate_reading_history(Path("papers/2401.00001.md"), body)
        self.assertTrue(any("must match" in error for error in errors))

    def test_duplicate_history_sections_are_rejected(self) -> None:
        body = """# Reading History

- 2026-07-21 · arXiv v1 · paper-url · merged

# Reading History

- 2026-07-22 · arXiv v2 · paper-url · merged
"""
        errors = validator._validate_reading_history(Path("papers/2401.00001.md"), body)
        self.assertTrue(any("must appear at most once" in error for error in errors))

    def test_invalid_calendar_date_is_rejected(self) -> None:
        body = """# Reading History

- 2026-99-99 · arXiv v2 · paper-url · merged
"""
        errors = validator._validate_reading_history(Path("papers/2401.00001.md"), body)
        self.assertTrue(any("invalid date" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
