"""Shared code for export.py and import_check.py. Standard library only.

The source repository is read only through Git, at one commit: `git ls-tree`
for paths, modes, and blob ids, and `git cat-file` for the content of the
paths the manifest names. No folder of the source checkout is walked, and no
W file is opened: the check compares Git blob ids (SHA-1 of the content), so
it knows a W file's content only by its id.
"""

from __future__ import annotations

import hashlib
import json
import os
import posixpath
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

KIT = "os-build/import"
EMPTY_BLOB = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
SHIP_CLASSES = ("M", "B", "R", "Dv-product", "Dv-both")
CLASS_ORDER = ("W", "M", "B", "R", "Dv-product", "Dv-both", "S")


class KitError(SystemExit):
    pass


def fail(message: str) -> None:
    raise KitError(f"error: {message}")


# ---------------------------------------------------------------- git, read only


def git(repo: Path, *args: str, data: bytes | None = None) -> bytes:
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    run = subprocess.run(
        ["git", "-C", str(repo), "--no-pager", *args],
        input=data,
        capture_output=True,
        env=env,
    )
    if run.returncode != 0:
        fail(f"git {args[0]} failed: {run.stderr.decode(errors='replace').strip()}")
    return run.stdout


@dataclass(frozen=True)
class Entry:
    mode: str
    kind: str
    oid: str


def resolve_commit(repo: Path, commit: str) -> str:
    return git(repo, "rev-parse", "--verify", f"{commit}^{{commit}}").decode().strip()


def ls_tree(repo: Path, commit: str, paths: list[str] | None = None) -> dict[str, Entry]:
    """Tracked files at `commit`, or only those under `paths` (exact files or folders)."""
    args = ["ls-tree", "-r", "-z", "--full-tree", commit]
    if paths is not None:
        if not paths:
            return {}
        args += ["--", *(p.rstrip("/") for p in paths)]
    tree: dict[str, Entry] = {}
    for record in git(repo, *args).split(b"\0"):
        if not record:
            continue
        meta, raw = record.split(b"\t", 1)
        mode, kind, oid = meta.decode().split()
        tree[raw.decode("utf-8")] = Entry(mode, kind, oid)
    return tree


def read_blobs(repo: Path, oids: set[str]) -> dict[str, bytes]:
    order = sorted(oids)
    if not order:
        return {}
    out = git(repo, "cat-file", "--batch", data="".join(o + "\n" for o in order).encode())
    blobs: dict[str, bytes] = {}
    pos = 0
    for oid in order:
        nl = out.index(b"\n", pos)
        header = out[pos:nl].decode().split()
        if len(header) != 3 or header[0] != oid:
            fail(f"cat-file returned {header!r} for {oid}")
        size = int(header[2])
        blobs[oid] = out[nl + 1 : nl + 1 + size]
        pos = nl + 1 + size + 1
    return blobs


def blob_id(data: bytes) -> str:
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def origin_web_url(repo: Path) -> str | None:
    """The source's GitHub page, from its `origin` remote, without credentials."""
    run = subprocess.run(["git", "-C", str(repo), "remote", "get-url", "origin"], capture_output=True, text=True)
    if run.returncode != 0:
        return None
    raw = run.stdout.strip()
    m = re.fullmatch(r"git@([^:]+):(.+?)(?:\.git)?/?", raw)
    if m:
        host, path = m.groups()
    else:
        parts = urlsplit(raw)
        if parts.scheme not in ("https", "http", "ssh") or not parts.hostname:
            return None
        host, path = parts.hostname, parts.path.strip("/")
        path = path[:-4] if path.endswith(".git") else path
    return f"https://{host}/{path}"


# ---------------------------------------------------------------- manifest


@dataclass
class Manifest:
    data: dict

    @property
    def allowlist(self) -> list[dict]:
        return self.data["allowlist"]

    def entry_key(self, e: dict) -> str:
        return e.get("path") or e["prefix"]

    def class_of(self, e: dict) -> str:
        return f"Dv-{e['side']}" if e["class"] == "Dv" else e["class"]

    def matches(self, e: dict, path: str) -> bool:
        return path == e["path"] if "path" in e else path.startswith(e["prefix"])

    def named_paths(self) -> list[str]:
        """Everything export.py lists from the source: the allowlist and the example."""
        return [self.entry_key(e) for e in self.allowlist] + list(self.data["example"]["files"])

    @property
    def example(self) -> list[str]:
        return list(self.data["example"]["files"])

    def section(self, name: str) -> dict:
        return {k: v for k, v in self.data[name].items() if k != "about"}


