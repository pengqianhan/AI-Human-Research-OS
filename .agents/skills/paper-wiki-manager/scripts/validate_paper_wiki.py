#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Validate an OKF paper wiki.

This script is intentionally self-contained: it uses only the Python standard
library so the paper-wiki-manager skill can travel to other repositories.
It validates the paper-wiki profile layered on top of OKF v0.1.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

RESERVED_NAMES = {"index.md", "log.md"}
LOCALIZED_NOTES_DIR = "papers_zh"
CONFIG_NAME = "paper-wiki.toml"
DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "assets" / CONFIG_NAME
PAPER_REQUIRED = {
    "type",
    "title",
    "description",
    "resource",
    "arxiv_id",
    "authors",
    "submitted",
    "tags",
    "status",
    "priority",
    "timestamp",
}
TOPIC_REQUIRED = {"type", "title", "description", "tags", "timestamp"}
CONCEPT_REQUIRED = {"type", "title", "description", "tags", "timestamp"}
CONCEPT_TYPES = {"Method", "Dataset", "Benchmark", "Metric", "Term", "Tool"}
SOURCE_REQUIRED = {
    "type",
    "title",
    "description",
    "resource",
    "tags",
    "status",
    "priority",
    "timestamp",
}
LOCALIZED_NOTE_REQUIRED = {
    "type",
    "title",
    "language",
    "arxiv_id",
    "source_note",
    "timestamp",
}
STATUS_VALUES = {"unread", "skimmed", "read", "summarized"}
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+\.md(?:#[^)]+)?)\)")


@dataclass
class Document:
    path: Path
    rel: Path
    frontmatter: dict[str, Any]
    body: str


@dataclass
class LibraryConfig:
    paper_required_sections: list[str]


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def _parse_inline_list(value: str) -> list[str] | None:
    value = value.strip()
    if not (value.startswith("[") and value.endswith("]")):
        return None
    inner = value[1:-1].strip()
    if not inner:
        return []
    return [_strip_quotes(part.strip()) for part in inner.split(",")]


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("missing YAML frontmatter opening delimiter")

    end_idx = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_idx = idx
            break
    if end_idx is None:
        raise ValueError("missing YAML frontmatter closing delimiter")

    frontmatter: dict[str, Any] = {}
    current_list_key: str | None = None
    for raw in lines[1:end_idx]:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- ") and current_list_key:
            frontmatter.setdefault(current_list_key, []).append(_strip_quotes(stripped[2:]))
            continue
        current_list_key = None
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        inline_list = _parse_inline_list(value)
        if inline_list is not None:
            frontmatter[key] = inline_list
        elif value == "":
            frontmatter[key] = []
            current_list_key = key
        else:
            frontmatter[key] = _strip_quotes(value)

    body = "\n".join(lines[end_idx + 1 :])
    if body.startswith("\n"):
        body = body[1:]
    return frontmatter, body


def load_documents(root: Path) -> tuple[list[Document], list[str]]:
    docs: list[Document] = []
    errors: list[str] = []
    for path in sorted(root.rglob("*.md")):
        rel = path.relative_to(root)
        if path.name in RESERVED_NAMES:
            continue
        if rel.parts and rel.parts[0] == LOCALIZED_NOTES_DIR:
            continue
        try:
            frontmatter, body = parse_frontmatter(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{rel}: invalid OKF frontmatter: {exc}")
            continue
        docs.append(Document(path=path, rel=rel, frontmatter=frontmatter, body=body))
    return docs, errors


def _validate_localized_notes(root: Path) -> list[str]:
    errors: list[str] = []
    notes_dir = root / LOCALIZED_NOTES_DIR
    if not notes_dir.exists():
        return errors
    if not notes_dir.is_dir():
        return [f"{LOCALIZED_NOTES_DIR}: expected a directory"]

    for path in sorted(notes_dir.glob("*.md")):
        rel = path.relative_to(root)
        if path.name in RESERVED_NAMES:
            errors.append(f"{rel}: localized notes do not use index.md or log.md")
            continue
        try:
            frontmatter, body = parse_frontmatter(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{rel}: invalid localized-note frontmatter: {exc}")
            continue

        missing = _missing(frontmatter, LOCALIZED_NOTE_REQUIRED)
        if missing:
            errors.append(f"{rel}: missing localized-note fields: {', '.join(missing)}")
        if frontmatter.get("type") != "LocalizedPaperNote":
            errors.append(
                f"{rel}: expected type LocalizedPaperNote, got {frontmatter.get('type')!r}"
            )
        if frontmatter.get("language") != "zh-CN":
            errors.append(f"{rel}: expected language 'zh-CN'")

        arxiv_id = frontmatter.get("arxiv_id")
        if arxiv_id and arxiv_id != path.stem:
            errors.append(f"{rel}: arxiv_id {arxiv_id!r} does not match filename")

        expected_source = (root / "papers" / f"{path.stem}.md").resolve()
        source_note = frontmatter.get("source_note")
        if source_note:
            actual_source = (path.parent / str(source_note)).resolve()
            if actual_source != expected_source:
                errors.append(
                    f"{rel}: source_note must resolve to papers/{path.stem}.md"
                )
        if not expected_source.is_file():
            errors.append(f"{rel}: missing canonical paper papers/{path.stem}.md")
        if not body.strip():
            errors.append(f"{rel}: localized-note body is empty")

    nested_notes = [
        path.relative_to(root)
        for path in notes_dir.rglob("*.md")
        if path.parent != notes_dir
    ]
    for rel in sorted(nested_notes):
        errors.append(f"{rel}: localized notes must be direct children of papers_zh/")
    return errors


def _missing(frontmatter: dict[str, Any], required: set[str]) -> list[str]:
    return sorted(key for key in required if not frontmatter.get(key))


def _has_section(body: str, heading: str) -> bool:
    return any(line.strip() == heading for line in body.splitlines())


def _string_list(value: Any) -> bool:
    return isinstance(value, list) and all(
        isinstance(item, str) and bool(item.strip()) for item in value
    )


def _heading(section: str) -> str:
    section = section.strip()
    return section if section.startswith("#") else f"# {section}"


def _load_config(config_path: Path) -> tuple[LibraryConfig, list[str]]:
    config_path = config_path.expanduser().resolve()
    config_label = config_path.as_posix()
    if not config_path.exists():
        return LibraryConfig(paper_required_sections=[]), [
            f"{config_label}: missing paper-wiki config"
        ]
    if not config_path.is_file():
        return LibraryConfig(paper_required_sections=[]), [f"{config_label}: expected a file"]

    try:
        data = tomllib.loads(config_path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        return LibraryConfig(paper_required_sections=[]), [f"{config_label}: invalid TOML: {exc}"]

    errors: list[str] = []
    paper_body = data.get("paper_body", {})
    if not isinstance(paper_body, dict):
        return LibraryConfig(paper_required_sections=[]), [
            f"{config_label}: paper_body must be a table"
        ]

    required_sections = paper_body.get("required_sections", [])
    if not _string_list(required_sections):
        errors.append(f"{config_label}: paper_body.required_sections must be a string list")
        required_sections = []

    recommended_sections = paper_body.get("recommended_sections", [])
    if "recommended_sections" in paper_body and not _string_list(recommended_sections):
        errors.append(f"{config_label}: paper_body.recommended_sections must be a string list")

    preserve_existing = paper_body.get("preserve_existing_layout", True)
    if not isinstance(preserve_existing, bool):
        errors.append(f"{config_label}: paper_body.preserve_existing_layout must be a boolean")

    profiles = paper_body.get("profiles", {})
    if "profiles" in paper_body and not isinstance(profiles, dict):
        errors.append(f"{config_label}: paper_body.profiles must be a table")
        profiles = {}

    default_profile = paper_body.get("default_profile")
    if default_profile is not None:
        if not isinstance(default_profile, str) or not default_profile.strip():
            errors.append(f"{config_label}: paper_body.default_profile must be a string")
        elif default_profile not in profiles:
            errors.append(
                f"{config_label}: paper_body.default_profile {default_profile!r} "
                "is not defined under paper_body.profiles"
            )

    if isinstance(profiles, dict):
        for profile_name, profile in sorted(profiles.items()):
            if not isinstance(profile, dict):
                errors.append(f"{config_label}: profile {profile_name!r} must be a table")
                continue
            sections = profile.get("sections", [])
            if not _string_list(sections):
                errors.append(
                    f"{config_label}: profile {profile_name!r} sections must be a string list"
                )
            description = profile.get("description")
            if "description" in profile and not isinstance(description, str):
                errors.append(
                    f"{config_label}: profile {profile_name!r} description must be a string"
                )

    return LibraryConfig(paper_required_sections=list(required_sections)), errors


def _link_target(root: Path, source: Path, target: str) -> Path:
    target = target.split("#", 1)[0]
    if target.startswith("/"):
        return (root / target.lstrip("/")).resolve()
    return (source.parent / target).resolve()


def _extract_okf_bundle_data(text: str) -> dict[str, Any]:
    marker = "window.BUNDLE"
    marker_idx = text.find(marker)
    if marker_idx < 0:
        raise ValueError("missing OKF viewer data assignment window.BUNDLE")
    object_start = text.find("{", marker_idx)
    if object_start < 0:
        raise ValueError("missing OKF viewer graph object")
    try:
        data, _ = json.JSONDecoder().raw_decode(text[object_start:])
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid OKF viewer graph JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError("OKF viewer graph data must be an object")
    return data


def _validate_viz(root: Path, expected_concept_ids: set[str]) -> list[str]:
    errors: list[str] = []
    viz_path = root / "viz.html"
    legacy_path = root / "vis.html"
    if not viz_path.exists():
        if legacy_path.exists():
            errors.append("viz.html: missing required file; found vis.html, expected viz.html")
        else:
            errors.append("viz.html: missing required visualization file")
        return errors
    if not viz_path.is_file():
        return ["viz.html: expected a file"]

    text = viz_path.read_text(encoding="utf-8")
    if not text.strip():
        return ["viz.html: file is empty"]

    try:
        data = _extract_okf_bundle_data(text)
    except ValueError as exc:
        return [f"viz.html: {exc}; regenerate with generate_viz.py"]

    nodes = data.get("nodes")
    if not isinstance(nodes, list):
        errors.append("viz.html: OKF graph field nodes must be a list")
        nodes = []
    node_ids = {
        str(node.get("data", {}).get("id"))
        for node in nodes
        if isinstance(node, dict)
        and isinstance(node.get("data"), dict)
        and node.get("data", {}).get("id")
    }
    missing_nodes = sorted(expected_concept_ids - node_ids)
    extra_nodes = sorted(node_ids - expected_concept_ids)
    if missing_nodes:
        errors.append(f"viz.html: missing concepts: {', '.join(missing_nodes)}")
    if extra_nodes:
        errors.append(f"viz.html: contains unknown concepts: {', '.join(extra_nodes)}")

    edges = data.get("edges")
    if not isinstance(edges, list):
        errors.append("viz.html: OKF graph field edges must be a list")
        return errors
    for idx, edge in enumerate(edges, start=1):
        edge_data = edge.get("data") if isinstance(edge, dict) else None
        if not isinstance(edge_data, dict):
            errors.append(f"viz.html: edge {idx} must contain an OKF data object")
            continue
        source = edge_data.get("source")
        target = edge_data.get("target")
        if source not in node_ids or target not in node_ids:
            errors.append(f"viz.html: edge {idx} references an unknown concept")

    bodies = data.get("bodies")
    if isinstance(bodies, dict):
        missing_bodies = sorted(expected_concept_ids - set(map(str, bodies)))
        if missing_bodies:
            errors.append(f"viz.html: missing concept bodies: {', '.join(missing_bodies)}")
    else:
        errors.append("viz.html: OKF graph field bodies must be an object")

    return errors


def validate(root: Path, config_path: Path | None = None) -> list[str]:
    root = root.resolve()
    config_path = config_path or DEFAULT_CONFIG_PATH
    errors: list[str] = []
    if not root.exists():
        return [f"{root}: library root does not exist"]
    if not root.is_dir():
        return [f"{root}: library root is not a directory"]

    docs, load_errors = load_documents(root)
    errors.extend(load_errors)
    errors.extend(_validate_localized_notes(root))
    config, config_errors = _load_config(config_path)
    errors.extend(config_errors)

    by_rel_no_suffix = {doc.rel.with_suffix("").as_posix(): doc for doc in docs}
    by_path = {doc.path.resolve(): doc for doc in docs}
    errors.extend(_validate_viz(root, set(by_rel_no_suffix)))

    for doc in docs:
        fm = doc.frontmatter
        if not fm.get("type"):
            errors.append(f"{doc.rel}: missing required OKF field type")
            continue

        if doc.rel.parts and doc.rel.parts[0] == "papers":
            missing = _missing(fm, PAPER_REQUIRED)
            if missing:
                errors.append(f"{doc.rel}: missing paper fields: {', '.join(missing)}")
            if fm.get("type") != "Paper":
                errors.append(f"{doc.rel}: expected type Paper, got {fm.get('type')!r}")
            if fm.get("arxiv_id") and fm.get("arxiv_id") != doc.path.stem:
                errors.append(
                    f"{doc.rel}: arxiv_id {fm.get('arxiv_id')!r} does not match filename"
                )
            if fm.get("status") and fm.get("status") not in STATUS_VALUES:
                errors.append(f"{doc.rel}: unexpected status {fm.get('status')!r}")
            if not doc.body.strip():
                errors.append(f"{doc.rel}: paper body is empty")
            for section in config.paper_required_sections:
                heading = _heading(section)
                if not _has_section(doc.body, heading):
                    errors.append(
                        f"{doc.rel}: missing configured paper body section {heading}"
                    )

        elif doc.rel.parts and doc.rel.parts[0] == "topics":
            missing = _missing(fm, TOPIC_REQUIRED)
            if missing:
                errors.append(f"{doc.rel}: missing topic fields: {', '.join(missing)}")
            if fm.get("type") != "Topic":
                errors.append(f"{doc.rel}: expected type Topic, got {fm.get('type')!r}")
            for section in ["# Scope", "# Papers", "# Open Questions"]:
                if not _has_section(doc.body, section):
                    errors.append(f"{doc.rel}: missing body section {section}")

        elif doc.rel.parts and doc.rel.parts[0] == "concepts":
            missing = _missing(fm, CONCEPT_REQUIRED)
            if missing:
                errors.append(f"{doc.rel}: missing concept fields: {', '.join(missing)}")
            if fm.get("type") not in CONCEPT_TYPES:
                errors.append(
                    f"{doc.rel}: expected concept type in "
                    f"{', '.join(sorted(CONCEPT_TYPES))}, got {fm.get('type')!r}"
                )
            for section in ["# Definition", "# Papers"]:
                if not _has_section(doc.body, section):
                    errors.append(f"{doc.rel}: missing body section {section}")

        elif doc.rel.parts and doc.rel.parts[0] == "sources":
            # Non-paper reading (blogs, docs, talks). A lighter tier than papers:
            # only frontmatter is checked, and topic links are one-way (not
            # enforced bidirectional below).
            missing = _missing(fm, SOURCE_REQUIRED)
            if missing:
                errors.append(f"{doc.rel}: missing source fields: {', '.join(missing)}")
            if fm.get("type") != "Reference":
                errors.append(f"{doc.rel}: expected type Reference, got {fm.get('type')!r}")
            if fm.get("status") and fm.get("status") not in STATUS_VALUES:
                errors.append(f"{doc.rel}: unexpected status {fm.get('status')!r}")

    paper_to_topics: set[tuple[str, str]] = set()
    topic_to_papers: set[tuple[str, str]] = set()
    paper_to_concepts: set[tuple[str, str]] = set()
    concept_to_papers: set[tuple[str, str]] = set()

    for path in sorted(root.rglob("*.md")):
        rel = path.relative_to(root)
        if rel.parts and rel.parts[0] == LOCALIZED_NOTES_DIR:
            continue
        text = path.read_text(encoding="utf-8")
        for raw_target in LINK_RE.findall(text):
            if "://" in raw_target:
                continue
            target_path = _link_target(root, path, raw_target)
            try:
                target_path.relative_to(root)
            except ValueError:
                # Outside-bundle links are allowed for project references,
                # but the target must exist in the surrounding repository.
                if not target_path.exists():
                    errors.append(
                        f"{rel}: missing outside-bundle link target: {raw_target}"
                    )
                continue
            if not target_path.exists():
                errors.append(f"{rel}: missing link target: {raw_target}")
                continue

            source_doc = by_path.get(path.resolve())
            target_doc = by_path.get(target_path)
            if source_doc is None or target_doc is None:
                continue
            source_id = source_doc.rel.with_suffix("").as_posix()
            target_id = target_doc.rel.with_suffix("").as_posix()
            source_type = source_doc.frontmatter.get("type")
            target_type = target_doc.frontmatter.get("type")
            if source_type == "Paper" and target_type == "Topic":
                paper_to_topics.add((source_id, target_id))
            elif source_type == "Topic" and target_type == "Paper":
                topic_to_papers.add((source_id, target_id))
            elif source_type == "Paper" and target_type in CONCEPT_TYPES:
                paper_to_concepts.add((source_id, target_id))
            elif source_type in CONCEPT_TYPES and target_type == "Paper":
                concept_to_papers.add((source_id, target_id))

    for paper_id, topic_id in sorted(paper_to_topics):
        if (topic_id, paper_id) not in topic_to_papers:
            errors.append(f"{paper_id}: links to {topic_id}, but topic does not link back")
    for topic_id, paper_id in sorted(topic_to_papers):
        if (paper_id, topic_id) not in paper_to_topics:
            errors.append(f"{topic_id}: links to {paper_id}, but paper does not link back")
    for paper_id, concept_id in sorted(paper_to_concepts):
        if (concept_id, paper_id) not in concept_to_papers:
            errors.append(f"{paper_id}: links to {concept_id}, but concept does not link back")
    for concept_id, paper_id in sorted(concept_to_papers):
        if (paper_id, concept_id) not in paper_to_concepts:
            errors.append(f"{concept_id}: links to {paper_id}, but paper does not link back")

    required_indexes = ["papers/index", "topics/index"]
    if any(doc.rel.parts and doc.rel.parts[0] == "concepts" for doc in docs):
        required_indexes.append("concepts/index")
    if any(doc.rel.parts and doc.rel.parts[0] == "sources" for doc in docs):
        required_indexes.append("sources/index")
    for required_index in required_indexes:
        if required_index not in by_rel_no_suffix and not (root / f"{required_index}.md").exists():
            errors.append(f"{required_index}.md: missing index file")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate an OKF paper wiki.")
    parser.add_argument(
        "library_root",
        nargs="?",
        default="paper-wiki",
        help="Path to the paper wiki root (default: paper-wiki).",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=None,
        help=(
            "Path to paper-wiki.toml. Defaults to the skill asset at "
            "assets/paper-wiki.toml."
        ),
    )
    args = parser.parse_args()

    errors = validate(Path(args.library_root), args.config)
    if errors:
        print("paper-wiki validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("paper-wiki validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
