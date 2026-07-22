#!/usr/bin/env python3
"""Install Research-skills-hub skills into every registered agent directory.

The hub is canonical. An install is either a symlink back to it or a copy, and
which one is not a free choice: a collection whose SOURCE.md declares
`Install form: `copy`` must be copied, everything else is linked. See
research-skills-hub/docs/adr/0002-skill-install-form-and-targets.md.

Targets come from assets/targets.toml, so adding one is a table row, not a code
change. State is discovered by scanning those directories; there is no install
manifest to drift out of sync with reality.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import shutil
import sys
import tomllib
from dataclasses import dataclass, field
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
DISABLED_MARKER = "SKILL.md.disabled"
TARGETS_ASSET = Path(__file__).resolve().parents[1] / "assets" / "targets.toml"


@dataclass(frozen=True)
class SkillSource:
    collection: str
    name: str
    path: Path


@dataclass(frozen=True)
class Target:
    name: str
    path: Path
    scope: str
    agent: str
    default: bool


@dataclass
class State:
    target: Target
    path: Path
    form: str = "missing"          # symlink | copy | missing
    ok: bool = True
    detail: str = ""
    disabled: bool = False
    issues: list[str] = field(default_factory=list)


def fail(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def find_repo_root(start: Path) -> Path:
    for candidate in (start.resolve(), *start.resolve().parents):
        if (candidate / "research-skills-hub").is_dir():
            return candidate
    fail("could not find Research-skills-hub; run from the repository root or pass --repo")


def repo_root(args: argparse.Namespace) -> Path:
    if args.repo:
        root = Path(args.repo).expanduser().resolve()
        if not (root / "research-skills-hub").is_dir():
            fail(f"{root} does not contain Research-skills-hub")
        return root
    return find_repo_root(Path.cwd())


# ---------------------------------------------------------------- target table


def load_targets(root: Path) -> list[Target]:
    if not TARGETS_ASSET.is_file():
        fail(f"target table is missing: {TARGETS_ASSET}")
    with TARGETS_ASSET.open("rb") as handle:
        table = tomllib.load(handle)

    targets: list[Target] = []
    for row in table.get("target", []):
        name = row.get("name")
        if not name:
            fail(f"a [[target]] row in {TARGETS_ASSET} has no name")
        scope = row.get("scope", "repo")
        agent = row.get("agent", "unknown")
        default = bool(row.get("default", False))

        if "glob" in row:
            subdir = row.get("subdir")
            if not subdir:
                fail(f"target {name!r} uses glob but has no subdir")
            exclude = set(row.get("exclude", []))
            for parent in sorted(root.glob(row["glob"])):
                if not parent.is_dir() or parent.name in exclude:
                    continue
                targets.append(
                    Target(f"{name}:{parent.name}", parent / subdir, scope, agent, default)
                )
            continue

        raw = row.get("path")
        if not raw:
            fail(f"target {name!r} has neither path nor glob")
        path = Path(raw).expanduser() if raw.startswith("~") else root / raw
        targets.append(Target(name, path, scope, agent, default))
    return targets


def select_targets(root: Path, names: list[str] | None, use_all: bool) -> list[Target]:
    targets = load_targets(root)
    if use_all:
        return targets
    if names:
        by_name = {target.name: target for target in targets}
        chosen = []
        for name in names:
            # Allow "project-claude" to mean every expanded "project-claude:<p>".
            matches = [t for t in targets if t.name == name or t.name.startswith(f"{name}:")]
            if not matches:
                fail(f"unknown target {name!r}; run `targets` to list them")
            chosen.extend(matches)
        return list(dict.fromkeys(chosen))
    defaults = [target for target in targets if target.default]
    if not defaults:
        fail("no target is marked default; pass --target or --all-targets")
    return defaults


# ------------------------------------------------------------------ hub source


def install_form(root: Path, collection: str) -> str:
    """copy when the collection declares it, symlink otherwise (ADR 0002)."""
    source_md = root / "research-skills-hub" / collection / "SOURCE.md"
    if source_md.is_file():
        for line in source_md.read_text(encoding="utf-8").splitlines():
            if "Install form" in line and "`copy`" in line:
                return "copy"
    return "symlink"


def discover_sources(root: Path) -> list[SkillSource]:
    hub = root / "research-skills-hub"
    sources: list[SkillSource] = []
    for collection_dir in sorted(path for path in hub.iterdir() if path.is_dir()):
        for skill_dir in sorted(path for path in collection_dir.iterdir() if path.is_dir()):
            if (skill_dir / "SKILL.md").is_file():
                sources.append(SkillSource(collection_dir.name, skill_dir.name, skill_dir))
                continue
            # No SKILL.md here: treat this folder as a bundle and look one level
            # deeper, e.g. mattpocock-skills/productivity/grill-me/SKILL.md.
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


# --------------------------------------------------------------------- writing


def ignore_for_copy(directory: str, names: list[str]) -> set[str]:
    return {
        name
        for name in names
        if name in IGNORE_NAMES
        or any(fnmatch.fnmatch(name, pattern) for pattern in IGNORE_PATTERNS)
    }


def ensure_safe(install: Path, targets: list[Target]) -> None:
    allowed = {target.path.expanduser().resolve() for target in targets}
    if install.parent.expanduser().resolve() not in allowed:
        fail(f"refusing to modify a path outside the target table: {install}")


def link_value(install: Path, source: Path, root: Path) -> str:
    """Relative inside the repository (committable), absolute outside it."""
    parent = install.parent.resolve()
    if parent.is_relative_to(root):
        return os.path.relpath(source.resolve(), parent)
    return str(source.resolve())


def place(install: Path, source: SkillSource, form: str, root: Path, dry_run: bool) -> None:
    install.parent.mkdir(parents=True, exist_ok=True)
    if install.is_symlink() or install.exists():
        if not dry_run:
            if install.is_symlink() or install.is_file():
                install.unlink()
            else:
                shutil.rmtree(install)
    if dry_run:
        return
    if form == "symlink":
        install.symlink_to(link_value(install, source.path, root))
    else:
        shutil.copytree(source.path, install, ignore=ignore_for_copy)


# ------------------------------------------------------------------ inspecting


def inspect(install: Path, source: SkillSource, form: str) -> tuple[str, bool, str, bool]:
    """Return (actual_form, ok, detail, disabled) for one install path."""
    if install.is_symlink():
        actual = "symlink"
        if not install.exists():
            return actual, False, f"dangling -> {os.readlink(install)}", False
        if install.resolve() != source.path.resolve():
            return actual, False, f"points at {install.resolve()}", False
        if form != "symlink":
            return actual, False, "should be a copy", False
        return actual, True, "", False
    if not install.exists():
        return "missing", True, "", False
    if not install.is_dir():
        return "unknown", False, "not a directory", False

    actual = "copy"
    disabled = (install / DISABLED_MARKER).is_file() and not (install / "SKILL.md").is_file()
    if form != "copy":
        return actual, False, "should be a symlink", disabled
    left = {p.relative_to(source.path) for p in source.path.rglob("*") if p.is_file()}
    right = {p.relative_to(install) for p in install.rglob("*") if p.is_file()}
    if disabled:
        right = {Path("SKILL.md") if p.name == DISABLED_MARKER else p for p in right}
    if left != right:
        return actual, False, "drifted from hub (file set differs)", disabled
    for rel in sorted(left):
        other = install / (DISABLED_MARKER if disabled and rel.name == "SKILL.md" else rel)
        if (source.path / rel).read_bytes() != other.read_bytes():
            return actual, False, f"drifted from hub ({rel})", disabled
    return actual, True, "", disabled


def scan(root: Path, source: SkillSource, targets: list[Target]) -> list[State]:
    form = install_form(root, source.collection)
    states = []
    for target in targets:
        install = target.path / source.name
        actual, ok, detail, disabled = inspect(install, source, form)
        states.append(State(target, install, actual, ok, detail, disabled))
    return states


# -------------------------------------------------------------------- commands


def command_targets(args: argparse.Namespace) -> None:
    root = repo_root(args)
    targets = load_targets(root)
    if args.json:
        print(json.dumps([
            {
                "name": t.name, "path": str(t.path), "scope": t.scope,
                "agent": t.agent, "default": t.default, "exists": t.path.is_dir(),
            }
            for t in targets
        ], indent=2))
        return
    for t in targets:
        mark = "*" if t.default else " "
        print(f"{mark} {t.name:26} {t.scope:8} {t.agent:7} {t.path}"
              f"{'' if t.path.is_dir() else '  (not created yet)'}")
    print("\n* = written to by `install` when no --target is given")


def command_list(args: argparse.Namespace) -> None:
    root = repo_root(args)
    rows = [
        {
            "collection": s.collection,
            "name": s.name,
            "install_form": install_form(root, s.collection),
            "path": str(s.path.relative_to(root)),
        }
        for s in discover_sources(root)
    ]
    if args.json:
        print(json.dumps(rows, indent=2))
        return
    for row in rows:
        print(f"{row['install_form']:8} {row['collection']}/{row['name']}")


def scan_unknown(root: Path, targets: list[Target], known: set[str]) -> list[dict]:
    """Installs the hub knows nothing about.

    Iterating hub sources alone cannot see these: when a hub source disappears
    the skill drops out of the listing and the install it left behind — very
    likely now a dangling symlink — becomes invisible. Discovery has to look at
    what is actually on disk, not only at what the hub advertises.
    """
    found: dict[str, dict] = {}
    for target in targets:
        if not target.path.is_dir():
            continue
        for install in sorted(target.path.iterdir()):
            if install.name in known or install.name.startswith("."):
                continue
            dangling = install.is_symlink() and not install.exists()
            entry = found.setdefault(install.name, {"name": install.name, "installs": []})
            entry["installs"].append({
                "target": target.name, "path": str(install), "scope": target.scope,
                "agent": target.agent,
                "form": "symlink" if install.is_symlink() else "copy",
                "ok": not dangling, "disabled": False,
                "detail": f"dangling -> {os.readlink(install)}" if dangling
                          else "no hub source (orphan install)",
            })
    return list(found.values())


def command_status(args: argparse.Namespace) -> None:
    root = repo_root(args)
    targets = select_targets(root, args.target, use_all=not args.target)
    all_sources = discover_sources(root)
    sources = all_sources
    if args.skill:
        sources = [s for s in all_sources if s.name == args.skill]

    payload, problems = [], 0
    for source in sources:
        states = scan(root, source, targets)
        installed = [s for s in states if s.form != "missing"]
        if not installed and not args.all:
            continue
        problems += sum(1 for s in states if not s.ok)
        payload.append({
            "collection": source.collection,
            "name": source.name,
            "install_form": install_form(root, source.collection),
            "installs": [
                {
                    "target": s.target.name, "path": str(s.path), "scope": s.target.scope,
                    "agent": s.target.agent, "form": s.form, "ok": s.ok,
                    "disabled": s.disabled, "detail": s.detail,
                }
                for s in states if s.form != "missing" or args.all
            ],
        })

    known = {s.name for s in all_sources}
    for entry in scan_unknown(root, targets, known):
        if args.skill and entry["name"] != args.skill:
            continue
        entry.update(collection="(none)", install_form="unknown")
        problems += sum(1 for i in entry["installs"] if not i["ok"])
        payload.append(entry)

    if args.skill and not payload:
        fail(f"skill {args.skill!r} was not found in the hub or in any target")

    if args.json:
        print(json.dumps(payload, indent=2))
        raise SystemExit(1 if problems else 0)

    for entry in payload:
        print(f"{entry['collection']}/{entry['name']}  [{entry['install_form']}]")
        for install in entry["installs"]:
            flag = "ok" if install["ok"] else "PROBLEM"
            note = " disabled" if install["disabled"] else ""
            detail = f"  {install['detail']}" if install["detail"] else ""
            print(f"    {flag:8}{note:9} {install['target']:26} {install['form']}{detail}")
    if problems:
        print(f"\n{problems} problem(s) found", file=sys.stderr)
        raise SystemExit(1)


def command_install(args: argparse.Namespace) -> None:
    root = repo_root(args)
    source = resolve_source(root, args.skill, args.collection)
    form = install_form(root, source.collection)
    targets = select_targets(root, args.target, args.all_targets)

    for target in targets:
        install = target.path / source.name
        ensure_safe(install, targets)
        actual, ok, detail, _ = inspect(install, source, form)
        if actual != "missing" and ok and not args.update:
            print(f"present:  {target.name:26} {install}")
            continue
        verb = "install" if actual == "missing" else "replace"
        print(f"{verb}{'(dry-run)' if args.dry_run else ''}: "
              f"{target.name:26} {install}  <- {form} {source.collection}/{source.name}")
        place(install, source, form, root, args.dry_run)


def command_remove(args: argparse.Namespace) -> None:
    root = repo_root(args)
    if not args.yes:
        fail("remove requires --yes")
    source = resolve_source(root, args.skill, args.collection)
    targets = select_targets(root, args.target, args.all_targets)
    for target in targets:
        install = target.path / source.name
        ensure_safe(install, targets)
        if not (install.is_symlink() or install.exists()):
            print(f"missing:  {target.name:26} {install}")
            continue
        print(f"remove{'(dry-run)' if args.dry_run else ''}:   {target.name:26} {install}")
        if args.dry_run:
            continue
        if install.is_symlink():
            install.unlink()
        else:
            shutil.rmtree(install)


def command_toggle(args: argparse.Namespace, enable: bool) -> None:
    """Disable or enable one install location without touching the hub.

    A symlinked install is disabled by dropping the link: its content lives in
    the hub, so nothing is lost and re-enabling just recreates it. Renaming
    SKILL.md inside a symlinked install would edit the hub itself and take out
    every other install at once, so it is never done.

    A copied install is the only place its content exists, so it is disabled by
    renaming SKILL.md to SKILL.md.disabled — agents stop discovering it and the
    files stay put.
    """
    root = repo_root(args)
    source = resolve_source(root, args.skill, args.collection)
    form = install_form(root, source.collection)
    targets = select_targets(root, args.target, args.all_targets)

    for target in targets:
        install = target.path / source.name
        ensure_safe(install, targets)
        if form == "symlink":
            present = install.is_symlink()
            if enable and not present:
                print(f"enable:   {target.name:26} {install}  (recreating link)")
                if not args.dry_run:
                    place(install, source, form, root, args.dry_run)
            elif not enable and present:
                print(f"disable:  {target.name:26} {install}  (dropping link; hub keeps content)")
                if not args.dry_run:
                    install.unlink()
            else:
                print(f"no-op:    {target.name:26} already {'enabled' if enable else 'disabled'}")
            continue

        live, off = install / "SKILL.md", install / DISABLED_MARKER
        if not install.is_dir():
            print(f"missing:  {target.name:26} {install}")
        elif enable and off.is_file():
            print(f"enable:   {target.name:26} {off.name} -> SKILL.md")
            if not args.dry_run:
                off.rename(live)
        elif not enable and live.is_file():
            print(f"disable:  {target.name:26} SKILL.md -> {off.name}")
            if not args.dry_run:
                live.rename(off)
        else:
            print(f"no-op:    {target.name:26} already {'enabled' if enable else 'disabled'}")


# ---------------------------------------------------------------------- parser


def add_target_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--target", action="append", help="target name; repeatable")
    parser.add_argument("--all-targets", action="store_true", help="every target in the table")
    parser.add_argument("--collection", help="collection name when a skill name is ambiguous")
    parser.add_argument("--dry-run", action="store_true", help="print actions without writing")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", help="repository root; defaults to searching upward from cwd")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("targets", help="list the install targets from assets/targets.toml")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=command_targets)

    p = sub.add_parser("list", help="list hub skills and the install form each one gets")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=command_list)

    p = sub.add_parser("status", help="scan every target and report what is installed")
    p.add_argument("skill", nargs="?")
    p.add_argument("--target", action="append", help="restrict to these targets")
    p.add_argument("--all", action="store_true", help="also show skills that are not installed")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=command_status)

    p = sub.add_parser("install", help="install a hub skill into the selected targets")
    p.add_argument("skill")
    p.add_argument("--update", action="store_true", help="replace an install that is already correct")
    add_target_flags(p)
    p.set_defaults(func=command_install)

    p = sub.add_parser("remove", help="remove a skill from the selected targets")
    p.add_argument("skill")
    p.add_argument("--yes", action="store_true", help="confirm removal")
    add_target_flags(p)
    p.set_defaults(func=command_remove)

    p = sub.add_parser("disable", help="stop an agent seeing a skill at one location")
    p.add_argument("skill")
    add_target_flags(p)
    p.set_defaults(func=lambda a: command_toggle(a, enable=False))

    p = sub.add_parser("enable", help="undo disable")
    p.add_argument("skill")
    add_target_flags(p)
    p.set_defaults(func=lambda a: command_toggle(a, enable=True))
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
