#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "pyyaml>=6.0",
# ]
# ///
from __future__ import annotations

import argparse
import fnmatch
import os
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Callable

DEFAULT_IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "venv",
}

FRONTMATTER_DELIM = "---"
DATE_HEADING_RE = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\s*$")
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")


@dataclass
class Issue:
    severity: str
    path: Path
    message: str


def _candidate_okf_srcs(bundle_root: Path, explicit: str | None) -> list[Path]:
    candidates: list[Path] = []
    if explicit:
        candidates.append(Path(explicit))
    if os.environ.get("OKF_SRC"):
        candidates.append(Path(os.environ["OKF_SRC"]))

    for base in (Path.cwd(), bundle_root, Path(__file__).resolve()):
        for parent in (base, *base.parents):
            candidates.append(parent / "okf" / "src")

    seen: set[Path] = set()
    unique: list[Path] = []
    for candidate in candidates:
        resolved = candidate.expanduser().resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        unique.append(resolved)
    return unique


def _install_okf_src(bundle_root: Path, explicit: str | None) -> Path | None:
    for candidate in _candidate_okf_srcs(bundle_root, explicit):
        if (candidate / "enrichment_agent" / "bundle" / "document.py").exists():
            sys.path.insert(0, str(candidate))
            return candidate
    return None


def _build_parser() -> tuple[Callable[[str], tuple[dict[str, Any], str]], str]:
    try:
        from enrichment_agent.bundle.document import OKFDocument

        def parse_with_okf(text: str) -> tuple[dict[str, Any], str]:
            doc = OKFDocument.parse(text)
            return doc.frontmatter, doc.body

        return parse_with_okf, "okf"
    except Exception:
        pass

    try:
        import yaml
    except Exception as exc:
        raise RuntimeError(
            "Could not import the OKF parser or PyYAML. Pass --okf-src /path/to/okf/src "
            "or install PyYAML."
        ) from exc

    def parse_with_yaml(text: str) -> tuple[dict[str, Any], str]:
        lines = text.splitlines()
        if not lines or lines[0].strip() != FRONTMATTER_DELIM:
            return {}, text
        end_idx = None
        for idx in range(1, len(lines)):
            if lines[idx].strip() == FRONTMATTER_DELIM:
                end_idx = idx
                break
        if end_idx is None:
            raise ValueError("Unterminated YAML frontmatter block")
        try:
            frontmatter = yaml.safe_load("\n".join(lines[1:end_idx])) or {}
        except yaml.YAMLError as exc:
            raise ValueError(f"Invalid YAML in frontmatter: {exc}") from exc
        if not isinstance(frontmatter, dict):
            raise ValueError("Frontmatter must be a YAML mapping")
        body = "\n".join(lines[end_idx + 1 :])
        if body.startswith("\n"):
            body = body[1:]
        return frontmatter, body

    return parse_with_yaml, "pyyaml"


def _is_excluded(rel: Path, patterns: list[str]) -> bool:
    rel_posix = rel.as_posix()
    return any(fnmatch.fnmatch(rel_posix, pattern) for pattern in patterns)


def _markdown_files(root: Path, excludes: list[str]) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*.md"):
        rel = path.relative_to(root)
        if any(part in DEFAULT_IGNORED_DIRS for part in rel.parts[:-1]):
            continue
        if _is_excluded(rel, excludes):
            continue
        files.append(path)
    return sorted(files)


def _has_frontmatter(text: str) -> bool:
    return bool(text.splitlines() and text.splitlines()[0].strip() == FRONTMATTER_DELIM)


def _validate_index(
    rel: Path,
    text: str,
    parse: Callable[[str], tuple[dict[str, Any], str]],
) -> list[Issue]:
    issues: list[Issue] = []
    body = text
    if _has_frontmatter(text):
        try:
            frontmatter, body = parse(text)
        except Exception as exc:
            return [Issue("error", rel, f"index.md has invalid frontmatter: {exc}")]

        allowed_root_frontmatter = rel.as_posix() == "index.md" and set(frontmatter).issubset(
            {"okf_version"}
        )
        if not allowed_root_frontmatter:
            issues.append(
                Issue(
                    "error",
                    rel,
                    "index.md must not have frontmatter except bundle-root okf_version",
                )
            )

    stripped = body.strip()
    if stripped and not any(line.startswith("#") for line in body.splitlines()):
        issues.append(Issue("warning", rel, "index.md has no section headings"))
    if stripped and not LINK_RE.search(body):
        issues.append(Issue("warning", rel, "index.md has no Markdown links"))
    return issues


