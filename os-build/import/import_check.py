#!/usr/bin/env python3
"""Check an export against the source commit and the manifest, in the export's mode.

    uv run --no-project --python 3.12 -- python os-build/import/import_check.py --export <folder> [--rehearsal-workspace] [--patterns <file>] [--json <file>]

The mode is the flag, never inferred from the folder: without
--rehearsal-workspace the folder is checked as the real import. Passes when:

- every tracked file of the source commit is in exactly one class, and each
  pinned count holds;
- the export is a plain folder (no .git at its root);
- no path on disk, ignored files included, is on the manifest's `absent` list
  (the rule's list: HANDOFF.md, os-build/, ADR-0001 to 0004, CHANGELOG.md, the
  presentation, the screenshots, os-build/import.md) or is a tracked R or Dv
  file; in the real import, no path is under a workspace root (memory/, ideas/,
  inbox/, paper-wiki/, the skill folders, projects-folder/index.md);
- every file in the export is byte-identical to the tracked M or B file at its
  path, or is a named example file identical to its source, or is a named
  edition, stub, link, or generated file of this mode with the content the kit
  gives it; nothing named is missing;
- no W path is present except the named example (and, in a rehearsal, the
  stubs and links), and no edition, stub, or generated file has the content of
  any W, R, or Dv file (the kit's own files excepted, which they are written
  from) or of an S file's source here (empty files excepted). Such content is
  known only by Git blob id, so no such file is opened.

Reported, not failing: each Markdown file of the export with relative links
whose target the export does not hold, by file and count (computed from what
the commit and the kit give, so builds and tests do not change it).

Files the export did not write are allowed only where the product's own
.gitignore files ignore them (the end-of-run case, after builds and tests); they
are counted and left out of the search.

--patterns names a file outside the export with one `label<TAB>text` per line.
Every file is searched for each text, ignoring ASCII case, and reported by file
and number of matching lines per label; neither the text nor the match is
printed or stored.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importkit as kit  # noqa: E402
from export import add_source_args, workspace_url  # noqa: E402


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--export", required=True, type=Path)
    add_source_args(p)
    p.add_argument("--patterns", type=Path, help="label<TAB>text per line; kept outside the export and the repository")
    p.add_argument("--json", type=Path, help="write the full result here (outside the export)")
    return p.parse_args()


def load_patterns(path: Path | None) -> list[tuple[str, bytes]]:
    if path is None:
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        label, _, text = line.partition("\t")
        if not text.strip():
            raise SystemExit("error: a patterns line has no text after its label")
        out.append((label.strip(), text.strip().lower().encode("utf-8")))
    return out


def search(data: bytes, patterns: list[tuple[str, bytes]]) -> Counter:
    hits: Counter = Counter()
    low = data.lower()
    if not any(p in low for _, p in patterns):
        return hits
    for line in low.split(b"\n"):
        for label, p in patterns:
            if p in line:
                hits[label] += 1
    return hits


def main() -> int:
    args = parse_args()
    rehearsal = args.rehearsal_workspace
    repo = args.repo.resolve()
    export = args.export.resolve()
    if export == repo or repo in export.parents:
        kit.fail("--export must be outside the source repository")
    if args.patterns and (export in args.patterns.resolve().parents or repo in args.patterns.resolve().parents):
        kit.fail("--patterns must be outside the export and the repository")
    if args.json and export in args.json.resolve().parents:
        kit.fail("--json must be outside the export")
    patterns = load_patterns(args.patterns)
    src = kit.Source(repo, args.commit, args.kit_from_worktree)
    m = src.manifest()
    failures: list[str] = []

    # 1. The manifest against every tracked file.
    tree = kit.ls_tree(repo, src.commit)
    classes, problems, counts = kit.classify(m, tree)
    failures += [f"manifest: {p}" for p in problems]
    totals = Counter(classes.values())
    manifest_report = {
        "tracked": len(tree),
        "by_class": {k: totals[k] for k in kit.CLASS_ORDER},
        "kit_files_in_R": sum(1 for p in tree if p.startswith(kit.KIT + "/")),
        "unpinned": [m.entry_key(e) for e, _ in counts if e.get("count") is None],
        "symlinks": sum(1 for e in tree.values() if e.mode == "120000"),
        "gitlinks": sum(1 for e in tree.values() if e.mode == "160000"),
    }

    # 2. A plain folder.
    if (export / ".git").exists():
        failures.append("the export has a .git at its root")

    # 3. What must be absent, by path, over every file on disk.
    found = kit.walk_export(export)
    absent: dict[str, list[str]] = {"rule": [], "stays": [], "workspace": []}
    for rel in sorted(found):
        if m.must_be_absent(rel):
            absent["rule"].append(rel)
            failures.append(f"{rel}: on the rule's must-be-absent list")
        elif classes.get(rel) in kit.STAY_CLASSES:
            absent["stays"].append(rel)
            failures.append(f"{rel}: class {classes[rel]}, which stays in the source repository")
        elif not rehearsal and m.workspace_root(rel):
            absent["workspace"].append(rel)
            failures.append(f"{rel}: under a workspace root, which the real import does not hold")
    flagged = {p for v in absent.values() for p in v}

    # 4. Every file against what the kit says it must hold in this mode.
    url = workspace_url(args, repo)
    items = kit.expected_tree(src, m, tree, classes, url, rehearsal)
    # Content of every file that stays, except the kit's own files, which the
    # editions and stubs are written from.
    other_ids: dict[str, list[str]] = {}
    for p, e in tree.items():
        if classes[p] in ("W",) + kit.STAY_CLASSES and not p.startswith(kit.KIT + "/"):
            other_ids.setdefault(e.oid, []).append(p)
    s_ids = {e.oid: p for p, e in tree.items() if classes[p] == "S"}
    example = set(m.example(rehearsal))
    named_w = example | set(it for it, v in items.items() if v.kind in ("stub", "link", "generated"))
    rules = kit.IgnoreRules(export)
    checked: dict[str, bytes] = {}
    ignored_extra: Counter = Counter()
    coincidences: dict[str, list[str]] = {}
    for rel, path in sorted(found.items()):
        it = items.get(rel)
        if it is None:
            if rel in flagged:
                continue
            if rules.ignored(rel):
                ignored_extra[rel.split("/")[0]] += 1
                continue
            failures.append(f"{rel}: not named for this mode and not ignored")
            checked[rel] = os.readlink(path).encode() if path.is_symlink() else path.read_bytes()
            continue
        if it.kind == "link":
            if not path.is_symlink() or os.readlink(path) != it.target:
                failures.append(f"{rel}: not the link the manifest names")
            continue
        if path.is_symlink():
            failures.append(f"{rel}: a link where a file is expected")
            continue
        data = path.read_bytes()
        checked[rel] = data
        oid = kit.blob_id(data)
        executable = bool(path.stat().st_mode & 0o111)
        if it.kind in ("copy", "example"):
            if oid != it.oid:
                failures.append(f"{rel}: differs from the tracked file ({it.kind})")
            if executable != (it.mode == "100755"):
                failures.append(f"{rel}: mode differs from the tracked file")
            if it.kind == "copy" and oid in other_ids and oid != kit.EMPTY_BLOB:
                coincidences[rel] = sorted(other_ids[oid])
            continue
        if it.kind in ("edition", "stub") and data != it.data:
            failures.append(f"{rel}: differs from what the kit gives ({it.kind})")
        if it.kind in ("edition", "stub") and executable != (it.mode == "100755"):
            failures.append(f"{rel}: mode differs from the manifest ({it.kind})")
        if oid != kit.EMPTY_BLOB and oid in other_ids:
            failures.append(f"{rel}: has the content of a file that stays ({it.kind}; {classes[other_ids[oid][0]]})")
        if oid != kit.EMPTY_BLOB and oid in s_ids:
            failures.append(f"{rel}: has the content of an S file's source here ({it.kind})")
    for rel, it in items.items():
        if rel not in found:
            failures.append(f"{rel}: missing ({it.kind})")
    for rel in found:
        if classes.get(rel) == "W" and rel not in named_w and rel not in flagged:
            failures.append(f"{rel}: a W path")

    # 5. Relative links whose target did not come along (reported, not failing).
    md = {p: it for p, it in items.items() if p.endswith(".md") and it.kind != "link"}
    md_blobs = kit.read_blobs(repo, {it.oid for it in md.values() if it.oid})
    content = {p: (md_blobs[it.oid] if it.oid else it.data or b"") for p, it in md.items()}
    dangling = kit.dangling_links(items, content)

    # 6. The search for personal data, by file and line count only.
    personal: dict[str, dict[str, int]] = {}
    path_hits: dict[str, dict[str, int]] = {}
    if patterns:
        for rel, data in checked.items():
            hits = search(data, patterns)
            if hits:
                personal[rel] = dict(sorted(hits.items()))
        for rel in list(checked) + [r for r, it in items.items() if it.kind == "link"]:
            hits = search(rel.encode(), patterns)
            if hits:
                path_hits[rel] = dict(hits)
        for rel, it in items.items():
            if it.kind == "link":
                hits = search(it.target.encode(), patterns)
                if hits:
                    personal[rel] = dict(hits)

    kinds = Counter((classes.get(p) if it.kind == "copy" else it.kind) for p, it in items.items())
    size = sum(len(d) for p, d in checked.items() if p in items)
    result = {
        "date": dt.date.today().isoformat(),
        "mode": kit.mode_name(rehearsal),
        "source_commit": src.commit,
        "kit_from_worktree": src.kit_from_worktree,
        "passed": not failures,
        "failures": failures,
        "manifest": manifest_report,
        "must_be_absent": {"rule_list": absent["rule"], "stays": absent["stays"], "workspace_roots": absent["workspace"]},
        "export": {"files": len(items), "bytes": size, "by_kind": dict(kinds), "ignored_extra_by_top_folder": dict(ignored_extra),
                   "ignored_extra": sum(ignored_extra.values()), "copies_equal_to_a_file_that_stays": coincidences},
        "dangling_links": {"files": len(dangling), "links": sum(len(v) for v in dangling.values()), "by_file": dangling},
        "personal_search": {"patterns": len(patterns), "files": personal, "paths": path_hits,
                            "labels": sorted({lab for lab, _ in patterns})},
    }
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"import check ({kit.mode_name(rehearsal)}): {'PASSED' if not failures else 'FAILED'} at {src.commit[:12]}"
          + (" (kit from the working tree)" if src.kit_from_worktree else ""))
    t = manifest_report
    print(f"  manifest: {t['tracked']} tracked; " + ", ".join(f"{k} {v}" for k, v in t["by_class"].items())
          + f"; of R, {t['kit_files_in_R']} are this kit (unpinned)")
    print(f"  must be absent: {len(absent['rule'])} path(s) on the rule's list, {len(absent['stays'])} R or Dv path(s)"
          + ("" if rehearsal else f", {len(absent['workspace'])} path(s) under a workspace root"))
    print(f"  export: {len(items)} named files, {size / 1e6:.1f} MB; " + ", ".join(f"{k} {v}" for k, v in sorted(kinds.items())))
    print(f"  files the export did not write, ignored by the product's .gitignore: {sum(ignored_extra.values())}" + (f" ({dict(ignored_extra)})" if ignored_extra else ""))
    if coincidences:
        beyond = sorted(r for r, ws in coincidences.items() if not set(ws) <= set(m.example_all))
        print(f"  copies identical to a file that stays (allowed: each is its own tracked file; listed in --json): {len(coincidences)}, "
              f"of which {len(beyond)} match one that is not the example" + (f": {', '.join(beyond)}" if beyond else ""))
    print(f"  relative links whose target did not come along (reported, not failing): {sum(len(v) for v in dangling.values())} in {len(dangling)} Markdown file(s)")
    for rel, targets in sorted(dangling.items()):
        print(f"    {rel}: {len(targets)}")
    if patterns:
        print(f"  personal-data search ({len(patterns)} patterns): {len(personal)} file(s) with matching lines, {len(path_hits)} path(s)")
        for rel, hits in sorted(personal.items()):
            print(f"    {rel}: " + ", ".join(f"{k} {v}" for k, v in hits.items()))
        for rel, hits in sorted(path_hits.items()):
            print(f"    path {rel}: " + ", ".join(f"{k} {v}" for k, v in hits.items()))
    else:
        print("  personal-data search: not run (no --patterns)")
    for f in failures:
        print(f"  FAIL {f}")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
