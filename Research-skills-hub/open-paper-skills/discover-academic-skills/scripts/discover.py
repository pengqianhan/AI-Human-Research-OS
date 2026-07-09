#!/usr/bin/env python3
"""Deterministic half of the discover-academic-skills scout.

Pipeline:
  1. run `npx skills find <query>` for a set of academic queries (unauthenticated
     skills.sh CLI — no token needed),
  2. merge/dedupe candidates and drop anything already in the decision ledger,
  3. apply deterministic HARD GATES: install floor, and license-present
     (no license -> drop), enriched from GitHub via `gh`,
  4. write a JSON candidate file for the agent to relevance-gate and rubric-score.

Intentionally NOT here (they need to read each SKILL.md, so the agent does them
per SKILL.md): the strict academic-relevance gate and the rubric scoring.

Usage:
  python discover.py                          # full discovery run, default queries
  python discover.py --min-installs 100       # stricter popularity floor
  python discover.py --queries arxiv zotero   # custom query set
  python discover.py --candidate owner/repo@skill   # score a manual find (repeatable)
  python discover.py --include-seen           # do not suppress ledger entries

Prerequisites: Node/npx (for `skills find`); `gh` authenticated (for license and
repo metadata). If `gh` is unavailable the license gate cannot run — every
candidate is then flagged `license-unverified` and kept for the agent to check
by hand rather than silently dropped.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ANSI = re.compile(r"\x1b\[[0-9;]*m")
URL_RE = re.compile(r"https://skills\.sh/([^/\s]+)/([^/\s]+)/([^/\s]+)")
INSTALLS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*([KM]?)\s+installs", re.IGNORECASE)
CANDIDATE_RE = re.compile(r"^([\w.-]+)/([\w.-]+)@(\S+)$")

DEFAULT_QUERIES = [
    "arxiv", "openalex", "semantic scholar", "pubmed", "biorxiv",
    "zotero", "bibtex", "citation", "reference manager",
    "literature review", "systematic review", "meta-analysis",
    "latex paper", "paper writing", "research paper",
    "peer review", "reproducibility",
]

PERMISSIVE = {
    "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC",
    "0BSD", "Unlicense", "MPL-2.0", "CC0-1.0",
}
COPYLEFT = {
    "GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "LGPL-3.0",
    "GPL-2.0-or-later", "GPL-3.0-or-later", "AGPL-3.0-or-later",
}
OVERLAP_STOP = {
    "skills", "skill", "claude", "agent", "agents", "settings",
    "research", "ai", "the", "my", "a",
}


def strip_ansi(text: str) -> str:
    return ANSI.sub("", text)


def parse_installs(num: str, suffix: str) -> int:
    value = float(num)
    if suffix.upper() == "K":
        value *= 1_000
    elif suffix.upper() == "M":
        value *= 1_000_000
    return int(value)


def find_repo_root(start: Path | None = None) -> Path:
    start = Path(start or Path.cwd()).resolve()
    for candidate in (start, *start.parents):
        if (candidate / "Research-skills-hub").is_dir():
            return candidate
    sys.exit("error: run from inside the repo (Research-skills-hub not found)")


def run_find(query: str, timeout: int = 150) -> list[dict]:
    """Return candidates from `npx skills find <query>` (empty on failure)."""
    try:
        proc = subprocess.run(
            ["npx", "-y", "skills@latest", "find", query],
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ, "NO_COLOR": "1"},
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        print(f"  ! find '{query}' failed: {exc}", file=sys.stderr)
        return []

    candidates: list[dict] = []
    pending_installs: int | None = None
    for raw in proc.stdout.splitlines():
        line = strip_ansi(raw)
        m = INSTALLS_RE.search(line)
        if m:
            pending_installs = parse_installs(m.group(1), m.group(2))
        u = URL_RE.search(line)
        if u:
            candidates.append({
                "owner": u.group(1),
                "repo": u.group(2),
                "skill": u.group(3),
                "installs": pending_installs if pending_installs is not None else 0,
            })
            pending_installs = None
    return candidates


def gh_json(path: str, jq: str | None = None):
    args = ["gh", "api", path]
    if jq:
        args += ["--jq", jq]
    try:
        proc = subprocess.run(args, capture_output=True, text=True, timeout=30)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        return proc.stdout.strip()


def gh_available() -> bool:
    try:
        return subprocess.run(
            ["gh", "auth", "status"], capture_output=True, text=True, timeout=15
        ).returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def classify_license(spdx) -> str:
    if spdx is None:
        return "none"
    if spdx in PERMISSIVE:
        return "permissive"
    if spdx in COPYLEFT:
        return "copyleft"
    if spdx == "NOASSERTION":
        return "unknown"
    return "other"


def hub_skill_names(repo_root: Path) -> set[str]:
    names = set()
    for skill_md in (repo_root / "Research-skills-hub").rglob("SKILL.md"):
        names.add(skill_md.parent.name.lower())
    return names


def ledger_ids(ledger_path: Path) -> set[str]:
    ids = set()
    if not ledger_path.exists():
        return ids
    for line in ledger_path.read_text(encoding="utf-8").splitlines():
        m = re.search(r"[\w.-]+/[\w.-]+@[\w.-]+", line)
        if m and line.lstrip().startswith("|"):
            ids.add(m.group(0).lower())
    return ids


def hub_overlap(cand: dict, hub_names: set[str]) -> list[str]:
    tokens = set(re.split(r"[-_/@. ]+", f"{cand['repo']} {cand['skill']}".lower()))
    tokens -= OVERLAP_STOP
    hits = []
    for name in hub_names:
        name_tokens = set(re.split(r"[-_ ]+", name)) - OVERLAP_STOP
        if tokens & name_tokens:
            hits.append(name)
    return sorted(set(hits))[:5]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", help="repo root; defaults to searching upward from cwd")
    parser.add_argument("--min-installs", type=int, default=50, help="popularity floor (default 50)")
    parser.add_argument("--queries", nargs="*", help="override the default academic query set")
    parser.add_argument("--candidate", action="append", default=[],
                        help="owner/repo@skill manual candidate (repeatable); bypasses the install floor")
    parser.add_argument("--include-seen", action="store_true",
                        help="do not suppress candidates already in the decision ledger")
    parser.add_argument("--out", help="output JSON path (default scratch/skill-discovery/<date>-candidates.raw.json)")
    args = parser.parse_args()

    repo_root = Path(args.repo).resolve() if args.repo else find_repo_root()
    ledger = repo_root / "Research-skills-hub" / "discovery-ledger.md"
    seen = set() if args.include_seen else ledger_ids(ledger)
    hub_names = hub_skill_names(repo_root)
    have_gh = gh_available()
    if not have_gh:
        print("  ! gh not authenticated — license gate disabled; candidates kept with a flag", file=sys.stderr)

    queries = args.queries if args.queries is not None else DEFAULT_QUERIES

    raw: dict[str, dict] = {}
    for spec in args.candidate:
        m = CANDIDATE_RE.match(spec.strip())
        if not m:
            print(f"  ! bad --candidate '{spec}', expected owner/repo@skill", file=sys.stderr)
            continue
        owner, repo, skill = m.groups()
        cid = f"{owner}/{repo}@{skill}".lower()
        raw[cid] = {"owner": owner, "repo": repo, "skill": skill,
                    "installs": None, "queries": ["(manual)"]}

    for query in queries:
        print(f"find: {query}", file=sys.stderr)
        for cand in run_find(query):
            cid = f"{cand['owner']}/{cand['repo']}@{cand['skill']}".lower()
            if cid in raw:
                raw[cid].setdefault("queries", []).append(query)
            else:
                cand["queries"] = [query]
                raw[cid] = cand

    lic_cache: dict[tuple, object] = {}
    meta_cache: dict[tuple, dict] = {}
    kept: list[dict] = []
    dropped: list[dict] = []

    for cid, cand in sorted(raw.items()):
        cand["id"] = f"{cand['owner']}/{cand['repo']}@{cand['skill']}"
        cand["url"] = f"https://skills.sh/{cand['owner']}/{cand['repo']}/{cand['skill']}"
        manual = "(manual)" in cand.get("queries", [])

        if cid in seen:
            cand.update(gate="drop", drop_reason="already in decision ledger")
            dropped.append(cand)
            continue

        installs = cand.get("installs")
        if not manual and installs is not None and installs < args.min_installs:
            cand.update(gate="drop", drop_reason=f"installs {installs} < floor {args.min_installs}")
            dropped.append(cand)
            continue

        key = (cand["owner"], cand["repo"])
        if have_gh:
            if key not in lic_cache:
                lic_cache[key] = gh_json(f"repos/{cand['owner']}/{cand['repo']}/license",
                                         jq=".license.spdx_id")
            spdx = lic_cache[key]
        else:
            spdx = "UNVERIFIED"
        cand["license"] = spdx
        cand["license_class"] = "unverified" if spdx == "UNVERIFIED" else classify_license(spdx)

        if cand["license_class"] == "none":
            cand.update(gate="drop", drop_reason="no license (redistribution not permitted)")
            dropped.append(cand)
            continue

        if have_gh:
            if key not in meta_cache:
                meta_cache[key] = gh_json(
                    f"repos/{cand['owner']}/{cand['repo']}",
                    jq="{stars: .stargazers_count, pushed: .pushed_at, desc: .description}",
                ) or {}
            meta = meta_cache[key]
            cand["stars"] = meta.get("stars")
            cand["pushed_at"] = meta.get("pushed")
            cand["repo_desc"] = meta.get("desc")

        flags = []
        if cand["license_class"] == "copyleft":
            flags.append("copyleft-license")
        elif cand["license_class"] in ("unknown", "other"):
            flags.append(f"license-{spdx}")
        elif cand["license_class"] == "unverified":
            flags.append("license-unverified")
        overlap = hub_overlap(cand, hub_names)
        if overlap:
            flags.append("possible-overlap:" + ",".join(overlap))
        if manual:
            flags.append("manual-candidate")
        cand["flags"] = flags
        cand["gate"] = "pass"
        kept.append(cand)

    kept.sort(key=lambda c: (c.get("installs") or 0), reverse=True)

    today = date.today().isoformat()
    result = {
        "generated": today,
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "min_installs": args.min_installs,
        "gh_license_gate": have_gh,
        "queries": queries,
        "counts": {"kept": len(kept), "dropped": len(dropped)},
        "kept": kept,
        "dropped": dropped,
        "next_step": (
            "Agent: for each kept candidate apply the strict academic-relevance "
            "gate (IN/OUT scope in SKILL.md), then the rubric (35/25/25/15). "
            "Write the report, surface >=80 inline, and append every surfaced "
            "candidate to Research-skills-hub/discovery-ledger.md."
        ),
    }

    out_path = Path(args.out) if args.out else (
        repo_root / "scratch" / "skill-discovery" / f"{today}-candidates.raw.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nwrote {out_path}")
    print(f"kept {len(kept)} for scoring; dropped {len(dropped)} at deterministic gates.")


if __name__ == "__main__":
    main()
