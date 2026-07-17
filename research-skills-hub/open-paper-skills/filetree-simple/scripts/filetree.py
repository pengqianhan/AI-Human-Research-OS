#!/usr/bin/env python3
"""Generate and lint a compact top-level FILETREE.md navigation map."""

from __future__ import annotations

import argparse
import difflib
import os
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple
from urllib.parse import quote


MANIFEST_NAME = "FILETREE.md"
EXCLUDED_DIRECTORIES = frozenset(
    {
        "build",
        "dist",
        "env",
        "node_modules",
        "scratch",
        "temp",
        "tmp",
        "venv",
    }
)
CORE_FILES: Sequence[Tuple[str, str]] = (
    ("README.md", "Human-facing overview and entry point for the Research OS."),
    ("INSTRUCTION.md", "Primary operating instructions for agents working in this repository."),
    ("CONTEXT.md", "Shared domain language for the Research OS and its MVP."),
    ("HANDOFF.md", "Cross-session record of active work, settled decisions, deviations, and intentional omissions."),
    ("verify.sh", "Read-only consistency checks for the paper wiki, FILETREE, and installed skills."),
)

CJK_RE = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]")
WORD_RE = re.compile(r"[A-Za-z0-9]+(?:[._'’/-][A-Za-z0-9]+)*")
BLOCK_START_RE = re.compile(r"^(?:#{1,6}\s|[-*+>]\s|\d+[.)]\s|```|~~~)")
FRONTMATTER_FIELD_RE = re.compile(r"^([A-Za-z0-9_-]+):\s*(.*)$")


class FiletreeError(Exception):
    """Raised when repository navigation inputs violate the contract."""


@dataclass(frozen=True)
class Entry:
    label: str
    target: str
    description: str


