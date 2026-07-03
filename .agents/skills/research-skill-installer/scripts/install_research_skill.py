#!/usr/bin/env python3
"""Install and sync Research-skills-hub skills for Codex and Claude Code."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path


IGNORE_NAMES = {
    ".DS_Store",
    "__pycache__",
    ".git",
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
}
IGNORE_PATTERNS = ("*.pyc", "*.pyo")
TARGET_DIRS = (".agents/skills", ".claude/skills")
SOURCE_TARGETS = {
    "agents": ".agents/skills",
    "claude": ".claude/skills",
}


@dataclass(frozen=True)
class SkillSource:
    collection: str
    name: str
    path: Path


def fail(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def find_repo_root(start: Path) -> Path:
    for candidate in (start.resolve(), *start.resolve().parents):
        if (candidate / "Research-skills-hub").is_dir():
            return candidate
    fail("could not find Research-skills-hub; run from the repository root or pass --repo")


def repo_root(args: argparse.Namespace) -> Path:
    if args.repo:
        root = Path(args.repo).expanduser().resolve()
        if not (root / "Research-skills-hub").is_dir():
            fail(f"{root} does not contain Research-skills-hub")
        return root
    return find_repo_root(Path.cwd())


def is_ignored(path: Path) -> bool:
    if any(part in IGNORE_NAMES for part in path.parts):
        return True
    return any(fnmatch.fnmatch(path.name, pattern) for pattern in IGNORE_PATTERNS)


def ignore_for_copy(directory: str, names: list[str]) -> set[str]:
    ignored: set[str] = set()
    for name in names:
        path = Path(directory) / name
        if name in IGNORE_NAMES or any(fnmatch.fnmatch(name, pattern) for pattern in IGNORE_PATTERNS):
            ignored.add(name)
        elif path.is_dir() and name in IGNORE_NAMES:
            ignored.add(name)
    return ignored


def discover_sources(root: Path) -> list[SkillSource]:
    hub = root / "Research-skills-hub"
    sources: list[SkillSource] = []
    for collection_dir in sorted(path for path in hub.iterdir() if path.is_dir()):
        for skill_dir in sorted(path for path in collection_dir.iterdir() if path.is_dir()):
            if (skill_dir / "SKILL.md").is_file():
                sources.append(SkillSource(collection_dir.name, skill_dir.name, skill_dir))
                continue
            # No SKILL.md here: treat this folder as a bundle and look one
            # level deeper for nested skills, e.g.
            # collected-skills/productivity/grill-me/SKILL.md.
            for nested_dir in sorted(path for path in skill_dir.iterdir() if path.is_dir()):
                if (nested_dir / "SKILL.md").is_file():
                    sources.append(SkillSource(collection_dir.name, nested_dir.name, nested_dir))
    return sources


def resolve_source(root: Path, skill: str, collection: str | None) -> SkillSource:
    matches = [
        source
        for source in discover_sources(root)
        if source.name == skill and (collection is None or source.collection == collection)
    ]
    if not matches:
        if collection:
            fail(f"skill {skill!r} was not found in collection {collection!r}")
        fail(f"skill {skill!r} was not found in Research-skills-hub")
    if len(matches) > 1:
        options = ", ".join(f"{source.collection}/{source.name}" for source in matches)
        fail(f"skill {skill!r} is ambiguous; choose one with --collection. Options: {options}")
    return matches[0]


def target_paths(root: Path, skill: str) -> list[Path]:
    return [root / target_dir / skill for target_dir in TARGET_DIRS]


def ensure_safe_target(root: Path, target: Path) -> None:
    resolved = target.resolve()
    allowed_parents = [(root / target_dir).resolve() for target_dir in TARGET_DIRS]
    if resolved.parent not in allowed_parents:
        fail(f"refusing to modify unsafe target path: {target}")


def ensure_safe_hub_target(root: Path, target: Path) -> None:
    resolved = target.resolve()
    hub = (root / "Research-skills-hub").resolve()
    try:
        relative = resolved.relative_to(hub)
    except ValueError:
        fail(f"refusing to modify unsafe hub path: {target}")
    # 2 parts = collection/skill; 3 parts = collection/bundle/skill.
    if len(relative.parts) not in (2, 3):
        fail(f"refusing to replace non-skill hub path: {target}")


def installed_path(root: Path, target_name: str, skill: str) -> Path:
    try:
        target_dir = SOURCE_TARGETS[target_name]
    except KeyError:
        fail(f"unknown installed source {target_name!r}; choose agents or claude")
    return root / target_dir / skill


def copy_skill(root: Path, source: SkillSource, update: bool, dry_run: bool) -> None:
    for target in target_paths(root, source.name):
        ensure_safe_target(root, target)
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            if not update:
                fail(f"{target} already exists; pass --update to replace it")
            action = "update"
        else:
            action = "install"

        print(f"{action}: {source.collection}/{source.name} -> {target}")
        if dry_run:
            continue
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(source.path, target, ignore=ignore_for_copy)


def copy_installed_to_hub(root: Path, installed: Path, source: SkillSource, dry_run: bool) -> None:
    if not installed.is_dir() or not (installed / "SKILL.md").is_file():
        fail(f"installed skill source does not exist or lacks SKILL.md: {installed}")
    ensure_safe_hub_target(root, source.path)
    print(f"sync-back: {installed} -> {source.path}")
    if dry_run:
        return
    if source.path.exists():
        shutil.rmtree(source.path)
    shutil.copytree(installed, source.path, ignore=ignore_for_copy)


def remove_skill(root: Path, skill: str, yes: bool, dry_run: bool) -> None:
    if not yes:
        fail("remove requires --yes")
    for target in target_paths(root, skill):
        ensure_safe_target(root, target)
        if not target.exists():
            print(f"missing: {target}")
            continue
        print(f"remove: {target}")
        if not dry_run:
            shutil.rmtree(target)


def directory_digest(path: Path) -> str | None:
    if not path.is_dir():
        return None
    digest = hashlib.sha256()
    files = [p for p in path.rglob("*") if p.is_file() and not is_ignored(p.relative_to(path))]
    for file_path in sorted(files):
        rel = file_path.relative_to(path).as_posix()
        digest.update(rel.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()[:12]


def command_list(args: argparse.Namespace) -> None:
    root = repo_root(args)
    for source in discover_sources(root):
        print(f"{source.collection}/{source.name}")


def command_status(args: argparse.Namespace) -> None:
    root = repo_root(args)
    sources = discover_sources(root)
    if args.skill:
        sources = [source for source in sources if source.name == args.skill]
        if not sources:
            fail(f"skill {args.skill!r} was not found in Research-skills-hub")

    for source in sources:
        source_digest = directory_digest(source.path)
        states = []
        for target in target_paths(root, source.name):
            target_digest = directory_digest(target)
            if target_digest is None:
                state = "missing"
            elif target_digest == source_digest:
                state = "installed:match"
            else:
                state = "installed:diff"
            states.append(f"{target.parent.parent.name}:{state}")
        print(f"{source.collection}/{source.name}  {'  '.join(states)}")


def command_install(args: argparse.Namespace) -> None:
    root = repo_root(args)
    source = resolve_source(root, args.skill, args.collection)
    copy_skill(root, source, update=args.update, dry_run=args.dry_run)


def command_sync_back(args: argparse.Namespace) -> None:
    root = repo_root(args)
    source = resolve_source(root, args.skill, args.collection)
    selected = installed_path(root, args.source_target, source.name)
    selected_digest = directory_digest(selected)
    if selected_digest is None:
        fail(f"{args.source_target} copy is not installed: {selected}")

    hub_digest = directory_digest(source.path)
    other_diffs = []
    for target_name in SOURCE_TARGETS:
        if target_name == args.source_target:
            continue
        target = installed_path(root, target_name, source.name)
        target_digest = directory_digest(target)
        if target_digest is None:
            continue
        if target_digest not in {hub_digest, selected_digest}:
            other_diffs.append(f"{target_name}:{target}")

    if other_diffs and not args.force:
        detail = ", ".join(other_diffs)
        fail(
            "another installed copy has changes that differ from both the hub "
            f"and the selected source ({detail}); rerun with --force to use "
            f"{args.source_target} as the source of truth"
        )

    copy_installed_to_hub(root, selected, source, dry_run=args.dry_run)
    copy_skill(root, source, update=True, dry_run=args.dry_run)


def command_remove(args: argparse.Namespace) -> None:
    root = repo_root(args)
    remove_skill(root, args.skill, yes=args.yes, dry_run=args.dry_run)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", help="repository root; defaults to searching upward from cwd")
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="list skills available in Research-skills-hub")
    list_parser.set_defaults(func=command_list)

    status_parser = subparsers.add_parser("status", help="show install status for all skills or one skill")
    status_parser.add_argument("skill", nargs="?")
    status_parser.set_defaults(func=command_status)

    install_parser = subparsers.add_parser("install", help="install a hub skill into both agent directories")
    install_parser.add_argument("skill")
    install_parser.add_argument("--collection", help="collection name when a skill name is ambiguous")
    install_parser.add_argument("--update", action="store_true", help="replace existing installed copies")
    install_parser.add_argument("--dry-run", action="store_true", help="print actions without writing")
    install_parser.set_defaults(func=command_install)

    sync_parser = subparsers.add_parser(
        "sync-back",
        help="promote an installed skill copy back to the hub, then sync both installed copies",
    )
    sync_parser.add_argument("skill")
    sync_parser.add_argument("--collection", help="collection name when a skill name is ambiguous")
    sync_parser.add_argument(
        "--from",
        dest="source_target",
        required=True,
        choices=sorted(SOURCE_TARGETS),
        help="installed copy to promote: agents or claude",
    )
    sync_parser.add_argument(
        "--force",
        action="store_true",
        help="allow overwriting the other installed copy when it differs from the chosen source",
    )
    sync_parser.add_argument("--dry-run", action="store_true", help="print actions without writing")
    sync_parser.set_defaults(func=command_sync_back)

    remove_parser = subparsers.add_parser("remove", help="remove an installed skill from both agent directories")
    remove_parser.add_argument("skill")
    remove_parser.add_argument("--yes", action="store_true", help="confirm removal")
    remove_parser.add_argument("--dry-run", action="store_true", help="print actions without writing")
    remove_parser.set_defaults(func=command_remove)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