def load_manifest(text: str) -> Manifest:
    m = Manifest(json.loads(text))
    if m.data.get("format") != 1:
        fail("manifest format is not 1")
    return m


def classify(m: Manifest, tree: dict[str, Entry]) -> tuple[dict[str, str], list[str], list[tuple[dict, int]]]:
    """Class of every tracked path (W when no entry names it), problems, and each entry's count."""
    classes: dict[str, str] = {}
    problems: list[str] = []
    counts = [0] * len(m.allowlist)
    for path in tree:
        hits = [i for i, e in enumerate(m.allowlist) if m.matches(e, path)]
        if len(hits) > 1:
            problems.append(f"{path}: named by {len(hits)} allowlist entries")
        for i in hits:
            counts[i] += 1
        classes[path] = m.class_of(m.allowlist[hits[0]]) if hits else "W"
    for e, n in zip(m.allowlist, counts):
        if e.get("count") is not None and n != e["count"]:
            problems.append(f"{m.entry_key(e)}: {n} tracked file(s), the manifest pins {e['count']}; class the difference by §4's rules")
    for path in m.example:
        if path not in tree:
            problems.append(f"{path}: example file not tracked")
        elif classes[path] != "W":
            problems.append(f"{path}: example file is on the allowlist ({classes[path]})")
    for path, e in tree.items():
        if classes[path] in SHIP_CLASSES and e.kind != "blob":
            problems.append(f"{path}: a {e.kind} (mode {e.mode}) cannot be copied")
    return classes, problems, list(zip(m.allowlist, counts))


# ---------------------------------------------------------------- editions

DIRECTIVE = re.compile(r'^<!-- import:(section|heading|group|bullet|stays-section|stays-group|stays-bullet|cover-sections|cover-groups|cover-bullets) "(.+)" -->\s*$')
GROUP_HEAD = re.compile(r"^\*\*.+:\*\*")
HEADING = re.compile(r"^(#{1,6}) ")


def _level(line: str) -> int | None:
    h = HEADING.match(line)
    return len(h.group(1)) if h else None


def _scope(lines: list[str], heading: str) -> tuple[int, int]:
    hits = [i for i, l in enumerate(lines) if l.startswith(heading) and _level(l) is not None]
    if len(hits) != 1:
        fail(f"heading {heading!r}: {len(hits)} matches in the source")
    start = hits[0]
    level = _level(lines[start])
    end = next((j for j in range(start + 1, len(lines)) if (_level(lines[j]) or 99) <= level), len(lines))
    return start, end


def _extent(lines: list[str], kind: str, start: int) -> int:
    if kind == "heading":
        return start + 1
    if kind == "section":
        return _scope(lines, lines[start])[1]
    j = start + 1
    while j < len(lines):
        l = lines[j]
        if kind == "group" and (GROUP_HEAD.match(l) or (_level(l) or 99) <= 2):
            break
        if kind == "bullet" and (l.strip() == "" or l.startswith("- ") or _level(l) is not None):
            break
        j += 1
    return j


def _locate(lines: list[str], kind: str, prefix: str) -> tuple[int, int]:
    hits = [i for i, l in enumerate(lines) if l.startswith(prefix)]
    if kind in ("section", "heading"):
        hits = [i for i in hits if _level(lines[i]) is not None]
    if len(hits) != 1:
        fail(f"import:{kind} {prefix!r}: {len(hits)} matches in the source")
    return hits[0], _extent(lines, kind, hits[0])


def _units(lines: list[str], kind: str, heading: str) -> list[int]:
    """Start lines of every section, group, or top-level bullet inside `heading`."""
    start, end = _scope(lines, heading)
    level = _level(lines[start])
    if kind == "sections":
        return [i for i in range(start + 1, end) if _level(lines[i]) == level + 1]
    if kind == "bullets":
        return [i for i in range(start + 1, end) if lines[i].startswith("- ")]
    units = [i for i in range(start + 1, end) if GROUP_HEAD.match(lines[i])]
    first = next((i for i in range(start + 1, end) if lines[i].strip()), None)
    if first is not None and first not in units:
        units.insert(0, first)
    return units


def _trim(chunk: list[str]) -> list[str]:
    while chunk and not chunk[-1].strip():
        chunk = chunk[:-1]
    return chunk