def _read_utf8(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise FiletreeError(f"{path}: entrypoint must be UTF-8") from exc
    except OSError as exc:
        raise FiletreeError(f"{path}: could not read entrypoint: {exc}") from exc


def _strip_optional_frontmatter(lines: List[str], path: Path) -> List[str]:
    if not lines or lines[0].strip() != "---":
        return lines
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            return lines[index + 1 :]
    raise FiletreeError(f"{path}: unclosed YAML frontmatter")


def _validate_english_text(value: str, context: str) -> None:
    if CJK_RE.search(value):
        raise FiletreeError(f"{context}: must be English and contain no CJK characters")


def _validate_description(value: str, context: str) -> str:
    description = " ".join(value.split())
    if not description:
        raise FiletreeError(f"{context}: description is empty")
    _validate_english_text(description, context)
    if "](" in description or "![" in description:
        raise FiletreeError(f"{context}: description must be plain text; inline code is allowed")
    if description[-1] not in ".?!":
        raise FiletreeError(f"{context}: description must end with '.', '?' or '!'")
    if re.search(r"[.!?]\s+\S", description[:-1]):
        raise FiletreeError(f"{context}: description must be one sentence")
    word_count = len(WORD_RE.findall(description))
    if word_count == 0:
        raise FiletreeError(f"{context}: description must contain English words")
    if word_count > 20:
        raise FiletreeError(f"{context}: description has {word_count} words; maximum is 20")
    return description


def _index_entry(directory: Path, root: Path) -> Entry:
    path = directory / "index.md"
    lines = _strip_optional_frontmatter(_read_utf8(path).splitlines(), path)
    cursor = 0
    while cursor < len(lines) and not lines[cursor].strip():
        cursor += 1
    if cursor >= len(lines) or not lines[cursor].startswith("# "):
        raise FiletreeError(f"{path}: first content must be an H1 heading")
    title = lines[cursor][2:].strip()
    if not title:
        raise FiletreeError(f"{path}: H1 title is empty")
    _validate_english_text(title, f"{path} H1")

    cursor += 1
    while cursor < len(lines) and not lines[cursor].strip():
        cursor += 1
    if cursor >= len(lines):
        raise FiletreeError(f"{path}: add one summary paragraph after the H1")
    if BLOCK_START_RE.match(lines[cursor].lstrip()):
        raise FiletreeError(f"{path}: H1 must be followed by a plain summary paragraph")

    paragraph: List[str] = []
    while cursor < len(lines) and lines[cursor].strip():
        if BLOCK_START_RE.match(lines[cursor].lstrip()):
            raise FiletreeError(f"{path}: summary must be one plain paragraph")
        paragraph.append(lines[cursor].strip())
        cursor += 1
    description = _validate_description(" ".join(paragraph), f"{path} summary")
    relative = path.relative_to(root).as_posix()
    return Entry(f"{directory.name}/", relative, description)


def _unquote_yaml_scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def _skill_frontmatter(path: Path) -> Dict[str, str]:
    lines = _read_utf8(path).splitlines()
    if not lines or lines[0].strip() != "---":
        raise FiletreeError(f"{path}: SKILL.md must start with YAML frontmatter")
    fields: Dict[str, str] = {}
    closed = False
    for line in lines[1:]:
        if line.strip() == "---":
            closed = True
            break
        match = FRONTMATTER_FIELD_RE.match(line)
        if not match:
            continue
        key, raw_value = match.groups()
        if key in {"name", "description"}:
            value = _unquote_yaml_scalar(raw_value)
            if value in {"|", ">", "|-", ">-", "|+", ">+"}:
                raise FiletreeError(f"{path}: {key} must be a single-line YAML scalar")
            fields[key] = value
    if not closed:
        raise FiletreeError(f"{path}: unclosed YAML frontmatter")
    return fields


def _skill_entry(directory: Path, root: Path) -> Entry:
    path = directory / "SKILL.md"
    fields = _skill_frontmatter(path)
    name = fields.get("name", "").strip()
    if not name:
        raise FiletreeError(f"{path}: frontmatter requires a non-empty single-line name")
    _validate_english_text(name, f"{path} name")
    description = _validate_description(fields.get("description", ""), f"{path} description")
    relative = path.relative_to(root).as_posix()
    return Entry(f"{directory.name}/", relative, description)


def _is_excluded_directory(name: str) -> bool:
    return name.startswith(".") or name in EXCLUDED_DIRECTORIES


def collect_main_areas(root: Path) -> List[Entry]:
    entries: List[Entry] = []
    errors: List[str] = []
    try:
        children = sorted(root.iterdir(), key=lambda path: path.name.casefold())
    except OSError as exc:
        raise FiletreeError(f"{root}: could not scan repository root: {exc}") from exc

    for child in children:
        if _is_excluded_directory(child.name):
            continue
        if child.is_symlink():
            if child.is_dir():
                errors.append(f"{child}: top-level directory symlinks are not allowed")
            continue
        if not child.is_dir():
            continue
        try:
            if (child / "index.md").is_file():
                entries.append(_index_entry(child, root))
            elif (child / "SKILL.md").is_file():
                entries.append(_skill_entry(child, root))
            else:
                errors.append(f"{child}: public top-level directory requires index.md or skill SKILL.md")
        except FiletreeError as exc:
            errors.append(str(exc))

    if errors:
        raise FiletreeError("invalid navigation inputs:\n- " + "\n- ".join(errors))
    return entries


def collect_core_files(root: Path) -> List[Entry]:
    entries: List[Entry] = []
    for filename, description in CORE_FILES:
        path = root / filename
        if path.is_symlink() or not path.is_file():
            continue
        entries.append(Entry(filename, filename, description))
    return entries


def _markdown_link(entry: Entry) -> str:
    label = entry.label.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")
    target = quote(entry.target, safe="/._-")
    return f"- [{label}]({target}) — {entry.description}"


def render_filetree(core_files: Sequence[Entry], main_areas: Sequence[Entry]) -> str:
    lines = [
        "# Research OS Navigation Map",
        "",
        "_Auto-generated by the `filetree-simple` skill from top-level entrypoints. Do not edit manually._",
        "",
        "## Core Files",
        "",
    ]
    lines.extend(_markdown_link(entry) for entry in core_files)
    lines.extend(["", "## Main Areas", ""])
    lines.extend(_markdown_link(entry) for entry in main_areas)
    return "\n".join(lines) + "\n"


def expected_filetree(root: Path) -> str:
    if not root.is_dir():
        raise FiletreeError(f"{root}: repository root is not a directory")
    return render_filetree(collect_core_files(root), collect_main_areas(root))


def _atomic_write(path: Path, content: str) -> None:
    mode = path.stat().st_mode & 0o777 if path.exists() else 0o644
    temporary_name = ""
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=str(path.parent),
            prefix=f".{path.name}.",
            delete=False,
        ) as handle:
            temporary_name = handle.name
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary_name, mode)
        os.replace(temporary_name, path)
    finally:
        if temporary_name and os.path.exists(temporary_name):
            os.unlink(temporary_name)


def generate_repo(root: Path) -> bool:
    expected = expected_filetree(root)
    manifest = root / MANIFEST_NAME
    current = manifest.read_text(encoding="utf-8") if manifest.is_file() else None
    if current == expected:
        return False
    _atomic_write(manifest, expected)
    return True


def lint_repo(root: Path) -> Tuple[bool, str]:
    expected = expected_filetree(root)
    manifest = root / MANIFEST_NAME
    current = manifest.read_text(encoding="utf-8") if manifest.is_file() else ""
    if current == expected:
        return True, ""
    diff = "".join(
        difflib.unified_diff(
            current.splitlines(keepends=True),
            expected.splitlines(keepends=True),
            fromfile=MANIFEST_NAME,
            tofile=f"expected/{MANIFEST_NAME}",
        )
    )
    return False, diff


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".", help="target repository root; defaults to the current directory")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("generate", help="validate entrypoints and atomically generate FILETREE.md")
    subparsers.add_parser("lint", help="compare FILETREE.md with the deterministic expected map")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    root = Path(args.repo).expanduser().resolve()
    try:
        if args.command == "generate":
            changed = generate_repo(root)
            print("generated: FILETREE.md" if changed else "current: FILETREE.md")
            return 0
        current, diff = lint_repo(root)
        if current:
            print("FILETREE.md is current")
            return 0
        print("FILETREE.md has drift", file=sys.stderr)
        if diff:
            print(diff, file=sys.stderr, end="" if diff.endswith("\n") else "\n")
        return 1
    except FiletreeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
