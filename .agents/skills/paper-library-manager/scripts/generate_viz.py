#!/usr/bin/env python3
"""Generate the required viz.html artifact with the OKF reference viewer."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Iterator


def _normalize_okf_src(path: Path) -> Path | None:
    """Return an importable OKF src path for common repo/dependency layouts."""
    path = path.expanduser().resolve()
    candidates = [
        path,
        path / "src",
        path / "okf" / "src",
    ]
    for candidate in candidates:
        if (candidate / "enrichment_agent" / "viewer").is_dir():
            return candidate
    return None


def _okf_src_candidates(library_root: Path, explicit: str | None) -> Iterator[Path]:
    if explicit:
        normalized = _normalize_okf_src(Path(explicit))
        if normalized:
            yield normalized
        else:
            yield Path(explicit).expanduser().resolve()

    env_okf_src = os.environ.get("OKF_SRC")
    if env_okf_src:
        normalized = _normalize_okf_src(Path(env_okf_src))
        if normalized:
            yield normalized
        else:
            yield Path(env_okf_src).expanduser().resolve()

    roots: list[Path] = [Path.cwd(), library_root.resolve().parent]
    roots.extend(Path(__file__).resolve().parents)

    seen: set[Path] = set()
    for root in roots:
        normalized = _normalize_okf_src(root)
        if normalized and normalized not in seen:
            seen.add(normalized)
            yield normalized


def _import_generate_visualization(library_root: Path, explicit_okf_src: str | None):
    for okf_src in _okf_src_candidates(library_root, explicit_okf_src):
        if (okf_src / "enrichment_agent" / "viewer").is_dir():
            sys.path.insert(0, str(okf_src))
            try:
                from enrichment_agent.viewer import generate_visualization

                return generate_visualization, okf_src
            except ModuleNotFoundError as exc:
                raise RuntimeError(
                    f"found OKF source at {okf_src}, but could not import its "
                    f"viewer dependency: {exc}. Install OKF dependencies first."
                ) from exc

    try:
        from enrichment_agent.viewer import generate_visualization

        return generate_visualization, None
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "could not import the OKF reference viewer. Run this from a repo "
            "that contains okf/src, set OKF_SRC, pass --okf-src, or install the "
            "OKF enrichment_agent package."
        ) from exc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate paper-library/viz.html with the OKF reference viewer."
    )
    parser.add_argument(
        "library_root",
        nargs="?",
        default="paper-library",
        help="Path to the paper library bundle root (default: paper-library).",
    )
    parser.add_argument(
        "--output",
        help="Output HTML path (default: <library_root>/viz.html).",
    )
    parser.add_argument(
        "--bundle-name",
        default="Paper Library",
        help="Display name shown in the OKF viewer.",
    )
    parser.add_argument(
        "--okf-src",
        help="Path to OKF src, the okf directory, or a repo containing okf/src.",
    )
    args = parser.parse_args()

    library_root = Path(args.library_root)
    output = Path(args.output) if args.output else library_root / "viz.html"

    try:
        generate_visualization, okf_src = _import_generate_visualization(
            library_root, args.okf_src
        )
        stats = generate_visualization(
            library_root,
            output,
            bundle_name=args.bundle_name,
        )
    except Exception as exc:
        print(f"failed to generate viz.html: {exc}", file=sys.stderr)
        return 1

    source = f" using OKF viewer at {okf_src}" if okf_src else " using installed OKF viewer"
    print(
        f"generated {output}{source}: "
        f"{stats['concepts']} concept(s), {stats['edges']} edge(s), {stats['bytes']} bytes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