def _validate_log(rel: Path, text: str) -> list[Issue]:
    issues: list[Issue] = []
    if _has_frontmatter(text):
        issues.append(Issue("error", rel, "log.md must not have frontmatter"))

    date_heading_count = 0
    for line in text.splitlines():
        if not line.startswith("## "):
            continue
        match = DATE_HEADING_RE.match(line)
        if not match:
            issues.append(Issue("error", rel, f"log heading is not YYYY-MM-DD: {line}"))
            continue
        try:
            date.fromisoformat(match.group(1))
        except ValueError:
            issues.append(Issue("error", rel, f"log heading is not a real date: {line}"))
            continue
        date_heading_count += 1

    if text.strip() and date_heading_count == 0:
        issues.append(Issue("warning", rel, "log.md has no ## YYYY-MM-DD entries"))
    return issues


def _validate_concept(
    rel: Path,
    text: str,
    parse: Callable[[str], tuple[dict[str, Any], str]],
) -> list[Issue]:
    issues: list[Issue] = []
    try:
        frontmatter, body = parse(text)
    except Exception as exc:
        return [Issue("error", rel, f"invalid YAML frontmatter: {exc}")]

    if not frontmatter:
        return [Issue("error", rel, "missing YAML frontmatter")]

    concept_type = frontmatter.get("type")
    if not isinstance(concept_type, str) or not concept_type.strip():
        issues.append(Issue("error", rel, "missing non-empty string frontmatter field: type"))

    if not frontmatter.get("title"):
        issues.append(Issue("warning", rel, "recommended frontmatter field missing: title"))
    if not frontmatter.get("description"):
        issues.append(
            Issue("warning", rel, "recommended frontmatter field missing: description")
        )
    if not body.strip():
        issues.append(Issue("warning", rel, "concept body is empty"))
    return issues


def validate_bundle(root: Path, excludes: list[str]) -> tuple[list[Issue], int, int]:
    parse, _ = _build_parser()
    issues: list[Issue] = []
    concept_count = 0
    reserved_count = 0
    markdown_files = _markdown_files(root, excludes)

    for path in markdown_files:
        rel = path.relative_to(root)
        text = path.read_text(encoding="utf-8")
        if path.name == "index.md":
            reserved_count += 1
            issues.extend(_validate_index(rel, text, parse))
        elif path.name == "log.md":
            reserved_count += 1
            issues.extend(_validate_log(rel, text))
        else:
            concept_count += 1
            issues.extend(_validate_concept(rel, text, parse))

    if not markdown_files:
        issues.append(Issue("warning", Path("."), "bundle contains no Markdown files"))

    return issues, concept_count, reserved_count


def main() -> int:
    arg_parser = argparse.ArgumentParser(
        description="Validate generic OKF bundle conformance from bundled references/SPEC.md."
    )
    arg_parser.add_argument("bundle_root", help="Directory to validate as an OKF bundle")
    arg_parser.add_argument(
        "--okf-src",
        help="Path to okf/src so the script can reuse the OKF reference parser",
    )
    arg_parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Bundle-relative glob to skip, for example README.md or docs/generated/**",
    )
    args = arg_parser.parse_args()

    root = Path(args.bundle_root).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        print(f"ERROR: bundle root does not exist or is not a directory: {root}", file=sys.stderr)
        return 2

    okf_src = _install_okf_src(root, args.okf_src)
    try:
        _, parser_name = _build_parser()
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    issues, concept_count, reserved_count = validate_bundle(root, args.exclude)
    errors = [issue for issue in issues if issue.severity == "error"]
    warnings = [issue for issue in issues if issue.severity == "warning"]

    for issue in issues:
        print(f"{issue.severity.upper()}: {issue.path.as_posix()}: {issue.message}")

    parser_detail = f"{parser_name}"
    if okf_src is not None:
        parser_detail += f" ({okf_src})"
    print(
        "Checked "
        f"{concept_count} concept file(s) and {reserved_count} reserved file(s) "
        f"under {root} using {parser_detail}."
    )

    if errors:
        print(f"OKF validation failed: {len(errors)} error(s), {len(warnings)} warning(s).")
        return 1
    print(f"OKF validation passed: 0 error(s), {len(warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