def fill_template(template: str, source: str, subs: dict[str, str], label: str) -> str:
    """Replace each import: directive with the part of `source` it names; check coverage."""
    lines = source.split("\n")
    out: list[str] = []
    starts: dict[int, str] = {}
    covers: list[tuple[str, str]] = []
    for line in template.split("\n"):
        d = DIRECTIVE.match(line)
        if not d:
            for key, value in subs.items():
                line = line.replace("{{" + key + "}}", value)
            out.append(line)
            continue
        kind, prefix = d.groups()
        if kind.startswith("cover-"):
            covers.append((kind[len("cover-"):], prefix))
            continue
        stays = kind.startswith("stays-")
        base = kind[len("stays-"):] if stays else kind
        start, end = _locate(lines, base, prefix)
        if start in starts:
            fail(f"{label}: {prefix!r} and {starts[start]!r} name the same part")
        starts[start] = prefix
        if not stays:
            out.extend(_trim(lines[start:end]))
    for kind, heading in covers:
        for i in _units(lines, kind, heading):
            if i not in starts:
                fail(f"{label}: under {heading!r}, {lines[i][:70]!r} is neither moved nor marked as staying")
    text = "\n".join(out)
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text


LINK_MD = re.compile(r"(\]\()(<[^>]+>|[^)\s]+)")
LINK_REF = re.compile(r"^(\[[^\]]+\]:\s*)(\S+)", re.M)
LINK_HTML = re.compile(r'((?:href|src|srcset)=")([^"]+)')


def rewrite_links(text: str, base: str, keep, workspace_url: str | None, unresolved: list[str]) -> str:
    """Relative links whose target is not product content become links to the workspace repository."""

    def fix(m: re.Match[str]) -> str:
        lead, target = m.group(1), m.group(2)
        bare = target[1:-1] if target.startswith("<") else target
        if re.match(r"^[a-z][a-z0-9+.-]*:", bare, re.I) or bare.startswith(("#", "/")) or not re.match(r"^[\w.~%-]", bare) or re.search(r"['\"]", bare):
            return m.group(0)
        path, _, anchor = bare.partition("#")
        if not path:
            return m.group(0)
        norm = posixpath.normpath(posixpath.join(base, unquote(path)))
        if norm.startswith("..") or keep(norm):
            return m.group(0)
        if workspace_url is None:
            unresolved.append(norm)
            return m.group(0)
        return lead + f"{workspace_url}/blob/main/{quote(norm, safe='/')}" + (f"#{anchor}" if anchor else "")

    # Only outside code: fenced blocks and inline code spans are text, not links.
    out, fenced = [], False
    for line in text.split("\n"):
        if line.lstrip().startswith("```"):
            fenced = not fenced
            out.append(line)
            continue
        if fenced:
            out.append(line)
            continue
        parts = line.split("`")
        for k in range(0, len(parts), 2):
            for pattern in (LINK_MD, LINK_REF, LINK_HTML):
                parts[k] = pattern.sub(fix, parts[k])
        out.append("`".join(parts))
    return "\n".join(out)


# ---------------------------------------------------------------- the expected tree


@dataclass
class Item:
    kind: str  # copy, example, edition, stub, link, generated
    mode: str = "100644"
    oid: str | None = None
    data: bytes | None = None
    target: str | None = None


class Source:
    """One commit of the source repository and the kit that describes its import."""

    def __init__(self, repo: Path, commit: str, kit_from_worktree: bool):
        self.repo = repo
        self.commit = resolve_commit(repo, commit)
        self.kit_from_worktree = kit_from_worktree
        self._kit_tree = ls_tree(repo, self.commit, [KIT])

    def kit(self, rel: str) -> bytes:
        path = f"{KIT}/{rel}"
        if self.kit_from_worktree:
            return (self.repo / path).read_bytes()
        if path not in self._kit_tree:
            fail(f"{path} is not in commit {self.commit[:12]}; commit the kit or pass --kit-from-worktree")
        return read_blobs(self.repo, {self._kit_tree[path].oid})[self._kit_tree[path].oid]

    def manifest(self) -> Manifest:
        return load_manifest(self.kit("manifest.json").decode("utf-8"))


