#!/usr/bin/env python3
"""Check an export against the source commit and the manifest (§4, "The separation check").

    uv run --no-project --python 3.12 -- python os-build/import/import_check.py --export <folder> [--patterns <file>] [--json <file>] [--record]

Passes when:

- every tracked file of the source commit is in exactly one class, and each
  pinned count holds;
- the export is a plain folder (no .git at its root);
- every file in the export is byte-identical to the tracked file of class M, B,
  R, or Dv at its path, or is a named example file identical to its source, or
  is a named edition, stub, link, or generated file with the content the kit
  gives it; nothing named is missing;
- no W path is present except the named example, stubs, and links, and no
  edition, stub, or generated file has the content of any W file or of a split
  file's source (empty files excepted). W content is known only by Git blob id,
  so no W file is opened.

Files the export did not write are allowed only where the product's own
.gitignore files ignore them (the end-of-run case, after builds and tests); they
are counted and left out of the search.

--patterns names a file outside the export with one `label<TAB>text` per line.
Every file is searched for each text, ignoring case, and reported by file and
number of matching lines per label; neither the text nor the match is printed
or stored.
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
from export import RECORD, RESULT_END, RESULT_START, workspace_url  # noqa: E402


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--export", required=True, type=Path)
    p.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[2])
    p.add_argument("--commit", default="HEAD")
    p.add_argument("--kit-from-worktree", action="store_true")
    url = p.add_mutually_exclusive_group()
    url.add_argument("--workspace-url")
    url.add_argument("--no-workspace-url", action="store_true")
    p.add_argument("--patterns", type=Path, help="label<TAB>text per line; kept outside the export and the repository")
    p.add_argument("--json", type=Path, help="write the full result here (outside the export)")
    p.add_argument("--record", action="store_true", help=f"write the summary into the export's {RECORD}")
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
    repo = args.repo.resolve()
    export = args.export.resolve()
    if export == repo or repo in export.parents:
        kit.fail("--export must be outside the source repository")
    if args.patterns and (export in args.patterns.resolve().parents or repo in args.patterns.resolve().parents):
        kit.fail("--patterns must be outside the export and the repository")
    patterns = load_patterns(args.patterns)
    src = kit.Source(repo, args.commit, args.kit_from_worktree)
    m = src.manifest()
    failures: list[str] = []
    notes: list[str] = []

    # 1. The manifest against every tracked file.
    tree = kit.ls_tree(repo, src.commit)
    classes, problems, counts = kit.classify(m, tree)
    failures += [f"manifest: {p}" for p in problems]
    totals = Counter(classes.values())
    kit_files = sum(1 for p in tree if p.startswith(kit.KIT + "/"))
    design = m.data["derived_from"]["design_totals"]
    ours = {"W": totals["W"], "M": totals["M"], "B": totals["B"], "R": totals["R"] - kit_files,
            "Dv": totals["Dv-product"] + totals["Dv-both"], "S": totals["S"]}
    manifest_report = {
        "tracked": len(tree), "by_class": {k: totals[k] for k in kit.CLASS_ORDER}, "kit_files_in_R": kit_files,
        "design_totals": design, "matches_design_without_kit": ours == design,
        "symlinks": sum(1 for e in tree.values() if e.mode == "120000"),
        "gitlinks": sum(1 for e in tree.values() if e.mode == "160000"),
    }

    # 2. A plain folder.
    if (export / ".git").exists():
        failures.append("the export has a .git at its root")

    # 3. Every file against what the kit says it must hold.
    url = workspace_url(args, repo)
    items, _ = kit.expected_tree(src, m, tree, classes, url)
    w_ids: dict[str, list[str]] = {}
    for p, e in tree.items():
        if classes[p] == "W":
            w_ids.setdefault(e.oid, []).append(p)
    s_ids = {e.oid: p for p, e in tree.items() if classes[p] == "S"}
    example = set(m.example)
    named_w = example | set(m.section("stubs")) | set(m.section("links")) | set(m.section("generated"))
    found = kit.walk_export(export)
    rules = kit.IgnoreRules(export)
    checked: dict[str, bytes] = {}
    ignored_extra: Counter = Counter()
    coincidences: dict[str, list[str]] = {}
    for rel, path in sorted(found.items()):
        it = items.get(rel)
        if it is None:
            if rules.ignored(rel):
                ignored_extra[rel.split("/")[0]] += 1
                continue
            failures.append(f"{rel}: not on the allowlist and not ignored")
            data = os.readlink(path).encode() if path.is_symlink() else path.read_bytes()
            checked[rel] = data
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
            if it.kind == "copy" and oid in w_ids and oid != kit.EMPTY_BLOB:
                coincidences[rel] = sorted(w_ids[oid])
            continue
        if it.kind in ("edition", "stub") and data != it.data:
            failures.append(f"{rel}: differs from what the kit gives ({it.kind})")
        if oid != kit.EMPTY_BLOB and oid in w_ids:
            failures.append(f"{rel}: has the content of a W file ({it.kind})")
        if oid != kit.EMPTY_BLOB and oid in s_ids:
            failures.append(f"{rel}: has the content of a split file's workspace source ({it.kind})")
    for rel, it in items.items():
        if rel not in found:
            failures.append(f"{rel}: missing ({it.kind})")
    for rel in found:
        if classes.get(rel) == "W" and rel not in named_w:
            failures.append(f"{rel}: a W path")

    # 4. The search for personal data, by file and line count only.
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
    size = sum(len(d) for d in checked.values())
    result = {
        "date": dt.date.today().isoformat(),
        "source_commit": src.commit,
        "kit_from_worktree": src.kit_from_worktree,
        "passed": not failures,
        "failures": failures,
        "manifest": manifest_report,
        "export": {"files": len(items), "bytes": size, "by_kind": dict(kinds), "ignored_extra_by_top_folder": dict(ignored_extra),
                   "ignored_extra": sum(ignored_extra.values()), "allowlisted_files_equal_to_a_w_file": coincidences},
        "personal_search": {"patterns": len(patterns), "files": personal, "paths": path_hits,
                            "labels": sorted({lab for lab, _ in patterns})},
        "notes": notes,
    }
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"import check: {'PASSED' if not failures else 'FAILED'} at {src.commit[:12]}" + (" (kit from the working tree)" if src.kit_from_worktree else ""))
    t = manifest_report
    print(f"  manifest: {t['tracked']} tracked; " + ", ".join(f"{k} {v}" for k, v in t["by_class"].items()) + f"; of R, {kit_files} are this kit")
    print(f"  against §4 ({m.data['derived_from']['design_totals_at']}), without the kit: {'equal' if t['matches_design_without_kit'] else 'different'}")
    print(f"  export: {len(items)} named files, {size / 1e6:.1f} MB; " + ", ".join(f"{k} {v}" for k, v in sorted(kinds.items())))
    print(f"  files the export did not write, ignored by the product's .gitignore: {sum(ignored_extra.values())}" + (f" ({dict(ignored_extra)})" if ignored_extra else ""))
    if coincidences:
        beyond = sorted(r for r, ws in coincidences.items() if not set(ws) <= example)
        print(f"  allowlisted files identical to a W file (allowed: each is its own tracked file; listed in --json): {len(coincidences)}, "
              f"of which {len(beyond)} match a W file that is not the shipped example" + (f": {', '.join(beyond)}" if beyond else ""))
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

    if args.record:
        record = export / RECORD
        text = record.read_text(encoding="utf-8")
        start, end = text.index(RESULT_START) + len(RESULT_START), text.index(RESULT_END)
        summary = [
            "",
            f"`import_check.py` on {result['date']}: **{'passed' if not failures else 'failed'}**.",
            f"{len(items)} files; every tracked file of the source commit classed ({', '.join(f'{k} {v}' for k, v in t['by_class'].items())});",
            "no W path but the named example, stubs, and links; no W content (Git blob ids compared).",
            f"Personal-data search: {len(personal)} file(s) with matching lines" + (" (by file and count in the check's log)." if patterns else ", not run."),
            "",
        ]
        record.write_text(text[:start] + "\n".join(summary) + text[end:], encoding="utf-8")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
