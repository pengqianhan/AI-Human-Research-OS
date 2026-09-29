#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Set the human reading status of one paper-wiki note.

`status` records whether the human has read a paper or source, so it changes
only on the human's word: the viewer's status buttons (served by os-ui) call
this script, and an agent runs it only when the human asks. Only the
frontmatter `status:` line is rewritten; every other byte, including CRLF line
endings, stays as it was. Regenerate viz.html afterwards so the embedded graph
picks up the change.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

STATUS_VALUES = ("unread", "skimmed", "read")
# Reading surfaces only: topics and concepts carry no reading status.
STATUS_COLLECTIONS = ("papers", "sources")
NOTE_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")
STATUS_LINE_RE = re.compile(r"status:[ \t]*(?P<value>.*?)[ \t]*(?P<cr>\r?)")


def resolve_note(root: Path, note: str) -> tuple[str, Path]:
    """Map `papers/<id>`, `sources/<slug>`, or a bare name to its note file."""
    note = note.strip().replace("\\", "/").removesuffix(".md")
    if "/" in note:
        collection, _, name = note.partition("/")
        if collection not in STATUS_COLLECTIONS:
            raise ValueError(
                f"{note}: status applies only to {', '.join(STATUS_COLLECTIONS)}"
            )
        candidates = [(collection, name)]
    else:
        name = note
        candidates = [(collection, name) for collection in STATUS_COLLECTIONS]
    if not NOTE_NAME_RE.match(name):
        raise ValueError(f"{note}: not a note name")
    found = [
        (f"{collection}/{name}", root / collection / f"{name}.md")
        for collection, name in candidates
        if (root / collection / f"{name}.md").is_file()
    ]
    if not found:
        raise ValueError(f"{note}: no such paper or source note under {root}")
    if len(found) > 1:
        raise ValueError(f"{note}: ambiguous, use one of {[nid for nid, _ in found]}")
    return found[0]


def set_status(root: Path, note: str, status: str) -> dict[str, object]:
    if status not in STATUS_VALUES:
        raise ValueError(f"status must be one of {', '.join(STATUS_VALUES)}")
    note_id, path = resolve_note(root, note)
    with path.open(encoding="utf-8", newline="") as fh:
        lines = fh.read().split("\n")  # a CRLF line keeps its "\r"
    if not lines or lines[0].strip() != "---":
        raise ValueError(f"{note_id}: missing YAML frontmatter")
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            break
        match = STATUS_LINE_RE.fullmatch(lines[idx])
        if not match:
            continue
        previous = match.group("value").strip("\"'")
        if previous != status:
            lines[idx] = f"status: {status}{match.group('cr')}"
            with path.open("w", encoding="utf-8", newline="") as fh:
                fh.write("\n".join(lines))
        return {"note": note_id, "from": previous, "to": status, "changed": previous != status}
    raise ValueError(f"{note_id}: frontmatter has no status line")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Set the human reading status (unread / skimmed / read) of one paper or source note."
    )
    parser.add_argument("note", help="papers/<arxiv_id>, sources/<slug>, or a bare arXiv ID or slug.")
    parser.add_argument("status", choices=STATUS_VALUES)
    parser.add_argument(
        "--root",
        default="paper-wiki",
        help="Path to the paper wiki root (default: paper-wiki).",
    )
    args = parser.parse_args()
    try:
        result = set_status(Path(args.root).expanduser().resolve(), args.note, args.status)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
