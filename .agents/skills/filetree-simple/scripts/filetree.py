#!/usr/bin/env python3
"""Deterministic FILETREE.md maintenance helpers."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath


MANIFEST_PATH = Path("FILETREE.md")
ENTRYPOINT_FILENAMES = ("README.md", "SKILL.md")
# Top-level directories excluded from FILETREE.md entirely. These hold agent
# tooling/configuration that does not belong in the human-facing navigation
# index, so neither the directories nor anything beneath them is indexed.
EXCLUDED_DIRS = (".agents", ".claude")
README_INDEXED_SUBTREES = {
    "Research-skills-hub": {
        "files": ("index.md",),
        "dirs": (),
        "hash_source": "index.md",
    },
}

SKIP_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".bmp",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".mp4", ".mp3", ".wav", ".ogg", ".webm",
    ".zip", ".tar", ".gz", ".bz2", ".7z",
    ".pdf", ".psd", ".ai",
}

SKIP_FILENAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "Cargo.lock", "poetry.lock", "Pipfile.lock", "go.sum",
    ".gitkeep", "FILETREE.md",
}

ENTRY_RE = re.compile(
    r"^- `([^`]+)` (?:-|\u2014) (.+?) <!--hash:([a-f0-9]+)-->\s*$"
)
SECTION_RE = re.compile(r"^## (.+?)/?\s*$")


def require_git() -> None:
    """Require a git repository; change detection depends on git."""
    try:
        subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            check=True,
            capture_output=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        sys.exit(
            "Error: filetree requires a git repository.\n"
            "Run `git init` first, then rerun this command."
        )


def is_excluded_dir(path: str) -> bool:
    """Return whether path is an excluded directory or lives beneath one."""
    normalized = normalize_repo_path(path).rstrip("/")
    return any(
        normalized == excluded or normalized.startswith(f"{excluded}/")
        for excluded in EXCLUDED_DIRS
    )


def should_skip(path: str) -> bool:
    p = Path(path)
    return p.suffix.lower() in SKIP_EXTENSIONS or p.name in SKIP_FILENAMES


def normalize_repo_path(path: str) -> str:
    """Use slash-separated repository paths across platforms."""
    return path.replace("\\", "/")


def is_entrypoint_file(path: str) -> bool:
    """Return whether path is a directory-level navigation entrypoint."""
    return PurePosixPath(path).name in ENTRYPOINT_FILENAMES


def parent_dir(path: str) -> str:
    """Return a normalized parent directory for files or slash-ended dirs."""
    normalized = normalize_repo_path(path).rstrip("/")
    parent = PurePosixPath(normalized).parent
    return "" if str(parent) == "." else str(parent)


def ancestors(path: str) -> list[str]:
    """Return non-root ancestor directories for a file or directory path."""
    current = parent_dir(path)
    result: list[str] = []
    while current:
        result.append(current)
        current = parent_dir(current)
    return result


def has_entrypoint_ancestor(path: str, entrypoint_dirs: set[str]) -> bool:
    """Return whether a non-root ancestor directory has README.md or SKILL.md."""
    for parent in ancestors(path):
        if parent in entrypoint_dirs:
            return True
    return False


def directory_path(path: str) -> str:
    """Convert a normalized directory path to manifest form."""
    return normalize_repo_path(path).rstrip("/") + "/"


def entrypoint_sources(paths: list[str]) -> dict[str, str]:
    """Return directory entrypoint source files, preferring README.md."""
    path_set = set(paths)
    sources: dict[str, str] = {}
    directories = {parent_dir(path) for path in paths if parent_dir(path)}
    for directory in sorted(directories):
        for filename in ENTRYPOINT_FILENAMES:
            candidate = f"{directory}/{filename}"
            if candidate in path_set:
                sources[directory] = candidate
                break
    return sources


def list_directories(paths: list[str]) -> list[str]:
    """Return all non-root directories implied by repository files."""
    directories: set[str] = set()
    for path in paths:
        current = parent_dir(path)
        while current:
            directories.add(current)
            current = parent_dir(current)
    return sorted(directories)


def directory_hash(directory: str, all_paths: list[str]) -> str:
    """Return a deterministic structural hash for a directory entry."""
    prefix = f"{directory}/"
    children: set[str] = set()
    for path in all_paths:
        if not path.startswith(prefix):
            continue
        remainder = path[len(prefix):]
        if not remainder:
            continue
        first, _, rest = remainder.partition("/")
        children.add(f"{first}/" if rest else first)
    payload = f"{directory}\0" + "\n".join(sorted(children))
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:8]


def collapsed_subtree_roots(paths: list[str]) -> set[str]:
    """Return configured subtree roots present in the repository."""
    return {
        root
        for root in README_INDEXED_SUBTREES
        if any(path == root or path.startswith(f"{root}/") for path in paths)
    }


def is_collapsed_descendant(path: str, roots: set[str]) -> bool:
    """Return whether path is inside, but not equal to, a collapsed root."""
    normalized = normalize_repo_path(path).rstrip("/")
    return any(normalized.startswith(f"{root}/") for root in roots)


def collapsed_index_paths(
    paths: list[str], useful_files: list[str], roots: set[str]
) -> tuple[set[str], set[str], dict[str, str]]:
    """Return forced file/dir entries and source-backed directory hashes."""
    normalized = set(paths)
    useful = set(useful_files)
    forced_files: set[str] = set()
    forced_dirs: set[str] = set()
    dir_hash_sources: dict[str, str] = {}

    for root in sorted(roots):
        config = README_INDEXED_SUBTREES[root]
        hash_source = f"{root}/{config['hash_source']}"

        for filename in config.get("files", ()):
            file_path = f"{root}/{filename}"
            if file_path in useful:
                forced_files.add(file_path)

        for dirname in config.get("dirs", ()):
            dir_path = directory_path(f"{root}/{dirname}")
            if any(path.startswith(dir_path) for path in normalized):
                forced_dirs.add(dir_path)
                if hash_source in useful:
                    dir_hash_sources[dir_path] = hash_source

    return forced_files, forced_dirs, dir_hash_sources


def build_index(paths: list[str]) -> tuple[list[str], dict[str, str]]:
    """Build compact manifest paths and source-backed hashes."""
    normalized = sorted({normalize_repo_path(path) for path in paths if path})
    useful_files = [path for path in normalized if not should_skip(path)]
    sources = entrypoint_sources(useful_files)
    entrypoint_dirs = set(sources)
    collapsed_roots = collapsed_subtree_roots(normalized)
    forced_files, forced_dirs, dir_hash_sources = collapsed_index_paths(
        normalized, useful_files, collapsed_roots
    )
    directories = [
        directory
        for directory in list_directories(normalized)
        if not is_collapsed_descendant(directory, collapsed_roots)
    ]

    indexed_dirs = [
        directory_path(directory)
        for directory in directories
        if directory in entrypoint_dirs
        or not has_entrypoint_ancestor(directory_path(directory), entrypoint_dirs)
    ]

    indexed_files = [
        path
        for path in useful_files
        if (
            path in forced_files
            or not parent_dir(path)
            or (
                not is_entrypoint_file(path)
                and not has_entrypoint_ancestor(path, entrypoint_dirs)
                and not is_collapsed_descendant(path, collapsed_roots)
            )
        )
    ]

    indexed_paths = sorted(
        set(indexed_dirs + indexed_files) | forced_dirs,
        key=lambda path: (
            parent_dir(path).lower(),
            0 if path.endswith("/") else 1,
            path.rstrip("/").lower(),
        ),
    )

    file_hashes = hash_files(sorted(set(indexed_files) | set(sources.values())))
    hashes: dict[str, str] = {}
    for path in indexed_paths:
        if path.endswith("/"):
            directory = path.rstrip("/")
            source = dir_hash_sources.get(path) or sources.get(directory)
            hashes[path] = file_hashes[source] if source else directory_hash(directory, normalized)
        else:
            hashes[path] = file_hashes[path]
    return indexed_paths, hashes


def compact_index_files(paths: list[str]) -> list[str]:
    """Return compact FILETREE.md index paths."""
    indexed_paths, _ = build_index(paths)
    return indexed_paths


def list_repo_files() -> list[str]:
    """Return tracked plus untracked-unignored files."""
    tracked = subprocess.check_output(
        ["git", "-c", "core.quotePath=false", "ls-files", "-z"],
        encoding="utf-8",
    ).split("\0")

    staged = subprocess.check_output(
        ["git", "-c", "core.quotePath=false", "ls-files", "--stage", "-z"],
        encoding="utf-8",
    ).split("\0")
    gitlinks = {
        rec.split("\t", 1)[1]
        for rec in staged
        if rec.startswith("160000 ") and "\t" in rec
    }

    untracked = subprocess.check_output(
        [
            "git",
            "-c",
            "core.quotePath=false",
            "ls-files",
            "--others",
            "--exclude-standard",
            "-z",
        ],
        encoding="utf-8",
    ).split("\0")

    files = set(tracked) | set(untracked)
    repo_files = [
        normalize_repo_path(f)
        for f in files
        if f
        and f not in gitlinks
        and not f.endswith("/")
        and not is_excluded_dir(f)
        and os.path.lexists(f)
        and not os.path.isdir(f)
    ]
    return sorted(set(repo_files))


def list_useful_files() -> list[str]:
    """Return useful tracked plus untracked-unignored files."""
    return [path for path in list_repo_files() if not should_skip(path)]


def list_current_files() -> list[str]:
    """Return compact FILETREE.md index paths."""
    return compact_index_files(list_repo_files())


def hash_files(paths: list[str]) -> dict[str, str]:
    """Return {path: 8-char git object hash} for paths."""
    if not paths:
        return {}

    proc = subprocess.run(
        ["git", "hash-object", "--stdin-paths"],
        input="\n".join(paths),
        capture_output=True,
        encoding="utf-8",
        check=True,
    )
    hashes = proc.stdout.strip().splitlines()
    if len(hashes) != len(paths):
        raise RuntimeError(f"git hash-object returned {len(hashes)} hashes for {len(paths)} paths")
    return {path: digest[:8] for path, digest in zip(paths, hashes)}


def detect_renames() -> list[tuple[str, str]]:
    """Return staged rename pairs from git status porcelain output."""
    out = subprocess.check_output(
        ["git", "-c", "core.quotePath=false", "status", "--porcelain=v1", "-z"],
        encoding="utf-8",
    )

    fields = out.split("\0")
    renames: list[tuple[str, str]] = []
    i = 0
    while i < len(fields):
        entry = fields[i]
        if len(entry) < 4:
            i += 1
            continue
        xy = entry[:2]
        new_path = entry[3:]
        if xy[0] in ("R", "C") and i + 1 < len(fields):
            renames.append((fields[i + 1], new_path))
            i += 2
        else:
            i += 1
    return renames


def _unquote_git_path(value: str) -> str:
    """Decode legacy quoted git paths; leave normal paths unchanged."""
    if len(value) < 2 or value[0] != '"' or value[-1] != '"':
        return value

    inner = value[1:-1]
    raw = bytearray()
    i = 0
    while i < len(inner):
        char = inner[i]
        if char == "\\" and i + 1 < len(inner):
            nxt = inner[i + 1]
            if nxt in "01234567" and i + 4 <= len(inner):
                raw.append(int(inner[i + 1:i + 4], 8))
                i += 4
                continue
            simple = {"n": 0x0A, "t": 0x09, "r": 0x0D, "\\": 0x5C, '"': 0x22}
            raw.append(simple.get(nxt, ord(nxt)))
            i += 2
        else:
            raw.append(ord(char))
            i += 1
    return raw.decode("utf-8", errors="replace")


def parse_manifest() -> list[dict[str, str]]:
    """Read FILETREE.md into entries with path, summary, and hash."""
    if not MANIFEST_PATH.exists():
        return []

    entries: list[dict[str, str]] = []
    section = ""
    for line in MANIFEST_PATH.read_text(encoding="utf-8").splitlines():
        section_match = SECTION_RE.match(line)
        if section_match:
            section = section_match.group(1).strip().rstrip("/").replace("\\", "/")
            if section == "(root)":
                section = ""
            continue

        entry_match = ENTRY_RE.match(line)
        if not entry_match:
            continue

        filename, summary, digest = entry_match.groups()
        filename = _unquote_git_path(filename)
        is_directory = filename.endswith("/")
        normalized_name = filename.rstrip("/") if is_directory else filename
        if "/" in normalized_name:
            path = normalized_name
        elif section:
            path = f"{section}/{normalized_name}"
        else:
            path = normalized_name
        if is_directory:
            path = directory_path(path)
        entries.append({"path": path, "summary": summary.strip(), "hash": digest})
    return entries


def write_manifest(entries: list[dict[str, str]]) -> None:
    """Group by directory, sort stably, and write FILETREE.md."""
    by_dir: dict[str, list[dict[str, str]]] = {}
    for entry in entries:
        directory = parent_dir(entry["path"])
        by_dir.setdefault(directory, []).append(entry)

    lines = [
        "# Project Filetree",
        "",
        "_Auto-maintained compact navigation index by the filetree-simple skill. Indexed entries carry content hashes; mismatches indicate stale summaries._",
        "",
    ]

    for directory in sorted(by_dir):
        heading = f"{directory}/" if directory else "(root)/"
        lines.append(f"## {heading}")
        lines.append("")
        for entry in sorted(
            by_dir[directory],
            key=lambda item: (
                0 if item["path"].endswith("/") else 1,
                item["path"].rstrip("/").lower(),
            ),
        ):
            if entry["path"].endswith("/"):
                filename = PurePosixPath(entry["path"].rstrip("/")).name + "/"
            else:
                filename = PurePosixPath(entry["path"]).name
            lines.append(f"- `{filename}` - {entry['summary']} <!--hash:{entry['hash']}-->")
        lines.append("")

    tmp = MANIFEST_PATH.with_name(MANIFEST_PATH.name + ".tmp")
    tmp.write_text("\n".join(lines), encoding="utf-8")
    tmp.replace(MANIFEST_PATH)


def cmd_todo() -> dict:
    """Diff current repository files against FILETREE.md."""
    require_git()
    repo_paths = set(list_useful_files())
    current_list, hashes = build_index(list_repo_files())
    current_paths = set(current_list)
    manifest = parse_manifest()
    manifest_by_path = {entry["path"]: entry for entry in manifest}

    renames = [
        {"old_path": normalize_repo_path(old), "new_path": normalize_repo_path(new)}
        for old, new in detect_renames()
        if normalize_repo_path(old) in manifest_by_path
        and normalize_repo_path(new) in current_paths
    ]
    renamed_olds = {item["old_path"] for item in renames}
    renamed_news = {item["new_path"] for item in renames}

    added_paths = sorted(current_paths - set(manifest_by_path) - renamed_news)
    removed = sorted(set(manifest_by_path) - current_paths - renamed_olds)
    common = sorted(current_paths & set(manifest_by_path))

    changed = []
    for path in common:
        if hashes[path] != manifest_by_path[path]["hash"]:
            changed.append(
                {
                    "path": path,
                    "old_summary": manifest_by_path[path]["summary"],
                    "old_hash": manifest_by_path[path]["hash"],
                    "new_hash": hashes[path],
                }
            )

    return {
        "added": [{"path": path, "hash": hashes[path]} for path in added_paths],
        "changed": changed,
        "removed": removed,
        "renamed": renames,
        "stats": {
            "total_in_repo": len(repo_paths),
            "total_indexed": len(current_paths),
            "total_in_manifest": len(manifest_by_path),
            "need_llm": len(added_paths) + len(changed),
        },
    }


def cmd_apply(payload: str) -> dict[str, int]:
    """Apply summary decisions to FILETREE.md."""
    require_git()
    updates = json.loads(payload)
    current_list, hashes = build_index(list_repo_files())
    current_paths = set(current_list)
    by_path = {entry["path"]: entry for entry in parse_manifest()}

    for rename in updates.get("renames", []):
        old_path = rename["old_path"]
        new_path = rename["new_path"]
        if old_path in by_path and new_path in current_paths:
            entry = by_path.pop(old_path)
            entry["path"] = new_path
            entry["hash"] = hashes.get(new_path, entry["hash"])
            by_path[new_path] = entry

    for path in updates.get("removals", []):
        by_path.pop(path, None)

    for update in updates.get("updates", []):
        path = update["path"]
        digest = update["hash"]
        summary = update["summary"]
        if path not in current_paths:
            continue
        if summary == "UNCHANGED":
            if path in by_path:
                by_path[path]["hash"] = digest
        else:
            by_path[path] = {"path": path, "hash": digest, "summary": summary}

    write_manifest(list(by_path.values()))
    return {"total_entries": len(by_path)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["todo", "lint", "apply"])
    args = parser.parse_args()

    if args.command in ("todo", "lint"):
        result = cmd_todo()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if args.command == "lint":
            drift = (
                len(result["added"])
                + len(result["changed"])
                + len(result["removed"])
                + len(result["renamed"])
            )
            sys.exit(0 if drift == 0 else 1)
        return

    result = cmd_apply(sys.stdin.read())
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
