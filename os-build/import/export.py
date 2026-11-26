#!/usr/bin/env python3
"""Write the product repository's first tree into a plain folder.

    uv run --no-project --python 3.12 -- python os-build/import/export.py --dest <empty folder outside the repository> [--rehearsal-workspace]

Reads the source repository only through Git, at --commit (default HEAD): the
whole tree's paths, modes, and blob ids, and the content of the files it
writes. It writes the M and B files and the example's files at their paths
byte for byte, and the product editions of the S files.

- Default, the real import: nothing else. No workspace at the root: no
  memory/, ideas/, inbox/, paper-wiki/, skill links, or projects-folder/index.md.
- --rehearsal-workspace: also the placeholder workspace of the manifest's
  rehearsal_workspace section (stubs, the five skill links, the stub wiki's
  viz.html rendered by the export's own generator), the example's idea file,
  and the AGENTS.md edition's rehearsal section, so the product's checks that
  still read a workspace at the root can run today. Never the import.

It never runs `git init`, never writes inside the source repository, and
never deletes anything: --dest must be empty or absent. Then run
import_check.py on the same folder with the same mode.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importkit as kit  # noqa: E402


def add_source_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2], help="the source repository (default: the one holding this script)")
    p.add_argument("--commit", default="HEAD", help="the source commit (default HEAD)")
    p.add_argument("--kit-from-worktree", action="store_true", help="read the manifest, editions, and stubs from the working tree instead of the commit (for iterating)")
    p.add_argument("--rehearsal-workspace", action="store_true", help="add the placeholder workspace (rehearsal only; the default is the real import)")
    url = p.add_mutually_exclusive_group()
    url.add_argument("--workspace-url", help="web address of this repository for the README's origin note (default: from the source's origin remote)")
    url.add_argument("--no-workspace-url", action="store_true", help="name this repository in the origin note without an address")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dest", required=True, type=Path, help="the folder to write; empty or absent")
    add_source_args(p)
    return p.parse_args()


def workspace_url(args: argparse.Namespace, repo: Path) -> str | None:
    if args.no_workspace_url:
        return None
    return (args.workspace_url or kit.origin_web_url(repo) or "").rstrip("/") or None


def prepare_dest(dest: Path, repo: Path) -> None:
    dest_r, repo_r = dest.resolve(), repo.resolve()
    if dest_r == repo_r or repo_r in dest_r.parents or dest_r in repo_r.parents:
        kit.fail("--dest must be outside the source repository, and must not contain it")
    if dest.exists() and any(dest.iterdir()):
        kit.fail("--dest is not empty; choose an empty or new folder")
    dest.mkdir(parents=True, exist_ok=True)


def write_file(dest: Path, rel: str, data: bytes, mode: str) -> None:
    path = dest / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    os.chmod(path, 0o755 if mode == "100755" else 0o644)


def label(classes: dict[str, str], path: str, it: kit.Item) -> str:
    return classes.get(path, "") if it.kind == "copy" else it.kind


def main() -> int:
    args = parse_args()
    repo = args.repo.resolve()
    src = kit.Source(repo, args.commit, args.kit_from_worktree)
    m = src.manifest()
    prepare_dest(args.dest, repo)
    dest = args.dest.resolve()

    tree = kit.ls_tree(repo, src.commit)
    classes, problems, _ = kit.classify(m, tree)
    if problems:
        kit.fail("the manifest does not fit this commit:\n  " + "\n  ".join(problems))
    url = workspace_url(args, repo)
    items = kit.expected_tree(src, m, tree, classes, url, args.rehearsal_workspace)

    blobs = kit.read_blobs(repo, {it.oid for it in items.values() if it.oid})
    for rel, it in sorted(items.items()):
        if it.kind in ("copy", "example"):
            write_file(dest, rel, blobs[it.oid], it.mode)
        elif it.kind in ("edition", "stub"):
            write_file(dest, rel, it.data, it.mode)
        elif it.kind == "link":
            (dest / rel).parent.mkdir(parents=True, exist_ok=True)
            os.symlink(it.target, dest / rel)

    if args.rehearsal_workspace:
        viz = subprocess.run(
            [sys.executable, "research-skills-hub/open-paper-skills/paper-wiki-manager/scripts/generate_viz.py", "paper-wiki", "--output", "paper-wiki/viz.html"],
            cwd=dest, capture_output=True, text=True,
        )
        if viz.returncode != 0:
            print(viz.stdout + viz.stderr, file=sys.stderr)
            kit.fail("generate_viz.py failed on the stub wiki (see above)")

    kinds = Counter(label(classes, p, it) for p, it in items.items())
    size = sum((dest / p).lstat().st_size for p in items)
    print(f"export ({kit.mode_name(args.rehearsal_workspace)}): {len(items)} files ({size / 1e6:.1f} MB) from {src.commit[:12]}"
          + (" (kit from the working tree)" if src.kit_from_worktree else ""))
    for k in ("M", "B", "edition", "example", "stub", "link", "generated"):
        if kinds.get(k) or k in ("M", "B", "edition", "example"):
            print(f"  {k:<10} {kinds.get(k, 0)}")
    print("  README origin note: " + ("this repository's address" if url else "this repository's name, no address"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
