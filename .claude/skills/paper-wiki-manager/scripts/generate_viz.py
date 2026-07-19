#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Generate the required paper-wiki viz.html artifact.

This mirrors the OKF reference viewer (``enrichment_agent.viewer.generator``):
the same Cytoscape graph + detail-pane layout is produced by injecting the
bundled ``templates/viz.html``, ``static/viz.css``, and ``static/viz.js`` so the
paper-wiki ``viz.html`` stays format-consistent with okf bundle viewers.

The frontmatter parsing is kept self-contained so the skill can run after being
installed in Codex, Claude Code, or another Agent Skills-compatible client
without importing the okf package.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

RESERVED_NAMES = {"index.md", "log.md"}
NON_GRAPH_COLLECTIONS = {"papers_zh"}
FRONTMATTER_DELIM = "---"
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+\.md(?:#[^)]+)?)\)")
TYPE_PALETTE = {
    "Paper": "#2563eb",
    "Topic": "#16a34a",
    "Method": "#ea580c",
    "Dataset": "#0891b2",
    "Benchmark": "#ca8a04",
    "Metric": "#db2777",
    "Term": "#7c3aed",
    "Tool": "#4d7c0f",
    "Reference": "#9333ea",
}
DEFAULT_NODE_COLOR = "#64748b"

# Injection markers used by templates/viz.html.
_CSS_MARKER = "/*__VIZ_CSS__*/"
_JS_MARKER = "/*__VIZ_JS__*/"
_LIBS_MARKER = "/*__VIZ_LIBS__*/"
_NAME_MARKER = "__BUNDLE_NAME__"
_DATA_MARKER = "__BUNDLE_DATA__"

# Vendored viewer libraries, inlined so viz.html works fully offline.
# Load order matters: layout-base and cose-base are dependencies of fcose.
_VENDOR_LIBS = [
    "cytoscape.min.js",
    "layout-base.js",
    "cose-base.js",
    "cytoscape-fcose.js",
    "marked.min.js",
]


@dataclass
class Concept:
    id: str
    type: str
    title: str
    description: str
    resource: str
    tags: list[str]
    body: str
    links_to: list[str] = field(default_factory=list)

    def to_node(self) -> dict[str, Any]:
        return {
            "data": {
                "id": self.id,
                "label": self.title or self.id,
                "type": self.type,
                "description": self.description,
                "resource": self.resource,
                "tags": self.tags,
                "color": TYPE_PALETTE.get(self.type, DEFAULT_NODE_COLOR),
                "size": 30 + min(60, len(self.body) // 200),
            }
        }


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
    if not lines or lines[0].strip() != FRONTMATTER_DELIM:
        return {}, text

    end_idx = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == FRONTMATTER_DELIM:
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


def _target_to_concept_id(bundle_root: Path, source_path: Path, raw_target: str) -> str | None:
    target = raw_target.split("#", 1)[0]
    if "://" in target or target.startswith("mailto:"):
        return None
    if target.startswith("/"):
        resolved = (bundle_root / target.lstrip("/")).resolve()
    else:
        resolved = (source_path.parent / target).resolve()
    try:
        rel = resolved.relative_to(bundle_root.resolve())
    except ValueError:
        return None
    if rel.suffix != ".md":
        return None
    return rel.with_suffix("").as_posix()


def _extract_links(body: str, source_path: Path, bundle_root: Path) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw_target in LINK_RE.findall(body):
        concept_id = _target_to_concept_id(bundle_root, source_path, raw_target)
        if concept_id and concept_id not in seen:
            seen.add(concept_id)
            out.append(concept_id)
    return out


def _string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if value:
        return [str(value)]
    return []


def _walk_concepts(bundle_root: Path) -> list[Concept]:
    concepts: list[Concept] = []
    for md_path in sorted(bundle_root.rglob("*.md")):
        if md_path.name in RESERVED_NAMES:
            continue
        rel = md_path.relative_to(bundle_root).with_suffix("")
        if rel.parts and rel.parts[0] in NON_GRAPH_COLLECTIONS:
            continue
        concept_id = rel.as_posix()
        frontmatter, body = parse_frontmatter(md_path.read_text(encoding="utf-8"))
        concept = Concept(
            id=concept_id,
            type=str(frontmatter.get("type") or "Unknown"),
            title=str(frontmatter.get("title") or concept_id),
            description=str(frontmatter.get("description") or ""),
            resource=str(frontmatter.get("resource") or ""),
            tags=_string_list(frontmatter.get("tags")),
            body=body or "",
            links_to=_extract_links(body or "", md_path, bundle_root),
        )
        concepts.append(concept)
    return concepts


def _build_graph(concepts: list[Concept]) -> dict[str, Any]:
    ids = {concept.id for concept in concepts}
    nodes = [concept.to_node() for concept in concepts]
    edges: list[dict[str, Any]] = []
    seen_edges: set[tuple[str, str]] = set()
    for concept in concepts:
        for target in concept.links_to:
            if target == concept.id or target not in ids:
                continue
            key = (concept.id, target)
            if key in seen_edges:
                continue
            seen_edges.add(key)
            edges.append(
                {
                    "data": {
                        "id": f"{concept.id}__{target}",
                        "source": concept.id,
                        "target": target,
                    }
                }
            )
    return {
        "nodes": nodes,
        "edges": edges,
        "bodies": {concept.id: concept.body for concept in concepts},
        "types": sorted({concept.type for concept in concepts}),
        "palette": TYPE_PALETTE,
    }


def _load_template() -> str:
    return (Path(__file__).parent / "templates" / "viz.html").read_text(encoding="utf-8")


def _load_asset(name: str) -> str:
    return (Path(__file__).parent / "static" / name).read_text(encoding="utf-8")


def _load_libs() -> str:
    vendor = Path(__file__).parent / "vendor"
    return "\n;\n".join(
        (vendor / name).read_text(encoding="utf-8") for name in _VENDOR_LIBS
    )


def _render_html(bundle_name: str, graph: dict[str, Any]) -> str:
    template = _load_template()
    css = _load_asset("viz.css")
    js = _load_asset("viz.js")
    libs = _load_libs()
    # Inject libraries first so a marker never lands inside library source.
    return (
        template.replace(_LIBS_MARKER, libs)
        .replace(_CSS_MARKER, css)
        .replace(_JS_MARKER, js)
        .replace(_NAME_MARKER, json.dumps(bundle_name, ensure_ascii=False))
        .replace(_DATA_MARKER, json.dumps(graph, ensure_ascii=False))
    )


def generate_visualization(
    bundle_root: Path,
    out_path: Path,
    *,
    bundle_name: str | None = None,
) -> dict[str, int]:
    bundle_root = Path(bundle_root).expanduser().resolve()
    out_path = Path(out_path).expanduser()
    if not bundle_root.is_dir():
        raise FileNotFoundError(f"paper wiki directory not found: {bundle_root}")
    if not out_path.is_absolute():
        out_path = (Path.cwd() / out_path).resolve()

    concepts = _walk_concepts(bundle_root)
    graph = _build_graph(concepts)
    name = bundle_name or bundle_root.name
    html = _render_html(name, graph)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")

    return {
        "concepts": len(concepts),
        "edges": len(graph["edges"]),
        "bytes": len(html.encode("utf-8")),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate paper-wiki/viz.html as a self-contained OKF graph."
    )
    parser.add_argument(
        "library_root",
        nargs="?",
        default="paper-wiki",
        help="Path to the paper wiki bundle root (default: paper-wiki).",
    )
    parser.add_argument(
        "--output",
        help="Output HTML path (default: <library_root>/viz.html).",
    )
    parser.add_argument(
        "--bundle-name",
        default="Paper Wiki",
        help="Display name shown in the generated viewer.",
    )
    args = parser.parse_args()

    library_root = Path(args.library_root).expanduser().resolve()
    output = Path(args.output).expanduser() if args.output else library_root / "viz.html"

    stats = generate_visualization(
        library_root,
        output,
        bundle_name=args.bundle_name,
    )
    print(
        f"generated {output}: "
        f"{stats['concepts']} concept(s), {stats['edges']} edge(s), {stats['bytes']} bytes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
