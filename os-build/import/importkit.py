"""Shared code for export.py and import_check.py. Standard library only.

The source repository is read only through Git, at one commit: `git ls-tree`
for paths, modes, and blob ids, and `git cat-file` for the content of the
paths the manifest names. No folder of the source checkout is walked, and no
W, R, or Dv file is opened: the check compares Git blob ids (SHA-1 of the
content), so it knows such a file's content only by its id.

Two modes. The default is the real import: the product's files only, with no
workspace at the root. `rehearsal=True` adds the placeholder workspace of the
manifest's `rehearsal_workspace` section, so the product's checks that still
read a workspace at the root can run before step 3 gives the product its own.
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
from urllib.parse import unquote, urlsplit

KIT = "os-build/import"
EMPTY_BLOB = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
SHIP_CLASSES = ("M", "B")
STAY_CLASSES = ("R", "Dv")
CLASS_ORDER = ("M", "B", "S", "R", "Dv", "W")
FORMAT = 2


class KitError(SystemExit):
    pass


def fail(message: str) -> None:
    raise KitError(f"error: {message}")


def mode_name(rehearsal: bool) -> str:
    return "rehearsal workspace" if rehearsal else "real import"


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


def _matches(path: str, spec: dict) -> bool:
    return path in spec.get("paths", ()) or any(path.startswith(p) for p in spec.get("prefixes", ()))


@dataclass
class Manifest:
    data: dict

    @property
    def named(self) -> list[dict]:
        return self.data["named"]

    def entry_key(self, e: dict) -> str:
        return e.get("path") or e["prefix"]

    def matches(self, e: dict, path: str) -> bool:
        return path == e["path"] if "path" in e else path.startswith(e["prefix"])

    def example(self, rehearsal: bool) -> list[str]:
        only = self.data["example"].get("rehearsal_only", {})
        return [p for p in self.data["example"]["files"] if rehearsal or p not in only]

    @property
    def example_all(self) -> list[str]:
        return list(self.data["example"]["files"])

    @property
    def rehearsal_only(self) -> dict[str, str]:
        return dict(self.data["example"].get("rehearsal_only", {}))

    def section(self, *names: str) -> dict:
        d = self.data
        for n in names:
            d = d[n]
        return {k: v for k, v in d.items() if k != "about"}

    def must_be_absent(self, path: str) -> bool:
        """The rule's list: absent from every export, in both modes."""
        return _matches(path, self.data["absent"])

    def workspace_root(self, path: str) -> bool:
        """What a workspace owns at its root; the real import holds none of it."""
        return _matches(path, self.data["workspace_roots"])


def load_manifest(text: str) -> Manifest:
    m = Manifest(json.loads(text))
    if m.data.get("format") != FORMAT:
        fail(f"manifest format is not {FORMAT}")
    for e in m.named:
        if e["class"] not in CLASS_ORDER or e["class"] == "W":
            fail(f"{m.entry_key(e)}: class {e['class']!r} cannot be named (W is what no entry names)")
    if set(m.rehearsal_only) - set(m.example_all):
        fail("example.rehearsal_only names a file that is not in example.files")
    return m


def classify(m: Manifest, tree: dict[str, Entry]) -> tuple[dict[str, str], list[str], list[tuple[dict, int]]]:
    """Class of every tracked path (W when no entry names it), problems, and each entry's count."""
    classes: dict[str, str] = {}
    problems: list[str] = []
    counts = [0] * len(m.named)
    for path in tree:
        hits = [i for i, e in enumerate(m.named) if m.matches(e, path)]
        if len(hits) > 1:
            problems.append(f"{path}: named by {len(hits)} entries")
        for i in hits:
            counts[i] += 1
        classes[path] = m.named[hits[0]]["class"] if hits else "W"
    for e, n in zip(m.named, counts):
        if e.get("count") is not None and n != e["count"]:
            problems.append(f"{m.entry_key(e)}: {n} tracked file(s), the manifest pins {e['count']}; class the difference by the rule")
    for path in m.example_all:
        if path not in tree:
            problems.append(f"{path}: example file not tracked")
        elif classes[path] != "W":
            problems.append(f"{path}: example file is named as {classes[path]}")
    for path, cls in classes.items():
        if cls in SHIP_CLASSES and tree[path].kind != "blob":
            problems.append(f"{path}: a {tree[path].kind} (mode {tree[path].mode}) cannot be copied")
        if cls in SHIP_CLASSES + ("S",) and m.must_be_absent(path):
            problems.append(f"{path}: class {cls} ships it, but the rule's list says it must be absent")
    for path in m.section("editions"):
        if classes.get(path) != "S":
            problems.append(f"edition {path}: not an S file at this commit")
    for path, cls in classes.items():
        if cls == "S" and path not in m.section("editions"):
            problems.append(f"{path}: an S file with no edition")
    return classes, problems, list(zip(m.named, counts))


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