def expected_tree(src: Source, m: Manifest, tree: dict[str, Entry], classes: dict[str, str], workspace_url: str | None) -> tuple[dict[str, Item], list[str]]:
    """Every path of the export and what it must hold. `tree` must hold at least the named paths."""
    items: dict[str, Item] = {}
    for path, cls in classes.items():
        if cls in SHIP_CLASSES:
            items[path] = Item("copy", tree[path].mode, tree[path].oid)
    for path in m.example:
        items[path] = Item("example", tree[path].mode, tree[path].oid)
    for path, rel in m.section("stubs").items():
        items[path] = Item("stub", data=src.kit(rel))
    for path, target in m.section("links").items():
        items[path] = Item("link", "120000", target=target)
    for path in m.section("generated"):
        items[path] = Item("generated")
    editions = m.section("editions")
    for path in editions:
        items[path] = Item("edition")

    product = {p for p, it in items.items() if it.kind in ("copy", "example", "edition") or p == "os-build/import.md"}
    dirs = {posixpath.dirname(p) for p in product}
    for d in list(dirs):
        while d:
            d = posixpath.dirname(d)
            dirs.add(d)

    def keep(norm: str) -> bool:
        return norm in product or norm.rstrip("/") in dirs

    subs = {
        "SOURCE_COMMIT": src.commit,
        "SOURCE_SHORT": src.commit[:7],
        "WORKSPACE_URL": workspace_url or "the AI-Human-Research-OS repository",
    }
    unresolved: list[str] = []
    for path, spec in editions.items():
        if "file" in spec:
            data = src.kit(spec["file"])
        else:
            source_entry = tree.get(spec["source"])
            if source_entry is None or classes.get(spec["source"]) != "S":
                fail(f"edition {path}: source {spec['source']} is not an S file at this commit")
            source = read_blobs(src.repo, {source_entry.oid})[source_entry.oid].decode("utf-8")
            text = fill_template(src.kit(spec["template"]).decode("utf-8"), source, subs, path)
            text = rewrite_links(text, posixpath.dirname(path), keep, workspace_url, unresolved)
            data = text.encode("utf-8")
        items[path] = Item("edition", spec.get("mode", "100644"), data=data)
    return items, sorted(set(unresolved))


# ---------------------------------------------------------------- ignore rules (for the end-of-run check)


def _glob_regex(glob: str) -> str:
    out, i = "", 0
    while i < len(glob):
        c = glob[i]
        if glob.startswith("**/", i):
            out, i = out + "(?:.*/)?", i + 3
        elif glob.startswith("/**", i) and i + 3 == len(glob):
            out, i = out + "/.*", i + 3
        elif c == "*":
            out, i = out + "[^/]*", i + 1
        elif c == "?":
            out, i = out + "[^/]", i + 1
        elif c == "[":
            j = glob.find("]", i + 1)
            if j == -1:
                out, i = out + re.escape(c), i + 1
            else:
                out, i = out + "[" + glob[i + 1 : j].replace("!", "^", 1) + "]", j + 1
        else:
            out, i = out + re.escape(c), i + 1
    return out


class IgnoreRules:
    """The subset of .gitignore rules the product's ignore files use, read from the export."""

    def __init__(self, root: Path):
        self.rules: list[tuple[str, re.Pattern[str], bool, bool]] = []  # base, regex, negate, dir_only
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in ("node_modules", ".git")]
            if ".gitignore" in filenames:
                base = os.path.relpath(dirpath, root).replace(os.sep, "/")
                base = "" if base == "." else base
                for raw in (Path(dirpath) / ".gitignore").read_text(encoding="utf-8").splitlines():
                    line = raw.rstrip()
                    if not line or line.startswith("#"):
                        continue
                    negate = line.startswith("!")
                    line = line[1:] if negate else line
                    dir_only = line.endswith("/")
                    line = line.rstrip("/")
                    anchored = "/" in line
                    line = line.lstrip("/")
                    body = _glob_regex(line)
                    regex = re.compile(("^" if anchored else "^(?:.*/)?") + body + "$")
                    self.rules.append((base, regex, negate, dir_only))
        self.rules.sort(key=lambda r: r[0].count("/") if r[0] else -1)

    def _match(self, rel: str, is_dir: bool) -> bool:
        ignored = False
        for base, regex, negate, dir_only in self.rules:
            if base and not rel.startswith(base + "/"):
                continue
            sub = rel[len(base) + 1 :] if base else rel
            if dir_only and not is_dir:
                continue
            if regex.match(sub):
                ignored = not negate
        return ignored

    def ignored(self, rel: str) -> bool:
        parts = rel.split("/")
        for k in range(1, len(parts)):
            if self._match("/".join(parts[:k]), True):
                return True
        return self._match(rel, False)


def walk_export(root: Path) -> dict[str, Path]:
    """Every file and link in the export, by relative path; links are never followed."""
    found: dict[str, Path] = {}
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        for name in list(dirnames):
            p = Path(dirpath) / name
            if p.is_symlink():
                dirnames.remove(name)
                filenames.append(name)
        for name in filenames:
            p = Path(dirpath) / name
            found[p.relative_to(root).as_posix()] = p
    return found