def fill(text: str, src: Source, workspace_url: str | None) -> str:
    subs = {
        "ORIGIN": f"[AI-Human-Research-OS]({workspace_url})" if workspace_url else "AI-Human-Research-OS",
        "SOURCE_COMMIT": src.commit,
        "SOURCE_SHORT": src.commit[:7],
    }
    for key, value in subs.items():
        text = text.replace("{{" + key + "}}", value)
    left = re.findall(r"\{\{[A-Z_]+\}\}", text)
    if left:
        fail(f"unknown placeholder(s) {sorted(set(left))}")
    return text


def expected_tree(src: Source, m: Manifest, tree: dict[str, Entry], classes: dict[str, str], workspace_url: str | None, rehearsal: bool) -> dict[str, Item]:
    """Every path of the export in this mode and what it must hold, from the commit's whole tree."""
    items: dict[str, Item] = {}
    for path, cls in classes.items():
        if cls in SHIP_CLASSES:
            items[path] = Item("copy", tree[path].mode, tree[path].oid)
    for path in m.example(rehearsal):
        items[path] = Item("example", tree[path].mode, tree[path].oid)
    for path, spec in m.section("editions").items():
        data = src.kit(spec["file"])
        if rehearsal and "rehearsal_append" in spec:
            data = data.rstrip(b"\n") + b"\n\n" + src.kit(spec["rehearsal_append"])
        if spec.get("fill"):
            data = fill(data.decode("utf-8"), src, workspace_url).encode("utf-8")
        items[path] = Item("edition", spec.get("mode", "100644"), data=data)
    if rehearsal:
        for path, rel in m.section("rehearsal_workspace", "stubs").items():
            items[path] = Item("stub", data=src.kit(rel))
        for path, target in m.section("rehearsal_workspace", "links").items():
            items[path] = Item("link", "120000", target=target)
        for path in m.section("rehearsal_workspace", "generated"):
            items[path] = Item("generated")
    return items


# ---------------------------------------------------------------- relative links


LINK_MD = re.compile(r"\]\((<[^>]+>|[^)\s]+)")
LINK_REF = re.compile(r"^\s{0,3}\[[^\]]+\]:\s*(\S+)", re.M)
LINK_HTML = re.compile(r'(?:href|src|srcset)="([^"]+)"')


def relative_links(text: str) -> list[str]:
    """Relative link targets in Markdown text, outside fenced blocks and inline code."""
    found: list[str] = []
    fenced = False
    for line in text.split("\n"):
        if line.lstrip().startswith(("```", "~~~")):
            fenced = not fenced
            continue
        if fenced:
            continue
        parts = line.split("`")
        for k in range(0, len(parts), 2):
            for pattern in (LINK_MD, LINK_REF, LINK_HTML):
                for target in pattern.findall(parts[k]):
                    found.append(target)
    out = []
    for raw in found:
        bare = raw[1:-1] if raw.startswith("<") else raw
        bare = bare.split()[0] if bare.split() else bare
        if re.match(r"^[a-z][a-z0-9+.-]*:", bare, re.I) or not re.match(r"^[\w.~%-]", bare) or re.search(r"['\"]", bare):
            continue  # an address, an anchor, an absolute path, or text that only looks like a link
        path = bare.split("#", 1)[0].split("?", 1)[0]
        if path:
            out.append(unquote(path))
    return out


def dangling_links(items: dict[str, Item], content: dict[str, bytes]) -> dict[str, list[str]]:
    """Per Markdown file of the export, the relative links whose target the export does not hold."""
    dirs: set[str] = set()
    for p in items:
        d = posixpath.dirname(p)
        while d:
            dirs.add(d)
            d = posixpath.dirname(d)
    out: dict[str, list[str]] = {}
    for rel, data in sorted(content.items()):
        if not rel.endswith(".md"):
            continue
        base = posixpath.dirname(rel)
        for target in relative_links(data.decode("utf-8", errors="replace")):
            norm = posixpath.normpath(posixpath.join(base, target))
            if norm == ".":
                continue
            if norm.startswith("../") or norm == ".." or (norm not in items and norm.rstrip("/") not in dirs):
                out.setdefault(rel, []).append(norm)
    return out


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
